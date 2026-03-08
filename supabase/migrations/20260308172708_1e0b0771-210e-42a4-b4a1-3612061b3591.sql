
-- Conversations table (DM, group, announcement, question_thread)
CREATE TYPE public.conversation_type AS ENUM ('direct', 'group', 'announcement', 'question_thread');

CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.conversation_type NOT NULL,
  title TEXT,
  description TEXT,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_pinned BOOLEAN DEFAULT false
);

-- Conversation participants
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_edited BOOLEAN DEFAULT false
);

-- Office hours slots
CREATE TABLE public.office_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisor_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Office Hours',
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Office hours bookings
CREATE TABLE public.office_hour_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  office_hour_id UUID NOT NULL REFERENCES public.office_hours(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(office_hour_id, booking_date, start_time)
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_hour_bookings ENABLE ROW LEVEL SECURITY;

-- Conversations: users can see conversations they participate in
CREATE POLICY "Users can view own conversations" ON public.conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);

-- Supervisors can create conversations
CREATE POLICY "Authenticated users can create conversations" ON public.conversations
FOR INSERT WITH CHECK (created_by = auth.uid());

-- Creators can update their conversations
CREATE POLICY "Creators can update conversations" ON public.conversations
FOR UPDATE USING (created_by = auth.uid());

-- Creators can delete their conversations
CREATE POLICY "Creators can delete conversations" ON public.conversations
FOR DELETE USING (created_by = auth.uid());

-- Participants: users can see participants of their conversations
CREATE POLICY "Users can view conversation participants" ON public.conversation_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
  )
);

-- Conversation creators can manage participants
CREATE POLICY "Conversation creators can manage participants" ON public.conversation_participants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_participants.conversation_id AND created_by = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_participants.conversation_id AND created_by = auth.uid()
  )
);

-- Users can add themselves as participants (for joining groups)
CREATE POLICY "Users can join conversations" ON public.conversation_participants
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own participant record (last_read_at)
CREATE POLICY "Users can update own participant record" ON public.conversation_participants
FOR UPDATE USING (user_id = auth.uid());

-- Messages: participants can view messages in their conversations
CREATE POLICY "Participants can view messages" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

-- Participants can send messages
CREATE POLICY "Participants can send messages" ON public.messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

-- Users can edit own messages
CREATE POLICY "Users can edit own messages" ON public.messages
FOR UPDATE USING (sender_id = auth.uid());

-- Users can delete own messages
CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE USING (sender_id = auth.uid());

-- Office hours: supervisors manage their own
CREATE POLICY "Supervisors manage own office hours" ON public.office_hours
FOR ALL USING (supervisor_id = auth.uid()) WITH CHECK (supervisor_id = auth.uid());

-- Students can view active office hours of their supervisors
CREATE POLICY "Students can view supervisor office hours" ON public.office_hours
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.supervisor_id = office_hours.supervisor_id AND students.user_id = auth.uid()
  )
);

-- Office hour bookings: students can manage own bookings
CREATE POLICY "Students can manage own bookings" ON public.office_hour_bookings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = office_hour_bookings.student_id AND students.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = office_hour_bookings.student_id AND students.user_id = auth.uid()
  )
);

-- Supervisors can view bookings for their office hours
CREATE POLICY "Supervisors can view own hour bookings" ON public.office_hour_bookings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.office_hours
    WHERE office_hours.id = office_hour_bookings.office_hour_id AND office_hours.supervisor_id = auth.uid()
  )
);

-- Supervisors can update bookings (approve/cancel)
CREATE POLICY "Supervisors can update bookings" ON public.office_hour_bookings
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.office_hours
    WHERE office_hours.id = office_hour_bookings.office_hour_id AND office_hours.supervisor_id = auth.uid()
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
