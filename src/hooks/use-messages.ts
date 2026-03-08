import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'announcement' | 'question_thread';
  title: string | null;
  description: string | null;
  track_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  participants?: Participant[];
  last_message?: Message | null;
  unread_count?: number;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  profile?: { full_name: string; email: string; avatar_url: string | null };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  parent_message_id: string | null;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  sender_profile?: { full_name: string; avatar_url: string | null };
  replies?: Message[];
}

export function useConversations(type?: Conversation['type']) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch conversations', variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (data) {
      // Fetch participants and last message for each conversation
      const enriched = await Promise.all(
        data.map(async (conv: any) => {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('*')
            .eq('conversation_id', conv.id);

          const userIds = participants?.map((p: any) => p.user_id) || [];
          const { data: profiles } = userIds.length > 0
            ? await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds)
            : { data: [] };

          const enrichedParticipants = participants?.map((p: any) => ({
            ...p,
            profile: profiles?.find((pr: any) => pr.id === p.user_id),
          })) || [];

          // Last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Unread count
          const myParticipant = enrichedParticipants.find((p: any) => p.user_id === user.id);
          let unreadCount = 0;
          if (myParticipant?.last_read_at) {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .gt('created_at', myParticipant.last_read_at)
              .neq('sender_id', user.id);
            unreadCount = count || 0;
          }

          return {
            ...conv,
            participants: enrichedParticipants,
            last_message: lastMsg,
            unread_count: unreadCount,
          } as Conversation;
        })
      );

      setConversations(enriched);
    }
    setLoading(false);
  }, [user, type]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('parent_message_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      setLoading(false);
      return;
    }

    if (data) {
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
      const { data: profiles } = senderIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', senderIds)
        : { data: [] };

      // Fetch replies
      const { data: allReplies } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .not('parent_message_id', 'is', null)
        .order('created_at', { ascending: true });

      const replySenderIds = [...new Set((allReplies || []).map((r: any) => r.sender_id))];
      const newSenderIds = replySenderIds.filter(id => !senderIds.includes(id));
      const { data: replyProfiles } = newSenderIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', newSenderIds)
        : { data: [] };

      const allProfiles = [...(profiles || []), ...(replyProfiles || [])];

      const enriched = data.map((m: any) => ({
        ...m,
        sender_profile: allProfiles.find((p: any) => p.id === m.sender_id),
        replies: (allReplies || [])
          .filter((r: any) => r.parent_message_id === m.id)
          .map((r: any) => ({
            ...r,
            sender_profile: allProfiles.find((p: any) => p.id === r.sender_id),
          })),
      }));

      setMessages(enriched);
    }

    // Mark as read
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    setLoading(false);
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  const sendMessage = async (content: string, parentMessageId?: string) => {
    if (!conversationId || !user) return;

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      parent_message_id: parentMessageId || null,
    });

    if (!error) {
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    return error;
  };

  return { messages, loading, sendMessage, refetch: fetchMessages };
}
