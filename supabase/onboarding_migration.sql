-- ============================================================
-- ONBOARDING SELF-SERVICE : enrollment_code + acronym + RPCs
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Nouvelles colonnes sur training_centers
ALTER TABLE public.training_centers
ADD COLUMN IF NOT EXISTS enrollment_code VARCHAR(12) UNIQUE;

ALTER TABLE public.training_centers
ADD COLUMN IF NOT EXISTS acronym VARCHAR(20);

ALTER TABLE public.training_centers
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);

ALTER TABLE public.training_centers
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_tc_enrollment_code
ON public.training_centers(enrollment_code);

-- 2. Trigger auto-génération du code basé sur le nom (ou acronyme) de l'établissement
--    Si acronyme fourni : AC-SUFFIXE (ex: "ISP" → ISP-PARIS)
--    Sinon : initiales du nom + suffixe du dernier mot significatif
--    Ex: "Institut Supérieur de Paris" → IS-PARIS
--    Ex: "FormaPro Lyon" → FP-LYON
--    Collision : IS-PARIS → IS-PARI2 → IS-PARI3 ...
CREATE OR REPLACE FUNCTION generate_enrollment_code()
RETURNS TRIGGER AS $$
DECLARE
  v_words text[];
  v_significant text[];
  v_prefix text;
  v_suffix text;
  v_candidate text;
  v_clean_name text;
  v_counter int := 0;
  v_word text;
BEGIN
  IF NEW.enrollment_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.name IS NOT NULL AND trim(NEW.name) != '' THEN
    -- Nettoyer : majuscules + retirer accents
    v_clean_name := upper(NEW.name);
    v_clean_name := translate(v_clean_name,
      'ÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑ',
      'AAAAAAEEEEIIIIOOOOOOUUUUYYCN');
    -- Garder uniquement lettres et espaces
    v_clean_name := regexp_replace(v_clean_name, '[^A-Z ]', '', 'g');
    v_clean_name := regexp_replace(v_clean_name, '\s+', ' ', 'g');
    v_clean_name := trim(v_clean_name);

    -- Découper en mots
    v_words := string_to_array(v_clean_name, ' ');

    -- Filtrer les mots vides français
    v_significant := ARRAY[]::text[];
    FOREACH v_word IN ARRAY v_words LOOP
      IF v_word != '' AND v_word NOT IN (
        'DE','DU','DES','LA','LE','LES','ET','EN','AU','AUX',
        'A','L','D','UN','UNE','POUR','PAR','SUR','AVEC'
      ) THEN
        v_significant := v_significant || v_word;
      END IF;
    END LOOP;

    -- Fallback si aucun mot significatif
    IF array_length(v_significant, 1) IS NULL THEN
      v_significant := v_words;
    END IF;

    -- Préfixe : acronyme si fourni, sinon initiales des 2 premiers mots
    IF NEW.acronym IS NOT NULL AND trim(NEW.acronym) != '' THEN
      v_prefix := upper(regexp_replace(trim(NEW.acronym), '[^A-Za-z0-9]', '', 'g'));
      v_prefix := left(v_prefix, 4); -- max 4 chars pour le préfixe acronyme
    ELSIF array_length(v_significant, 1) >= 2 THEN
      v_prefix := left(v_significant[1], 1) || left(v_significant[2], 1);
    ELSIF array_length(v_significant, 1) = 1 THEN
      v_prefix := left(v_significant[1], 2);
    ELSE
      v_prefix := 'XX';
    END IF;

    -- Suffixe : dernier mot significatif, tronqué à 6 chars
    v_suffix := left(v_significant[array_length(v_significant, 1)], 6);

    -- Boucle anti-collision
    LOOP
      IF v_counter = 0 THEN
        v_candidate := v_prefix || '-' || v_suffix;
      ELSE
        v_candidate := v_prefix || '-' || left(v_suffix, 6 - length(v_counter::text)) || v_counter::text;
      END IF;

      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM training_centers WHERE enrollment_code = v_candidate
      );
      v_counter := v_counter + 1;

      -- Sécurité : après 99 tentatives, fallback aléatoire
      IF v_counter > 99 THEN
        v_candidate := v_prefix || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM training_centers WHERE enrollment_code = v_candidate
        );
      END IF;
    END LOOP;

    NEW.enrollment_code := v_candidate;
  ELSE
    -- Fallback aléatoire si pas de nom
    LOOP
      NEW.enrollment_code := chr(65 + floor(random() * 26)::int)
                          || chr(65 + floor(random() * 26)::int)
                          || '-'
                          || upper(substr(md5(gen_random_uuid()::text), 1, 6));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM training_centers WHERE enrollment_code = NEW.enrollment_code
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_enrollment_code ON training_centers;
CREATE TRIGGER trg_generate_enrollment_code
  BEFORE INSERT ON training_centers
  FOR EACH ROW EXECUTE FUNCTION generate_enrollment_code();

-- 3. Backfill centres existants (aléatoire pour les anciens)
UPDATE training_centers
SET enrollment_code = chr(65 + floor(random() * 26)::int)
                   || chr(65 + floor(random() * 26)::int)
                   || '-'
                   || upper(substr(md5(id::text), 1, 6))
WHERE enrollment_code IS NULL;

-- 4. RPC create_center_with_admin (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_center_with_admin(
  p_center_name text,
  p_acronym text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $func$
DECLARE
  v_user_id uuid;
  v_center_id uuid;
  v_enrollment_code text;
  v_free_plan_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Créer le centre (enrollment_code auto-généré par trigger basé sur le nom/acronyme)
  INSERT INTO training_centers (name, acronym, address, postal_code, city, phone, email, owner_id, is_active)
  VALUES (p_center_name, p_acronym, p_address, p_postal_code, p_city, p_phone, p_email, v_user_id, true)
  RETURNING id, enrollment_code INTO v_center_id, v_enrollment_code;

  -- Promouvoir l'utilisateur en admin du centre
  UPDATE profiles
  SET center_id = v_center_id, role = 'admin'::user_role, updated_at = now()
  WHERE id = v_user_id;

  -- Assigner le plan Free si disponible
  SELECT id INTO v_free_plan_id FROM subscription_plans WHERE slug = 'free' LIMIT 1;
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO center_subscriptions (center_id, plan_id, status, billing_cycle,
      current_period_start, current_period_end, cancel_at_period_end)
    VALUES (v_center_id, v_free_plan_id, 'active', 'monthly',
      now(), now() + interval '100 years', false);
  END IF;

  RETURN json_build_object(
    'center_id', v_center_id,
    'enrollment_code', v_enrollment_code,
    'center_name', p_center_name
  );
END;
$func$;

-- 5. RPC join_center_by_code (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.join_center_by_code(
  p_enrollment_code text,
  p_role text DEFAULT 'student'
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  v_user_id uuid;
  v_center_id uuid;
  v_center_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT id, name INTO v_center_id, v_center_name
  FROM training_centers
  WHERE enrollment_code = upper(trim(p_enrollment_code))
    AND is_active = true;

  IF v_center_id IS NULL THEN
    RAISE EXCEPTION 'Code établissement invalide';
  END IF;

  UPDATE profiles
  SET center_id = v_center_id, role = p_role::user_role, updated_at = now()
  WHERE id = v_user_id;

  RETURN json_build_object(
    'center_id', v_center_id,
    'center_name', v_center_name
  );
END;
$func$;
