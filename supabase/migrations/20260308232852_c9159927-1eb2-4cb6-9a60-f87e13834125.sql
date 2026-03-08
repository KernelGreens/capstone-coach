
-- 1. Create security definer function to check conversation participation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE user_id = _user_id
      AND conversation_id = _conversation_id
  )
$$;

-- 2. Drop the recursive policy on conversation_participants
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

-- 3. Recreate it using the security definer function
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(auth.uid(), conversation_id)
);

-- 4. Drop the recursive policy on conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;

-- 5. Recreate it using the security definer function
CREATE POLICY "Users can view own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(auth.uid(), id)
  OR created_by = auth.uid()
);

-- 6. Fix messages SELECT policy similarly (it references conversation_participants too)
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;

CREATE POLICY "Participants can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(auth.uid(), conversation_id)
);

-- 7. Fix messages INSERT policy
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;

CREATE POLICY "Participants can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_participant(auth.uid(), conversation_id)
);
