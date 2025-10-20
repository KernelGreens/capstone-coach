import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar } from 'lucide-react';

interface InitializeWeeksDialogProps {
  studentId: string;
  startDate: string;
  endDate: string;
  onSuccess?: () => void;
}

export function InitializeWeeksDialog({ studentId, startDate, endDate, onSuccess }: InitializeWeeksDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalWeeks, setTotalWeeks] = useState('');
  const { toast } = useToast();

  const calculateDefaultWeeks = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
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
        weekRecords.push({
          student_id: studentId,
          week_number: i,
          status: 'pending',
          week_focus: `Week ${i}`,
        });
      }

      const { error } = await supabase
        .from('weekly_progress')
        .insert(weekRecords);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Initialized ${weeks} weeks of progress tracking`,
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
            Set up weekly progress tracking for this student's entire internship period.
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
