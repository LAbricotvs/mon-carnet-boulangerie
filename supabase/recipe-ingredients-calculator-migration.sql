-- Ingrédients structurés pour le calculateur de quantités
alter table public.recipes
  add column if not exists ingredients_data jsonb not null default '[]'::jsonb;
