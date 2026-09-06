ALTER TABLE public.weekly_progress
  ADD COLUMN IF NOT EXISTS extension_weeks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_reason text,
  ADD COLUMN IF NOT EXISTS extended_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS extended_by uuid,
  ADD COLUMN IF NOT EXISTS extension_shifted_schedule boolean NOT NULL DEFAULT false;