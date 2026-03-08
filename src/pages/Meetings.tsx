import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MeetingDialog } from '@/components/meetings/MeetingDialog';
import {
  Loader2,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Video,
  Pencil,
  Trash2,
  User,
  Presentation,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { generatePptx } from '@/lib/generatePptx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Meeting {
  id: string;
  title: string;
  student_id: string;
  supervisor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  description: string | null;
  status: string;
  student_profile?: {
    full_name: string;
  };
}

interface Student {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

export default function Meetings() {
  const { user, userRole } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMeetings();
    if (userRole === 'supervisor') {
      fetchStudents();
    }
  }, [userRole]);

  const fetchMeetings = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('scheduled_at', { ascending: true });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch meetings',
        variant: 'destructive',
      });
    } else if (data) {
      // Fetch student profiles
      const studentIds = [...new Set(data.map((m) => m.student_id))];
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, user_id')
        .in('id', studentIds);

      if (studentsData) {
        const userIds = studentsData.map((s) => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const enrichedMeetings = data.map((m) => {
          const student = studentsData.find((s) => s.id === m.student_id);
          const profile = profiles?.find((p) => p.id === student?.user_id);
          return {
            ...m,
            student_profile: profile ? { full_name: profile.full_name } : undefined,
          };
        });

        setMeetings(enrichedMeetings);
      } else {
        setMeetings(data);
      }
    }
    setLoading(false);
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, user_id, profiles:user_id(full_name)')
      .eq('status', 'active');

    if (data) {
      setStudents(data as any);
    }
  };

  const handleSave = async (formData: any) => {
    if (!user) return;
    setSaving(true);

    try {
      if (editingMeeting) {
        // Update existing meeting
        const { error } = await supabase
          .from('meetings')
          .update({
            ...formData,
            scheduled_at: new Date(formData.scheduled_at).toISOString(),
          })
          .eq('id', editingMeeting.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Meeting updated successfully',
        });
      } else {
        // Create new meeting
        const { error } = await supabase.from('meetings').insert({
          ...formData,
          supervisor_id: user.id,
          scheduled_at: new Date(formData.scheduled_at).toISOString(),
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Meeting scheduled successfully',
        });
      }

      setDialogOpen(false);
      setEditingMeeting(null);
      fetchMeetings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save meeting',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setDialogOpen(true);
  };

  const handleDeleteClick = (meeting: Meeting) => {
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!meetingToDelete) return;

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingToDelete.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete meeting',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Meeting deleted successfully',
      });
      fetchMeetings();
    }

    setDeleteDialogOpen(false);
    setMeetingToDelete(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
            <p className="text-muted-foreground">
              {userRole === 'supervisor'
                ? 'Schedule and manage meetings with students'
                : 'View your scheduled meetings'}
            </p>
          </div>
          {userRole === 'supervisor' && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Button>
          )}
        </div>

        {meetings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Meetings Scheduled</h3>
              <p className="text-muted-foreground text-center mt-2">
                {userRole === 'supervisor'
                  ? 'Start by scheduling a meeting with a student'
                  : 'You have no upcoming meetings'}
              </p>
              {userRole === 'supervisor' && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule First Meeting
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {meetings.map((meeting) => (
              <Card key={meeting.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{meeting.title}</CardTitle>
                    <Badge className={getStatusColor(meeting.status)}>
                      {meeting.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{meeting.student_profile?.full_name || 'Student'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(meeting.scheduled_at), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(meeting.scheduled_at), 'p')} ({meeting.duration_minutes} min)
                    </span>
                  </div>
                  {meeting.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{meeting.location}</span>
                    </div>
                  )}
                  {meeting.meeting_link && (
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Join Video Call
                      </a>
                    </div>
                  )}
                    {meeting.description && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                      {meeting.description}
                    </p>
                  )}
                  {userRole === 'supervisor' && (
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleEdit(meeting)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(meeting)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {userRole === 'supervisor' && (
          <MeetingDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setEditingMeeting(null);
            }}
            meeting={editingMeeting}
            students={students}
            onSave={handleSave}
            saving={saving}
          />
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{meetingToDelete?.title}"? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
