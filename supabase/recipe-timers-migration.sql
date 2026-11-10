alter table public.recipes
  add column if not exists timer_presets jsonb not null default '[]'::jsonb;
