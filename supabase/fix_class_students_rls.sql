-- ============================================================
-- FIX : RLS sur class_students pour super_admin + admin/staff
-- ============================================================
-- Problème : les policies class_students utilisaient auth.get_my_role()
-- et auth.get_my_center_id() qui n'existent pas.
-- Le super-admin ne peut pas lire/écrire class_students.
-- ============================================================

-- 1. S'assurer que RLS est activé
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes policies cassées
DROP POLICY IF EXISTS "sa_bypass_class_students" ON public.class_students;
DROP POLICY IF EXISTS "class_students_select" ON public.class_students;
DROP POLICY IF EXISTS "class_students_insert" ON public.class_students;
DROP POLICY IF EXISTS "class_students_update" ON public.class_students;
DROP POLICY IF EXISTS "class_students_delete" ON public.class_students;

-- 3. Créer la policy super-admin bypass (lecture + écriture)
CREATE POLICY "sa_bypass_class_students"
    ON public.class_students FOR ALL
    USING (public.get_caller_role() = 'super_admin')
    WITH CHECK (public.get_caller_role() = 'super_admin');

-- 4. Créer les policies pour admin/staff (via center_id des classes)
CREATE POLICY "class_students_select"
    ON public.class_students FOR SELECT
    USING (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = public.get_caller_center_id()
        )
    );

CREATE POLICY "class_students_insert"
    ON public.class_students FOR INSERT
    WITH CHECK (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = public.get_caller_center_id()
        )
        AND public.get_caller_role() IN ('admin', 'staff')
    );

CREATE POLICY "class_students_delete"
    ON public.class_students FOR DELETE
    USING (
        class_id IN (
            SELECT id FROM public.classes
            WHERE center_id = public.get_caller_center_id()
        )
        AND public.get_caller_role() IN ('admin', 'staff')
    );
