import { useState, useRef, useEffect } from 'react';
import { Message } from '@/hooks/use-messages';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Send, Reply, Loader2, MessageSquare } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatViewProps {
  messages: Message[];
  loading: boolean;
  onSend: (content: string, parentId?: string) => Promise<any>;
  conversationTitle?: string;
  isThread?: boolean;
}

export function ChatView({ messages, loading, onSend, conversationTitle, isThread }: ChatViewProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setSending(true);
    const error = await onSend(trimmed, replyTo?.id);
    if (!error) {
      setInput('');
      setReplyTo(null);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (!conversationTitle) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Select a conversation</h3>
        <p className="text-sm text-muted-foreground mt-1">Choose a conversation from the list to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 shrink-0">
        <h3 className="font-semibold text-sm">{conversationTitle}</h3>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender_id === user?.id;
            const senderName = msg.sender_profile?.full_name || 'Unknown';

            return (
              <div key={msg.id} className="space-y-2">
                <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(senderName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className={cn('max-w-[75%] space-y-1', isOwn && 'items-end')}>
                    <div className={cn('flex items-center gap-2', isOwn && 'flex-row-reverse')}>
                      <span className="text-xs font-medium">{senderName}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), 'p')}
                      </span>
                    </div>

                    <div
                      className={cn(
                        'rounded-xl px-3 py-2 text-sm',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted rounded-tl-sm'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>

                    {!isThread && (
                      <div className={cn('flex items-center gap-2', isOwn && 'flex-row-reverse')}>
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Reply className="h-3 w-3" />
                          Reply
                        </button>
                        {(msg.replies?.length || 0) > 0 && (
                          <span className="text-xs text-primary">
                            {msg.replies?.length} {msg.replies?.length === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline replies */}
                {!isThread && msg.replies && msg.replies.length > 0 && (
                  <div className="ml-11 space-y-2 border-l-2 border-primary/20 pl-3">
                    {msg.replies.map(reply => {
                      const isReplyOwn = reply.sender_id === user?.id;
                      const replyName = reply.sender_profile?.full_name || 'Unknown';

                      return (
                        <div key={reply.id} className="flex gap-2">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                              {getInitials(replyName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{replyName}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(reply.created_at), 'p')}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap break-words">{reply.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 border-t bg-muted/50 flex items-center justify-between">
          <div className="text-xs text-muted-foreground truncate">
            <Reply className="h-3 w-3 inline mr-1" />
            Replying to <span className="font-medium">{replyTo.sender_profile?.full_name}</span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-xs text-muted-foreground hover:text-foreground ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <EmojiPicker onSelect={handleEmojiSelect} />
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className={cn(
              "resize-none text-sm",
              isMobile ? "min-h-[60px] max-h-[150px]" : "min-h-[40px] max-h-[120px]"
            )}
            rows={isMobile ? 2 : 1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
