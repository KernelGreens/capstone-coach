-- Drop the constraint if it exists (to handle the error)
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_user_id_fkey;

-- Add foreign key relationship between students and profiles
ALTER TABLE public.students
ADD CONSTRAINT students_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;