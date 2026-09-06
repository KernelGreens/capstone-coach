import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarClock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExtendWeekDialogProps {
  weekProgress: any;
  student: any;
  onUpdate?: () => void;
}

export function ExtendWeekDialog({ weekProgress, student, onUpdate }: ExtendWeekDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weeks, setWeeks] = useState(String(weekProgress.extension_weeks || 1));
  const [reason, setReason] = useState(weekProgress.extension_reason || '');
  const [shift, setShift] = useState<boolean>(!!weekProgress.extension_shifted_schedule);
  const { toast } = useToast();

  const isExtended = (weekProgress.extension_weeks || 0) > 0;

  const handleSave = async () => {
    const extra = parseInt(weeks, 10);
    if (!extra || extra < 1) {
      toast({ variant: 'destructive', title: 'Error', description: 'Enter at least 1 extra week' });
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('weekly_progress')
        .update({
          extension_weeks: extra,
          extension_reason: reason || null,
          extended_at: new Date().toISOString(),
          extended_by: userData.user?.id ?? null,
          extension_shifted_schedule: shift,
          status: weekProgress.status === 'completed' ? weekProgress.status : 'in_progress',
        })
        .eq('id', weekProgress.id);
      if (error) throw error;

      // Optionally push the rest of the schedule back by the same number of weeks
      const previousShift = weekProgress.extension_shifted_schedule
        ? weekProgress.extension_weeks || 0
        : 0;
      const delta = (shift ? extra : 0) - previousShift;
      if (delta !== 0 && student?.end_date) {
        const newEnd = new Date(student.end_date);
        newEnd.setDate(newEnd.getDate() + delta * 7);
        await supabase
          .from('students')
          .update({ end_date: newEnd.toISOString().split('T')[0] })
          .eq('id', student.id);
      }

      // Let the student know
      if (student?.user_id) {
        await supabase.from('notifications').insert({
          user_id: student.user_id,
          title: `Week ${weekProgress.week_number} extended`,
          message: `Your mentor extended this topic by ${extra} week${extra > 1 ? 's' : ''}${
            reason ? `: ${reason}` : '.'
          }`,
          type: 'progress',
          related_id: weekProgress.id,
        });
      }

      toast({ title: 'Extension saved', description: 'The student now sees the new timeline.' });
      setOpen(false);
      onUpdate?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('weekly_progress')
        .update({
          extension_weeks: 0,
          extension_reason: null,
          extended_at: null,
          extended_by: null,
          extension_shifted_schedule: false,
        })
        .eq('id', weekProgress.id);
      if (error) throw error;

      if (weekProgress.extension_shifted_schedule && student?.end_date) {
        const newEnd = new Date(student.end_date);
        newEnd.setDate(newEnd.getDate() - (weekProgress.extension_weeks || 0) * 7);
        await supabase
          .from('students')
          .update({ end_date: newEnd.toISOString().split('T')[0] })
          .eq('id', student.id);
      }

      toast({ title: 'Extension removed' });
      setOpen(false);
      onUpdate?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const extra = parseInt(weeks, 10) || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarClock className="h-4 w-4" />
          {isExtended ? 'Edit extension' : 'Needs more time'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Week {weekProgress.week_number} is running long</DialogTitle>
          <DialogDescription>
            Keep this topic open for longer and tell the student why.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Extra weeks needed</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
            />
            {extra > 0 && (
              <p className="text-xs text-muted-foreground">
                Week {weekProgress.week_number} will run through week {weekProgress.week_number + extra}.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reason (shown to the student)</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Extra time needed to finish the data cleaning exercise"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="shift-schedule"
              checked={shift}
              onCheckedChange={(v) => setShift(!!v)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="shift-schedule" className="cursor-pointer">
                Push the rest of the schedule back
              </Label>
              <p className="text-xs text-muted-foreground">
                Moves the internship end date later by the same number of weeks. Leave unticked to keep
                the original end date.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {isExtended && (
            <Button variant="ghost" onClick={handleRemove} disabled={saving}>
              Remove extension
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
