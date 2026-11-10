create table if not exists public.recipes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 category text not null default 'Pain' check(category in ('Pain','Brioche','Pizza','Autre')),
 starter text, ingredients text, instructions text, rest_time text, bake_time text, notes text, photo_path text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.recipes enable row level security;
grant select,insert,update,delete on public.recipes to authenticated;
drop policy if exists recipes_select_own on public.recipes;
drop policy if exists recipes_insert_own on public.recipes;
drop policy if exists recipes_update_own on public.recipes;
drop policy if exists recipes_delete_own on public.recipes;
create policy recipes_select_own on public.recipes for select to authenticated using(auth.uid()=user_id);
create policy recipes_insert_own on public.recipes for insert to authenticated with check(auth.uid()=user_id);
create policy recipes_update_own on public.recipes for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy recipes_delete_own on public.recipes for delete to authenticated using(auth.uid()=user_id);
insert into storage.buckets(id,name,public) values('recipe-photos','recipe-photos',false) on conflict(id) do nothing;
drop policy if exists recipe_photos_read_own on storage.objects;
drop policy if exists recipe_photos_insert_own on storage.objects;
drop policy if exists recipe_photos_delete_own on storage.objects;
create policy recipe_photos_read_own on storage.objects for select to authenticated using(bucket_id='recipe-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy recipe_photos_insert_own on storage.objects for insert to authenticated with check(bucket_id='recipe-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy recipe_photos_delete_own on storage.objects for delete to authenticated using(bucket_id='recipe-photos' and (storage.foldername(name))[1]=auth.uid()::text);