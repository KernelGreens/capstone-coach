import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { WeekProgressCard } from '@/components/progress/WeekProgressCard';
import { InitializeWeeksDialog } from '@/components/progress/InitializeWeeksDialog';
import { Users, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Progress() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    avgScore: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchWeeklyProgress();
    }
  }, [selectedStudent]);

  const fetchData = async () => {
    setLoading(true);
    const { data: studentsData } = await supabase
      .from('students')
      .select(`
        *,
        profiles!user_id(full_name, email),
        tracks(name)
      `)
      .eq('status', 'active');

    setStudents(studentsData || []);
    if (studentsData && studentsData.length > 0) {
      setSelectedStudent(studentsData[0]);
    }

    // Calculate stats
    const { data: allProgress } = await supabase
      .from('weekly_progress')
      .select('*');

    if (allProgress) {
      const completed = allProgress.filter(p => p.status === 'completed').length;
      const pending = allProgress.filter(p => p.status === 'pending' || p.status === 'in_progress').length;
      const scoresSum = allProgress
        .filter(p => p.supervisor_score)
        .reduce((sum, p) => sum + (p.supervisor_score || 0), 0);
      const scoresCount = allProgress.filter(p => p.supervisor_score).length;

      setStats({
        total: allProgress.length,
        pending,
        completed,
        avgScore: scoresCount > 0 ? Math.round((scoresSum / scoresCount) * 10) / 10 : 0,
      });
    }

    setLoading(false);
  };

  const fetchWeeklyProgress = async () => {
    if (!selectedStudent) return;

    const { data } = await supabase
      .from('weekly_progress')
      .select('*')
      .eq('student_id', selectedStudent.id)
      .order('week_number', { ascending: false });

    setWeeklyProgress(data || []);
  };

  const filteredProgress = (status?: string) => {
    if (!status) return weeklyProgress;
    return weeklyProgress.filter(p => p.status === status);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Progress Management</h1>
            <p className="text-muted-foreground">Review and manage student weekly progress</p>
          </div>
          {students.length > 0 && (
            <InitializeWeeksDialog
              students={students.map((s) => ({
                id: s.id,
                track_id: s.track_id,
                start_date: s.start_date,
                end_date: s.end_date,
                full_name: s.profiles?.full_name || 'Unknown',
                track_name: s.tracks?.name || null,
              }))}
              defaultStudentId={selectedStudent?.id}
              onSuccess={() => {
                fetchData();
                fetchWeeklyProgress();
              }}
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}/10</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student Progress</CardTitle>
            <CardDescription>Select a student to review their weekly submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedStudent?.id}
              onValueChange={(value) => {
                const student = students.find(s => s.id === value);
                setSelectedStudent(student);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex items-center gap-2">
                      <span>{student.profiles?.full_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {student.tracks?.name}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedStudent && (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">
                All ({weeklyProgress.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({filteredProgress('pending').length + filteredProgress('in_progress').length})
              </TabsTrigger>
              <TabsTrigger value="needs_revision">
                Needs Revision ({filteredProgress('needs_revision').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({filteredProgress('completed').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {weeklyProgress.length === 0 ? (
                <Card>
                  <CardContent className="py-10">
                    <p className="text-center text-muted-foreground">No progress records found</p>
                  </CardContent>
                </Card>
              ) : (
                weeklyProgress.map((progress) => (
                  <WeekProgressCard
                    key={progress.id}
                    weekProgress={progress}
                    student={selectedStudent}
                    isStudentView={false}
                    onUpdate={fetchWeeklyProgress}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {[...filteredProgress('pending'), ...filteredProgress('in_progress')].map((progress) => (
                <WeekProgressCard
                  key={progress.id}
                  weekProgress={progress}
                  student={selectedStudent}
                  isStudentView={false}
                  onUpdate={fetchWeeklyProgress}
                />
              ))}
            </TabsContent>

            <TabsContent value="needs_revision" className="space-y-4">
              {filteredProgress('needs_revision').map((progress) => (
                <WeekProgressCard
                  key={progress.id}
                  weekProgress={progress}
                  student={selectedStudent}
                  isStudentView={false}
                  onUpdate={fetchWeeklyProgress}
                />
              ))}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {filteredProgress('completed').map((progress) => (
                <WeekProgressCard
                  key={progress.id}
                  weekProgress={progress}
                  student={selectedStudent}
                  isStudentView={false}
                  onUpdate={fetchWeeklyProgress}
                />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}