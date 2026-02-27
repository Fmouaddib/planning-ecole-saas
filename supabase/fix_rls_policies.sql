-- ============================================================
-- FIX : Résolution de la récursion infinie RLS sur "profiles"
-- ============================================================
-- PROBLÈME : les policies RLS font SELECT sur "profiles" pour
-- récupérer center_id → déclenche la policy de profiles →
-- re-fait SELECT → boucle infinie (erreur 42P17).
--
-- SOLUTION : fonctions SECURITY DEFINER qui contournent le RLS.
--
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- ÉTAPE 1 : Fonctions helper (SECURITY DEFINER = bypass RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION auth.get_my_center_id()
RETURNS UUID AS $$
  SELECT center_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ÉTAPE 2 : Supprimer TOUTES les policies existantes
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
-- ÉTAPE 3 : Activer RLS sur toutes les tables
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
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ÉTAPE 4 : Recréer les policies SANS récursion
-- ============================================================

-- ==================== PROFILES ====================

-- Lecture : voir les profils de son centre
CREATE POLICY "profiles_select_own_center"
    ON public.profiles FOR SELECT
    USING (center_id = auth.get_my_center_id());

-- Insertion : un utilisateur peut créer son propre profil (inscription)
CREATE POLICY "profiles_insert_self"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Modification : modifier son propre profil
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

-- Admins : modifier n'importe quel profil de leur centre
CREATE POLICY "profiles_update_admin"
    ON public.profiles FOR UPDATE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- Admins : supprimer des profils de leur centre
CREATE POLICY "profiles_delete_admin"
    ON public.profiles FOR DELETE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- ==================== TRAINING CENTERS ====================

CREATE POLICY "centers_select_own"
    ON public.training_centers FOR SELECT
    USING (id = auth.get_my_center_id());

CREATE POLICY "centers_update_admin"
    ON public.training_centers FOR UPDATE
    USING (
        id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- ==================== ROOMS ====================

CREATE POLICY "rooms_select_own_center"
    ON public.rooms FOR SELECT
    USING (center_id = auth.get_my_center_id());

CREATE POLICY "rooms_insert_staff"
    ON public.rooms FOR INSERT
    WITH CHECK (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "rooms_update_staff"
    ON public.rooms FOR UPDATE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "rooms_delete_admin"
    ON public.rooms FOR DELETE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- ==================== TRAINING SESSIONS ====================

CREATE POLICY "sessions_select_own_center"
    ON public.training_sessions FOR SELECT
    USING (center_id = auth.get_my_center_id());

CREATE POLICY "sessions_insert_own_center"
    ON public.training_sessions FOR INSERT
    WITH CHECK (
        center_id = auth.get_my_center_id()
    );

CREATE POLICY "sessions_update_own_or_admin"
    ON public.training_sessions FOR UPDATE
    USING (
        center_id = auth.get_my_center_id()
        AND (trainer_id = auth.uid() OR auth.get_my_role() IN ('admin', 'staff'))
    );

CREATE POLICY "sessions_delete_own_or_admin"
    ON public.training_sessions FOR DELETE
    USING (
        center_id = auth.get_my_center_id()
        AND (trainer_id = auth.uid() OR auth.get_my_role() = 'admin')
    );

-- ==================== CLASSES ====================

CREATE POLICY "classes_select_own_center"
    ON public.classes FOR SELECT
    USING (center_id = auth.get_my_center_id());

CREATE POLICY "classes_insert_staff"
    ON public.classes FOR INSERT
    WITH CHECK (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "classes_update_staff"
    ON public.classes FOR UPDATE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "classes_delete_admin"
    ON public.classes FOR DELETE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- ==================== SUBJECTS ====================

CREATE POLICY "subjects_select_own_center"
    ON public.subjects FOR SELECT
    USING (center_id = auth.get_my_center_id());

CREATE POLICY "subjects_insert_staff"
    ON public.subjects FOR INSERT
    WITH CHECK (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "subjects_update_staff"
    ON public.subjects FOR UPDATE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "subjects_delete_admin"
    ON public.subjects FOR DELETE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- ==================== DIPLOMAS ====================

CREATE POLICY "diplomas_select_own_center"
    ON public.diplomas FOR SELECT
    USING (center_id = auth.get_my_center_id());

CREATE POLICY "diplomas_insert_staff"
    ON public.diplomas FOR INSERT
    WITH CHECK (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "diplomas_update_staff"
    ON public.diplomas FOR UPDATE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "diplomas_delete_admin"
    ON public.diplomas FOR DELETE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- ==================== PROGRAMS ====================

CREATE POLICY "programs_select_own_center"
    ON public.programs FOR SELECT
    USING (center_id = auth.get_my_center_id());

CREATE POLICY "programs_insert_staff"
    ON public.programs FOR INSERT
    WITH CHECK (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "programs_update_staff"
    ON public.programs FOR UPDATE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "programs_delete_admin"
    ON public.programs FOR DELETE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- ==================== SESSION PARTICIPANTS ====================

CREATE POLICY "participants_select"
    ON public.session_participants FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM public.training_sessions
            WHERE center_id = auth.get_my_center_id()
        )
    );

CREATE POLICY "participants_insert"
    ON public.session_participants FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT id FROM public.training_sessions
            WHERE center_id = auth.get_my_center_id()
        )
    );

CREATE POLICY "participants_update"
    ON public.session_participants FOR UPDATE
    USING (
        session_id IN (
            SELECT id FROM public.training_sessions
            WHERE center_id = auth.get_my_center_id()
        )
        AND auth.get_my_role() IN ('admin', 'teacher', 'staff')
    );

CREATE POLICY "participants_delete"
    ON public.session_participants FOR DELETE
    USING (
        session_id IN (
            SELECT id FROM public.training_sessions
            WHERE center_id = auth.get_my_center_id()
        )
        AND auth.get_my_role() IN ('admin', 'staff')
    );

-- ==================== CLASS STUDENTS ====================

CREATE POLICY "class_students_select"
    ON public.class_students FOR SELECT
    USING (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = auth.get_my_center_id()
        )
    );

CREATE POLICY "class_students_insert"
    ON public.class_students FOR INSERT
    WITH CHECK (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = auth.get_my_center_id()
        )
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "class_students_update"
    ON public.class_students FOR UPDATE
    USING (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = auth.get_my_center_id()
        )
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "class_students_delete"
    ON public.class_students FOR DELETE
    USING (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = auth.get_my_center_id()
        )
        AND auth.get_my_role() IN ('admin', 'staff')
    );

-- ==================== CLASS SUBJECTS ====================

CREATE POLICY "class_subjects_select"
    ON public.class_subjects FOR SELECT
    USING (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = auth.get_my_center_id()
        )
    );

