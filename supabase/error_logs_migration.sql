-- Migration: error_logs table for lightweight error monitoring
-- Date: 2026-03-14

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  stack text,
  url text,
  user_agent text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  center_id uuid,
  context jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for querying recent errors
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_center_id ON error_logs (center_id) WHERE center_id IS NOT NULL;

-- RLS: only super_admin can read
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_read_errors" ON error_logs
  FOR SELECT
  USING (public.get_caller_role() = 'super_admin');

-- Anyone can insert (errors happen before auth sometimes)
CREATE POLICY "anyone_insert_errors" ON error_logs
  FOR INSERT
  WITH CHECK (true);

-- Auto-cleanup: keep only last 30 days (optional cron)
-- SELECT cron.schedule('cleanup-error-logs', '0 3 * * 0', $$DELETE FROM error_logs WHERE created_at < now() - interval '30 days'$$);
