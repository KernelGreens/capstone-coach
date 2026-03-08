
-- Capstone proposals table
CREATE TABLE public.capstone_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  abstract text,
  objectives text,
  methodology text,
  expected_outcomes text,
  timeline text,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  reviewer_notes text,
  approved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.capstone_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own proposals" ON public.capstone_proposals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = capstone_proposals.student_id AND students.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = capstone_proposals.student_id AND students.user_id = auth.uid()));

CREATE POLICY "Supervisors can manage student proposals" ON public.capstone_proposals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = capstone_proposals.student_id AND students.supervisor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = capstone_proposals.student_id AND students.supervisor_id = auth.uid()));

-- Capstone milestones table
CREATE TABLE public.capstone_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.capstone_proposals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamp with time zone,
  feedback text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.capstone_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own milestones" ON public.capstone_milestones
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM capstone_proposals cp
    JOIN students s ON s.id = cp.student_id
    WHERE cp.id = capstone_milestones.proposal_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM capstone_proposals cp
    JOIN students s ON s.id = cp.student_id
    WHERE cp.id = capstone_milestones.proposal_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Supervisors can manage student milestones" ON public.capstone_milestones
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM capstone_proposals cp
    JOIN students s ON s.id = cp.student_id
    WHERE cp.id = capstone_milestones.proposal_id AND s.supervisor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM capstone_proposals cp
    JOIN students s ON s.id = cp.student_id
    WHERE cp.id = capstone_milestones.proposal_id AND s.supervisor_id = auth.uid()
  ));

-- Capstone presentations table
CREATE TABLE public.capstone_presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.capstone_proposals(id) ON DELETE CASCADE,
  scheduled_at timestamp with time zone,
  duration_minutes integer NOT NULL DEFAULT 30,
  location text,
  meeting_link text,
  status text NOT NULL DEFAULT 'scheduled',
  presentation_notes text,
  evaluation_score numeric,
  evaluation_notes text,
  evaluated_by uuid,
  evaluated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.capstone_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own presentations" ON public.capstone_presentations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM capstone_proposals cp
    JOIN students s ON s.id = cp.student_id
    WHERE cp.id = capstone_presentations.proposal_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Supervisors can manage student presentations" ON public.capstone_presentations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM capstone_proposals cp
    JOIN students s ON s.id = cp.student_id
    WHERE cp.id = capstone_presentations.proposal_id AND s.supervisor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM capstone_proposals cp
    JOIN students s ON s.id = cp.student_id
    WHERE cp.id = capstone_presentations.proposal_id AND s.supervisor_id = auth.uid()
  ));
