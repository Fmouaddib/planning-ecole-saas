-- ============================================================
-- Migration : Table virtual_rooms pour les centres "École en ligne"
-- Salles virtuelles persistantes (liens Teams/Zoom réutilisables)
-- ============================================================

-- Table principale
CREATE TABLE IF NOT EXISTS virtual_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES training_centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'teams',  -- 'teams' | 'zoom' | 'other'
  meeting_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index sur center_id pour les requêtes filtrées
CREATE INDEX IF NOT EXISTS idx_virtual_rooms_center_id ON virtual_rooms(center_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_virtual_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_virtual_rooms_updated_at ON virtual_rooms;
CREATE TRIGGER trg_virtual_rooms_updated_at
  BEFORE UPDATE ON virtual_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_virtual_rooms_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE virtual_rooms ENABLE ROW LEVEL SECURITY;

-- SELECT : même centre ou super_admin
CREATE POLICY "virtual_rooms_select" ON virtual_rooms
  FOR SELECT USING (
    center_id = public.get_caller_center_id()
    OR public.get_caller_role() = 'super_admin'
  );

-- INSERT : même centre ou super_admin
CREATE POLICY "virtual_rooms_insert" ON virtual_rooms
  FOR INSERT WITH CHECK (
    center_id = public.get_caller_center_id()
    OR public.get_caller_role() = 'super_admin'
  );

-- UPDATE : même centre ou super_admin
CREATE POLICY "virtual_rooms_update" ON virtual_rooms
  FOR UPDATE USING (
    center_id = public.get_caller_center_id()
    OR public.get_caller_role() = 'super_admin'
  );

-- DELETE : même centre ou super_admin
CREATE POLICY "virtual_rooms_delete" ON virtual_rooms
  FOR DELETE USING (
    center_id = public.get_caller_center_id()
    OR public.get_caller_role() = 'super_admin'
  );
