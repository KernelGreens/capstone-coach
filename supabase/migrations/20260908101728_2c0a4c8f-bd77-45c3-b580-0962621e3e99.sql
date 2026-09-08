CREATE POLICY "Deny all access to app_user_connections for authenticated"
ON public.app_user_connections
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny all access to app_user_connections for anon"
ON public.app_user_connections
FOR ALL
TO anon
USING (false)
WITH CHECK (false);