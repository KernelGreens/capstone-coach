
-- Multi-tenant isolation: Restrict supervisor data visibility to their own data only

-- TRACKS
DROP POLICY IF EXISTS "Anyone can view tracks" ON public.tracks;
DROP POLICY IF EXISTS "Supervisors can manage tracks" ON public.tracks;

CREATE POLICY "Users can view relevant tracks" ON public.tracks
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.student_tracks st
    JOIN public.students s ON s.id = st.student_id
    WHERE st.track_id = tracks.id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can manage own tracks" ON public.tracks
FOR ALL TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- STUDENTS
DROP POLICY IF EXISTS "Supervisors can view all students" ON public.students;
DROP POLICY IF EXISTS "Supervisors can manage students" ON public.students;

CREATE POLICY "Supervisors can view own students" ON public.students
FOR SELECT TO authenticated
USING (supervisor_id = auth.uid());

CREATE POLICY "Supervisors can manage own students" ON public.students
FOR ALL TO authenticated
USING (supervisor_id = auth.uid())
WITH CHECK (supervisor_id = auth.uid());

-- PROJECTS
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Supervisors can manage projects" ON public.projects;

CREATE POLICY "Users can view relevant projects" ON public.projects
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tracks WHERE tracks.id = projects.track_id AND tracks.created_by = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.student_tracks st
    JOIN public.students s ON s.id = st.student_id
    WHERE st.track_id = projects.track_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can manage own projects" ON public.projects
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tracks WHERE tracks.id = projects.track_id AND tracks.created_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.tracks WHERE tracks.id = projects.track_id AND tracks.created_by = auth.uid()));

-- MEETINGS
DROP POLICY IF EXISTS "Supervisors can view all meetings" ON public.meetings;
DROP POLICY IF EXISTS "Supervisors can manage meetings" ON public.meetings;

CREATE POLICY "Supervisors can view own meetings" ON public.meetings
FOR SELECT TO authenticated
USING (supervisor_id = auth.uid());

CREATE POLICY "Supervisors can manage own meetings" ON public.meetings
FOR ALL TO authenticated
USING (supervisor_id = auth.uid())
WITH CHECK (supervisor_id = auth.uid());

-- RESOURCES
DROP POLICY IF EXISTS "Anyone can view resources" ON public.resources;
DROP POLICY IF EXISTS "Supervisors can manage resources" ON public.resources;

CREATE POLICY "Users can view relevant resources" ON public.resources
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR track_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.student_tracks st
    JOIN public.students s ON s.id = st.student_id
    WHERE st.track_id = resources.track_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can manage own resources" ON public.resources
FOR ALL TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- WEEKLY_RESOURCES
DROP POLICY IF EXISTS "Anyone can view weekly resources" ON public.weekly_resources;
DROP POLICY IF EXISTS "Supervisors can manage weekly resources" ON public.weekly_resources;

CREATE POLICY "Users can view relevant weekly resources" ON public.weekly_resources
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.student_tracks st
    JOIN public.students s ON s.id = st.student_id
    WHERE st.track_id = weekly_resources.track_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can manage own weekly resources" ON public.weekly_resources
FOR ALL TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- WEEKLY_PROGRESS
DROP POLICY IF EXISTS "Supervisors can view all progress" ON public.weekly_progress;
DROP POLICY IF EXISTS "Supervisors can manage all progress" ON public.weekly_progress;

CREATE POLICY "Supervisors can view own students progress" ON public.weekly_progress
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students WHERE students.id = weekly_progress.student_id AND students.supervisor_id = auth.uid())
);

CREATE POLICY "Supervisors can manage own students progress" ON public.weekly_progress
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students WHERE students.id = weekly_progress.student_id AND students.supervisor_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.students WHERE students.id = weekly_progress.student_id AND students.supervisor_id = auth.uid())
);

-- EVALUATION_CRITERIA
DROP POLICY IF EXISTS "Anyone can view criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Supervisors can manage criteria" ON public.evaluation_criteria;

CREATE POLICY "Users can view relevant criteria" ON public.evaluation_criteria
FOR SELECT TO authenticated
USING (
  track_id IS NULL
  OR EXISTS (SELECT 1 FROM public.tracks WHERE tracks.id = evaluation_criteria.track_id AND tracks.created_by = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.student_tracks st
    JOIN public.students s ON s.id = st.student_id
    WHERE st.track_id = evaluation_criteria.track_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can manage own criteria" ON public.evaluation_criteria
FOR ALL TO authenticated
USING (
  track_id IS NULL OR EXISTS (SELECT 1 FROM public.tracks WHERE tracks.id = evaluation_criteria.track_id AND tracks.created_by = auth.uid())
)
WITH CHECK (
  track_id IS NULL OR EXISTS (SELECT 1 FROM public.tracks WHERE tracks.id = evaluation_criteria.track_id AND tracks.created_by = auth.uid())
);

-- WEEKLY_EVALUATIONS
DROP POLICY IF EXISTS "Supervisors can manage evaluations" ON public.weekly_evaluations;

CREATE POLICY "Supervisors can manage own evaluations" ON public.weekly_evaluations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.weekly_progress wp
    JOIN public.students s ON s.id = wp.student_id
    WHERE wp.id = weekly_evaluations.weekly_progress_id AND s.supervisor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.weekly_progress wp
    JOIN public.students s ON s.id = wp.student_id
    WHERE wp.id = weekly_evaluations.weekly_progress_id AND s.supervisor_id = auth.uid()
  )
);

-- STUDENT_TRACKS
DROP POLICY IF EXISTS "Supervisors can manage student tracks" ON public.student_tracks;

CREATE POLICY "Supervisors can manage own student tracks" ON public.student_tracks
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students WHERE students.id = student_tracks.student_id AND students.supervisor_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.students WHERE students.id = student_tracks.student_id AND students.supervisor_id = auth.uid())
);

-- DELIVERABLES
DROP POLICY IF EXISTS "Supervisors can view all deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Supervisors can manage deliverables" ON public.deliverables;

CREATE POLICY "Supervisors can view own students deliverables" ON public.deliverables
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students WHERE students.id = deliverables.student_id AND students.supervisor_id = auth.uid())
);

CREATE POLICY "Supervisors can manage own students deliverables" ON public.deliverables
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students WHERE students.id = deliverables.student_id AND students.supervisor_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.students WHERE students.id = deliverables.student_id AND students.supervisor_id = auth.uid())
);

-- NOTIFICATIONS: Already user-scoped, no changes needed
-- COMMENTS: Update supervisor access to own students only
DROP POLICY IF EXISTS "Users can view relevant comments" ON public.comments;

CREATE POLICY "Users can view relevant comments" ON public.comments
FOR SELECT TO authenticated
USING (
  auth.uid() = author_id
  OR EXISTS (SELECT 1 FROM public.students WHERE students.id = comments.student_id AND students.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.students WHERE students.id = comments.student_id AND students.supervisor_id = auth.uid())
);
