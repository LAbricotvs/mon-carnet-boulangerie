-- Famille partagee pour Mon Carnet de Boulangerie
-- A executer une seule fois dans Supabase > SQL Editor.

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Ma famille',
  created_by uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  unique (user_id)
);

-- Creer une famille pour chaque compte deja existant, sans toucher aux recettes.
insert into public.families (created_by)
select id from auth.users
on conflict (created_by) do nothing;

insert into public.family_members (family_id, user_id, role)
select f.id, f.created_by, 'owner'
from public.families f
on conflict (family_id, user_id) do nothing;

alter table public.recipes add column if not exists family_id uuid references public.families(id);
update public.recipes r
set family_id = fm.family_id
from public.family_members fm
where fm.user_id = r.user_id and r.family_id is null;
alter table public.recipes alter column family_id set not null;
create index if not exists recipes_family_id_idx on public.recipes(family_id);

alter table public.families enable row level security;
alter table public.family_members enable row level security;

drop policy if exists families_read_member on public.families;
create policy families_read_member on public.families
for select to authenticated
using (exists (
  select 1 from public.family_members fm
  where fm.family_id = families.id and fm.user_id = auth.uid()
));

drop policy if exists family_members_read_family on public.family_members;
create policy family_members_read_family on public.family_members
for select to authenticated
using (exists (
  select 1 from public.family_members mine
  where mine.family_id = family_members.family_id and mine.user_id = auth.uid()
));

-- Les recettes sont visibles et modifiables par tous les membres de la famille.
drop policy if exists recipes_select_own on public.recipes;
drop policy if exists recipes_insert_own on public.recipes;
drop policy if exists recipes_update_own on public.recipes;
drop policy if exists recipes_delete_own on public.recipes;

drop policy if exists recipes_select_family on public.recipes;
create policy recipes_select_family on public.recipes
for select to authenticated
using (exists (
  select 1 from public.family_members fm
  where fm.family_id = recipes.family_id and fm.user_id = auth.uid()
));

drop policy if exists recipes_insert_family on public.recipes;
create policy recipes_insert_family on public.recipes
for insert to authenticated
with check (
  user_id = auth.uid() and exists (
    select 1 from public.family_members fm
    where fm.family_id = recipes.family_id and fm.user_id = auth.uid()
  )
);

drop policy if exists recipes_update_family on public.recipes;
create policy recipes_update_family on public.recipes
for update to authenticated
using (exists (
  select 1 from public.family_members fm
  where fm.family_id = recipes.family_id and fm.user_id = auth.uid()
))
with check (exists (
  select 1 from public.family_members fm
  where fm.family_id = recipes.family_id and fm.user_id = auth.uid()
));

drop policy if exists recipes_delete_family on public.recipes;
create policy recipes_delete_family on public.recipes
for delete to authenticated
using (exists (
  select 1 from public.family_members fm
  where fm.family_id = recipes.family_id and fm.user_id = auth.uid()
));

-- Invitations a usage unique, valables 7 jours.
create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.family_invites enable row level security;

create or replace function public.create_family_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
  v_code text;
begin
  select fm.family_id into v_family
  from public.family_members fm
  where fm.user_id = auth.uid() and fm.role = 'owner'
  limit 1;
  if v_family is null then
    raise exception 'Seul le responsable de la famille peut inviter un membre.';
  end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.family_invites (family_id, code, created_by)
  values (v_family, v_code, auth.uid());
  return v_code;
end;
$$;

create or replace function public.join_family_with_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.family_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Connectez-vous avant de rejoindre une famille.';
  end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'Ce compte appartient deja a une famille.';
  end if;
  select * into v_invite
  from public.family_invites
  where code = upper(trim(p_code))
    and used_at is null
    and expires_at > now()
  for update;
  if not found then
    raise exception 'Code invalide, deja utilise ou expire.';
  end if;
  insert into public.family_members (family_id, user_id, role)
  values (v_invite.family_id, auth.uid(), 'member');
  update public.family_invites set used_at = now() where id = v_invite.id;
end;
$$;

revoke all on function public.create_family_invite() from public;
revoke all on function public.join_family_with_code(text) from public;
grant execute on function public.create_family_invite() to authenticated;
grant execute on function public.join_family_with_code(text) to authenticated;

-- Les photos existantes restent accessibles a la famille via la recette qui les reference.
-- Les nouvelles photos seront rangees dans un dossier portant l'identifiant de la famille.
drop policy if exists recipe_photos_read_own on storage.objects;
drop policy if exists recipe_photos_insert_own on storage.objects;
drop policy if exists recipe_photos_delete_own on storage.objects;
drop policy if exists recipe_photos_read_family on storage.objects;
create policy recipe_photos_read_family on storage.objects
for select to authenticated
using (
  bucket_id = 'recipe-photos'
  and (
    exists (
      select 1 from public.recipes r
      join public.family_members fm on fm.family_id = r.family_id
      where fm.user_id = auth.uid() and r.photo_path = storage.objects.name
    )
    or exists (
      select 1 from public.family_members fm
      where fm.user_id = auth.uid()
        and (storage.foldername(storage.objects.name))[1] = fm.family_id::text
    )
  )
);

drop policy if exists recipe_photos_insert_family on storage.objects;
create policy recipe_photos_insert_family on storage.objects
for insert to authenticated
with check (
  bucket_id = 'recipe-photos'
  and exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and (storage.foldername(storage.objects.name))[1] = fm.family_id::text
  )
);

drop policy if exists recipe_photos_delete_family on storage.objects;
create policy recipe_photos_delete_family on storage.objects
for delete to authenticated
using (
  bucket_id = 'recipe-photos'
  and exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and (
        (storage.foldername(storage.objects.name))[1] = fm.family_id::text
        or exists (
          select 1 from public.recipes r
          where r.photo_path = storage.objects.name and r.family_id = fm.family_id
        )
      )
  )
);
