-- Ajouter diploma_id sur la table subjects (relation matière → diplôme)
-- À exécuter dans le Supabase Dashboard (SQL Editor)

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS diploma_id UUID REFERENCES public.diplomas(id) ON DELETE SET NULL;
