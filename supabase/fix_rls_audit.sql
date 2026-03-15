-- =============================================================================
-- RLS AUDIT FIX MIGRATION
-- Generated: 2026-03-14
-- Project: rfmaombcwjxeiwanchdh (Planning Ecole SaaS)
-- =============================================================================
--
-- AUDIT SUMMARY:
--
-- All 58 public tables have RLS ENABLED. No table is missing RLS.
-- All tables have at least one policy covering SELECT/INSERT/UPDATE/DELETE
-- (either via individual policies or via an ALL policy).
-- All tables have super_admin access (either via sa_bypass_* ALL policy or
-- inline super_admin checks in individual policies).
--
-- FINDINGS (issues to fix):
--
-- [CRITICAL] F1: grades SELECT - students can see ALL grades in their center
--   Current: center_id = get_caller_center_id() (no student_id filter)
--   Fix: Students should only see their own grades (student_id = auth.uid())
--
-- [CRITICAL] F2: evaluations SELECT - students can see unpublished evaluations
--   Current: center_id = get_caller_center_id() (no is_published filter)
--   Fix: Students should only see published evaluations
--
-- [HIGH] F3: center_subscriptions SELECT - all roles can read subscription data
--   Current: center_id = get_caller_center_id() (any role)
--   Fix: Restrict to admin/staff/coordinator (students/teachers don't need this)
--
-- [HIGH] F4: billing_events SELECT - all roles can read billing events
--   Current: center_id = get_caller_center_id() OR super_admin
--   Fix: Restrict to admin/staff (billing is admin-only concern)
--
-- [HIGH] F5: center_addons INSERT/UPDATE - all roles in center can modify add-ons
--   Current: center_id = get_caller_center_id() OR super_admin
--   Fix: Restrict INSERT/UPDATE to admin/super_admin only
--
-- [MEDIUM] F6: email_templates SELECT - only super_admin can read (admin needs read for their center)
--   Current: ONLY sa_bypass ALL policy
--   Fix: Add SELECT for admin/staff of their center (needed for email sending)
--
-- [MEDIUM] F7: session_participants - missing UPDATE and DELETE for non-SA users
--   Current: Only INSERT + SELECT + sa_bypass
--   Fix: Add DELETE for admin/staff of their center (needed when removing participants)
--
-- [LOW] F8: chat_channels - missing DELETE policy for admin cleanup
--   Current: Only SELECT + INSERT + UPDATE (no DELETE except via sa_bypass)
--   Fix: Add DELETE for admin/coordinator
--
-- [LOW] F9: chat_attachments - missing UPDATE and DELETE policies
--   Current: Only SELECT + INSERT
--   Fix: Add DELETE for message owner
--
-- [LOW] F10: chat_mentions - missing UPDATE and DELETE policies
--   Current: Only SELECT + INSERT
--   Fix: These are immutable records, no fix needed (by design)
--
-- [INFO] Tables with only sa_bypass (super_admin-only access) - CORRECT by design:
--   audit_log, blog_settings, blog_topics, blog_generation_logs,
--   platform_settings, email_templates (partial - see F6)
--
-- [INFO] Tables with public SELECT (CORRECT by design):
--   addon_plans (catalog, public read), subscription_plans (pricing, public read),
--   blog_posts (published only)
--
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- F1: GRADES - Restrict student SELECT to their own grades
-- ---------------------------------------------------------------------------
-- Drop the existing overly-permissive center-wide SELECT
DROP POLICY IF EXISTS "center_select_grades" ON grades;

-- Admin/teacher/coordinator/staff can see all grades in their center
CREATE POLICY "staff_select_grades" ON grades
  FOR SELECT
  USING (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() IN ('admin', 'teacher', 'trainer', 'coordinator', 'staff')
  );

-- Students can only see their own grades
CREATE POLICY "student_select_own_grades" ON grades
  FOR SELECT
  USING (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() = 'student'
    AND student_id = auth.uid()
  );


-- ---------------------------------------------------------------------------
-- F2: EVALUATIONS - Students should only see published evaluations
-- ---------------------------------------------------------------------------
-- Drop the existing overly-permissive center-wide SELECT
DROP POLICY IF EXISTS "center_select_evaluations" ON evaluations;

-- Admin/teacher/coordinator/staff can see all evaluations in their center
CREATE POLICY "staff_select_evaluations" ON evaluations
  FOR SELECT
  USING (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() IN ('admin', 'teacher', 'trainer', 'coordinator', 'staff')
  );

-- Students can only see published evaluations in their center
CREATE POLICY "student_select_published_evaluations" ON evaluations
  FOR SELECT
  USING (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() = 'student'
    AND is_published = true
  );


-- ---------------------------------------------------------------------------
-- F3: CENTER_SUBSCRIPTIONS - Restrict SELECT to admin/staff roles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "center_subscriptions_select" ON center_subscriptions;

CREATE POLICY "center_subscriptions_select_admin" ON center_subscriptions
  FOR SELECT
  USING (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() IN ('admin', 'staff', 'coordinator')
  );


-- ---------------------------------------------------------------------------
-- F4: BILLING_EVENTS - Restrict SELECT to admin/staff roles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "billing_events_select_own" ON billing_events;

CREATE POLICY "billing_events_select_admin" ON billing_events
  FOR SELECT
  USING (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() IN ('admin', 'staff')
  );


-- ---------------------------------------------------------------------------
-- F5: CENTER_ADDONS - Restrict INSERT/UPDATE to admin/super_admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "center_addons_insert" ON center_addons;
DROP POLICY IF EXISTS "center_addons_update" ON center_addons;

CREATE POLICY "center_addons_insert_admin" ON center_addons
  FOR INSERT
  WITH CHECK (
    (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin', 'staff'))
    OR public.get_caller_role() = 'super_admin'
  );

CREATE POLICY "center_addons_update_admin" ON center_addons
  FOR UPDATE
  USING (
    (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin', 'staff'))
    OR public.get_caller_role() = 'super_admin'
  )
  WITH CHECK (
    (center_id = public.get_caller_center_id() AND public.get_caller_role() IN ('admin', 'staff'))
    OR public.get_caller_role() = 'super_admin'
  );


-- ---------------------------------------------------------------------------
-- F6: EMAIL_TEMPLATES - Add SELECT for admin/staff of their center
-- ---------------------------------------------------------------------------
-- Keep the existing sa_bypass_email_templates ALL policy (do NOT drop it)
-- Add a read-only policy for center admins
CREATE POLICY "center_admin_select_email_templates" ON email_templates
  FOR SELECT
  USING (
    center_id = public.get_caller_center_id()
    AND public.get_caller_role() IN ('admin', 'staff', 'coordinator')
  );


-- ---------------------------------------------------------------------------
-- F7: SESSION_PARTICIPANTS - Add DELETE for admin/staff
-- ---------------------------------------------------------------------------
-- Keep existing sa_bypass, participants_insert, participants_select
CREATE POLICY "participants_delete" ON session_participants
  FOR DELETE
  USING (
    session_id IN (
      SELECT id FROM training_sessions
      WHERE center_id = public.get_caller_center_id()
    )
    AND public.get_caller_role() IN ('admin', 'staff', 'teacher', 'trainer', 'coordinator')
  );

-- Add UPDATE policy for admin/staff (e.g., updating attendance status)
CREATE POLICY "participants_update" ON session_participants
  FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM training_sessions
      WHERE center_id = public.get_caller_center_id()
    )
    AND public.get_caller_role() IN ('admin', 'staff', 'teacher', 'trainer', 'coordinator')
  );


-- ---------------------------------------------------------------------------
-- F8: CHAT_CHANNELS - Add DELETE for admin/coordinator cleanup
-- ---------------------------------------------------------------------------
CREATE POLICY "chat_channels_delete" ON chat_channels
  FOR DELETE
  USING (
    public.get_caller_role() IN ('super_admin', 'admin', 'coordinator')
    AND (center_id = public.get_caller_center_id() OR public.get_caller_role() = 'super_admin')
  );


-- ---------------------------------------------------------------------------
-- F9: CHAT_ATTACHMENTS - Add DELETE for message sender
-- ---------------------------------------------------------------------------
CREATE POLICY "chat_attachments_delete" ON chat_attachments
  FOR DELETE
  USING (
    public.get_caller_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM chat_messages m
      WHERE m.id = chat_attachments.message_id
      AND m.sender_id = auth.uid()
    )
  );


COMMIT;

-- =============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- (Run these manually to verify the migration was applied correctly)
-- =============================================================================
--
-- 1. Verify grades policies:
--    SELECT policyname, cmd, qual FROM pg_policies
--    WHERE tablename = 'grades' AND schemaname = 'public' ORDER BY policyname;
--
-- 2. Verify evaluations policies:
--    SELECT policyname, cmd, qual FROM pg_policies
--    WHERE tablename = 'evaluations' AND schemaname = 'public' ORDER BY policyname;
--
-- 3. Count all policies per table:
--    SELECT tablename, COUNT(*) FROM pg_policies
--    WHERE schemaname = 'public' GROUP BY tablename ORDER BY tablename;
--
-- =============================================================================
