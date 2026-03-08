import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Track {
  id: string;
  name: string;
}

interface Criterion {
  id: string;
  track_id: string | null;
  category: string;
  criterion: string;
  weight: number;
  max_score: number;
}

export default function EvaluationCriteria() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [formData, setFormData] = useState({
    track_id: '',
    category: '',
    criterion: '',
    weight: '1',
    max_score: '10',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchCriteria();
  }, [selectedTrack]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch tracks
    const { data: tracksData } = await supabase
      .from('tracks')
      .select('id, name')
      .order('name');
    
    if (tracksData) setTracks(tracksData);
    
    await fetchCriteria();
    setLoading(false);
  };

  const fetchCriteria = async () => {
    let query = supabase
      .from('evaluation_criteria')
      .select('*')
      .order('category', { ascending: true });

    if (selectedTrack !== 'all') {
      query = query.eq('track_id', selectedTrack);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch evaluation criteria',
        variant: 'destructive',
      });
    } else {
      setCriteria(data || []);
    }
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.criterion) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const criterionData = {
      track_id: formData.track_id || null,
      category: formData.category,
      criterion: formData.criterion,
      weight: parseFloat(formData.weight),
      max_score: parseInt(formData.max_score),
    };

    if (editingCriterion) {
      const { error } = await supabase
        .from('evaluation_criteria')
        .update(criterionData)
        .eq('id', editingCriterion.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update criterion',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Criterion updated successfully',
        });
      }
    } else {
      const { error } = await supabase
        .from('evaluation_criteria')
        .insert(criterionData);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create criterion',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Criterion created successfully',
        });
      }
    }

    resetForm();
    fetchCriteria();
  };

  const handleEdit = (criterion: Criterion) => {
    setEditingCriterion(criterion);
    setFormData({
      track_id: criterion.track_id || '',
      category: criterion.category,
      criterion: criterion.criterion,
      weight: criterion.weight.toString(),
      max_score: criterion.max_score.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('evaluation_criteria')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete criterion',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Criterion deleted successfully',
      });
      fetchCriteria();
    }
  };

  const resetForm = () => {
    setFormData({
      track_id: '',
      category: '',
      criterion: '',
      weight: '1',
      max_score: '10',
    });
    setEditingCriterion(null);
    setDialogOpen(false);
  };

  const getTrackName = (trackId: string | null) => {
    if (!trackId) return 'All Tracks';
    return tracks.find((t) => t.id === trackId)?.name || 'Unknown';
  };

  const groupedCriteria = criteria.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, Criterion[]>);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Evaluation Criteria</h1>
            <p className="text-muted-foreground">Define and manage evaluation criteria for tracks</p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedTrack} onValueChange={setSelectedTrack}>
              <SelectTrigger className="w-[180px]">
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
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (!open) resetForm();
              setDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Criterion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCriterion ? 'Edit Criterion' : 'Add Evaluation Criterion'}
                  </DialogTitle>
                  <DialogDescription>
                    Define the evaluation criteria for student assessments
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="track">Track (Optional)</Label>
                    <Select
                      value={formData.track_id}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, track_id: value === 'none' ? '' : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Apply to all tracks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All Tracks</SelectItem>
                        {tracks.map((track) => (
                          <SelectItem key={track.id} value={track.id}>
                            {track.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, category: e.target.value }))
                      }
                      placeholder="e.g., Technical Skills, Communication"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="criterion">Criterion *</Label>
                    <Input
                      id="criterion"
                      value={formData.criterion}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, criterion: e.target.value }))
                      }
                      placeholder="e.g., Code Quality"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight</Label>
                      <Input
                        id="weight"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, weight: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_score">Max Score</Label>
                      <Input
                        id="max_score"
                        type="number"
                        min="1"
                        value={formData.max_score}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, max_score: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSubmit} className="flex-1">
                      {editingCriterion ? 'Update' : 'Create'} Criterion
                    </Button>
                    <Button onClick={resetForm} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {criteria.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Criteria Defined</h3>
              <p className="text-muted-foreground text-center mt-2">
                Start by adding evaluation criteria to assess student performance
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Criterion
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedCriteria).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
                <CardDescription>{items.length} criteria in this category</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criterion</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead className="text-center">Weight</TableHead>
                      <TableHead className="text-center">Max Score</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.criterion}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTrackName(item.track_id)}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{item.weight}</TableCell>
                        <TableCell className="text-center">{item.max_score}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
