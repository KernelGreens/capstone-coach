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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    student_ids: [] as string[],
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
        student_ids: [meeting.student_id],
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
        student_ids: [],
        scheduled_at: '',
        duration_minutes: '60',
        location: '',
        meeting_link: '',
        description: '',
        status: 'scheduled',
      });
    }
  }, [meeting, open]);

  const toggleStudent = (studentId: string) => {
    setFormData((prev) => ({
      ...prev,
      student_ids: prev.student_ids.includes(studentId)
        ? prev.student_ids.filter((id) => id !== studentId)
        : [...prev.student_ids, studentId],
    }));
  };

  const selectAllStudents = () => {
    setFormData((prev) => ({
      ...prev,
      student_ids: prev.student_ids.length === students.length ? [] : students.map((s) => s.id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.student_ids.length === 0) return;

    await onSave({
      title: formData.title,
      student_ids: formData.student_ids,
      scheduled_at: formData.scheduled_at,
      duration_minutes: parseInt(formData.duration_minutes),
      location: formData.location || null,
      meeting_link: formData.meeting_link || null,
      description: formData.description || null,
      status: formData.status,
    });
  };

  const isEditing = !!meeting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Meeting' : 'Schedule Meeting'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update meeting details' : 'Schedule a new meeting with one or more students'}
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
            <div className="flex items-center justify-between">
              <Label>{isEditing ? 'Student' : 'Students *'}</Label>
              {!isEditing && students.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={selectAllStudents}>
                  {formData.student_ids.length === students.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
            {isEditing ? (
              <Select
                value={formData.student_ids[0] || ''}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, student_ids: [value] }))}
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
            ) : (
              <ScrollArea className="max-h-40 rounded-md border p-3">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active students found</p>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1"
                      >
                        <Checkbox
                          checked={formData.student_ids.includes(student.id)}
                          onCheckedChange={() => toggleStudent(student.id)}
                        />
                        <span className="text-sm">{student.profiles?.full_name || 'Unnamed Student'}</span>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
            {!isEditing && formData.student_ids.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {formData.student_ids.length} student{formData.student_ids.length > 1 ? 's' : ''} selected
              </p>
            )}
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

          {isEditing && (
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
            <Button
              type="submit"
              className="flex-1"
              disabled={saving || formData.student_ids.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Meeting'
              ) : (
                `Schedule Meeting${formData.student_ids.length > 1 ? ` (${formData.student_ids.length} students)` : ''}`
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
