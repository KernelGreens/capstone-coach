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
import { Plus, BookOpen, Edit, Trash2, Search, Eye, Printer, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableProjectCard } from '@/components/projects/SortableProjectCard';

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deletingProject, setDeletingProject] = useState<any>(null);
  const [viewProject, setViewProject] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const { toast } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    setLoading(true);
    const [projectsRes, tracksRes] = await Promise.all([
      supabase.from('projects').select('*, tracks(name)').order('week_number', { ascending: true }),
      supabase.from('tracks').select('*'),
    ]);

    setProjects(projectsRes.data || []);
    setTracks(tracksRes.data || []);
    setLoading(false);
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

    const projectData = {
      ...formData,
      week_number: formData.week_number ? parseInt(formData.week_number) : null,
    };

    let error;
    if (editingProject) {
      const result = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', editingProject.id);
      error = result.error;
    } else {
      const result = await supabase.from('projects').insert([projectData]);
      error = result.error;
    }

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Success',
        description: editingProject ? 'Project updated successfully' : 'Project created successfully',
      });
      handleCloseDialog();
      fetchData();
    }
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setFormData({
      track_id: project.track_id,
      title: project.title,
      description: project.description || '',
      project_type: project.project_type,
      week_number: project.week_number?.toString() || '',
      objectives: project.objectives || '',
      deliverables: project.deliverables || '',
      tools_technologies: project.tools_technologies || '',
    });
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProject) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', deletingProject.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
      setDeletingProject(null);
      fetchData();
    }
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingProject(null);
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
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tracks?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrack = selectedTrack === 'all' || project.track_id === selectedTrack;
    return matchesSearch && matchesTrack;
  });

  const miniProjects = filteredProjects.filter(p => p.project_type?.toLowerCase() === 'mini');
  const capstoneProjects = filteredProjects.filter(p => p.project_type?.toLowerCase() === 'capstone');

  const downloadCSV = () => {
    const headers = ['Title', 'Track', 'Type', 'Week', 'Description', 'Objectives', 'Deliverables', 'Tools & Technologies'];
    const rows = filteredProjects.map(p => [
      p.title,
      p.tracks?.name || '',
      p.project_type,
      p.week_number || '',
      (p.description || '').replace(/\n/g, ' '),
      (p.objectives || '').replace(/\n/g, ' '),
      (p.deliverables || '').replace(/\n/g, ' '),
      p.tools_technologies || '',
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    const data = filteredProjects.map(({ id, title, tracks, project_type, week_number, description, objectives, deliverables, tools_technologies }) => ({
      title, track: tracks?.name || '', project_type, week_number, description, objectives, deliverables, tools_technologies,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const weeklyProjects = filteredProjects.filter(p => p.week_number != null).sort((a: any, b: any) => a.week_number - b.week_number);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = weeklyProjects.findIndex((p: any) => p.id === active.id);
    const newIndex = weeklyProjects.findIndex((p: any) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(weeklyProjects, oldIndex, newIndex);
    
    // Optimistically update local state with new week numbers
    const updates = reordered.map((p: any, i: number) => ({
      ...p,
      week_number: i + 1,
    }));
    
    setProjects(prev => {
      const nonWeekly = prev.filter((p: any) => p.week_number == null || !weeklyProjects.some((wp: any) => wp.id === p.id));
      return [...nonWeekly, ...updates].sort((a: any, b: any) => (a.week_number || 999) - (b.week_number || 999));
    });

    // Persist to DB
    try {
      const promises = updates.map((p: any) =>
        supabase.from('projects').update({ week_number: p.week_number }).eq('id', p.id)
      );
      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
      
      toast({ title: 'Reordered', description: 'Week numbers updated successfully' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save new order' });
      fetchData(); // rollback
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden" id="projects-header">
          <div>
            <h1 className="text-3xl font-bold">Projects Management</h1>
            <p className="text-muted-foreground">Define projects and assignments for each track</p>
          </div>
           <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={downloadCSV}>Download as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={downloadJSON}>Download as JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          <Dialog open={open} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
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
                  {editingProject ? 'Update Project' : 'Create Project'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedTrack} onValueChange={setSelectedTrack}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by track" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">
                All Projects ({filteredProjects.length})
              </TabsTrigger>
              <TabsTrigger value="mini">
                Mini Projects ({miniProjects.length})
              </TabsTrigger>
              <TabsTrigger value="capstone">
                Capstone Projects ({capstoneProjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredProjects.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No projects found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || selectedTrack !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'Create your first project to get started'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {weeklyProjects.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Weekly Projects (drag to reorder)</h3>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
                        <SortableContext items={weeklyProjects.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-4">
                            {weeklyProjects.map((project: any) => (
                              <SortableProjectCard
                                key={project.id}
                                project={project}
                                onEdit={handleEdit}
                                onDelete={setDeletingProject}
                                onView={setViewProject}
                                isDraggable
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                  {filteredProjects.filter((p: any) => p.week_number == null).length > 0 && (
                    <div>
                      {weeklyProjects.length > 0 && <h3 className="text-sm font-medium text-muted-foreground mb-2 mt-6">Other Projects</h3>}
                      {filteredProjects.filter((p: any) => p.week_number == null).map((project: any) => (
                        <div key={project.id} className="mb-4">
                          <SortableProjectCard
                            project={project}
                            onEdit={handleEdit}
                            onDelete={setDeletingProject}
                            onView={setViewProject}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="mini" className="space-y-4">
              {miniProjects.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No mini projects found</p>
                    <p className="text-sm text-muted-foreground">Create your first mini project</p>
                  </CardContent>
                </Card>
              ) : (
                miniProjects.map((project) => (
                  <SortableProjectCard
                    key={project.id}
                    project={project}
                    onEdit={handleEdit}
                    onDelete={setDeletingProject}
                    onView={setViewProject}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="capstone" className="space-y-4">
              {capstoneProjects.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No capstone projects found</p>
                    <p className="text-sm text-muted-foreground">Create your first capstone project</p>
                  </CardContent>
                </Card>
              ) : (
                capstoneProjects.map((project) => (
                  <SortableProjectCard
                    key={project.id}
                    project={project}
                    onEdit={handleEdit}
                    onDelete={setDeletingProject}
                    onView={setViewProject}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingProject?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!viewProject} onOpenChange={() => setViewProject(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {viewProject?.title}
              </DialogTitle>
            </DialogHeader>
            {viewProject && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={viewProject.project_type === 'capstone' ? 'default' : 'secondary'}>
                    {viewProject.project_type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {viewProject.tracks?.name}
                  </span>
                  {viewProject.week_number && (
                    <span className="text-sm text-muted-foreground">• Week {viewProject.week_number}</span>
                  )}
                </div>
                {viewProject.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewProject.description}</p>
                  </div>
                )}
                {viewProject.objectives && (
                  <div>
                    <h4 className="font-semibold mb-2">Learning Objectives</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewProject.objectives}</p>
                  </div>
                )}
                {viewProject.deliverables && (
                  <div>
                    <h4 className="font-semibold mb-2">Deliverables</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewProject.deliverables}</p>
                  </div>
                )}
                {viewProject.tools_technologies && (
                  <div>
                    <h4 className="font-semibold mb-2">Tools & Technologies</h4>
                    <p className="text-sm text-muted-foreground">{viewProject.tools_technologies}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}