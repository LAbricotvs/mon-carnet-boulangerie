-- Autoriser le responsable à modifier le nom de sa famille.
grant select, update on table public.families to authenticated;
drop policy if exists families_update_owner on public.families;
create policy families_update_owner on public.families
for update to authenticated
using (exists (
  select 1 from public.family_members fm
  where fm.family_id = families.id and fm.user_id = auth.uid() and fm.role = 'owner'
))
with check (exists (
  select 1 from public.family_members fm
  where fm.family_id = families.id and fm.user_id = auth.uid() and fm.role = 'owner'
));
