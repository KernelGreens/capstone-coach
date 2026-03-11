import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weeklyProgressId?: string;
  projectId?: string;
  assignment?: any;
  onSuccess: () => void;
}

export function AssignmentDialog({ open, onOpenChange, weeklyProgressId, projectId, assignment, onSuccess }: AssignmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: assignment?.title || '',
    description: assignment?.description || '',
    instructions: assignment?.instructions || '',
    learning_objectives: assignment?.learning_objectives || '',
    submission_requirements: assignment?.submission_requirements || '',
    grading_criteria: assignment?.grading_criteria || '',
    resources: assignment?.resources || '',
    is_step_guide: assignment?.is_step_guide || false,
    steps: assignment?.steps || [],
    due_date: assignment?.due_date ? assignment.due_date.slice(0, 16) : '',
    max_score: assignment?.max_score || 100,
  });

  const addStep = () => {
    setForm(f => ({ ...f, steps: [...f.steps, { title: '', content: '', tip: '' }] }));
  };

  const updateStep = (idx: number, field: string, value: string) => {
    setForm(f => {
      const steps = [...f.steps];
      steps[idx] = { ...steps[idx], [field]: value };
      return { ...f, steps };
    });
  };

  const removeStep = (idx: number) => {
    setForm(f => ({ ...f, steps: f.steps.filter((_: any, i: number) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }
    setSaving(true);
    const payload: any = {
      created_by: user!.id,
      title: form.title,
      description: form.description || null,
      instructions: form.instructions || null,
      learning_objectives: form.learning_objectives || null,
      submission_requirements: form.submission_requirements || null,
      grading_criteria: form.grading_criteria || null,
      resources: form.resources || null,
      is_step_guide: form.is_step_guide,
      steps: form.is_step_guide ? form.steps : null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      max_score: form.max_score,
    };

    if (weeklyProgressId) {
      payload.weekly_progress_id = weeklyProgressId;
    }
    if (projectId) {
      payload.project_id = projectId;
    }

    const { error } = assignment
      ? await supabase.from('assignments').update(payload).eq('id', assignment.id)
      : await supabase.from('assignments').insert(payload);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: assignment ? 'Assignment updated' : 'Assignment created' });
      onSuccess();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assignment ? 'Edit' : 'Create'} Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Build a REST API" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief overview of the assignment" rows={2} />
          </div>
          <div>
            <Label>Learning Objectives</Label>
            <Textarea value={form.learning_objectives} onChange={e => setForm(f => ({ ...f, learning_objectives: e.target.value }))} placeholder="What the student will learn (one per line)" rows={3} />
          </div>
          <div>
            <Label>Instructions</Label>
            <Textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="Detailed instructions for completing the assignment" rows={4} />
          </div>
          <div>
            <Label>Submission Requirements</Label>
            <Textarea value={form.submission_requirements} onChange={e => setForm(f => ({ ...f, submission_requirements: e.target.value }))} placeholder="What should be submitted (e.g. GitHub link, PDF report)" rows={2} />
          </div>
          <div>
            <Label>Grading Criteria</Label>
            <Textarea value={form.grading_criteria} onChange={e => setForm(f => ({ ...f, grading_criteria: e.target.value }))} placeholder="How the assignment will be evaluated" rows={2} />
          </div>
          <div>
            <Label>Resources / References</Label>
            <Textarea value={form.resources} onChange={e => setForm(f => ({ ...f, resources: e.target.value }))} placeholder="Helpful links, documentation, readings" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date</Label>
              <Input type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>Max Score</Label>
              <Input type="number" value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: parseInt(e.target.value) || 100 }))} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t">
            <Switch checked={form.is_step_guide} onCheckedChange={v => setForm(f => ({ ...f, is_step_guide: v }))} />
            <Label>This is a step-by-step practical guide</Label>
          </div>

          {form.is_step_guide && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Steps</Label>
                <Button size="sm" variant="outline" onClick={addStep}><Plus className="h-3 w-3 mr-1" /> Add Step</Button>
              </div>
              {form.steps.map((step: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Step {idx + 1}</span>
                    <Button size="icon" variant="ghost" onClick={() => removeStep(idx)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <Input placeholder="Step title" value={step.title} onChange={e => updateStep(idx, 'title', e.target.value)} />
                  <Textarea placeholder="Step instructions" value={step.content} onChange={e => updateStep(idx, 'content', e.target.value)} rows={2} />
                  <Input placeholder="💡 Pro tip (optional)" value={step.tip} onChange={e => updateStep(idx, 'tip', e.target.value)} />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Assignment'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
