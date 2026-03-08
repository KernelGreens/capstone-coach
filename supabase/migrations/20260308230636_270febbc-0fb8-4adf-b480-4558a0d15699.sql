
-- Create lessons table
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT NOT NULL DEFAULT 'text', -- 'video', 'audio', 'text'
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  external_url TEXT,
  duration_seconds INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_downloadable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Supervisors can manage lessons they created
CREATE POLICY "Supervisors can manage own lessons"
  ON public.lessons
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Students can view lessons for projects in their tracks
CREATE POLICY "Students can view relevant lessons"
  ON public.lessons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN student_tracks st ON st.track_id = p.track_id
      JOIN students s ON s.id = st.student_id
      WHERE p.id = lessons.project_id
      AND s.user_id = auth.uid()
    )
  );

-- Create storage bucket for lessons
INSERT INTO storage.buckets (id, name, public)
VALUES ('lessons', 'lessons', false);

-- Storage policies: supervisors upload
CREATE POLICY "Supervisors can upload lessons"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lessons'
    AND public.has_role(auth.uid(), 'supervisor')
  );

-- Supervisors can manage lesson files
CREATE POLICY "Supervisors can manage lesson files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'lessons'
    AND public.has_role(auth.uid(), 'supervisor')
  );

-- Students can read lesson files
CREATE POLICY "Students can read lesson files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lessons'
  );
