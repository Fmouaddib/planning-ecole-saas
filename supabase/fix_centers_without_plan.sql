-- ============================================================
-- Assigner le plan gratuit a tous les centres sans abonnement
-- ============================================================

INSERT INTO center_subscriptions (center_id, plan_id, billing_cycle, status, current_period_start, current_period_end, cancel_at_period_end)
SELECT
  tc.id,
  sp.id,
  'monthly',
  'active',
  now(),
  now() + interval '100 years',
  false
FROM training_centers tc
CROSS JOIN subscription_plans sp
WHERE sp.slug = 'free'
  AND sp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM center_subscriptions cs WHERE cs.center_id = tc.id
  );

SELECT
  count(*) AS centres_mis_a_jour,
  'Plan gratuit assigne a tous les centres sans abonnement' AS resultat
FROM center_subscriptions cs
JOIN subscription_plans sp ON sp.id = cs.plan_id
WHERE sp.slug = 'free';
