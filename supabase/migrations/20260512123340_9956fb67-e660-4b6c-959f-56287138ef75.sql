DO $$
DECLARE
  uid uuid := 'b6cba462-cbe3-47c3-98c4-e4c11fe96104';
  sid uuid;
BEGIN
  SELECT id INTO sid FROM public.students WHERE user_id = uid LIMIT 1;

  -- Student-scoped data
  IF sid IS NOT NULL THEN
    DELETE FROM public.assignment_submissions WHERE student_id = sid;
    DELETE FROM public.capstone_milestones WHERE proposal_id IN (SELECT id FROM public.capstone_proposals WHERE student_id = sid);
    DELETE FROM public.capstone_presentations WHERE proposal_id IN (SELECT id FROM public.capstone_proposals WHERE student_id = sid);
    DELETE FROM public.capstone_proposals WHERE student_id = sid;
    DELETE FROM public.comments WHERE student_id = sid;
    DELETE FROM public.deliverables WHERE student_id = sid;
    DELETE FROM public.meetings WHERE student_id = sid;
    DELETE FROM public.office_hour_bookings WHERE student_id = sid;
    DELETE FROM public.portfolio_projects WHERE portfolio_id IN (SELECT id FROM public.portfolios WHERE student_id = sid);
    DELETE FROM public.portfolios WHERE student_id = sid;
    DELETE FROM public.quiz_attempts WHERE student_id = sid;
    DELETE FROM public.student_tracks WHERE student_id = sid;
    DELETE FROM public.weekly_progress WHERE student_id = sid;
    DELETE FROM public.students WHERE id = sid;
  END IF;

  -- User-scoped data
  DELETE FROM public.comments WHERE author_id = uid;
  DELETE FROM public.messages WHERE sender_id = uid;
  DELETE FROM public.conversation_participants WHERE user_id = uid;
  DELETE FROM public.conversations WHERE created_by = uid;
  DELETE FROM public.notifications WHERE user_id = uid;
  DELETE FROM public.push_subscriptions WHERE user_id = uid;
  DELETE FROM public.internship_applications WHERE applicant_id = uid;
  DELETE FROM public.coupon_redemptions WHERE user_id = uid;
  DELETE FROM public.feedback WHERE user_id = uid;
  DELETE FROM public.company_profiles WHERE user_id = uid;
  DELETE FROM public.user_roles WHERE user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;

  -- Auth account
  DELETE FROM auth.users WHERE id = uid;
END $$;