-- ============================================================
-- FIX COMPLET : fonctions helper + policies RLS toutes tables
-- + fonction create_teacher_profile
-- A executer dans Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- ETAPE 1 : Creer les fonctions helper dans TOUS les schemas
-- ============================================================

-- Version public.* (toujours accessible)
CREATE OR REPLACE FUNCTION public.get_caller_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_caller_center_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT center_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Version auth.* (alias vers public.*)
CREATE OR REPLACE FUNCTION auth.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.get_caller_role()
$$;

CREATE OR REPLACE FUNCTION auth.get_my_center_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.get_caller_center_id()
$$;

-- ============================================================
-- ETAPE 2 : Supprimer TOUTES les policies existantes
-- ============================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END;
$$;

-- ============================================================
-- ETAPE 3 : Activer RLS sur toutes les tables
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diplomas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

-- Tables optionnelles (ignorer si elles n'existent pas)
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.center_subscriptions ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- ETAPE 4 : Recreer TOUTES les policies
-- Utilise public.get_caller_role() et public.get_caller_center_id()
-- ============================================================

-- ==================== PROFILES ====================

CREATE POLICY "profiles_select_own_center"
    ON public.profiles FOR SELECT
    USING (center_id = public.get_caller_center_id());

CREATE POLICY "profiles_insert_self"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "profiles_update_admin"
    ON public.profiles FOR UPDATE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "profiles_delete_admin"
    ON public.profiles FOR DELETE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'super_admin')
    );

-- Super admin bypass
CREATE POLICY "sa_bypass_profiles"
    ON public.profiles FOR ALL
    USING (public.get_caller_role() = 'super_admin');

-- ==================== TRAINING CENTERS ====================

CREATE POLICY "centers_select_own"
    ON public.training_centers FOR SELECT
    USING (id = public.get_caller_center_id());

CREATE POLICY "centers_update_admin"
    ON public.training_centers FOR UPDATE
    USING (
        id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "sa_bypass_centers"
    ON public.training_centers FOR ALL
    USING (public.get_caller_role() = 'super_admin');

-- ==================== ROOMS ====================

CREATE POLICY "rooms_select_own_center"
    ON public.rooms FOR SELECT
    USING (center_id = public.get_caller_center_id());

CREATE POLICY "rooms_insert_staff"
    ON public.rooms FOR INSERT
    WITH CHECK (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "rooms_update_staff"
    ON public.rooms FOR UPDATE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "rooms_delete_admin"
    ON public.rooms FOR DELETE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "sa_bypass_rooms"
    ON public.rooms FOR ALL
    USING (public.get_caller_role() = 'super_admin');

-- ==================== TRAINING SESSIONS ====================

CREATE POLICY "sessions_select_own_center"
    ON public.training_sessions FOR SELECT
    USING (center_id = public.get_caller_center_id());

CREATE POLICY "sessions_insert_staff"
    ON public.training_sessions FOR INSERT
    WITH CHECK (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'teacher', 'staff')
    );

CREATE POLICY "sessions_update_staff"
    ON public.training_sessions FOR UPDATE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'teacher', 'staff')
    );

CREATE POLICY "sessions_delete_admin"
    ON public.training_sessions FOR DELETE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "sa_bypass_sessions"
    ON public.training_sessions FOR ALL
    USING (public.get_caller_role() = 'super_admin');

-- ==================== DIPLOMAS ====================

CREATE POLICY "diplomas_select_own_center"
    ON public.diplomas FOR SELECT
    USING (center_id = public.get_caller_center_id());

