import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Target, Edit2, Trash2, Loader2, Search, Users, BookOpen, Sparkles, ClipboardList } from 'lucide-react';
import { CurriculumGeneratorDialog } from '@/components/tracks/CurriculumGeneratorDialog';
import { ManualCurriculumDialog } from '@/components/tracks/ManualCurriculumDialog';

export default function Tracks() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<any[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [manualCurriculumOpen, setManualCurriculumOpen] = useState(false);
  const [curriculumTrack, setCurriculumTrack] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchTracks();
  }, []);

  useEffect(() => {
    filterTracks();
  }, [tracks, searchQuery]);

  const fetchTracks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tracks')
      .select(`
        *,
        students:students(count),
        projects:projects(count)
      `)
      .order('created_at', { ascending: false });
    
    const tracksWithCounts = (data || []).map(track => ({
      ...track,
      studentCount: track.students?.[0]?.count || 0,
      projectCount: track.projects?.[0]?.count || 0,
    }));
    
    setTracks(tracksWithCounts);
    setLoading(false);
  };

  const filterTracks = () => {
    let filtered = [...tracks];

    if (searchQuery) {
      filtered = filtered.filter(track =>
        track.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTracks(filtered);
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

    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTrack) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', selectedTrack.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Track deleted successfully',
      });

      setDeleteOpen(false);
      setSelectedTrack(null);
      fetchTracks();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (track: any) => {
    setEditingTrack(track);
    setFormData({ name: track.name, description: track.description || '' });
    setOpen(true);
  };

  const openDeleteDialog = (track: any) => {
    setSelectedTrack(track);
    setDeleteOpen(true);
  };

  const openViewDialog = (track: any) => {
    setSelectedTrack(track);
    setViewOpen(true);
  };

  const openCurriculumGenerator = (track: any) => {
    setCurriculumTrack(track);
    setCurriculumOpen(true);
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
                <DialogDescription>
                  {editingTrack ? 'Update track information' : 'Add a new internship track'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Track Name *</Label>
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
                <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingTrack ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>{editingTrack ? 'Update Track' : 'Create Track'}</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tracks by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTracks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No tracks found</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search' : 'Get started by creating your first track'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Track
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTracks.map((track) => (
              <Card key={track.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openViewDialog(track)}>
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
                  </div>
                  <CardDescription className="mt-2 line-clamp-2">
                    {track.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{track.studentCount} students</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{track.projectCount} projects</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(track)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(track)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Track Dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {selectedTrack?.name}
              </DialogTitle>
              <DialogDescription>Track details and statistics</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Description</Label>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedTrack?.description || 'No description provided'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Enrolled Students</CardDescription>
                    <CardTitle className="text-3xl">{selectedTrack?.studentCount || 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Assigned Projects</CardDescription>
                    <CardTitle className="text-3xl">{selectedTrack?.projectCount || 0}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Created</Label>
                <p className="text-sm mt-1">
                  {selectedTrack?.created_at ? new Date(selectedTrack.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setViewOpen(false);
                    openCurriculumGenerator(selectedTrack);
                  }}
                  className="flex-1"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Curriculum
                </Button>
                <Button onClick={() => {
                  setViewOpen(false);
                  openEditDialog(selectedTrack);
                }} className="flex-1">
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Track
                </Button>
                <Button variant="destructive" onClick={() => {
                  setViewOpen(false);
                  openDeleteDialog(selectedTrack);
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Track</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedTrack?.name}"? This action cannot be undone and will affect {selectedTrack?.studentCount} students and {selectedTrack?.projectCount} projects.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Track'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AI Curriculum Generator Dialog */}
        {curriculumTrack && (
          <CurriculumGeneratorDialog
            open={curriculumOpen}
            onOpenChange={setCurriculumOpen}
            trackId={curriculumTrack.id}
            trackName={curriculumTrack.name}
            trackDescription={curriculumTrack.description || ''}
            onSaved={fetchTracks}
          />
        )}
      </div>
    </DashboardLayout>
  );
}