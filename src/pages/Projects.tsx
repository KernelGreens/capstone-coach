import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    track_id: '',
    title: '',
    description: '',
    project_type: 'mini',
    week_number: '',
    objectives: '',
    deliverables: '',
    tools_technologies: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [projectsRes, tracksRes] = await Promise.all([
      supabase.from('projects').select('*, tracks(name)').order('week_number', { ascending: true }),
      supabase.from('tracks').select('*'),
    ]);

    setProjects(projectsRes.data || []);
    setTracks(tracksRes.data || []);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.track_id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    const { error } = await supabase.from('projects').insert([{
      ...formData,
      week_number: formData.week_number ? parseInt(formData.week_number) : null,
    }]);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
      setOpen(false);
      setFormData({
        track_id: '',
        title: '',
        description: '',
        project_type: 'mini',
        week_number: '',
        objectives: '',
        deliverables: '',
        tools_technologies: '',
      });
      fetchData();
    }
  };

  const miniProjects = projects.filter(p => p.project_type === 'mini');
  const capstoneProjects = projects.filter(p => p.project_type === 'capstone');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projects Management</h1>
            <p className="text-muted-foreground">Define projects and assignments for each track</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Track *</Label>
                    <Select value={formData.track_id} onValueChange={(value) => setFormData({ ...formData, track_id: value })}>
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
                    <Label>Project Type *</Label>
                    <Select value={formData.project_type} onValueChange={(value) => setFormData({ ...formData, project_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mini">Mini Project</SelectItem>
                        <SelectItem value="capstone">Capstone Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Project Title *</Label>
                  <Input
                    placeholder="Enter project title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Week Number (optional)</Label>
                  <Input
                    type="number"
                    placeholder="Week number"
                    value={formData.week_number}
                    onChange={(e) => setFormData({ ...formData, week_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the project"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Objectives</Label>
                  <Textarea
                    placeholder="Learning objectives"
                    value={formData.objectives}
                    onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Deliverables</Label>
                  <Textarea
                    placeholder="Expected deliverables"
                    value={formData.deliverables}
                    onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Tools & Technologies</Label>
                  <Input
                    placeholder="e.g., Python, React, TensorFlow"
                    value={formData.tools_technologies}
                    onChange={(e) => setFormData({ ...formData, tools_technologies: e.target.value })}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Projects</TabsTrigger>
            <TabsTrigger value="mini">Mini Projects</TabsTrigger>
            <TabsTrigger value="capstone">Capstone Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </TabsContent>

          <TabsContent value="mini" className="space-y-4">
            {miniProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </TabsContent>

          <TabsContent value="capstone" className="space-y-4">
            {capstoneProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function ProjectCard({ project }: { project: any }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>{project.title}</CardTitle>
              <CardDescription className="mt-1">
                {project.tracks?.name} {project.week_number && `• Week ${project.week_number}`}
              </CardDescription>
            </div>
          </div>
          <Badge variant={project.project_type === 'capstone' ? 'default' : 'secondary'}>
            {project.project_type}
          </Badge>
        </div>
      </CardHeader>
      {(project.description || project.objectives || project.deliverables || project.tools_technologies) && (
        <CardContent className="space-y-3">
          {project.description && (
            <div>
              <p className="text-sm font-medium">Description:</p>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </div>
          )}
          {project.objectives && (
            <div>
              <p className="text-sm font-medium">Objectives:</p>
              <p className="text-sm text-muted-foreground">{project.objectives}</p>
            </div>
          )}
          {project.deliverables && (
            <div>
              <p className="text-sm font-medium">Deliverables:</p>
              <p className="text-sm text-muted-foreground">{project.deliverables}</p>
            </div>
          )}
          {project.tools_technologies && (
            <div>
              <p className="text-sm font-medium">Tools & Technologies:</p>
              <p className="text-sm text-muted-foreground">{project.tools_technologies}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}