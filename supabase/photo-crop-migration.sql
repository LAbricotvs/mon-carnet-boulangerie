-- Ajoute les réglages de cadrage de la vignette pour chaque recette.
alter table public.recipes
  add column if not exists photo_position_x integer not null default 50
    check (photo_position_x between 0 and 100),
  add column if not exists photo_position_y integer not null default 50
    check (photo_position_y between 0 and 100);
