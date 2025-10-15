import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Link as LinkIcon, Video, BookOpen, Plus, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  url: string;
  file_path: string;
  track_id: string;
  tracks?: {
    name: string;
  };
}

export default function Resources() {
  const { userRole, user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'link',
    url: '',
    track_id: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchResources();
    fetchTracks();
  }, []);

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        tracks(name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setResources(data);
    }
  };

  const fetchTracks = async () => {
    const { data } = await supabase.from('tracks').select('id, name');
    if (data) setTracks(data);
  };

  const handleCreateResource = async () => {
    if (!formData.title || !formData.resource_type) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('resources').insert({
      ...formData,
      created_by: user?.id,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create resource',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Resource added successfully',
      });
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        resource_type: 'link',
        url: '',
        track_id: '',
      });
      fetchResources();
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      case 'link':
        return <LinkIcon className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-purple-100 text-purple-800';
      case 'document':
        return 'bg-blue-100 text-blue-800';
      case 'link':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
            <p className="text-muted-foreground">Learning materials and references</p>
          </div>
          {userRole === 'supervisor' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Resource</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Resource title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the resource"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="resource_type">Type</Label>
                      <Select
                        value={formData.resource_type}
                        onValueChange={(value) => setFormData({ ...formData, resource_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="document">Document</SelectItem>
                          <SelectItem value="tutorial">Tutorial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="track_id">Track (Optional)</Label>
                      <Select
                        value={formData.track_id}
                        onValueChange={(value) => setFormData({ ...formData, track_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select track" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Tracks</SelectItem>
                          {tracks.map((track) => (
                            <SelectItem key={track.id} value={track.id}>
                              {track.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <Button onClick={handleCreateResource} className="w-full">
                    Add Resource
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {getResourceIcon(resource.resource_type)}
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                  </div>
                  <Badge className={getResourceTypeColor(resource.resource_type)}>
                    {resource.resource_type}
                  </Badge>
                </div>
                {resource.tracks && (
                  <p className="text-sm text-muted-foreground">{resource.tracks.name}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{resource.description}</p>
                {resource.url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Open Resource
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
