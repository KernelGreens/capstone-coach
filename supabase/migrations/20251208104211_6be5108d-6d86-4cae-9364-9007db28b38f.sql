-- 1. Add DELETE policy for students on deliverables table
CREATE POLICY "Students can delete own deliverables"
ON public.deliverables
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM students
  WHERE students.id = deliverables.student_id
  AND students.user_id = auth.uid()
));

-- 2. Fix search_path warning on update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;