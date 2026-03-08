import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Plus, ExternalLink, Trash2, Play } from 'lucide-react';
import { getContentTypeConfig } from '@/components/resources/contentTypes';
import { ContentTypeSelect } from '@/components/resources/ContentTypeSelect';
import { ContentViewer } from '@/components/resources/ContentViewer';

interface WeeklyResourcesSectionProps {
  trackId: string;
  weekNumber: number;
  canEdit?: boolean;
}

export function WeeklyResourcesSection({ trackId, weekNumber, canEdit = false }: WeeklyResourcesSectionProps) {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    resource_type: 'link',
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchResources();
  }, [trackId, weekNumber]);

  const fetchResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('weekly_resources')
      .select('*')
      .eq('track_id', trackId)
      .eq('week_number', weekNumber)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching resources:', error);
    } else {
      setResources(data || []);
    }
    setLoading(false);
  };

  const handleAddResource = async () => {
    if (!formData.title || !formData.url) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Title and URL are required',
      });
      return;
    }

    const { error } = await supabase.from('weekly_resources').insert({
      track_id: trackId,
      week_number: weekNumber,
      title: formData.title,
      description: formData.description,
      url: formData.url,
      resource_type: formData.resource_type,
      created_by: user?.id,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Success',
        description: 'Resource added successfully',
      });
      setDialogOpen(false);
      setFormData({ title: '', description: '', url: '', resource_type: 'link' });
      fetchResources();
    }
  };

  const handleDeleteResource = async (id: string) => {
    const { error } = await supabase.from('weekly_resources').delete().eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Success',
        description: 'Resource deleted',
      });
      fetchResources();
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Video;
      case 'document':
        return FileText;
      case 'tutorial':
        return BookOpen;
      default:
        return LinkIcon;
    }
  };

  if (loading) {
    return null;
  }

  if (resources.length === 0 && !canEdit) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Learning Resources
        </h4>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Learning Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Resource title"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={formData.resource_type}
                    onValueChange={(v) => setFormData({ ...formData, resource_type: v })}
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
                <div>
                  <Label>URL *</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleAddResource} className="w-full">
                  Add Resource
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {resources.length === 0 ? (
        <p className="text-xs text-muted-foreground">No resources added for this week</p>
      ) : (
        <div className="space-y-2">
          {resources.map((resource) => {
            const Icon = getResourceIcon(resource.resource_type);
            return (
              <div
                key={resource.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{resource.title}</p>
                    {resource.description && (
                      <p className="text-xs text-muted-foreground truncate">{resource.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {resource.resource_type}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteResource(resource.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
