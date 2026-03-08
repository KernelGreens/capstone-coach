
-- Replace the overly broad SELECT policy with one restricted to supervisors (who send notifications)
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;

-- Supervisors can read subscriptions of their students (to send them push notifications)
CREATE POLICY "Supervisors can read student subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM students s
    WHERE s.user_id = push_subscriptions.user_id
    AND s.supervisor_id = auth.uid()
  )
);
