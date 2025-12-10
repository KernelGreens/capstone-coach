-- Add project_id to weekly_progress to link student progress with curriculum projects
ALTER TABLE public.weekly_progress 
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX idx_weekly_progress_project_id ON public.weekly_progress(project_id);