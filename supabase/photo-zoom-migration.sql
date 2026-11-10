-- Enregistre aussi le niveau de zoom du cadrage photo.
alter table public.recipes
  add column if not exists photo_zoom numeric(3,2) not null default 1
    check (photo_zoom >= 1 and photo_zoom <= 3);
