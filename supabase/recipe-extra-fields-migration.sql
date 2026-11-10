-- Ajout de la quantité obtenue et du temps de préparation.
alter table public.recipes
  add column if not exists quantity text,
  add column if not exists preparation_time text;
