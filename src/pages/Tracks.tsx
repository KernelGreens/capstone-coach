import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Target, Edit2 } from 'lucide-react';

export default function Tracks() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    const { data } = await supabase.from('tracks').select('*').order('created_at', { ascending: false });
    setTracks(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Track name is required',
      });
      return;
    }

    try {
      if (editingTrack) {
        const { error } = await supabase
          .from('tracks')
          .update(formData)
          .eq('id', editingTrack.id);
        
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Track updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('tracks')
          .insert([{ ...formData, created_by: user?.id }]);
        
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Track created successfully',
        });
      }

      setOpen(false);
      setFormData({ name: '', description: '' });
      setEditingTrack(null);
      fetchTracks();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const openEditDialog = (track: any) => {
    setEditingTrack(track);
    setFormData({ name: track.name, description: track.description || '' });
    setOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tracks Management</h1>
            <p className="text-muted-foreground">Manage internship tracks and specializations</p>
          </div>
          <Dialog open={open} onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setEditingTrack(null);
              setFormData({ name: '', description: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Track
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTrack ? 'Edit Track' : 'Create New Track'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Track Name</Label>
                  <Input
                    placeholder="e.g., Cybersecurity, Application Development"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the track and its focus areas"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingTrack ? 'Update Track' : 'Create Track'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <Card key={track.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{track.name}</CardTitle>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(track)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="mt-2">
                  {track.description || 'No description provided'}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}