-- ============================================================
-- Ajout des colonnes manquantes sur training_centers
-- postal_code et city (utilisées par le formulaire de création)
-- ============================================================

ALTER TABLE public.training_centers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
ALTER TABLE public.training_centers ADD COLUMN IF NOT EXISTS city VARCHAR(255);

-- Vérification
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'training_centers' ORDER BY ordinal_position;
