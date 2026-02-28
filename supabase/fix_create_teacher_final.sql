-- ============================================================
-- Version FINALE v3 : creation professeur via insert auth.users
-- Fix: extensions.crypt / extensions.gen_salt (pgcrypto dans schema extensions)
-- Ajoute raw_app_meta_data + is_sso_user (requis par Supabase recent)
-- Diagnostic detaille si l'INSERT auth.users echoue
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_teacher_profile(
  p_email text,
  p_full_name text,
  p_role text default 'teacher'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
DECLARE
  v_center_id uuid;
  v_caller_role text;
  v_new_id uuid;
  v_result json;
BEGIN
  -- 1. Verifier les permissions de l'appelant
  SELECT center_id, role::text INTO v_center_id, v_caller_role
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission refusee (role="%")', COALESCE(v_caller_role, 'NULL');
  END IF;
  IF v_center_id IS NULL THEN
    RAISE EXCEPTION 'Aucun centre rattache a votre profil';
  END IF;

  -- 2. Verifier doublon email
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Un compte avec cet email existe deja';
  END IF;

  v_new_id := gen_random_uuid();

  -- 3. Inserer dans auth.users avec TOUTES les colonnes requises
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      aud,
      role,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      is_sso_user
    ) VALUES (
      v_new_id,
      '00000000-0000-0000-0000-000000000000',
      p_email,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      'authenticated',
      'authenticated',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'role', p_role),
      now(),
      now(),
      '',
      '',
      false
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'INSERT auth.users echoue: % [SQLSTATE=%]', SQLERRM, SQLSTATE;
  END;

  -- 4. Mettre a jour le profil cree par le trigger handle_new_user
  UPDATE public.profiles SET
    full_name = p_full_name,
    role = p_role::user_role,
    center_id = v_center_id,
    is_active = true,
    updated_at = now()
  WHERE id = v_new_id;

  -- 5. Si le trigger n'a pas cree le profil, le creer manuellement
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, full_name, role, center_id, is_active)
    VALUES (v_new_id, p_email, p_full_name, p_role::user_role, v_center_id, true);
  END IF;

  -- 6. Retourner le resultat
  SELECT json_build_object(
    'id', p.id, 'email', p.email, 'full_name', p.full_name,
    'role', p.role::text, 'center_id', p.center_id,
    'is_active', p.is_active, 'created_at', p.created_at,
    'updated_at', p.updated_at
  ) INTO v_result FROM public.profiles p WHERE p.id = v_new_id;

  RETURN v_result;
END;
$func$;

NOTIFY pgrst, 'reload schema';
SELECT 'OK — create_teacher_profile v3 (extensions.crypt + raw_app_meta_data)' AS resultat;
