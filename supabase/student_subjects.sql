-- Migration : student_subjects
-- Inscription individuelle étudiant → matière (dispensation + matières libres)

CREATE TABLE IF NOT EXISTS public.student_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,  -- NULL = matière libre
    center_id UUID NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
    enrollment_type TEXT NOT NULL DEFAULT 'class'
        CHECK (enrollment_type IN ('class', 'free')),
    status TEXT NOT NULL DEFAULT 'enrolled'
        CHECK (status IN ('enrolled', 'dispensed')),
    dispensation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, subject_id, class_id)
);

-- Index pour free subjects (class_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS student_subjects_free_unique
    ON public.student_subjects (student_id, subject_id)
    WHERE class_id IS NULL;

-- RLS
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_bypass_student_subjects"
    ON public.student_subjects FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

CREATE POLICY "student_subjects_select"
    ON public.student_subjects FOR SELECT
    USING (center_id = public.get_caller_center_id());

CREATE POLICY "student_subjects_insert"
    ON public.student_subjects FOR INSERT
    WITH CHECK (center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff'));

CREATE POLICY "student_subjects_update"
    ON public.student_subjects FOR UPDATE
    USING (center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff'))
    WITH CHECK (center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff'));

CREATE POLICY "student_subjects_delete"
    ON public.student_subjects FOR DELETE
    USING (center_id = public.get_caller_center_id()
        AND public.get_caller_role() IN ('admin', 'staff'));

-- Backfill : peupler student_subjects à partir des données existantes
INSERT INTO public.student_subjects (student_id, subject_id, class_id, center_id, enrollment_type, status)
SELECT cs.student_id, csub.subject_id, cs.class_id, cl.center_id, 'class', 'enrolled'
FROM public.class_students cs
JOIN public.classes cl ON cl.id = cs.class_id
JOIN public.class_subjects csub ON csub.class_id = cs.class_id
ON CONFLICT DO NOTHING;
