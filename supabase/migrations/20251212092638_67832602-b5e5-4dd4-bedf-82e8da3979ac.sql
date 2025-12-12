-- Remove the conflicting old policies that use auth.uid() directly
DROP POLICY IF EXISTS "Students can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Students can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors can view all files" ON storage.objects;