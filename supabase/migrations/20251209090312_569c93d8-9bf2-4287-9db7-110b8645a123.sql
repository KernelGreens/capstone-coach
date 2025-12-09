-- Drop the existing constraint and add a new one that includes 'weekly'
ALTER TABLE public.projects DROP CONSTRAINT projects_project_type_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_project_type_check CHECK (project_type = ANY (ARRAY['mini'::text, 'capstone'::text, 'weekly'::text]));