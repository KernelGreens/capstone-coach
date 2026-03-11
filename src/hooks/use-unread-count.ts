import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadCounts {
  total: number;
  direct: number;
  group: number;
  announcement: number;
  question_thread: number;
}

export function useUnreadMessageCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!participants || participants.length === 0) {
        setCount(0);
        return;
      }

      let total = 0;
      for (const p of participants) {
        if (p.last_read_at) {
          const { count: unread } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', p.conversation_id)
            .gt('created_at', p.last_read_at)
            .neq('sender_id', user.id);
          total += unread || 0;
        }
      }
      setCount(total);
    };

    fetchCount();

    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}

export function useUnreadCountsByType() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({
    total: 0,
    direct: 0,
    group: 0,
    announcement: 0,
    question_thread: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      // Get all conversations user participates in, with their types
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!participants || participants.length === 0) {
        setCounts({ total: 0, direct: 0, group: 0, announcement: 0, question_thread: 0 });
        return;
      }

      const convIds = participants.map(p => p.conversation_id);
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, type')
        .in('id', convIds);

      const convTypeMap: Record<string, string> = {};
      conversations?.forEach(c => { convTypeMap[c.id] = c.type; });

      const result: UnreadCounts = { total: 0, direct: 0, group: 0, announcement: 0, question_thread: 0 };

      for (const p of participants) {
        if (p.last_read_at) {
          const { count: unread } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', p.conversation_id)
            .gt('created_at', p.last_read_at)
            .neq('sender_id', user.id);
          
          const n = unread || 0;
          if (n > 0) {
            result.total += n;
            const type = convTypeMap[p.conversation_id] as keyof Omit<UnreadCounts, 'total'>;
            if (type && type in result) {
              result[type] += n;
            }
          }
        }
      }
      setCounts(result);
    };

    fetchCounts();

    const channel = supabase
      .channel('unread-messages-by-type')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return counts;
}
