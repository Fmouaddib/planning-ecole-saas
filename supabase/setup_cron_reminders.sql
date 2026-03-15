-- ============================================================================
-- pg_cron jobs for automated session reminders
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
--
-- Prerequisites:
--   1. Edge Function `process-reminders` deployed with verify_jwt: false
--   2. Column `reminder_sent_at` exists on `training_sessions`
--   3. Extensions `pg_cron` and `pg_net` enabled
-- ============================================================================

-- ── Ensure required extensions ───────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── Add reminder_sent_at column if missing ───────────────────────────────────

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz DEFAULT NULL;

-- ── Remove old jobs if they exist (idempotent) ───────────────────────────────

SELECT cron.unschedule('daily-session-reminders');
SELECT cron.unschedule('hourly-session-reminders');

-- ── Daily reminder at 18:00 UTC (20:00 Paris time) ──────────────────────────
-- Sends reminders for sessions happening in the next 24 hours.
-- Uses verify_jwt: false so no Authorization header is needed,
-- since current_setting('supabase.service_role_key') returns NULL in pg_cron.

SELECT cron.schedule(
  'daily-session-reminders',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rfmaombcwjxeiwanchdh.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"type": "daily"}'::jsonb
  );
  $$
);

-- ── Hourly catch-up reminder (every 4 hours) ────────────────────────────────
-- Safety net: catches sessions that might have been created after the daily run.
-- The Edge Function is idempotent (skips already-reminded sessions).

SELECT cron.schedule(
  'hourly-session-reminders',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rfmaombcwjxeiwanchdh.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"type": "catchup"}'::jsonb
  );
  $$
);

-- ── Verify jobs are scheduled ────────────────────────────────────────────────

SELECT jobid, schedule, command, jobname
FROM cron.job
WHERE jobname IN ('daily-session-reminders', 'hourly-session-reminders');
