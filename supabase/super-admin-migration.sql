-- ============================================================
-- MIGRATION SUPER ADMIN
-- Crée les tables manquantes, ajoute le rôle super_admin,
-- et configure les policies RLS de bypass.
--
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- ÉTAPE 1 : Ajouter 'super_admin' à l'enum user_role
-- ============================================================

-- Vérifier si la valeur existe déjà avant de l'ajouter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'super_admin'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- Ajouter aussi 'trainer' et 'coordinator' si manquants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'trainer'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'trainer';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'coordinator'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'coordinator';
  END IF;
END $$;

-- ============================================================
-- ÉTAPE 2 : Créer les tables manquantes
-- ============================================================

-- ── subscription_plans ──
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
    price_yearly NUMERIC(10, 2),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    max_users INTEGER NOT NULL DEFAULT 5,
    max_sessions INTEGER NOT NULL DEFAULT 50,
    max_rooms INTEGER NOT NULL DEFAULT 5,
    max_programs INTEGER NOT NULL DEFAULT 10,
    max_students INTEGER NOT NULL DEFAULT 0,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── center_subscriptions ──
CREATE TABLE IF NOT EXISTS public.center_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    center_id UUID NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')),
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly'
        CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(center_id, status) -- Un seul abonnement actif par centre
);

