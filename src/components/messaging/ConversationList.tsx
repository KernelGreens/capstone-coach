import { Conversation } from '@/hooks/use-messages';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Users, Megaphone, HelpCircle } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const typeIcons = {
  direct: MessageSquare,
  group: Users,
  announcement: Megaphone,
  question_thread: HelpCircle,
};

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const { user } = useAuth();

  const getConversationName = (conv: Conversation) => {
    if (conv.title) return conv.title;
    if (conv.type === 'direct') {
      const other = conv.participants?.find(p => p.user_id !== user?.id);
      return other?.profile?.full_name || 'Direct Message';
    }
    return 'Conversation';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map(conv => {
          const Icon = typeIcons[conv.type];
          const name = getConversationName(conv);
          const isSelected = conv.id === selectedId;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                isSelected
                  ? 'bg-primary/10 text-foreground'
                  : 'hover:bg-muted/50 text-foreground'
              )}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {conv.type === 'direct' ? getInitials(name) : <Icon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{name}</span>
                  {conv.last_message && (
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.last_message?.content || 'No messages yet'}
                  </p>
                  {(conv.unread_count || 0) > 0 && (
                    <Badge variant="default" className="ml-2 h-5 min-w-5 flex items-center justify-center rounded-full text-xs px-1.5">
                      {conv.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
