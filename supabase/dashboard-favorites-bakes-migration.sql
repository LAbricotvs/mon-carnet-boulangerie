alter table public.recipes
  add column if not exists is_favorite boolean not null default false,
  add column if not exists tags text[] not null default '{}';

create table if not exists public.bake_logs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid,
  recipe_name text not null,
  baked_at timestamptz not null default now(),
  rating text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.bake_logs enable row level security;
drop policy if exists "bake_logs_select_family" on public.bake_logs;
create policy "bake_logs_select_family" on public.bake_logs for select to authenticated using (
 user_id=auth.uid() or (family_id is not null and exists (select 1 from public.family_members fm where fm.family_id=bake_logs.family_id and fm.user_id=auth.uid()))
);
drop policy if exists "bake_logs_insert_family" on public.bake_logs;
create policy "bake_logs_insert_family" on public.bake_logs for insert to authenticated with check (
 user_id=auth.uid() and (family_id is null or exists (select 1 from public.family_members fm where fm.family_id=bake_logs.family_id and fm.user_id=auth.uid()))
);
drop policy if exists "bake_logs_delete_own" on public.bake_logs;
create policy "bake_logs_delete_own" on public.bake_logs for delete to authenticated using (user_id=auth.uid());
