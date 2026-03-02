-- ============================================================
-- FIX : Remplacement de auth.get_my_role() par public.get_caller_role()
-- dans TOUTES les policies super-admin bypass
-- ============================================================
-- Problème : auth.get_my_role() n'a jamais pu être créée car le
-- schema "auth" est read-only sur Supabase hosted.
-- La fonction qui EXISTE est public.get_caller_role().
-- Conséquence : tous les INSERT/UPDATE/DELETE super-admin échouent
-- silencieusement (RLS refuse, 0 rows affected).
-- ============================================================

-- 0. S'assurer que la fonction public.get_caller_role() existe
CREATE OR REPLACE FUNCTION public.get_caller_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT role::text FROM public.profiles WHERE id = auth.uid() $$;

-- 1. Ajouter les colonnes manquantes sur training_centers (si absentes)
ALTER TABLE public.training_centers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.training_centers ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE public.training_centers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.training_centers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE public.training_centers ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.training_centers ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 2. DROP + RECREATE de chaque policy avec la bonne fonction
-- (DROP IF EXISTS pour être idempotent)

-- profiles
DROP POLICY IF EXISTS "sa_bypass_profiles" ON public.profiles;
CREATE POLICY "sa_bypass_profiles"
    ON public.profiles FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- training_centers
DROP POLICY IF EXISTS "sa_bypass_training_centers" ON public.training_centers;
CREATE POLICY "sa_bypass_training_centers"
    ON public.training_centers FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- rooms
DROP POLICY IF EXISTS "sa_bypass_rooms" ON public.rooms;
CREATE POLICY "sa_bypass_rooms"
    ON public.rooms FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- training_sessions
DROP POLICY IF EXISTS "sa_bypass_training_sessions" ON public.training_sessions;
CREATE POLICY "sa_bypass_training_sessions"
    ON public.training_sessions FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- classes
DROP POLICY IF EXISTS "sa_bypass_classes" ON public.classes;
CREATE POLICY "sa_bypass_classes"
    ON public.classes FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- subjects
DROP POLICY IF EXISTS "sa_bypass_subjects" ON public.subjects;
CREATE POLICY "sa_bypass_subjects"
    ON public.subjects FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- diplomas
DROP POLICY IF EXISTS "sa_bypass_diplomas" ON public.diplomas;
CREATE POLICY "sa_bypass_diplomas"
    ON public.diplomas FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- programs
DROP POLICY IF EXISTS "sa_bypass_programs" ON public.programs;
CREATE POLICY "sa_bypass_programs"
    ON public.programs FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- session_participants
DROP POLICY IF EXISTS "sa_bypass_session_participants" ON public.session_participants;
CREATE POLICY "sa_bypass_session_participants"
    ON public.session_participants FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- class_students (peut ne pas exister)
DO $$ BEGIN
  DROP POLICY IF EXISTS "sa_bypass_class_students" ON public.class_students;
  CREATE POLICY "sa_bypass_class_students"
      ON public.class_students FOR ALL
      USING (public.get_caller_role() = 'super_admin')
      WITH CHECK (public.get_caller_role() = 'super_admin');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- class_subjects
DROP POLICY IF EXISTS "sa_bypass_class_subjects" ON public.class_subjects;
CREATE POLICY "sa_bypass_class_subjects"
    ON public.class_subjects FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- teacher_subjects
DO $$ BEGIN
  DROP POLICY IF EXISTS "sa_bypass_teacher_subjects" ON public.teacher_subjects;
  CREATE POLICY "sa_bypass_teacher_subjects"
      ON public.teacher_subjects FOR ALL
      USING (public.get_caller_role() = 'super_admin')
      WITH CHECK (public.get_caller_role() = 'super_admin');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- subscription_plans
DROP POLICY IF EXISTS "sa_bypass_subscription_plans" ON public.subscription_plans;
CREATE POLICY "sa_bypass_subscription_plans"
    ON public.subscription_plans FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- center_subscriptions
DROP POLICY IF EXISTS "sa_bypass_center_subscriptions" ON public.center_subscriptions;
CREATE POLICY "sa_bypass_center_subscriptions"
    ON public.center_subscriptions FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- audit_log
DROP POLICY IF EXISTS "sa_bypass_audit_log" ON public.audit_log;
CREATE POLICY "sa_bypass_audit_log"
    ON public.audit_log FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- billing_events
DO $$ BEGIN
  DROP POLICY IF EXISTS "sa_bypass_billing_events" ON public.billing_events;
  CREATE POLICY "sa_bypass_billing_events"
      ON public.billing_events FOR ALL
      USING (public.get_caller_role() = 'super_admin')
      WITH CHECK (public.get_caller_role() = 'super_admin');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- email_templates
DO $$ BEGIN
  DROP POLICY IF EXISTS "sa_bypass_email_templates" ON public.email_templates;
  CREATE POLICY "sa_bypass_email_templates"
      ON public.email_templates FOR ALL
      USING (public.get_caller_role() = 'super_admin')
      WITH CHECK (public.get_caller_role() = 'super_admin');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- email_logs
DO $$ BEGIN
  DROP POLICY IF EXISTS "sa_bypass_email_logs" ON public.email_logs;
  CREATE POLICY "sa_bypass_email_logs"
      ON public.email_logs FOR ALL
      USING (public.get_caller_role() = 'super_admin')
      WITH CHECK (public.get_caller_role() = 'super_admin');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- VÉRIFICATION : tester que le super-admin peut insérer
-- ============================================================
-- SELECT public.get_caller_role();  -- doit retourner 'super_admin'
-- INSERT INTO training_centers (name) VALUES ('__TEST__') RETURNING id;
-- DELETE FROM training_centers WHERE name = '__TEST__';
