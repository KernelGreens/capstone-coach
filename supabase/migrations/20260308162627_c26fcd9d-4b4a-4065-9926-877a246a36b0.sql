
-- Store WebAuthn credentials for biometric sign-in
CREATE TABLE public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name text DEFAULT 'Unknown device',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone
);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Users can manage their own credentials
CREATE POLICY "Users can manage own webauthn credentials"
ON public.webauthn_credentials
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
