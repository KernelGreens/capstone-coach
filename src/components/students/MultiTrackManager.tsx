import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface MultiTrackManagerProps {
  studentId: string;
  tracks: any[];
  onUpdate?: () => void;
}

export function MultiTrackManager({ studentId, tracks, onUpdate }: MultiTrackManagerProps) {
  const [assignedTracks, setAssignedTracks] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignedTracks();
  }, [studentId]);

  const fetchAssignedTracks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('student_tracks')
      .select('*, tracks(*)')
      .eq('student_id', studentId);

    if (error) {
      console.error('Error fetching student tracks:', error);
    } else {
      setAssignedTracks(data || []);
    }
    setLoading(false);
  };

  const handleAddTrack = async () => {
    if (!selectedTrack) return;
    
    // Check if already assigned
    if (assignedTracks.some(at => at.track_id === selectedTrack)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Track is already assigned to this student',
      });
      return;
    }

    setAdding(true);
    const { error } = await supabase
      .from('student_tracks')
      .insert({
        student_id: studentId,
        track_id: selectedTrack,
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
        description: 'Track assigned successfully',
      });
      setSelectedTrack('');
      fetchAssignedTracks();
      onUpdate?.();
    }
    setAdding(false);
  };

  const handleRemoveTrack = async (studentTrackId: string) => {
    if (assignedTracks.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Student must have at least one track assigned',
      });
      return;
    }

    const { error } = await supabase
      .from('student_tracks')
      .delete()
      .eq('id', studentTrackId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Success',
        description: 'Track removed successfully',
      });
      fetchAssignedTracks();
      onUpdate?.();
    }
  };

  const availableTracks = tracks.filter(
    t => !assignedTracks.some(at => at.track_id === t.id)
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading tracks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Assigned Tracks</Label>
      
      {/* Current Tracks */}
      <div className="flex flex-wrap gap-2">
        {assignedTracks.map((at) => (
          <Badge key={at.id} variant="secondary" className="gap-1 pr-1">
            {at.tracks?.name}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
              onClick={() => handleRemoveTrack(at.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        {assignedTracks.length === 0 && (
          <span className="text-sm text-muted-foreground">No tracks assigned</span>
        )}
      </div>

      {/* Add Track */}
      {availableTracks.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedTrack} onValueChange={setSelectedTrack}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add another track..." />
            </SelectTrigger>
            <SelectContent>
              {availableTracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            onClick={handleAddTrack} 
            disabled={!selectedTrack || adding}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
