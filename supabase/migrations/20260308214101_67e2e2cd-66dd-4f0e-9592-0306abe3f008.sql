
-- Company profiles for external companies
CREATE TABLE public.company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  description text,
  website text,
  industry text,
  location text,
  logo_url text,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company profile"
  ON public.company_profiles FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can view company profiles"
  ON public.company_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Internship listings
CREATE TABLE public.internship_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_profile_id uuid REFERENCES public.company_profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  requirements text,
  skills_required text[] DEFAULT '{}',
  track_id uuid REFERENCES public.tracks(id) ON DELETE SET NULL,
  location text,
  location_type text NOT NULL DEFAULT 'remote',
  duration_weeks integer DEFAULT 16,
  start_date date,
  application_deadline date,
  max_applicants integer,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internship_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own listings"
  ON public.internship_listings FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can view published listings"
  ON public.internship_listings FOR SELECT
  TO authenticated
  USING (status = 'published' OR created_by = auth.uid());

-- Internship applications with full pipeline
CREATE TABLE public.internship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.internship_listings(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'applied',
  cover_letter text,
  resume_url text,
  portfolio_url text,
  reviewer_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  applied_at timestamptz NOT NULL DEFAULT now(),
  shortlisted_at timestamptz,
  interviewed_at timestamptz,
  decided_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, applicant_id)
);

ALTER TABLE public.internship_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can manage own applications"
  ON public.internship_applications FOR ALL
  TO authenticated
  USING (applicant_id = auth.uid())
  WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Listing owners can view and update applications"
  ON public.internship_applications FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.internship_listings
    WHERE id = internship_applications.listing_id
    AND created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.internship_listings
    WHERE id = internship_applications.listing_id
    AND created_by = auth.uid()
  ));

-- Add 'company' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company';
