import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Video, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Meeting {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string;
  meeting_link: string;
  status: string;
  description: string;
  notes: string;
  students: {
    user_id: string;
  };
  student_profile?: {
    full_name: string;
  };
}

export default function Meetings() {
  const { userRole, user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    title: '',
    scheduled_at: '',
    duration_minutes: 60,
    location: '',
    meeting_link: '',
    description: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMeetings();
    if (userRole === 'supervisor') {
      fetchStudents();
    }
  }, [userRole]);

  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        students!inner(user_id)
      `)
      .order('scheduled_at', { ascending: true });

    if (!error && data) {
      // Fetch profiles separately
      const userIds = data.map((m: any) => m.students.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const enrichedData = data.map((m: any) => ({
        ...m,
        student_profile: profiles?.find((prof) => prof.id === m.students.user_id),
      }));

      setMeetings(enrichedData || []);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, profiles!inner(full_name)');
    if (data) setStudents(data);
  };

  const handleCreateMeeting = async () => {
    if (!formData.student_id || !formData.title || !formData.scheduled_at) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const { data: supervisorData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('user_id', user?.id)
      .eq('role', 'supervisor')
      .single();

    const { error } = await supabase.from('meetings').insert({
      ...formData,
      supervisor_id: supervisorData?.user_id,
      status: 'scheduled',
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create meeting',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Meeting scheduled successfully',
      });
      setIsDialogOpen(false);
      setFormData({
        student_id: '',
        title: '',
        scheduled_at: '',
        duration_minutes: 60,
        location: '',
        meeting_link: '',
        description: '',
      });
      fetchMeetings();
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
            <p className="text-muted-foreground">Manage mentor-intern meetings</p>
          </div>
          {userRole === 'supervisor' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule New Meeting</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="student_id">Student</Label>
                    <Select
                      value={formData.student_id}
                      onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.profiles.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title">Meeting Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Weekly check-in"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scheduled_at">Date & Time</Label>
                      <Input
                        id="scheduled_at"
                        type="datetime-local"
                        value={formData.scheduled_at}
                        onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                      <Input
                        id="duration_minutes"
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Office, Room 203"
                    />
                  </div>
                  <div>
                    <Label htmlFor="meeting_link">Video Meeting Link</Label>
                    <Input
                      id="meeting_link"
                      value={formData.meeting_link}
                      onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Agenda and topics to discuss"
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleCreateMeeting} className="w-full">
                    Schedule Meeting
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <Card key={meeting.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{meeting.title}</CardTitle>
                  <Badge className={getStatusColor(meeting.status)}>
                    {meeting.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{meeting.student_profile?.full_name || 'Student'}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(meeting.scheduled_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(meeting.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({meeting.duration_minutes} min)
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
                    <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Join Meeting
                    </a>
                  </div>
                )}
                {meeting.description && (
                  <p className="text-sm text-muted-foreground mt-2">{meeting.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
