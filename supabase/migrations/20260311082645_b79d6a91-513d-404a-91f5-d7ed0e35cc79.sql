
ALTER TABLE public.assignments 
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Allow students to view assignments linked to projects in their tracks
CREATE POLICY "Students can view track assignments via project"
ON public.assignments
FOR SELECT
TO authenticated
USING (
  project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.student_tracks st ON st.track_id = p.track_id
    JOIN public.students s ON s.id = st.student_id
    WHERE p.id = assignments.project_id AND s.user_id = auth.uid()
  )
);
