
CREATE POLICY "Supervisors can update student profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.user_id = profiles.id
      AND students.supervisor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.user_id = profiles.id
      AND students.supervisor_id = auth.uid()
  )
);
