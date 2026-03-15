-- ============================================================
-- RPC create_user_for_center : creation utilisateur pour un centre
-- Utilisable par super_admin (tout centre) ou admin (son propre centre)
-- Meme pattern que create_teacher_profile (auth.users INSERT direct)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_user_for_center(
  p_email text,
  p_full_name text,
  p_role text,
  p_center_id uuid,
  p_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
DECLARE
  v_caller_role text;
  v_caller_center uuid;
  v_new_id uuid;
  v_result json;
BEGIN
  -- 1. Verifier les permissions de l'appelant
  SELECT role::text, center_id INTO v_caller_role, v_caller_center
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifie';
  END IF;

  IF v_caller_role = 'admin' THEN
    -- Un admin ne peut creer que pour son propre centre
    IF v_caller_center IS NULL OR v_caller_center != p_center_id THEN
      RAISE EXCEPTION 'Permission refusee : vous ne pouvez creer des utilisateurs que pour votre propre centre';
    END IF;
  ELSIF v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission refusee (role="%")', v_caller_role;
  END IF;

  -- 2. Verifier que le centre existe
  IF NOT EXISTS (SELECT 1 FROM public.training_centers WHERE id = p_center_id) THEN
    RAISE EXCEPTION 'Centre inexistant (id=%)', p_center_id;
  END IF;

  -- 3. Verifier que le role demande est valide
  IF p_role NOT IN ('admin', 'trainer', 'coordinator', 'staff', 'student', 'teacher') THEN
    RAISE EXCEPTION 'Role invalide : "%"', p_role;
  END IF;

  -- 4. Verifier si l'email existe deja dans auth.users
  SELECT id INTO v_new_id FROM auth.users WHERE email = p_email;

  IF v_new_id IS NOT NULL THEN
    -- ========== CAS MULTI-CENTRE : l'utilisateur existe déjà ==========

    -- Vérifier qu'il n'est pas déjà dans ce centre (profil direct)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_new_id AND center_id = p_center_id) THEN
      RAISE EXCEPTION 'Cet utilisateur est deja membre de ce centre';
    END IF;

    -- Vérifier qu'il n'est pas déjà lié via user_centers
    IF EXISTS (SELECT 1 FROM public.user_centers WHERE user_id = v_new_id AND center_id = p_center_id AND is_active = true) THEN
      RAISE EXCEPTION 'Cet utilisateur est deja lie a ce centre';
    END IF;

    -- Réactiver ou créer l'entrée user_centers
    INSERT INTO public.user_centers (user_id, center_id, role, is_active, created_at, updated_at)
    VALUES (v_new_id, p_center_id, p_role::user_role, true, now(), now())
    ON CONFLICT (user_id, center_id)
    DO UPDATE SET role = p_role::user_role, is_active = true, updated_at = now();

    -- Retourner le résultat avec les infos du profil existant
    SELECT json_build_object(
      'id', p.id, 'email', p.email, 'full_name', p.full_name,
      'role', p_role, 'center_id', p_center_id,
      'phone', COALESCE(p_phone, p.phone), 'is_active', true,
      'created_at', p.created_at, 'updated_at', now(),
      'linked', true
    ) INTO v_result FROM public.profiles p WHERE p.id = v_new_id;

    RETURN v_result;
  END IF;

  -- ========== CAS NORMAL : nouvel utilisateur ==========
  v_new_id := gen_random_uuid();

  -- 5. Inserer dans auth.users
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

  -- 6. Mettre a jour le profil cree par le trigger handle_new_user
  UPDATE public.profiles SET
    full_name = p_full_name,
    role = p_role::user_role,
    center_id = p_center_id,
    phone = p_phone,
    is_active = true,
    updated_at = now()
  WHERE id = v_new_id;

  -- 7. Si le trigger n'a pas cree le profil, le creer manuellement
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, full_name, role, center_id, phone, is_active)
    VALUES (v_new_id, p_email, p_full_name, p_role::user_role, p_center_id, p_phone, true);
  END IF;

  -- 8. Retourner le resultat
  SELECT json_build_object(
    'id', p.id, 'email', p.email, 'full_name', p.full_name,
    'role', p.role::text, 'center_id', p.center_id,
    'phone', p.phone, 'is_active', p.is_active,
    'created_at', p.created_at, 'updated_at', p.updated_at,
    'linked', false
  ) INTO v_result FROM public.profiles p WHERE p.id = v_new_id;

  RETURN v_result;
END;
$func$;

NOTIFY pgrst, 'reload schema';
SELECT 'OK — create_user_for_center installe' AS resultat;