CREATE POLICY "class_subjects_insert"
    ON public.class_subjects FOR INSERT
    WITH CHECK (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = auth.get_my_center_id()
        )
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "class_subjects_update"
    ON public.class_subjects FOR UPDATE
    USING (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = auth.get_my_center_id()
        )
        AND auth.get_my_role() IN ('admin', 'staff')
    );

CREATE POLICY "class_subjects_delete"
    ON public.class_subjects FOR DELETE
    USING (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = auth.get_my_center_id()
        )
        AND auth.get_my_role() IN ('admin', 'staff')
    );

-- ==================== AUDIT LOG ====================

-- Admins peuvent voir les logs de leur centre
CREATE POLICY "audit_select_admin"
    ON public.audit_log FOR SELECT
    USING (auth.get_my_role() = 'admin');

-- Tout utilisateur authentifié peut créer un log
CREATE POLICY "audit_insert_any"
    ON public.audit_log FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ==================== BILLING / SUBSCRIPTIONS ====================

-- Subscription plans : visibles par tous les authentifiés
CREATE POLICY "plans_select_all"
    ON public.subscription_plans FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Center subscriptions : visible par le centre
CREATE POLICY "subscriptions_select_own"
    ON public.center_subscriptions FOR SELECT
    USING (center_id = auth.get_my_center_id());

CREATE POLICY "subscriptions_update_admin"
    ON public.center_subscriptions FOR UPDATE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- Billing events : visible par le centre (admin)
CREATE POLICY "billing_select_admin"
    ON public.billing_events FOR SELECT
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- ==================== EMAIL ====================

-- Email templates : visible par le centre
CREATE POLICY "email_templates_select"
    ON public.email_templates FOR SELECT
    USING (center_id = auth.get_my_center_id());

CREATE POLICY "email_templates_manage_admin"
    ON public.email_templates FOR INSERT
    WITH CHECK (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

CREATE POLICY "email_templates_update_admin"
    ON public.email_templates FOR UPDATE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- Email logs : visible par les admins/staff
CREATE POLICY "email_logs_select"
    ON public.email_logs FOR SELECT
    USING (auth.get_my_role() IN ('admin', 'staff'));

CREATE POLICY "email_logs_insert"
    ON public.email_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- Après exécution, testez avec un utilisateur authentifié :
--   SELECT * FROM rooms LIMIT 1;
--   SELECT * FROM training_sessions LIMIT 1;
--   SELECT * FROM profiles LIMIT 1;
-- Ces requêtes doivent retourner des données (ou un tableau vide),
-- mais PAS l'erreur "infinite recursion".
-- ============================================================
