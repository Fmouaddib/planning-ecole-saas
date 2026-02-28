-- ============================================================
-- FIX COMPLET RLS : toutes tables + create_teacher_profile
-- A executer dans Supabase Dashboard > SQL Editor
-- PAS de fonctions auth.* (permission denied sur Supabase)
-- ============================================================

-- 1. Fonctions helper (public uniquement)
CREATE OR REPLACE FUNCTION public.get_caller_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT role::text FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.get_caller_center_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT center_id FROM public.profiles WHERE id = auth.uid() $$;

-- 2. Supprimer TOUTES les anciennes policies
DO $$ DECLARE pol RECORD;
BEGIN FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
END LOOP; END; $$;

-- 3. Policies PROFILES
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (center_id = public.get_caller_center_id());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','super_admin'));
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','super_admin'));
CREATE POLICY "sa_profiles" ON public.profiles FOR ALL USING (public.get_caller_role() = 'super_admin');

-- 4. Policies DIPLOMAS
CREATE POLICY "diplomas_select" ON public.diplomas FOR SELECT USING (center_id = public.get_caller_center_id());
CREATE POLICY "diplomas_insert" ON public.diplomas FOR INSERT WITH CHECK (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','staff'));
CREATE POLICY "diplomas_update" ON public.diplomas FOR UPDATE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','staff'));
CREATE POLICY "diplomas_delete" ON public.diplomas FOR DELETE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','super_admin'));

-- 5. Policies CLASSES
CREATE POLICY "classes_select" ON public.classes FOR SELECT USING (center_id = public.get_caller_center_id());
CREATE POLICY "classes_insert" ON public.classes FOR INSERT WITH CHECK (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','staff'));
CREATE POLICY "classes_update" ON public.classes FOR UPDATE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','staff'));
CREATE POLICY "classes_delete" ON public.classes FOR DELETE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','super_admin'));

-- 6. Policies SUBJECTS
CREATE POLICY "subjects_select" ON public.subjects FOR SELECT USING (center_id = public.get_caller_center_id());
CREATE POLICY "subjects_insert" ON public.subjects FOR INSERT WITH CHECK (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','staff'));
CREATE POLICY "subjects_update" ON public.subjects FOR UPDATE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','staff'));
CREATE POLICY "subjects_delete" ON public.subjects FOR DELETE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','super_admin'));

-- 7. Policies CLASS_SUBJECTS
CREATE POLICY "cs_select" ON public.class_subjects FOR SELECT USING (class_id IN (SELECT id FROM public.classes WHERE center_id = public.get_caller_center_id()));
CREATE POLICY "cs_insert" ON public.class_subjects FOR INSERT WITH CHECK (class_id IN (SELECT id FROM public.classes WHERE center_id = public.get_caller_center_id()) AND public.get_caller_role() IN ('admin','staff'));
CREATE POLICY "cs_delete" ON public.class_subjects FOR DELETE USING (class_id IN (SELECT id FROM public.classes WHERE center_id = public.get_caller_center_id()) AND public.get_caller_role() IN ('admin','staff'));

-- 8. Policies ROOMS
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (center_id = public.get_caller_center_id());
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT WITH CHECK (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','staff'));
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','staff'));
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','super_admin'));

-- 9. Policies TRAINING_SESSIONS
CREATE POLICY "sessions_select" ON public.training_sessions FOR SELECT USING (center_id = public.get_caller_center_id());
CREATE POLICY "sessions_insert" ON public.training_sessions FOR INSERT WITH CHECK (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','teacher','staff'));
CREATE POLICY "sessions_update" ON public.training_sessions FOR UPDATE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','teacher','staff'));
CREATE POLICY "sessions_delete" ON public.training_sessions FOR DELETE USING (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','super_admin'));

-- 10. Policies TRAINING_CENTERS
CREATE POLICY "centers_select" ON public.training_centers FOR SELECT USING (id = public.get_caller_center_id());
CREATE POLICY "centers_update" ON public.training_centers FOR UPDATE USING (id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','super_admin'));

-- 11. Policies PROGRAMS
CREATE POLICY "programs_select" ON public.programs FOR SELECT USING (center_id = public.get_caller_center_id());
CREATE POLICY "programs_insert" ON public.programs FOR INSERT WITH CHECK (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin','staff'));

-- 12. Policies SESSION_PARTICIPANTS
CREATE POLICY "participants_select" ON public.session_participants FOR SELECT USING (session_id IN (SELECT id FROM public.training_sessions WHERE center_id = public.get_caller_center_id()));
CREATE POLICY "participants_insert" ON public.session_participants FOR INSERT WITH CHECK (session_id IN (SELECT id FROM public.training_sessions WHERE center_id = public.get_caller_center_id()));

-- 13. Fonction create_teacher_profile (bypass GoTrue)
CREATE OR REPLACE FUNCTION public.create_teacher_profile(
  p_email text, p_full_name text, p_role text default 'teacher'
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $func$
DECLARE
  v_center_id uuid; v_caller_role text; v_new_id uuid; v_result json;
BEGIN
  SELECT center_id, role::text INTO v_center_id, v_caller_role
  FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'Permission refusee';
  END IF;
  IF v_center_id IS NULL THEN RAISE EXCEPTION 'Aucun centre rattache'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email deja utilise';
  END IF;
  v_new_id := gen_random_uuid();
  BEGIN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, is_sso_user)
    VALUES (v_new_id, '00000000-0000-0000-0000-000000000000', p_email,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      'authenticated', 'authenticated', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'role', p_role),
      now(), now(), '', '', false);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'INSERT auth.users: % [%]', SQLERRM, SQLSTATE;
  END;
  UPDATE public.profiles SET full_name = p_full_name, role = p_role::user_role,
    center_id = v_center_id, is_active = true, updated_at = now()
  WHERE id = v_new_id;
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, full_name, role, center_id, is_active)
    VALUES (v_new_id, p_email, p_full_name, p_role::user_role, v_center_id, true);
  END IF;
  SELECT json_build_object('id', p.id, 'email', p.email, 'full_name', p.full_name,
    'role', p.role::text, 'center_id', p.center_id, 'is_active', p.is_active,
    'created_at', p.created_at, 'updated_at', p.updated_at)
  INTO v_result FROM public.profiles p WHERE p.id = v_new_id;
  RETURN v_result;
END; $func$;

NOTIFY pgrst, 'reload schema';
SELECT 'OK — Policies RLS + create_teacher_profile OK' AS resultat;