CREATE POLICY "diplomas_insert_staff"
    ON public.diplomas FOR INSERT
    WITH CHECK (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "diplomas_update_staff"
    ON public.diplomas FOR UPDATE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "diplomas_delete_admin"
    ON public.diplomas FOR DELETE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "sa_bypass_diplomas"
    ON public.diplomas FOR ALL
    USING (public.get_caller_role() = 'super_admin');

-- ==================== CLASSES ====================

CREATE POLICY "classes_select_own_center"
    ON public.classes FOR SELECT
    USING (center_id = public.get_caller_center_id());

CREATE POLICY "classes_insert_staff"
    ON public.classes FOR INSERT
    WITH CHECK (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "classes_update_staff"
    ON public.classes FOR UPDATE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "classes_delete_admin"
    ON public.classes FOR DELETE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "sa_bypass_classes"
    ON public.classes FOR ALL
    USING (public.get_caller_role() = 'super_admin');

-- ==================== SUBJECTS ====================

CREATE POLICY "subjects_select_own_center"
    ON public.subjects FOR SELECT
    USING (center_id = public.get_caller_center_id());

CREATE POLICY "subjects_insert_staff"
    ON public.subjects FOR INSERT
    WITH CHECK (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "subjects_update_staff"
    ON public.subjects FOR UPDATE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "subjects_delete_admin"
    ON public.subjects FOR DELETE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "sa_bypass_subjects"
    ON public.subjects FOR ALL
    USING (public.get_caller_role() = 'super_admin');

-- ==================== CLASS_SUBJECTS ====================

CREATE POLICY "class_subjects_select"
    ON public.class_subjects FOR SELECT
    USING (
        class_id IN (SELECT id FROM public.classes WHERE center_id = public.get_caller_center_id())
    );

CREATE POLICY "class_subjects_insert"
    ON public.class_subjects FOR INSERT
    WITH CHECK (
        class_id IN (SELECT id FROM public.classes WHERE center_id = public.get_caller_center_id())
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "class_subjects_update"
    ON public.class_subjects FOR UPDATE
    USING (
        class_id IN (SELECT id FROM public.classes WHERE center_id = public.get_caller_center_id())
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "class_subjects_delete"
    ON public.class_subjects FOR DELETE
    USING (
        class_id IN (SELECT id FROM public.classes WHERE center_id = public.get_caller_center_id())
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "sa_bypass_class_subjects"
    ON public.class_subjects FOR ALL
    USING (public.get_caller_role() = 'super_admin');

-- ==================== PROGRAMS ====================

CREATE POLICY "programs_select_own_center"
    ON public.programs FOR SELECT
    USING (center_id = public.get_caller_center_id());

CREATE POLICY "programs_insert_admin"
    ON public.programs FOR INSERT
    WITH CHECK (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "programs_update_admin"
    ON public.programs FOR UPDATE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "programs_delete_admin"
    ON public.programs FOR DELETE
    USING (
        center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'super_admin')
    );

CREATE POLICY "sa_bypass_programs"
    ON public.programs FOR ALL
    USING (public.get_caller_role() = 'super_admin');

-- ==================== SESSION PARTICIPANTS ====================

CREATE POLICY "participants_select_own_center"
    ON public.session_participants FOR SELECT
    USING (
        session_id IN (SELECT id FROM public.training_sessions WHERE center_id = public.get_caller_center_id())
    );

CREATE POLICY "participants_insert_staff"
    ON public.session_participants FOR INSERT
    WITH CHECK (
        session_id IN (SELECT id FROM public.training_sessions WHERE center_id = public.get_caller_center_id())
        AND public.get_caller_role() IN ('admin', 'teacher', 'staff')
    );

CREATE POLICY "participants_update_staff"
    ON public.session_participants FOR UPDATE
    USING (
        session_id IN (SELECT id FROM public.training_sessions WHERE center_id = public.get_caller_center_id())
        AND public.get_caller_role() IN ('admin', 'teacher', 'staff')
    );

CREATE POLICY "participants_delete_staff"
    ON public.session_participants FOR DELETE
    USING (
        session_id IN (SELECT id FROM public.training_sessions WHERE center_id = public.get_caller_center_id())
        AND public.get_caller_role() IN ('admin', 'teacher', 'staff')
    );

CREATE POLICY "sa_bypass_participants"
    ON public.session_participants FOR ALL
    USING (public.get_caller_role() = 'super_admin');

-- ============================================================
-- ETAPE 5 : Fonction create_teacher_profile (bypass GoTrue)
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
  -- 1. Verifier les permissions
  SELECT center_id, role::text INTO v_center_id, v_caller_role
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission refusee (role="%")', COALESCE(v_caller_role, 'NULL');
  END IF;
  IF v_center_id IS NULL THEN
    RAISE EXCEPTION 'Aucun centre rattache';
  END IF;

  -- 2. Doublon email
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Un compte avec cet email existe deja';
  END IF;

  v_new_id := gen_random_uuid();

  -- 3. Inserer dans auth.users
  BEGIN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      aud, role, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, is_sso_user
    ) VALUES (
      v_new_id,
      '00000000-0000-0000-0000-000000000000',
      p_email,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      'authenticated', 'authenticated', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'role', p_role),
      now(), now(), '', '', false
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'INSERT auth.users: % [%]', SQLERRM, SQLSTATE;
  END;

  -- 4. Mettre a jour le profil (cree par trigger handle_new_user)
  UPDATE public.profiles SET
    full_name = p_full_name,
    role = p_role::user_role,
    center_id = v_center_id,
    is_active = true,
    updated_at = now()
  WHERE id = v_new_id;

  -- 5. Si le trigger n'a pas cree le profil, le creer
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

-- ============================================================
-- ETAPE 6 : Refresh schema cache
-- ============================================================

NOTIFY pgrst, 'reload schema';

SELECT 'OK — Toutes les policies RLS reconstruites + create_teacher_profile v3' AS resultat;
