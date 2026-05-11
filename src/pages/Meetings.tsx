import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/use-subscription';
import { MeetingDialog } from '@/components/meetings/MeetingDialog';
import { VideoCallDialog } from '@/components/meetings/VideoCallDialog';
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
  ChevronDown,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

interface GroupedMeeting {
  key: string;
  meetings: Meeting[];
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  description: string | null;
  status: string;
  supervisor_id: string;
  studentNames: string[];
}

interface Student {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

export default function Meetings() {
  const { user, userRole, activeStudentId } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingSlides, setGeneratingSlides] = useState<string | null>(null);
  const [videoCallMeeting, setVideoCallMeeting] = useState<Meeting | null>(null);
  const { toast } = useToast();
  const { subscribed, isExcluded } = useSubscription();
  const canUseVideo = subscribed || isExcluded;

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
      if (formData.status && formData.student_ids?.length === 1 && editingMeeting) {
        // Editing existing meeting
        const { student_ids, ...rest } = formData;
        const { error } = await supabase
          .from('meetings')
          .update({
            ...rest,
            student_id: student_ids[0],
            scheduled_at: new Date(formData.scheduled_at).toISOString(),
          })
          .eq('id', editingMeeting.id);

        if (error) throw error;

        toast({ title: 'Success', description: 'Meeting updated successfully' });
      } else {
        // Create meeting(s) for each selected student
        const { student_ids, ...rest } = formData;
        const meetingsToInsert = student_ids.map((studentId: string) => ({
          ...rest,
          student_id: studentId,
          supervisor_id: user.id,
          scheduled_at: new Date(formData.scheduled_at).toISOString(),
        }));

        const { error } = await supabase.from('meetings').insert(meetingsToInsert);
        if (error) throw error;

        toast({
          title: 'Success',
          description: `Meeting scheduled for ${student_ids.length} student${student_ids.length > 1 ? 's' : ''}`,
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
      toast({ title: 'Error', description: 'Failed to delete meeting', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Meeting deleted successfully' });
      fetchMeetings();
    }

    setDeleteDialogOpen(false);
    setMeetingToDelete(null);
  };

  const handleStartVideoCall = async (meeting: Meeting) => {
    setVideoCallMeeting(meeting);

    // Notify the student about the video call
    try {
      // Get student's user_id
      const { data: studentData } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', meeting.student_id)
        .single();

      if (studentData) {
        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: studentData.user_id,
          title: '📹 Video Call Started',
          message: `Your supervisor has started a video call: "${meeting.title}". Join now from your Meetings page.`,
          type: 'video_call',
          related_id: meeting.id,
        });

        // Try sending push notification
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: studentData.user_id,
              title: '📹 Video Call Started',
              message: `Join the video call: "${meeting.title}"`,
              url: '/meetings',
            },
          });
        } catch {
          // Push notification is best-effort
        }
      }
    } catch {
      // Notification sending is best-effort, don't block the call
    }
  };

  const handleGenerateSlides = async (meeting: Meeting) => {
    setGeneratingSlides(meeting.id);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meeting-slides`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            meetingTitle: meeting.title,
            meetingDescription: meeting.description || '',
            studentName: meeting.student_profile?.full_name || 'Student',
            scheduledAt: format(new Date(meeting.scheduled_at), 'PPP p'),
          }),
        }
      );

      if (response.status === 429) {
        toast({ variant: 'destructive', title: 'Rate limited', description: 'Please try again in a moment.' });
        return;
      }
      if (response.status === 402) {
        toast({ variant: 'destructive', title: 'Credits exhausted', description: 'Please add AI credits in your workspace settings.' });
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate slides');

      await generatePptx(data.slides, meeting.title);

      toast({ title: 'Slides generated!', description: 'Your PowerPoint presentation has been downloaded.' });
    } catch (error: any) {
      console.error('Error generating slides:', error);
      toast({ variant: 'destructive', title: 'Generation failed', description: error.message });
    } finally {
      setGeneratingSlides(null);
    }
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

  // Group meetings by title + scheduled_at + supervisor_id
  const groupedMeetings: GroupedMeeting[] = (() => {
    const groups = new Map<string, Meeting[]>();
    meetings.forEach(m => {
      const key = `${m.title}|${m.scheduled_at}|${m.supervisor_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    });
    return Array.from(groups.entries()).map(([key, grp]) => ({
      key,
      meetings: grp,
      title: grp[0].title,
      scheduled_at: grp[0].scheduled_at,
      duration_minutes: grp[0].duration_minutes,
      location: grp[0].location,
      meeting_link: grp[0].meeting_link,
      description: grp[0].description,
      status: grp[0].status,
      supervisor_id: grp[0].supervisor_id,
      studentNames: grp.map(m => m.student_profile?.full_name || 'Student'),
    }));
  })();

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Meetings</h1>
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
            {groupedMeetings.map((group) => {
              const firstMeeting = group.meetings[0];
              return (
                <Collapsible key={group.key}>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CollapsibleTrigger className="w-full text-left">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg">{group.title}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>{format(new Date(group.scheduled_at), 'PPP p')}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-muted-foreground mt-1">
                              <User className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span className="truncate">{group.studentNames.join(', ')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <Badge className={getStatusColor(group.status)}>
                              {group.status}
                            </Badge>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-3 pt-0">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{group.duration_minutes} minutes</span>
                        </div>
                        {group.location && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{group.location}</span>
                          </div>
                        )}
                        {group.meeting_link && (
                          <div className="flex items-center gap-2 text-sm">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={group.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Join Video Call
                            </a>
                          </div>
                        )}
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                            {group.description}
                          </p>
                        )}
                        <div className="flex flex-col gap-2 pt-3 border-t">
                          {group.status === 'scheduled' && (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                userRole === 'supervisor'
                                  ? handleStartVideoCall(firstMeeting)
                                  : setVideoCallMeeting(firstMeeting)
                              }
                            >
                              <Video className="mr-2 h-4 w-4" />
                              {userRole === 'supervisor' ? 'Start Video Call' : 'Join Video Call'}
                            </Button>
                          )}
                          {userRole === 'supervisor' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => handleGenerateSlides(firstMeeting)}
                                disabled={generatingSlides === firstMeeting.id}
                              >
                                {generatingSlides === firstMeeting.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Slides...
                                  </>
                                ) : (
                                  <>
                                    <Presentation className="mr-2 h-4 w-4" />
                                    Generate Slides
                                  </>
                                )}
                              </Button>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleEdit(firstMeeting)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteClick(firstMeeting)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
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

        {videoCallMeeting && (
          <VideoCallDialog
            open={!!videoCallMeeting}
            onOpenChange={(open) => { if (!open) setVideoCallMeeting(null); }}
            roomName={`capstone-meeting-${videoCallMeeting.id}`}
            meetingTitle={videoCallMeeting.title}
            userDisplayName={user?.email?.split('@')[0] || 'User'}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
