
-- Portfolios table
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT false,
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  github_username text,
  github_data jsonb,
  bio text,
  graduation_approved boolean NOT NULL DEFAULT false,
  graduation_approved_at timestamptz,
  graduation_approved_by uuid,
  certificate_issued boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Students can view/update own portfolio
CREATE POLICY "Students can view own portfolio" ON public.portfolios
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM students WHERE students.id = portfolios.student_id AND students.user_id = auth.uid()
  ));

CREATE POLICY "Students can update own portfolio" ON public.portfolios
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM students WHERE students.id = portfolios.student_id AND students.user_id = auth.uid()
  ));

-- Supervisors can manage their students' portfolios
CREATE POLICY "Supervisors can manage student portfolios" ON public.portfolios
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM students WHERE students.id = portfolios.student_id AND students.supervisor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM students WHERE students.id = portfolios.student_id AND students.supervisor_id = auth.uid()
  ));

-- Public portfolios viewable by anyone (via share token)
CREATE POLICY "Public portfolios are viewable" ON public.portfolios
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

-- Portfolio projects table
CREATE TABLE public.portfolio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  github_url text,
  github_stats jsonb,
  technologies text[],
  image_url text,
  week_number integer,
  project_id uuid REFERENCES public.projects(id),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio project owners can manage" ON public.portfolio_projects
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portfolios p
    JOIN students s ON s.id = p.student_id
    WHERE p.id = portfolio_projects.portfolio_id AND (s.user_id = auth.uid() OR s.supervisor_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM portfolios p
    JOIN students s ON s.id = p.student_id
    WHERE p.id = portfolio_projects.portfolio_id AND (s.user_id = auth.uid() OR s.supervisor_id = auth.uid())
  ));

CREATE POLICY "Public portfolio projects viewable" ON public.portfolio_projects
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM portfolios WHERE portfolios.id = portfolio_projects.portfolio_id AND portfolios.is_public = true
  ));

-- Skill badges table
CREATE TABLE public.skill_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'technical',
  level text NOT NULL DEFAULT 'beginner',
  awarded_at timestamptz NOT NULL DEFAULT now(),
  awarded_by uuid,
  description text
);

ALTER TABLE public.skill_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badge owners can view" ON public.skill_badges
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portfolios p
    JOIN students s ON s.id = p.student_id
    WHERE p.id = skill_badges.portfolio_id AND (s.user_id = auth.uid() OR s.supervisor_id = auth.uid())
  ));

CREATE POLICY "Supervisors can manage badges" ON public.skill_badges
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portfolios p
    JOIN students s ON s.id = p.student_id
    WHERE p.id = skill_badges.portfolio_id AND s.supervisor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM portfolios p
    JOIN students s ON s.id = p.student_id
    WHERE p.id = skill_badges.portfolio_id AND s.supervisor_id = auth.uid()
  ));

CREATE POLICY "Public badges viewable" ON public.skill_badges
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM portfolios WHERE portfolios.id = skill_badges.portfolio_id AND portfolios.is_public = true
  ));
