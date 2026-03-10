
-- Create assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_progress_id UUID REFERENCES public.weekly_progress(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  learning_objectives TEXT,
  submission_requirements TEXT,
  grading_criteria TEXT,
  resources TEXT,
  is_step_guide BOOLEAN NOT NULL DEFAULT false,
  steps JSONB,
  due_date TIMESTAMPTZ,
  max_score NUMERIC DEFAULT 100,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  file_path TEXT,
  file_name TEXT,
  score NUMERIC,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  graded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Assignments policies
CREATE POLICY "Supervisors can manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Students can view assignments for their weeks" ON public.assignments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM weekly_progress wp
    JOIN students s ON s.id = wp.student_id
    WHERE wp.id = assignments.weekly_progress_id
    AND s.user_id = auth.uid()
  ));

-- Submission policies
CREATE POLICY "Students can manage own submissions" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM students s WHERE s.id = assignment_submissions.student_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM students s WHERE s.id = assignment_submissions.student_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Supervisors can manage student submissions" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM students s WHERE s.id = assignment_submissions.student_id AND s.supervisor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM students s WHERE s.id = assignment_submissions.student_id AND s.supervisor_id = auth.uid()
  ));
