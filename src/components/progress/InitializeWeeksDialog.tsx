import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar } from 'lucide-react';

export interface InitializeCandidate {
  id: string;
  track_id: string | null;
  start_date: string;
  end_date: string;
  full_name: string;
  track_name?: string | null;
}

interface InitializeWeeksDialogProps {
  /** All students the supervisor can initialize weeks for */
  students: InitializeCandidate[];
  /** Pre-selected student id (usually the currently viewed one) */
  defaultStudentId?: string;
  onSuccess?: () => void;
}

const weeksBetween = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
};

const extractTasks = (description: string | null): string => {
  if (!description) return '';
  const tasksMatch = description.match(/\*\*Tasks:\*\*\s*([\s\S]*?)(?=\n\n|$)/i);
  if (tasksMatch) return tasksMatch[1].trim();
  const numberedTasks = description.match(/\d+\.\s+[^\n]+/g);
  if (numberedTasks) return numberedTasks.join('\n');
  return '';
};

export function InitializeWeeksDialog({ students, defaultStudentId, onSuccess }: InitializeWeeksDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [totalWeeks, setTotalWeeks] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initializedIds, setInitializedIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setChecking(true);
      const ids = students.map(s => s.id);
      let existing: string[] = [];
      if (ids.length > 0) {
        const { data } = await supabase
          .from('weekly_progress')
          .select('student_id')
          .in('student_id', ids);
        existing = Array.from(new Set((data || []).map((r: any) => r.student_id)));
      }
      setInitializedIds(existing);
      const available = students.filter(s => !existing.includes(s.id));
      setSelectedIds(
        defaultStudentId && available.some(s => s.id === defaultStudentId)
          ? [defaultStudentId]
          : []
      );
      setChecking(false);
    };
    load();
  }, [open, students, defaultStudentId]);

  const available = students.filter(s => !initializedIds.includes(s.id));
  const selectedStudents = available.filter(s => selectedIds.includes(s.id));

  const suggestedWeeks = selectedStudents.length
    ? Math.max(...selectedStudents.map(s => weeksBetween(s.start_date, s.end_date)))
    : 0;

  const toggle = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setSelectedIds(prev => (prev.length === available.length ? [] : available.map(s => s.id)));
  };

  const handleInitialize = async () => {
    if (selectedStudents.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Select at least one mentee' });
      return;
    }

    setLoading(true);
    try {
      // Fetch curriculum projects for every distinct track in one go
      const trackIds = Array.from(
        new Set(selectedStudents.map(s => s.track_id).filter(Boolean))
      ) as string[];

      const projectsByTrack: Record<string, any[]> = {};
      if (trackIds.length > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .in('track_id', trackIds)
          .order('week_number', { ascending: true });
        (projects || []).forEach((p: any) => {
          projectsByTrack[p.track_id] = [...(projectsByTrack[p.track_id] || []), p];
        });
      }

      const weekRecords: any[] = [];
      for (const student of selectedStudents) {
        const weeks = totalWeeks
          ? parseInt(totalWeeks)
          : weeksBetween(student.start_date, student.end_date);
        if (!weeks || weeks < 1) throw new Error('Please enter a valid number of weeks');

        const projects = student.track_id ? projectsByTrack[student.track_id] || [] : [];

        for (let i = 1; i <= weeks; i++) {
          const weekProject = projects.find((p: any) => p.week_number === i);
          weekRecords.push({
            student_id: student.id,
            week_number: i,
            status: 'pending',
            week_focus: weekProject?.title || `Week ${i}`,
            tasks: weekProject ? extractTasks(weekProject.description) : '',
            project_id: weekProject?.id || null,
          });
        }
      }

      const { error } = await supabase.from('weekly_progress').insert(weekRecords);
      if (error) throw error;

      toast({
        title: 'Success',
        description: `Initialized progress tracking for ${selectedStudents.length} mentee${selectedStudents.length > 1 ? 's' : ''}`,
      });

      setOpen(false);
      setTotalWeeks('');
      onSuccess?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
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
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Initialize Weekly Progress</DialogTitle>
          <DialogDescription>
            Set up weekly progress tracking with curriculum tasks for one or more mentees at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <Label>Mentees {available.length > 0 && `(${selectedIds.length}/${available.length} selected)`}</Label>
            {available.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedIds.length === available.length ? 'Clear all' : 'Select all'}
              </Button>
            )}
          </div>

          {checking ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Checking mentees...
            </div>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              All mentees already have weekly progress initialized.
            </p>
          ) : (
            <ScrollArea className="max-h-64 rounded-md border">
              <div className="p-2 space-y-1">
                {available.map(student => (
                  <label
                    key={student.id}
                    className="flex items-start gap-3 rounded-md p-2 hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(student.id)}
                      onCheckedChange={() => toggle(student.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{student.full_name}</span>
                        {student.track_name && (
                          <Badge variant="outline" className="text-xs">{student.track_name}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(student.start_date).toLocaleDateString()} –{' '}
                        {new Date(student.end_date).toLocaleDateString()} ·{' '}
                        {weeksBetween(student.start_date, student.end_date)} weeks
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="space-y-1">
            <Label>Number of Weeks (optional)</Label>
            <Input
              type="number"
              min="1"
              placeholder={
                suggestedWeeks
                  ? `Leave empty to use each mentee's own dates (up to ${suggestedWeeks} weeks)`
                  : "Leave empty to use each mentee's own dates"
              }
              value={totalWeeks}
              onChange={(e) => setTotalWeeks(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If set, the same number of weeks is applied to every selected mentee.
            </p>
          </div>
        </div>

        <Button onClick={handleInitialize} className="w-full" disabled={loading || selectedIds.length === 0}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Initializing...
            </>
          ) : (
            `Initialize Progress Tracking${selectedIds.length > 1 ? ` (${selectedIds.length} mentees)` : ''}`
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
