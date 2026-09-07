ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS calendar_uid text,
  ADD COLUMN IF NOT EXISTS calendar_sequence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_event_id text;

UPDATE public.meetings SET calendar_uid = id::text || '@capstone-coach.lovable.app' WHERE calendar_uid IS NULL;

CREATE TABLE IF NOT EXISTS public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;