-- Migration : Ajout d'une deuxième ligne d'adresse pour les centres
-- Date : 2026-03-03

ALTER TABLE training_centers ADD COLUMN IF NOT EXISTS address_line_2 TEXT;
