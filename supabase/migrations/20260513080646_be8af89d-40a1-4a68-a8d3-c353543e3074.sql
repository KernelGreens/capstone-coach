CREATE OR REPLACE FUNCTION public._debug_lookup_user(_email text)
RETURNS TABLE(id uuid, email text, created_at timestamptz, confirmed_at timestamptz, last_sign_in_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT id, email, created_at, email_confirmed_at, last_sign_in_at FROM auth.users WHERE email = _email;
$$;