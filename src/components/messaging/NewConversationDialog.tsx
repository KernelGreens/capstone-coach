import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type ConvType = 'direct' | 'group' | 'announcement' | 'question_thread';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ConvType;
  onCreated: (conversationId: string) => void;
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
}

interface Track {
  id: string;
  name: string;
}

export function NewConversationDialog({ open, onOpenChange, defaultType, onCreated }: Props) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<ConvType>(defaultType || 'direct');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchTracks();
      setType(defaultType || 'direct');
      setTitle('');
      setDescription('');
      setSelectedUsers([]);
      setSelectedTrack('');
    }
  }, [open, defaultType]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email');
    if (data) setUsers(data.filter(u => u.id !== user?.id));
  };

  const fetchTracks = async () => {
    const { data } = await supabase.from('tracks').select('id, name');
    if (data) setTracks(data);
  };

  const handleCreate = async () => {
    if (!user) return;
    if (type === 'direct' && selectedUsers.length !== 1) {
      toast({ title: 'Error', description: 'Select exactly one user for direct message', variant: 'destructive' });
      return;
    }
    if ((type === 'group' || type === 'announcement') && !title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }
    if (type === 'question_thread' && !title.trim()) {
      toast({ title: 'Error', description: 'Question title is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({
          type,
          title: type === 'direct' ? null : title,
          description: description || null,
          track_id: selectedTrack && selectedTrack !== 'none' ? selectedTrack : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as participant
      const participants = [
        { conversation_id: conv.id, user_id: user.id },
        ...selectedUsers.map(uid => ({ conversation_id: conv.id, user_id: uid })),
      ];

      const { error: pError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (pError) throw pError;

      // For announcements, add initial message
      if (type === 'announcement' && description) {
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: description,
        });
      }

      toast({ title: 'Success', description: 'Conversation created' });
      onCreated(conv.id);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = (userId: string) => {
    if (type === 'direct') {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {type === 'direct' ? 'New Direct Message' :
             type === 'group' ? 'New Group Chat' :
             type === 'announcement' ? 'New Announcement' :
             'New Question Thread'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {!defaultType && (
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ConvType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct Message</SelectItem>
                  <SelectItem value="group">Group Chat</SelectItem>
                  {userRole === 'supervisor' && (
                    <SelectItem value="announcement">Announcement</SelectItem>
                  )}
                  <SelectItem value="question_thread">Question Thread</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type !== 'direct' && (
            <div className="space-y-2">
              <Label>{type === 'question_thread' ? 'Question' : 'Title'}</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={type === 'question_thread' ? 'What is your question?' : 'Conversation title'}
              />
            </div>
          )}

          {(type === 'group' || type === 'announcement') && (
            <div className="space-y-2">
              <Label>Track (optional)</Label>
              <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific track</SelectItem>
                  {tracks.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'announcement' && (
            <div className="space-y-2">
              <Label>Announcement Message</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Write your announcement..."
                rows={3}
              />
            </div>
          )}

          {type === 'question_thread' && (
            <div className="space-y-2">
              <Label>Details (optional)</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add more context..."
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {type === 'direct' ? 'Select User' : 'Add Participants'}
            </Label>
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-2 space-y-1">
                {users.map(u => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedUsers.includes(u.id)}
                      onCheckedChange={() => toggleUser(u.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </label>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
