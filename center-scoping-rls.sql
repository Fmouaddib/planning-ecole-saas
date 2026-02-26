-- ============================================================
-- RLS complémentaire pour le scoping par center_id
-- À exécuter APRÈS cleanup-and-create.sql et super-admin-migration.sql
--
-- Ce script complète les policies existantes pour :
--   1. Permettre à tous les users authentifiés d'écrire des audit logs
--   2. Permettre aux admins de centre de lire les audit logs
--   3. Ajouter super_admin bypass sur training_sessions et session_participants
--   4. Permettre aux admins de gérer les profils de leur centre
-- ============================================================

-- ==================== AUDIT_LOG : insertion par tous ====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert audit logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can insert audit logs" ON audit_log
      FOR INSERT TO authenticated
      WITH CHECK (true)';
  END IF;
END $$;

-- Les admins de centre peuvent lire les logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Center admins can view audit logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Center admins can view audit logs" ON audit_log
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = ''admin''
        )
      )';
  END IF;
END $$;

-- ==================== PROFILES : admin peut gérer les profils de son centre ====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can create profiles in their center'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can create profiles in their center" ON profiles
      FOR INSERT
      WITH CHECK (
        center_id = (SELECT center_id FROM profiles WHERE id = auth.uid())
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = ''admin''
      )';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update profiles in their center'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update profiles in their center" ON profiles
      FOR UPDATE USING (
        center_id = (SELECT center_id FROM profiles WHERE id = auth.uid())
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = ''admin''
      )';
  END IF;
END $$;

-- ==================== SUPER ADMIN BYPASS sur tables supplémentaires ====================

-- Super admin sur session_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admin full access session_participants'
  ) THEN
    EXECUTE 'CREATE POLICY "Super admin full access session_participants" ON session_participants
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''super_admin'')
      )';
  END IF;
END $$;

-- Super admin sur subjects (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = 'Super admin full access subjects'
    ) THEN
      EXECUTE 'CREATE POLICY "Super admin full access subjects" ON subjects
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''super_admin'')
        )';
    END IF;
  END IF;
END $$;

-- Super admin sur diplomas (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diplomas') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = 'Super admin full access diplomas'
    ) THEN
      EXECUTE 'CREATE POLICY "Super admin full access diplomas" ON diplomas
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''super_admin'')
        )';
    END IF;
  END IF;
END $$;

SELECT 'RLS complémentaire appliquée avec succès!' AS message;
