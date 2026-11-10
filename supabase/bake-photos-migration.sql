-- Historique enrichi des fournées : commentaires modifiables et photos privées.
alter table public.bake_logs
  add column if not exists photo_paths text[] not null default '{}';

grant select, insert, update, delete on table public.bake_logs to authenticated;

drop policy if exists "bake_logs_update_own" on public.bake_logs;
create policy "bake_logs_update_own" on public.bake_logs
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (family_id is null or exists (
    select 1 from public.family_members fm
    where fm.family_id = bake_logs.family_id
      and fm.user_id = auth.uid()
  ))
);

insert into storage.buckets (id, name, public)
values ('bake-photos', 'bake-photos', false)
on conflict (id) do nothing;

drop policy if exists bake_photos_read_family on storage.objects;
create policy bake_photos_read_family on storage.objects
for select to authenticated
using (
  bucket_id = 'bake-photos'
  and exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and (storage.foldername(storage.objects.name))[1] = fm.family_id::text
  )
);

drop policy if exists bake_photos_insert_family on storage.objects;
create policy bake_photos_insert_family on storage.objects
for insert to authenticated
with check (
  bucket_id = 'bake-photos'
  and exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and (storage.foldername(storage.objects.name))[1] = fm.family_id::text
  )
);

drop policy if exists bake_photos_delete_family on storage.objects;
create policy bake_photos_delete_family on storage.objects
for delete to authenticated
using (
  bucket_id = 'bake-photos'
  and exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and (storage.foldername(storage.objects.name))[1] = fm.family_id::text
  )
);
