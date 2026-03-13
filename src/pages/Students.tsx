import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Mail, Calendar, Search, Edit, Trash2, Loader2, Eye, Users, GraduationCap, TrendingUp, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { MultiTrackManager } from '@/components/students/MultiTrackManager';

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentProgress, setStudentProgress] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const { toast } = useToast();

  const [newStudent, setNewStudent] = useState({
    email: '',
    full_name: '',
    track_id: '',
    start_date: '',
    end_date: '',
  });

  const [editStudent, setEditStudent] = useState({
    full_name: '',
    email: '',
    track_id: '',
    start_date: '',
    end_date: '',
    status: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchQuery, statusFilter, trackFilter]);

  const fetchData = async () => {
    const [studentsRes, tracksRes] = await Promise.all([
      supabase
        .from('students')
        .select(`
          *,
          profiles!user_id(full_name, email),
          tracks(name)
        `),
      supabase.from('tracks').select('*'),
    ]);

    if (studentsRes.error) {
      console.error('Error fetching students:', studentsRes.error);
      toast({
        title: 'Error',
        description: 'Failed to load students. Please refresh the page.',
        variant: 'destructive',
      });
    }

    setStudents(studentsRes.data || []);
    setTracks(tracksRes.data || []);
    setLoading(false);
  };

  const filterStudents = () => {
    let filtered = [...students];

    if (searchQuery) {
      filtered = filtered.filter(student =>
        student.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(student => student.status === statusFilter);
    }

    if (trackFilter !== 'all') {
      filtered = filtered.filter(student => student.track_id === trackFilter);
    }

    setFilteredStudents(filtered);
  };

  const handleAddStudent = async () => {
    if (!newStudent.email || !newStudent.full_name || !newStudent.track_id || !newStudent.start_date || !newStudent.end_date) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-student`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStudent),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite student');
      }

      toast({
        title: 'Success',
        description: 'Student invited successfully',
      });

      setOpen(false);
      setNewStudent({
        email: '',
        full_name: '',
        track_id: '',
        start_date: '',
        end_date: '',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent) return;

    setSubmitting(true);
    try {
      // Update profile name and email if changed
      if (selectedStudent.user_id) {
        const profileUpdate: any = {};
        if (editStudent.full_name.trim()) profileUpdate.full_name = editStudent.full_name.trim();
        if (editStudent.email.trim()) profileUpdate.email = editStudent.email.trim();
        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', selectedStudent.user_id);
          if (profileError) throw profileError;
        }
      }

      const { error } = await supabase
        .from('students')
        .update({
          track_id: editStudent.track_id,
          start_date: editStudent.start_date,
          end_date: editStudent.end_date,
          status: editStudent.status,
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student updated successfully',
      });

      setEditOpen(false);
      setSelectedStudent(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'inactive' })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student deactivated successfully',
      });

      setDeleteOpen(false);
      setSelectedStudent(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvitation = async (student: any) => {
    try {
      setSubmitting(true);
      const { data, error } = await supabase.functions.invoke('resend-invitation', {
        body: { student_id: student.id },
      });
      if (error) throw error;
      toast({ title: 'Success', description: 'Invitation email resent successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (student: any) => {
    setSelectedStudent(student);
    setEditStudent({
      full_name: student.profiles?.full_name || '',
      email: student.profiles?.email || '',
      track_id: student.track_id || '',
      start_date: student.start_date,
      end_date: student.end_date,
      status: student.status,
    });
    setEditOpen(true);
  };

  const openDeleteDialog = (student: any) => {
    setSelectedStudent(student);
    setDeleteOpen(true);
  };

  const openDetailDialog = async (student: any) => {
    setSelectedStudent(student);
    setDetailOpen(true);
    
    // Fetch student's weekly progress
    const { data } = await supabase
      .from('weekly_progress')
      .select('*')
      .eq('student_id', student.id)
      .order('week_number', { ascending: true });
    
    setStudentProgress(data || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'inactive':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const calculateProgress = () => {
    if (studentProgress.length === 0) return 0;
    const completed = studentProgress.filter(p => p.status === 'completed').length;
    return Math.round((completed / studentProgress.length) * 100);
  };

  const getStats = () => {
    return {
      total: students.length,
      active: students.filter(s => s.status === 'active').length,
      completed: students.filter(s => s.status === 'completed').length,
      inactive: students.filter(s => s.status === 'inactive').length,
    };
  };

  const stats = getStats();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Students Management</h1>
            <p className="text-muted-foreground">Manage and monitor all interns</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Student</DialogTitle>
                <DialogDescription>
                  Send an invitation email to a new student to join the program
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={newStudent.full_name}
                    onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    placeholder="student@example.com"
                  />
                </div>
                <div>
                  <Label>Track *</Label>
                  <Select value={newStudent.track_id} onValueChange={(value) => setNewStudent({ ...newStudent, track_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select track" />
                    </SelectTrigger>
                    <SelectContent>
                      {tracks.map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          {track.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={newStudent.start_date}
                    onChange={(e) => setNewStudent({ ...newStudent, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={newStudent.end_date}
                    onChange={(e) => setNewStudent({ ...newStudent, end_date: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddStudent} className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        {!loading && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Students</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  {stats.total}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                  {stats.active}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  {stats.completed}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Inactive</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-muted-foreground" />
                  {stats.inactive}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by track" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No students found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((student) => (
              <Card key={student.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{student.profiles?.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {student.profiles?.email}
                      </p>
                    </div>
                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                      {student.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Track:</span>
                    <span className="text-muted-foreground">{student.tracks?.name || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span className="text-muted-foreground">
                      {new Date(student.start_date).toLocaleDateString()} - {new Date(student.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetailDialog(student)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(student)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvitation(student)}
                      disabled={submitting}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(student)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>
                View comprehensive information about the student
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedStudent.profiles?.full_name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {selectedStudent.profiles?.email}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(selectedStudent.status)}>
                    {selectedStudent.status}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Track</Label>
                    <p className="font-medium">{selectedStudent.tracks?.name || 'Not assigned'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Duration</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(selectedStudent.start_date).toLocaleDateString()} - {new Date(selectedStudent.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Overall Progress</Label>
                    <span className="text-sm font-medium">{calculateProgress()}%</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                </div>

                <div>
                  <Label className="mb-3 block">Weekly Progress Summary</Label>
                  {studentProgress.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No progress data available</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {studentProgress.map((progress) => (
                        <div key={progress.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">Week {progress.week_number}</p>
                            <p className="text-sm text-muted-foreground">{progress.week_focus || 'No focus set'}</p>
                          </div>
                          <Badge variant={
                            progress.status === 'completed' ? 'default' :
                            progress.status === 'pending' ? 'secondary' : 'outline'
                          }>
                            {progress.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setDetailOpen(false);
                      openEditDialog(selectedStudent);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Student
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDetailOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>
                Update student information and track assignments
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Multi-Track Manager */}
              {selectedStudent && (
                <MultiTrackManager
                  studentId={selectedStudent.id}
                  tracks={tracks}
                  onUpdate={fetchData}
                />
              )}

              <div>
                <Label>Full Name</Label>
                <Input
                  value={editStudent.full_name}
                  onChange={(e) => setEditStudent({ ...editStudent, full_name: e.target.value })}
                  placeholder="Student's full name"
                />
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground text-xs">Primary Track (for curriculum)</Label>
                <Select value={editStudent.track_id} onValueChange={(value) => setEditStudent({ ...editStudent, track_id: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select primary track" />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks.map((track) => (
                      <SelectItem key={track.id} value={track.id}>
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editStudent.start_date}
                  onChange={(e) => setEditStudent({ ...editStudent, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={editStudent.end_date}
                  onChange={(e) => setEditStudent({ ...editStudent, end_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editStudent.status} onValueChange={(value) => setEditStudent({ ...editStudent, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleEditStudent} className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Student'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Student</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate {selectedStudent?.profiles?.full_name}? This will change their status to inactive.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteStudent} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  'Deactivate'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}