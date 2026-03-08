import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Save, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CurriculumWeek {
  week_number: number;
  week_focus: string;
  objectives: string;
  tasks: string;
  deliverables: string;
  tools_technologies: string;
}

interface ManualCurriculumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackName: string;
  onSaved: () => void;
}

const emptyWeek = (weekNumber: number): CurriculumWeek => ({
  week_number: weekNumber,
  week_focus: '',
  objectives: '',
  tasks: '',
  deliverables: '',
  tools_technologies: '',
});

export function ManualCurriculumDialog({
  open,
  onOpenChange,
  trackId,
  trackName,
  onSaved,
}: ManualCurriculumDialogProps) {
  const [weeks, setWeeks] = useState<CurriculumWeek[]>([emptyWeek(1)]);
  const [saving, setSaving] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const { toast } = useToast();

  const addWeek = () => {
    const nextNumber = weeks.length + 1;
    setWeeks(prev => [...prev, emptyWeek(nextNumber)]);
    setExpandedWeeks(prev => new Set([...prev, nextNumber]));
  };

  const removeWeek = (weekNumber: number) => {
    if (weeks.length <= 1) return;
    const updated = weeks
      .filter(w => w.week_number !== weekNumber)
      .map((w, i) => ({ ...w, week_number: i + 1 }));
    setWeeks(updated);
    setExpandedWeeks(prev => {
      const next = new Set<number>();
      prev.forEach(n => {
        if (n < weekNumber) next.add(n);
        else if (n > weekNumber) next.add(n - 1);
      });
      return next;
    });
  };

  const updateWeek = (weekNumber: number, field: keyof CurriculumWeek, value: string) => {
    setWeeks(prev =>
      prev.map(w => w.week_number === weekNumber ? { ...w, [field]: value } : w)
    );
  };

  const toggleExpanded = (weekNumber: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekNumber)) next.delete(weekNumber);
      else next.add(weekNumber);
      return next;
    });
  };

  const saveCurriculum = async () => {
    const validWeeks = weeks.filter(w => w.week_focus.trim());
    if (validWeeks.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'At least one week with a focus is required.' });
      return;
    }

    setSaving(true);
    try {
      const projects = validWeeks.map(w => ({
        track_id: trackId,
        title: w.week_focus,
        description: `**Objectives:**\n${w.objectives}\n\n**Tasks:**\n${w.tasks}`,
        objectives: w.objectives,
        deliverables: w.deliverables,
        tools_technologies: w.tools_technologies,
        week_number: w.week_number,
        project_type: 'weekly',
      }));

      const { error } = await supabase.from('projects').insert(projects);
      if (error) throw error;

      toast({ title: 'Curriculum saved', description: `${validWeeks.length} weeks added to "${trackName}"` });
      onSaved();
      handleClose();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setWeeks([emptyWeek(1)]);
    setExpandedWeeks(new Set([1]));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manual Curriculum Builder</DialogTitle>
          <DialogDescription>
            Create a weekly curriculum for "{trackName}" manually
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{weeks.length} week{weeks.length !== 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addWeek}>
              <Plus className="mr-1 h-4 w-4" />
              Add Week
            </Button>
            <Button size="sm" onClick={saveCurriculum} disabled={saving}>
              {saving ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-1 h-4 w-4" />Save Curriculum</>
              )}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3 pb-4">
            {weeks.map((week) => (
              <Card key={week.week_number} className="overflow-hidden">
                <CardHeader
                  className="py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleExpanded(week.week_number)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline">Week {week.week_number}</Badge>
                      <span className="text-sm text-muted-foreground truncate">
                        {week.week_focus || 'Untitled week'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {weeks.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); removeWeek(week.week_number); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {expandedWeeks.has(week.week_number) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {expandedWeeks.has(week.week_number) && (
                  <CardContent className="pt-0 space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Week Focus *</Label>
                      <Input
                        value={week.week_focus}
                        onChange={(e) => updateWeek(week.week_number, 'week_focus', e.target.value)}
                        placeholder="e.g., Introduction to Cloud Computing"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Learning Objectives</Label>
                      <Textarea
                        value={week.objectives}
                        onChange={(e) => updateWeek(week.week_number, 'objectives', e.target.value)}
                        placeholder="One objective per line"
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tasks</Label>
                      <Textarea
                        value={week.tasks}
                        onChange={(e) => updateWeek(week.week_number, 'tasks', e.target.value)}
                        placeholder="Describe specific tasks for this week"
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Deliverables</Label>
                      <Textarea
                        value={week.deliverables}
                        onChange={(e) => updateWeek(week.week_number, 'deliverables', e.target.value)}
                        placeholder="What should the intern produce?"
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tools & Technologies</Label>
                      <Input
                        value={week.tools_technologies}
                        onChange={(e) => updateWeek(week.week_number, 'tools_technologies', e.target.value)}
                        placeholder="e.g., AWS, Docker, Python"
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
