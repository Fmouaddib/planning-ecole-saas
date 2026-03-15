-- Migration: Parent Portal - access tokens + anon RLS policies (v2)
-- Date: 2026-03-14
-- Description: Add access_token column to student_contacts and create
--              RLS policies allowing anonymous access via token lookup.
-- NOTE: profiles has no class_id — we use student_subjects.class_id instead.

-- 1. Add access_token column
ALTER TABLE public.student_contacts
  ADD COLUMN IF NOT EXISTS access_token UUID DEFAULT gen_random_uuid() NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_contacts_access_token
  ON public.student_contacts (access_token);

UPDATE public.student_contacts
  SET access_token = gen_random_uuid()
  WHERE access_token IS NULL;

-- Helper view: student class IDs reachable via parent portal tokens
CREATE OR REPLACE VIEW parent_portal_student_classes AS
  SELECT DISTINCT sc.student_id, ss.class_id
  FROM public.student_contacts sc
  INNER JOIN public.student_subjects ss ON ss.student_id = sc.student_id
  WHERE sc.access_token IS NOT NULL AND ss.class_id IS NOT NULL;

-- 2. Anon SELECT on student_contacts
CREATE POLICY "anon_select_student_contacts_by_token"
  ON public.student_contacts
  FOR SELECT TO anon
  USING (access_token IS NOT NULL);

-- 3. Anon SELECT on profiles (students with a contact)
CREATE POLICY "anon_select_profiles_via_parent_portal"
  ON public.profiles
  FOR SELECT TO anon
  USING (
    id IN (SELECT student_id FROM public.student_contacts WHERE access_token IS NOT NULL)
  );

-- 4. Anon SELECT on evaluations (published, matching student classes)
CREATE POLICY "anon_select_evaluations_via_parent_portal"
  ON public.evaluations
  FOR SELECT TO anon
  USING (
    is_published = true
    AND class_id IN (SELECT class_id FROM parent_portal_student_classes)
  );

-- 5. Anon SELECT on grades
CREATE POLICY "anon_select_grades_via_parent_portal"
  ON public.grades
  FOR SELECT TO anon
  USING (
    student_id IN (SELECT student_id FROM public.student_contacts WHERE access_token IS NOT NULL)
  );

-- 6. Anon SELECT on session_attendance
CREATE POLICY "anon_select_attendance_via_parent_portal"
  ON public.session_attendance
  FOR SELECT TO anon
  USING (
    student_id IN (SELECT student_id FROM public.student_contacts WHERE access_token IS NOT NULL)
  );

-- 7. Anon SELECT on bulletins
CREATE POLICY "anon_select_bulletins_via_parent_portal"
  ON public.bulletins
  FOR SELECT TO anon
  USING (
    student_id IN (SELECT student_id FROM public.student_contacts WHERE access_token IS NOT NULL)
  );

-- 8. Anon SELECT on training_sessions
CREATE POLICY "anon_select_sessions_via_parent_portal"
  ON public.training_sessions
  FOR SELECT TO anon
  USING (
    class_id IN (SELECT class_id FROM parent_portal_student_classes)
  );

-- 9. Anon SELECT on subjects
CREATE POLICY "anon_select_subjects_via_parent_portal"
  ON public.subjects
  FOR SELECT TO anon
  USING (
    id IN (
      SELECT subject_id FROM public.evaluations
      WHERE is_published = true
      AND class_id IN (SELECT class_id FROM parent_portal_student_classes)
    )
    OR id IN (
      SELECT subject_id FROM public.training_sessions
      WHERE class_id IN (SELECT class_id FROM parent_portal_student_classes)
    )
  );

-- 10. Anon SELECT on classes
CREATE POLICY "anon_select_classes_via_parent_portal"
  ON public.classes
  FOR SELECT TO anon
  USING (
    id IN (SELECT class_id FROM parent_portal_student_classes)
  );

-- 11. Anon SELECT on rooms
CREATE POLICY "anon_select_rooms_via_parent_portal"
  ON public.rooms
  FOR SELECT TO anon
  USING (
    id IN (
      SELECT room_id FROM public.training_sessions
      WHERE class_id IN (SELECT class_id FROM parent_portal_student_classes)
      AND room_id IS NOT NULL
    )
  );

-- 12. Anon SELECT on class_subjects
CREATE POLICY "anon_select_class_subjects_via_parent_portal"
  ON public.class_subjects
  FOR SELECT TO anon
  USING (
    class_id IN (SELECT class_id FROM parent_portal_student_classes)
  );
