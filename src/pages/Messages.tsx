import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useConversations, useMessages, Conversation } from '@/hooks/use-messages';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatView } from '@/components/messaging/ChatView';
import { NewConversationDialog } from '@/components/messaging/NewConversationDialog';
import { OfficeHoursTab } from '@/components/messaging/OfficeHoursTab';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2, Plus, ArrowLeft, MessageSquare, Users, Megaphone, HelpCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'direct' | 'group' | 'announcement' | 'question_thread' | 'office_hours';

export default function Messages() {
  const { user, userRole } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabType>('direct');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newDialogType, setNewDialogType] = useState<Conversation['type']>('direct');

  const convType = activeTab === 'office_hours' ? undefined : activeTab;
  const { conversations, loading: convsLoading, refetch } = useConversations(convType);
  const { messages, loading: msgsLoading, sendMessage } = useMessages(selectedConversation);

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const getConversationTitle = (conv: Conversation | undefined) => {
    if (!conv) return undefined;
    if (conv.title) return conv.title;
    if (conv.type === 'direct') {
      const other = conv.participants?.find(p => p.user_id !== user?.id);
      return other?.profile?.full_name || 'Direct Message';
    }
    return 'Conversation';
  };

  const handleNewConversation = (type: Conversation['type']) => {
    setNewDialogType(type);
    setNewDialogOpen(true);
  };

  const handleCreated = (conversationId: string) => {
    setSelectedConversation(conversationId);
    refetch();
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
  };

  const showList = isMobile ? !selectedConversation : true;
  const showChat = isMobile ? !!selectedConversation : true;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Messages</h1>
            <p className="text-muted-foreground text-sm">Communicate with your team</p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as TabType);
            setSelectedConversation(null);
          }}
        >
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="direct" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Direct</span>
              <span className="sm:hidden">DMs</span>
            </TabsTrigger>
            <TabsTrigger value="group" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="announcement" className="gap-1.5 text-xs sm:text-sm">
              <Megaphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Announcements</span>
              <span className="sm:hidden">News</span>
            </TabsTrigger>
            <TabsTrigger value="question_thread" className="gap-1.5 text-xs sm:text-sm">
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Q&A</span>
              <span className="sm:hidden">Q&A</span>
            </TabsTrigger>
            <TabsTrigger value="office_hours" className="gap-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Office Hours</span>
              <span className="sm:hidden">Hours</span>
            </TabsTrigger>
          </TabsList>

          {/* Office Hours has its own tab content */}
          <TabsContent value="office_hours" className="mt-4">
            <OfficeHoursTab />
          </TabsContent>

          {/* Messaging tabs */}
          {['direct', 'group', 'announcement', 'question_thread'].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-0">
              <div
                className={cn(
                  'border rounded-lg overflow-hidden mt-4',
                  'flex',
                  isMobile ? 'flex-col h-[calc(100vh-14rem)]' : 'h-[calc(100vh-14rem)]'
                )}
              >
                {/* Conversation list */}
                {showList && (
                  <div className={cn(
                    'border-r flex flex-col',
                    isMobile ? 'w-full h-full' : 'w-80 shrink-0'
                  )}>
                    <div className="p-3 border-b flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {tab === 'question_thread' ? 'Q&A Threads' : 
                         tab === 'direct' ? 'Direct Messages' :
                         tab === 'announcement' ? 'Announcements' : 'Groups'}
                      </span>
                      {(tab !== 'announcement' || userRole === 'supervisor') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleNewConversation(tab as Conversation['type'])}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {convsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ConversationList
                        conversations={conversations}
                        selectedId={selectedConversation}
                        onSelect={handleSelectConversation}
                      />
                    )}
                  </div>
                )}

                {/* Chat view */}
                {showChat && (
                  <div className={cn('flex-1 flex flex-col', isMobile && 'w-full h-full')}>
                    {isMobile && selectedConversation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start m-2"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                    )}
                    <ChatView
                      messages={messages}
                      loading={msgsLoading}
                      onSend={sendMessage}
                      conversationTitle={getConversationTitle(selectedConv)}
                      isThread={activeTab === 'question_thread'}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <NewConversationDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        defaultType={newDialogType}
        onCreated={handleCreated}
      />
    </DashboardLayout>
  );
}
