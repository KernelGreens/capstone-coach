import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Student {
  id: string;
  profiles: {
    full_name: string;
  };
}

interface Meeting {
  id: string;
  title: string;
  student_id: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  description: string | null;
  status: string;
}

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null;
  students: Student[];
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

export function MeetingDialog({
  open,
  onOpenChange,
  meeting,
  students,
  onSave,
  saving,
}: MeetingDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    student_id: '',
    scheduled_at: '',
    duration_minutes: '60',
    location: '',
    meeting_link: '',
    description: '',
    status: 'scheduled',
  });

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title || '',
        student_id: meeting.student_id || '',
        scheduled_at: meeting.scheduled_at ? new Date(meeting.scheduled_at).toISOString().slice(0, 16) : '',
        duration_minutes: meeting.duration_minutes?.toString() || '60',
        location: meeting.location || '',
        meeting_link: meeting.meeting_link || '',
        description: meeting.description || '',
        status: meeting.status || 'scheduled',
      });
    } else {
      setFormData({
        title: '',
        student_id: '',
        scheduled_at: '',
        duration_minutes: '60',
        location: '',
        meeting_link: '',
        description: '',
        status: 'scheduled',
      });
    }
  }, [meeting, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      duration_minutes: parseInt(formData.duration_minutes),
      location: formData.location || null,
      meeting_link: formData.meeting_link || null,
      description: formData.description || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{meeting ? 'Edit Meeting' : 'Schedule Meeting'}</DialogTitle>
          <DialogDescription>
            {meeting ? 'Update meeting details' : 'Schedule a new meeting with a student'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Meeting title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            <Select
              value={formData.student_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, student_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.profiles?.full_name || 'Unnamed Student'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Date & Time *</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select
                value={formData.duration_minutes}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, duration_minutes: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {meeting && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Office, Room 101, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting_link">Video Link</Label>
            <Input
              id="meeting_link"
              value={formData.meeting_link}
              onChange={(e) => setFormData((prev) => ({ ...prev, meeting_link: e.target.value }))}
              placeholder="https://zoom.us/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Meeting agenda or notes"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : meeting ? (
                'Update Meeting'
              ) : (
                'Schedule Meeting'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
