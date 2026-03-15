-- ============================================================
-- MIGRATION : Table user_centers + RPC get_center_linked_users
-- Support multi-centre : un utilisateur peut être lié à
-- plusieurs centres via cette table junction.
--
-- Son profil principal reste dans profiles (avec center_id),
-- et les centres secondaires sont dans user_centers.
--
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- ==================== TABLE ====================

CREATE TABLE IF NOT EXISTS public.user_centers (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, center_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_user_centers_center_id ON public.user_centers(center_id);
CREATE INDEX IF NOT EXISTS idx_user_centers_user_id ON public.user_centers(user_id);

-- ==================== RLS ====================

ALTER TABLE public.user_centers ENABLE ROW LEVEL SECURITY;

-- Lecture : l'utilisateur peut voir ses propres liens
DROP POLICY IF EXISTS "uc_select_own" ON public.user_centers;
CREATE POLICY "uc_select_own" ON public.user_centers
  FOR SELECT USING (user_id = auth.uid());

-- Lecture : les admins voient les liens de leur centre
DROP POLICY IF EXISTS "uc_select_admin" ON public.user_centers;
CREATE POLICY "uc_select_admin" ON public.user_centers
  FOR SELECT USING (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() IN ('admin', 'super_admin')
  );

-- Super admin : accès total
DROP POLICY IF EXISTS "uc_all_sa" ON public.user_centers;
CREATE POLICY "uc_all_sa" ON public.user_centers
  FOR ALL USING (public.get_caller_role() = 'super_admin');

-- Insert/Update/Delete pour les admins de ce centre
DROP POLICY IF EXISTS "uc_insert_admin" ON public.user_centers;
CREATE POLICY "uc_insert_admin" ON public.user_centers
  FOR INSERT WITH CHECK (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "uc_update_admin" ON public.user_centers;
CREATE POLICY "uc_update_admin" ON public.user_centers
  FOR UPDATE USING (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "uc_delete_admin" ON public.user_centers;
CREATE POLICY "uc_delete_admin" ON public.user_centers
  FOR DELETE USING (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() IN ('admin', 'super_admin')
  );

-- ==================== RPC : get_center_linked_users ====================
-- Retourne les profils des utilisateurs liés à un centre via user_centers
-- (exclut ceux qui ont déjà leur profil principal dans ce centre)
-- SECURITY DEFINER pour bypasser le RLS sur profiles (lecture cross-centre)

CREATE OR REPLACE FUNCTION public.get_center_linked_users(p_center_id UUID)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  full_name TEXT,
  role TEXT,
  center_id UUID,
  phone TEXT,
  linkedin TEXT,
  avatar_url TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin/super_admin pour ce centre
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text IN ('admin', 'super_admin')
    AND (profiles.center_id = p_center_id OR profiles.role::text = 'super_admin')
  ) THEN
    -- Non-admin : retourner un ensemble vide (pas d'erreur)
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      p.email,
      p.full_name,
      uc.role::text AS role,        -- Utiliser le rôle du user_centers, pas celui du profil
      p_center_id AS center_id,     -- Présenter comme appartenant à ce centre
      p.phone,
      p.linkedin,
      p.avatar_url,
      uc.is_active,
      uc.created_at,
      uc.updated_at
    FROM public.user_centers uc
    JOIN public.profiles p ON p.id = uc.user_id
    WHERE uc.center_id = p_center_id
    AND uc.is_active = true
    AND NOT EXISTS (
      -- Exclure ceux qui ont déjà un profil direct dans ce centre
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = uc.user_id
      AND p2.center_id = p_center_id
    );
END;
$$;

-- ==================== Vérification ====================
SELECT 'OK — user_centers + get_center_linked_users installés' AS resultat;
