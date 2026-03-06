
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_status_check CHECK (status IN ('active', 'inactive', 'completed', 'on_hold'));

ALTER TABLE public.weekly_progress DROP CONSTRAINT IF EXISTS weekly_progress_status_check;
ALTER TABLE public.weekly_progress ADD CONSTRAINT weekly_progress_status_check CHECK (status IN ('pending', 'in_progress', 'submitted', 'reviewed', 'completed', 'needs_revision'));
