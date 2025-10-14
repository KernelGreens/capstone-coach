-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('supervisor', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create tracks table
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('mini', 'capstone')),
  week_number INTEGER,
  objectives TEXT,
  deliverables TEXT,
  tools_technologies TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create evaluation_criteria table
CREATE TABLE public.evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  criterion TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create weekly_progress table
CREATE TABLE public.weekly_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  week_focus TEXT,
  tasks TEXT,
  deliverables_submitted BOOLEAN DEFAULT FALSE,
  self_assessment_score NUMERIC(5,2),
  self_assessment_notes TEXT,
  supervisor_score NUMERIC(5,2),
  supervisor_notes TEXT,
  score_approved BOOLEAN DEFAULT FALSE,
  score_approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, week_number)
);

-- Create weekly_evaluations table
CREATE TABLE public.weekly_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_progress_id UUID NOT NULL REFERENCES public.weekly_progress(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(weekly_progress_id, criterion_id)
);

-- Create storage bucket for deliverables
INSERT INTO storage.buckets (id, name, public) VALUES ('deliverables', 'deliverables', false);

-- Create deliverables table
CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  weekly_progress_id UUID REFERENCES public.weekly_progress(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_progress_id UUID REFERENCES public.weekly_progress(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create resources table
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('link', 'document', 'video', 'tutorial', 'other')),
  url TEXT,
  file_path TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('score_update', 'deadline', 'meeting', 'comment', 'milestone', 'general')),
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Supervisors can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for tracks
CREATE POLICY "Anyone can view tracks" ON public.tracks FOR SELECT USING (true);
CREATE POLICY "Supervisors can manage tracks" ON public.tracks FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for projects
CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Supervisors can manage projects" ON public.projects FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for students
CREATE POLICY "Students can view own record" ON public.students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Supervisors can view all students" ON public.students FOR SELECT USING (public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors can manage students" ON public.students FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for evaluation_criteria
CREATE POLICY "Anyone can view criteria" ON public.evaluation_criteria FOR SELECT USING (true);
CREATE POLICY "Supervisors can manage criteria" ON public.evaluation_criteria FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for weekly_progress
CREATE POLICY "Students can view own progress" ON public.weekly_progress 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = weekly_progress.student_id AND user_id = auth.uid())
  );
CREATE POLICY "Supervisors can view all progress" ON public.weekly_progress 
  FOR SELECT USING (public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Students can update own progress" ON public.weekly_progress 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = weekly_progress.student_id AND user_id = auth.uid())
  );
CREATE POLICY "Supervisors can manage all progress" ON public.weekly_progress 
  FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for weekly_evaluations
CREATE POLICY "Students can view own evaluations" ON public.weekly_evaluations 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.weekly_progress wp
      JOIN public.students s ON wp.student_id = s.id
      WHERE wp.id = weekly_evaluations.weekly_progress_id AND s.user_id = auth.uid()
    )
  );
CREATE POLICY "Supervisors can manage evaluations" ON public.weekly_evaluations 
  FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for deliverables
CREATE POLICY "Students can view own deliverables" ON public.deliverables 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = deliverables.student_id AND user_id = auth.uid())
  );
CREATE POLICY "Supervisors can view all deliverables" ON public.deliverables 
  FOR SELECT USING (public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Students can upload own deliverables" ON public.deliverables 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.students WHERE id = deliverables.student_id AND user_id = auth.uid())
  );
CREATE POLICY "Supervisors can manage deliverables" ON public.deliverables 
  FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for storage.objects (deliverables bucket)
CREATE POLICY "Students can upload own files" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'deliverables' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Students can view own files" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'deliverables' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Supervisors can view all files" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'deliverables' AND 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'supervisor')
  );

-- RLS Policies for comments
CREATE POLICY "Users can view relevant comments" ON public.comments 
  FOR SELECT USING (
    auth.uid() = author_id OR
    EXISTS (SELECT 1 FROM public.students WHERE id = comments.student_id AND user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'supervisor')
  );
CREATE POLICY "Users can create comments" ON public.comments 
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own comments" ON public.comments 
  FOR UPDATE USING (auth.uid() = author_id);

-- RLS Policies for meetings
CREATE POLICY "Students can view own meetings" ON public.meetings 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = meetings.student_id AND user_id = auth.uid())
  );
CREATE POLICY "Supervisors can view all meetings" ON public.meetings 
  FOR SELECT USING (public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors can manage meetings" ON public.meetings 
  FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for resources
CREATE POLICY "Anyone can view resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Supervisors can manage resources" ON public.resources FOR ALL USING (public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_evaluation_criteria_updated_at BEFORE UPDATE ON public.evaluation_criteria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weekly_progress_updated_at BEFORE UPDATE ON public.weekly_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weekly_evaluations_updated_at BEFORE UPDATE ON public.weekly_evaluations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for auto-creating profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;