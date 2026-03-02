-- Migration : Offre "École en ligne" + colonne meeting_url
-- Date : 2026-03-03

-- 1. Ajouter la colonne meeting_url sur training_sessions
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS meeting_url TEXT;

-- 2. Insérer le plan "École en ligne"
INSERT INTO subscription_plans (name, slug, description, max_users, max_rooms, max_sessions, max_programs, max_students, price_monthly, price_yearly, features, sort_order, is_active)
VALUES (
  'École en ligne',
  'ecole-en-ligne',
  'Plan pour les écoles 100% en ligne avec intégration Teams & Zoom et gestion des étudiants',
  15,
  999999,
  999999,
  999999,
  200,
  59,
  47,
  '["15 professeurs", "200 étudiants", "Intégration Teams & Zoom", "Salles illimitées", "Séances illimitées", "Support prioritaire"]',
  3,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Mettre à jour les sort_order des plans existants
UPDATE subscription_plans SET sort_order = 1 WHERE slug = 'free';
UPDATE subscription_plans SET sort_order = 2 WHERE slug = 'pro';
UPDATE subscription_plans SET sort_order = 4 WHERE slug = 'enterprise';

-- 4. Mettre à jour le plan Pro : 99€/mois, 50 profs
UPDATE subscription_plans
SET price_monthly = 99,
    price_yearly = 79,
    max_users = 50,
    features = '["50 professeurs", "Salles illimitées", "Séances illimitées", "Détection de conflits", "Intégration Teams & Zoom", "Support prioritaire"]'
WHERE slug = 'pro';
