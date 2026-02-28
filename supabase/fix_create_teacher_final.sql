-- ============================================================
-- Version FINALE : creation professeur via insert auth.users
-- Contourne la validation email de GoTrue
-- Le trigger handle_new_user cree le profil automatiquement
-- Puis on UPDATE le profil avec center_id et role
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_teacher_profile(
  p_email text,
  p_full_name text,
  p_role text default 'teacher'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_center_id uuid;
  v_caller_role text;
  v_new_id uuid;
  v_result json;
BEGIN
  -- Verifier les permissions de l'appelant
  SELECT center_id, role::text INTO v_center_id, v_caller_role
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission refusee';
  END IF;
  IF v_center_id IS NULL THEN
    RAISE EXCEPTION 'Aucun centre rattache';
  END IF;

  -- Verifier doublon email
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Un compte avec cet email existe deja';
  END IF;

  v_new_id := gen_random_uuid();

  -- Inserer directement dans auth.users (bypass GoTrue)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    aud,
    role,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    v_new_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    'authenticated',
    'authenticated',
    now(),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(),
    now(),
    '',
    ''
  );

  -- Attendre que le trigger handle_new_user cree le profil
  -- Puis mettre a jour avec les bonnes valeurs
  UPDATE public.profiles SET
    full_name = p_full_name,
    role = p_role::user_role,
    center_id = v_center_id,
    is_active = true,
    updated_at = now()
  WHERE id = v_new_id;

  -- Si le trigger n'a pas cree le profil, le creer
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, full_name, role, center_id, is_active)
    VALUES (v_new_id, p_email, p_full_name, p_role::user_role, v_center_id, true);
  END IF;

  -- Retourner le resultat
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
SELECT 'OK — create_teacher_profile mis a jour (insert auth.users direct)' AS resultat;