-- ── audit_log ──
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    center_id UUID REFERENCES public.training_centers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── billing_events ──
CREATE TABLE IF NOT EXISTS public.billing_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    center_id UUID NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    stripe_event_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── email_templates ──
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    center_id UUID NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── email_logs ──
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    center_id UUID REFERENCES public.training_centers(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    status VARCHAR(20) DEFAULT 'sent'
        CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÉTAPE 3 : Index utiles
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_center ON public.audit_log(center_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_center_subs_center ON public.center_subscriptions(center_id);
CREATE INDEX IF NOT EXISTS idx_center_subs_status ON public.center_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_center ON public.billing_events(center_id);
CREATE INDEX IF NOT EXISTS idx_billing_created ON public.billing_events(created_at DESC);

-- ============================================================
-- ÉTAPE 4 : Activer RLS sur les nouvelles tables
-- ============================================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ÉTAPE 5 : Policies de base pour les nouvelles tables
-- ============================================================

-- subscription_plans : lisibles par tous les authentifiés
CREATE POLICY "plans_select_authenticated"
    ON public.subscription_plans FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- center_subscriptions : visible par le centre
CREATE POLICY "subscriptions_select_own_center"
    ON public.center_subscriptions FOR SELECT
    USING (center_id = auth.get_my_center_id());

CREATE POLICY "subscriptions_update_center_admin"
    ON public.center_subscriptions FOR UPDATE
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- audit_log : admins de centre peuvent lire
CREATE POLICY "audit_select_center_admin"
    ON public.audit_log FOR SELECT
    USING (auth.get_my_role() = 'admin');

-- audit_log : tout authentifié peut écrire
CREATE POLICY "audit_insert_authenticated"
    ON public.audit_log FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- billing_events : visible par admin du centre
CREATE POLICY "billing_select_center_admin"
    ON public.billing_events FOR SELECT
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- email_templates : visible par le centre
CREATE POLICY "email_templates_select_own_center"
    ON public.email_templates FOR SELECT
    USING (center_id = auth.get_my_center_id());

CREATE POLICY "email_templates_manage_admin"
    ON public.email_templates FOR ALL
    USING (
        center_id = auth.get_my_center_id()
        AND auth.get_my_role() = 'admin'
    );

-- email_logs : visible par admins/staff
CREATE POLICY "email_logs_select_staff"
    ON public.email_logs FOR SELECT
    USING (auth.get_my_role() IN ('admin', 'staff'));

CREATE POLICY "email_logs_insert_authenticated"
    ON public.email_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- ÉTAPE 6 : SUPER ADMIN — Bypass RLS sur TOUTES les tables
-- ============================================================
-- Le super_admin voit et peut modifier toutes les données
-- indépendamment du center_id.

-- profiles
CREATE POLICY "sa_bypass_profiles"
    ON public.profiles FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- training_centers
CREATE POLICY "sa_bypass_training_centers"
    ON public.training_centers FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- rooms
CREATE POLICY "sa_bypass_rooms"
    ON public.rooms FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- training_sessions
CREATE POLICY "sa_bypass_training_sessions"
    ON public.training_sessions FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- classes
CREATE POLICY "sa_bypass_classes"
    ON public.classes FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- subjects
CREATE POLICY "sa_bypass_subjects"
    ON public.subjects FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- diplomas
CREATE POLICY "sa_bypass_diplomas"
    ON public.diplomas FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- programs
CREATE POLICY "sa_bypass_programs"
    ON public.programs FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- session_participants
CREATE POLICY "sa_bypass_session_participants"
    ON public.session_participants FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- class_students
CREATE POLICY "sa_bypass_class_students"
    ON public.class_students FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- class_subjects
CREATE POLICY "sa_bypass_class_subjects"
    ON public.class_subjects FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- subscription_plans (super admin peut aussi modifier)
CREATE POLICY "sa_bypass_subscription_plans"
    ON public.subscription_plans FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- center_subscriptions
CREATE POLICY "sa_bypass_center_subscriptions"
    ON public.center_subscriptions FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- audit_log
CREATE POLICY "sa_bypass_audit_log"
    ON public.audit_log FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- billing_events
CREATE POLICY "sa_bypass_billing_events"
    ON public.billing_events FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- email_templates
CREATE POLICY "sa_bypass_email_templates"
    ON public.email_templates FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- email_logs
CREATE POLICY "sa_bypass_email_logs"
    ON public.email_logs FOR ALL
    USING (auth.get_my_role() = 'super_admin')
    WITH CHECK (auth.get_my_role() = 'super_admin');

-- ============================================================
-- ÉTAPE 7 : Données initiales — Plans d'abonnement
-- ============================================================

INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, max_users, max_sessions, max_rooms, max_programs, max_students, features, sort_order)
VALUES
    ('Free', 'free', 'Pour découvrir AntiPlanning', 0, 0, 3, 20, 2, 3, 0,
     '["Tableau de bord", "Gestion sessions", "Export CSV"]'::jsonb, 1),
    ('Pro', 'pro', 'Pour les centres en croissance', 99, 990, 15, 200, 10, 25, 0,
     '["Tout Free", "Intégration Zoom", "Emails automatiques", "Paiements Stripe", "Support prioritaire"]'::jsonb, 2),
    ('Enterprise', 'enterprise', 'Pour les grands centres', 149, 1490, -1, -1, -1, -1, 100,
     '["Tout Pro", "Utilisateurs illimités", "Sessions illimitées", "Comptes étudiants", "API access", "SSO", "Support dédié"]'::jsonb, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ÉTAPE 8 : Triggers updated_at pour les nouvelles tables
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_subscription_plans') THEN
    CREATE TRIGGER set_timestamp_subscription_plans
      BEFORE UPDATE ON public.subscription_plans
      FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_center_subscriptions') THEN
    CREATE TRIGGER set_timestamp_center_subscriptions
      BEFORE UPDATE ON public.center_subscriptions
      FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_email_templates') THEN
    CREATE TRIGGER set_timestamp_email_templates
      BEFORE UPDATE ON public.email_templates
      FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;

-- ============================================================
-- ÉTAPE 9 : Promouvoir votre utilisateur en super_admin
-- ============================================================
-- ⚠️ IMPORTANT : Remplacez l'email si nécessaire

UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'fahd.mouaddib@gmail.com';

-- ============================================================
-- VÉRIFICATION
-- ============================================================
-- Après exécution, vérifiez :
--   SELECT role FROM profiles WHERE email = 'fahd.mouaddib@gmail.com';
--   → Doit retourner 'super_admin'
--
--   SELECT * FROM subscription_plans;
--   → Doit retourner 3 plans (Free, Pro, Enterprise)
--
--   Puis dans l'app : se déconnecter / reconnecter
--   et accéder à l'Espace Super Admin.
-- ============================================================

SELECT 'Migration super admin terminée avec succès !' AS message;
