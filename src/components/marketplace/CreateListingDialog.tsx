import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateListingDialog({ open, onOpenChange, onCreated }: CreateListingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    skills: '',
    location: '',
    location_type: 'remote',
    duration_weeks: '16',
    start_date: '',
    application_deadline: '',
  });

  const handleSave = async (status: 'draft' | 'published') => {
    if (!user || !form.title.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title is required' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('internship_listings').insert({
        created_by: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        requirements: form.requirements.trim() || null,
        skills_required: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        location: form.location.trim() || null,
        location_type: form.location_type,
        duration_weeks: parseInt(form.duration_weeks) || 16,
        start_date: form.start_date || null,
        application_deadline: form.application_deadline || null,
        status,
      });
      if (error) throw error;
      toast({ title: 'Success', description: `Listing ${status === 'published' ? 'published' : 'saved as draft'}` });
      onOpenChange(false);
      setForm({ title: '', description: '', requirements: '', skills: '', location: '', location_type: 'remote', duration_weeks: '16', start_date: '', application_deadline: '' });
      onCreated();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Internship Listing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Junior Data Science Intern" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the internship opportunity..." rows={4} />
          </div>
          <div className="space-y-2">
            <Label>Requirements</Label>
            <Textarea value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="List requirements..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Skills (comma-separated)</Label>
            <Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="Python, React, SQL" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location Type</Label>
              <Select value={form.location_type} onValueChange={v => setForm(f => ({ ...f, location_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, Country" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Duration (weeks)</Label>
              <Input type="number" value={form.duration_weeks} onChange={e => setForm(f => ({ ...f, duration_weeks: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" value={form.application_deadline} onChange={e => setForm(f => ({ ...f, application_deadline: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="flex-1">
              Save Draft
            </Button>
            <Button onClick={() => handleSave('published')} disabled={saving} className="flex-1">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
