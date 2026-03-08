
-- Add created_by column as nullable first
ALTER TABLE public.evaluation_criteria ADD COLUMN created_by uuid;

-- Backfill from track creator
UPDATE public.evaluation_criteria ec
SET created_by = t.created_by
FROM public.tracks t
WHERE ec.track_id = t.id AND ec.created_by IS NULL;

-- For any criteria without a track, assign to the first supervisor
UPDATE public.evaluation_criteria
SET created_by = (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'supervisor' LIMIT 1)
WHERE created_by IS NULL;

-- Now make it NOT NULL
ALTER TABLE public.evaluation_criteria ALTER COLUMN created_by SET NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Supervisors can manage own criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Users can view relevant criteria" ON public.evaluation_criteria;

-- New policy: Supervisors can manage their own criteria
CREATE POLICY "Supervisors can manage own criteria"
ON public.evaluation_criteria
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- New policy: Users can view relevant criteria
CREATE POLICY "Users can view relevant criteria"
ON public.evaluation_criteria
FOR SELECT
TO authenticated
USING (
  (created_by = auth.uid())
  OR (EXISTS (
    SELECT 1
    FROM student_tracks st
    JOIN students s ON s.id = st.student_id
    WHERE st.track_id = evaluation_criteria.track_id
    AND s.user_id = auth.uid()
  ))
);
