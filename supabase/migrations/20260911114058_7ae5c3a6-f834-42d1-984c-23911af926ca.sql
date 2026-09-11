
-- 1. Super admin list (replaces hardcoded email checks)
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own super admin row" ON public.super_admins;
CREATE POLICY "Users can view own super admin row" ON public.super_admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.super_admins (user_id)
SELECT id FROM public.profiles
WHERE lower(email) IN ('abiodunahmadaws@gmail.com','abiodunodukaye@gmail.com')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;

-- 2. Profile visibility
CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    _profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.students s
               WHERE s.user_id = _profile_id AND s.supervisor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.students s
               WHERE s.user_id = auth.uid() AND s.supervisor_id = _profile_id)
    OR EXISTS (SELECT 1 FROM public.students a
               JOIN public.students b ON b.supervisor_id = a.supervisor_id
               WHERE a.user_id = auth.uid() AND b.user_id = _profile_id)
    OR EXISTS (SELECT 1 FROM public.conversation_participants me
               JOIN public.conversation_participants other
                 ON other.conversation_id = me.conversation_id
               WHERE me.user_id = auth.uid() AND other.user_id = _profile_id)
    OR EXISTS (SELECT 1 FROM public.portfolios p
               JOIN public.students s ON s.id = p.student_id
               WHERE s.user_id = _profile_id AND p.is_public)
    OR public.is_super_admin(auth.uid())
$$;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view relevant profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.can_view_profile(id));
CREATE POLICY "Anyone can view public portfolio profiles" ON public.profiles
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.portfolios p
            JOIN public.students s ON s.id = p.student_id
            WHERE s.user_id = profiles.id AND p.is_public)
  );

-- 3. Notifications insert restriction
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can notify themselves and their program peers" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.students s
               WHERE s.user_id = notifications.user_id AND s.supervisor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.students s
               WHERE s.user_id = auth.uid() AND s.supervisor_id = notifications.user_id)
  );

-- 4. Replace hardcoded super-admin email policies
DROP POLICY IF EXISTS "Super admin can view all feedback" ON public.feedback;
CREATE POLICY "Super admins can view all feedback" ON public.feedback
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin can manage coupons" ON public.coupons;
CREATE POLICY "Super admins can manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin can view all redemptions" ON public.coupon_redemptions;
CREATE POLICY "Super admins can view all redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- 5. user_roles: mentors only manage their own mentees
DROP POLICY IF EXISTS "Supervisors can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisors can view all roles" ON public.user_roles;
CREATE POLICY "Supervisors can manage own mentees roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.students s
               WHERE s.user_id = user_roles.user_id AND s.supervisor_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.students s
               WHERE s.user_id = user_roles.user_id AND s.supervisor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Allow first supervisor setup" ON public.user_roles;
CREATE POLICY "Users can claim supervisor role for themselves" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'supervisor'::app_role);

-- 6. Storage: lesson files scoped to owning mentor / enrolled mentees
DROP POLICY IF EXISTS "Students can read lesson files" ON storage.objects;
CREATE POLICY "Enrolled users can read lesson files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'lessons' AND (
      EXISTS (SELECT 1 FROM public.projects p
              JOIN public.tracks t ON t.id = p.track_id
              WHERE p.id::text = (storage.foldername(name))[1]
                AND t.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.projects p
                 JOIN public.student_tracks st ON st.track_id = p.track_id
                 JOIN public.students s ON s.id = st.student_id
                 WHERE p.id::text = (storage.foldername(name))[1]
                   AND s.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Supervisors can manage lesson files" ON storage.objects;
CREATE POLICY "Supervisors can manage own lesson files" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'lessons' AND EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.tracks t ON t.id = p.track_id
      WHERE p.id::text = (storage.foldername(name))[1] AND t.created_by = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'lessons' AND EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.tracks t ON t.id = p.track_id
      WHERE p.id::text = (storage.foldername(name))[1] AND t.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Supervisors can upload lessons" ON storage.objects;
CREATE POLICY "Supervisors can upload own lessons" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'lessons' AND EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.tracks t ON t.id = p.track_id
      WHERE p.id::text = (storage.foldername(name))[1] AND t.created_by = auth.uid())
  );

-- 7. Storage: deliverables scoped to the mentor's own mentees
DROP POLICY IF EXISTS "Supervisors can manage all deliverables" ON storage.objects;
CREATE POLICY "Supervisors can manage own mentees deliverables" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'deliverables' AND (storage.foldername(name))[1] IN (
      SELECT s.id::text FROM public.students s WHERE s.supervisor_id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'deliverables' AND (storage.foldername(name))[1] IN (
      SELECT s.id::text FROM public.students s WHERE s.supervisor_id = auth.uid())
  );
