-- ============================================================
-- TRIGGER handle_new_user : Création automatique du profil
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Fonction qui crée le profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_role text;
BEGIN
  -- Extraire full_name depuis user_metadata ou email
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Extraire le rôle depuis user_metadata, défaut = 'student'
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'student'
  );

  -- Valider que le rôle est valide
  IF v_role NOT IN ('admin', 'teacher', 'student', 'staff', 'trainer', 'coordinator') THEN
    v_role := 'student';
  END IF;

  -- Créer le profil
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_role::user_role,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Éviter les erreurs si le profil existe déjà

  RETURN NEW;
END;
$$;

-- 2. Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Créer le trigger sur auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Vérification : afficher le trigger créé
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass
  AND tgname = 'on_auth_user_created';
