-- Table de liaison many-to-many : professeurs <-> matières
-- À exécuter dans le Supabase Dashboard (SQL Editor)
-- Safe à re-exécuter (DROP IF EXISTS sur les policies)

CREATE TABLE IF NOT EXISTS public.teacher_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, subject_id)
);

ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes avant de les recréer
DROP POLICY IF EXISTS "teacher_subjects_select" ON public.teacher_subjects;
DROP POLICY IF EXISTS "teacher_subjects_insert" ON public.teacher_subjects;
DROP POLICY IF EXISTS "teacher_subjects_delete" ON public.teacher_subjects;

-- Policy SELECT : même centre que l'utilisateur connecté
CREATE POLICY "teacher_subjects_select" ON public.teacher_subjects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = teacher_subjects.teacher_id
              AND p.center_id = public.get_caller_center_id()
        )
    );

-- Policy INSERT : admin/coordinator du même centre
CREATE POLICY "teacher_subjects_insert" ON public.teacher_subjects
    FOR INSERT WITH CHECK (
        public.get_caller_role() IN ('admin', 'super_admin', 'coordinator')
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = teacher_subjects.teacher_id
              AND p.center_id = public.get_caller_center_id()
        )
    );

-- Policy DELETE : admin/coordinator du même centre
CREATE POLICY "teacher_subjects_delete" ON public.teacher_subjects
    FOR DELETE USING (
        public.get_caller_role() IN ('admin', 'super_admin', 'coordinator')
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = teacher_subjects.teacher_id
              AND p.center_id = public.get_caller_center_id()
        )
    );
