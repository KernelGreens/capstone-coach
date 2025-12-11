-- Fix storage policies for deliverables bucket
CREATE POLICY "Students can upload own deliverables"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deliverables' AND
  (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM students s WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Students can view own deliverables"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deliverables' AND
  (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM students s WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Students can delete own deliverables"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'deliverables' AND
  (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM students s WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can manage all deliverables"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'deliverables' AND
  public.has_role(auth.uid(), 'supervisor')
)
WITH CHECK (
  bucket_id = 'deliverables' AND
  public.has_role(auth.uid(), 'supervisor')
);

-- Create junction table for students with multiple tracks
CREATE TABLE public.student_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, track_id)
);

-- Enable RLS
ALTER TABLE public.student_tracks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Students can view own tracks"
ON public.student_tracks
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM students WHERE students.id = student_tracks.student_id AND students.user_id = auth.uid())
);

CREATE POLICY "Supervisors can manage student tracks"
ON public.student_tracks
FOR ALL
USING (public.has_role(auth.uid(), 'supervisor'))
WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- Create table for weekly resources
CREATE TABLE public.weekly_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  resource_type TEXT NOT NULL DEFAULT 'link',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_resources ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly resources
CREATE POLICY "Anyone can view weekly resources"
ON public.weekly_resources
FOR SELECT
USING (true);

CREATE POLICY "Supervisors can manage weekly resources"
ON public.weekly_resources
FOR ALL
USING (public.has_role(auth.uid(), 'supervisor'))
WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- Add trigger for updated_at
CREATE TRIGGER update_weekly_resources_updated_at
BEFORE UPDATE ON public.weekly_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();