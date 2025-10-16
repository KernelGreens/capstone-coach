-- Allow first user to become supervisor if no supervisors exist
CREATE POLICY "Allow first supervisor setup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'supervisor' AND
  user_id = auth.uid() AND
  NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'supervisor'
  )
);