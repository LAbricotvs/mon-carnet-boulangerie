-- Autoriser toutes les catégories proposées dans l'application
ALTER TABLE public.recipes
  DROP CONSTRAINT IF EXISTS recipes_category_check;

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_category_check
  CHECK (category IN ('Pain', 'Brioche', 'Pizza', 'Pâtisserie', 'Autre'));
