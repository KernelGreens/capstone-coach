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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Link as LinkIcon, Video, BookOpen, Plus, Trash2, Calendar } from 'lucide-react';
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

interface WeeklyResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string | null;
  track_id: string;
  week_number: number;
  tracks?: {
    name: string;
  };
}

export default function Resources() {
  const { userRole, user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [weeklyResources, setWeeklyResources] = useState<WeeklyResource[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWeeklyDialogOpen, setIsWeeklyDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'link',
    url: '',
    track_id: '',
  });
  const [weeklyFormData, setWeeklyFormData] = useState({
    title: '',
    description: '',
    resource_type: 'link',
    url: '',
    track_id: '',
    week_number: '1',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchResources();
    fetchWeeklyResources();
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

  const fetchWeeklyResources = async () => {
    const { data, error } = await supabase
      .from('weekly_resources')
      .select(`
        *,
        tracks(name)
      `)
      .order('week_number', { ascending: true });

    if (!error && data) {
      setWeeklyResources(data);
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

  const handleCreateWeeklyResource = async () => {
    if (!weeklyFormData.title || !weeklyFormData.track_id || !weeklyFormData.week_number) {
      toast({
        title: 'Error',
        description: 'Please fill in title, track, and week number',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('weekly_resources').insert({
      title: weeklyFormData.title,
      description: weeklyFormData.description || null,
      resource_type: weeklyFormData.resource_type,
      url: weeklyFormData.url || null,
      track_id: weeklyFormData.track_id,
      week_number: parseInt(weeklyFormData.week_number),
      created_by: user?.id,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create curriculum resource',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Curriculum resource added successfully',
      });
      setIsWeeklyDialogOpen(false);
      setWeeklyFormData({
        title: '',
        description: '',
        resource_type: 'link',
        url: '',
        track_id: '',
        week_number: '1',
      });
      fetchWeeklyResources();
    }
  };

  const handleDeleteWeeklyResource = async (id: string) => {
    const { error } = await supabase.from('weekly_resources').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete resource', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Resource removed' });
      fetchWeeklyResources();
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

  // Group weekly resources by track and week
  const groupedWeeklyResources = weeklyResources.reduce((acc, res) => {
    const key = `${res.tracks?.name || 'Unknown'} - Week ${res.week_number}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(res);
    return acc;
  }, {} as Record<string, WeeklyResource[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
            <p className="text-muted-foreground">Learning materials and curriculum resources</p>
          </div>
        </div>

        <Tabs defaultValue="curriculum" className="space-y-4">
          <TabsList>
            <TabsTrigger value="curriculum" className="gap-2">
              <Calendar className="h-4 w-4" />
              Curriculum Resources
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Resource Library
            </TabsTrigger>
          </TabsList>

          {/* Curriculum Resources Tab */}
          <TabsContent value="curriculum" className="space-y-4">
            {userRole === 'supervisor' && (
              <div className="flex justify-end">
                <Dialog open={isWeeklyDialogOpen} onOpenChange={setIsWeeklyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Curriculum Resource
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Curriculum Resource</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Title *</Label>
                        <Input
                          value={weeklyFormData.title}
                          onChange={(e) => setWeeklyFormData({ ...weeklyFormData, title: e.target.value })}
                          placeholder="Resource title"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={weeklyFormData.description}
                          onChange={(e) => setWeeklyFormData({ ...weeklyFormData, description: e.target.value })}
                          placeholder="Brief description"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Track *</Label>
                          <Select
                            value={weeklyFormData.track_id}
                            onValueChange={(value) => setWeeklyFormData({ ...weeklyFormData, track_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select track" />
                            </SelectTrigger>
                            <SelectContent>
                              {tracks.map((track) => (
                                <SelectItem key={track.id} value={track.id}>
                                  {track.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Week *</Label>
                          <Input
                            type="number"
                            min="1"
                            max="52"
                            value={weeklyFormData.week_number}
                            onChange={(e) => setWeeklyFormData({ ...weeklyFormData, week_number: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select
                            value={weeklyFormData.resource_type}
                            onValueChange={(value) => setWeeklyFormData({ ...weeklyFormData, resource_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="link">Link</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="tutorial">Tutorial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>URL</Label>
                        <Input
                          value={weeklyFormData.url}
                          onChange={(e) => setWeeklyFormData({ ...weeklyFormData, url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <Button onClick={handleCreateWeeklyResource} className="w-full">
                        Add to Curriculum
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {Object.keys(groupedWeeklyResources).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No curriculum resources added yet. Add resources to specific weeks for students.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedWeeklyResources).map(([group, items]) => (
                  <Card key={group}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {group}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {items.map((res) => (
                          <div key={res.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              {getResourceIcon(res.resource_type)}
                              <div>
                                <p className="font-medium">{res.title}</p>
                                {res.description && (
                                  <p className="text-sm text-muted-foreground">{res.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getResourceTypeColor(res.resource_type)}>
                                {res.resource_type}
                              </Badge>
                              {res.url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(res.url!, '_blank')}
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                              )}
                              {userRole === 'supervisor' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteWeeklyResource(res.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Resource Library Tab */}
          <TabsContent value="library" className="space-y-4">
            {userRole === 'supervisor' && (
              <div className="flex justify-end">
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
              </div>
            )}

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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
