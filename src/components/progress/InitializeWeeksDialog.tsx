import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar } from 'lucide-react';

interface InitializeWeeksDialogProps {
  studentId: string;
  trackId: string | null;
  startDate: string;
  endDate: string;
  onSuccess?: () => void;
}

export function InitializeWeeksDialog({ studentId, trackId, startDate, endDate, onSuccess }: InitializeWeeksDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalWeeks, setTotalWeeks] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open && trackId) {
      fetchProjects();
    }
  }, [open, trackId]);

  const fetchProjects = async () => {
    if (!trackId) return;
    
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('track_id', trackId)
      .order('week_number', { ascending: true });
    
    setProjects(data || []);
  };

  const calculateDefaultWeeks = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
  };

  const extractTasks = (description: string | null): string => {
    if (!description) return '';
    
    // Try to extract tasks section from description
    const tasksMatch = description.match(/\*\*Tasks:\*\*\s*([\s\S]*?)(?=\n\n|$)/i);
    if (tasksMatch) {
      return tasksMatch[1].trim();
    }
    
    // Also check for numbered tasks pattern
    const numberedTasks = description.match(/\d+\.\s+[^\n]+/g);
    if (numberedTasks) {
      return numberedTasks.join('\n');
    }
    
    return '';
  };

  const handleInitialize = async () => {
    if (!totalWeeks || parseInt(totalWeeks) < 1) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a valid number of weeks',
      });
      return;
    }

    setLoading(true);
    try {
      const weeks = parseInt(totalWeeks);
      const weekRecords = [];

      for (let i = 1; i <= weeks; i++) {
        // Find matching project for this week
        const weekProject = projects.find(p => p.week_number === i);
        
        weekRecords.push({
          student_id: studentId,
          week_number: i,
          status: 'pending',
          week_focus: weekProject?.title || `Week ${i}`,
          tasks: weekProject ? extractTasks(weekProject.description) : '',
          project_id: weekProject?.id || null,
        });
      }

      const { error } = await supabase
        .from('weekly_progress')
        .insert(weekRecords);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Initialized ${weeks} weeks of progress tracking with curriculum tasks`,
      });

      setOpen(false);
      setTotalWeeks('');
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Initialize Weeks
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Initialize Weekly Progress</DialogTitle>
          <DialogDescription>
            Set up weekly progress tracking with curriculum tasks for this student's internship.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-1">Internship Period</p>
            <p className="text-muted-foreground">
              {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </p>
            <p className="text-muted-foreground mt-2">
              Suggested: <span className="font-medium">{calculateDefaultWeeks()} weeks</span>
            </p>
            {projects.length > 0 && (
              <p className="text-muted-foreground mt-1">
                <span className="font-medium">{projects.length}</span> curriculum projects will be linked
              </p>
            )}
          </div>
          <div>
            <Label>Number of Weeks</Label>
            <Input
              type="number"
              min="1"
              placeholder="Enter number of weeks"
              value={totalWeeks}
              onChange={(e) => setTotalWeeks(e.target.value)}
            />
          </div>
          <Button onClick={handleInitialize} className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              'Initialize Progress Tracking'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
