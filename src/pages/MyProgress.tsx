import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressTimeline } from '@/components/progress/ProgressTimeline';
import { StudentWeekView } from '@/components/progress/StudentWeekView';
import { TrendingUp, Target, Award, GraduationCap } from 'lucide-react';

export default function MyProgress() {
  const { user, activeStudentId } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [track, setTrack] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeStudentId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch student data with track (scoped to active student/supervisor)
    let query = supabase.from('students').select('*, tracks(*)');
    query = activeStudentId
      ? query.eq('id', activeStudentId)
      : query.eq('user_id', user?.id);
    const { data: studentData } = await query.maybeSingle();

    if (studentData) {
      setStudent(studentData);
      setTrack(studentData.tracks);

      // Fetch weekly progress
      const { data: progressData } = await supabase
        .from('weekly_progress')
        .select('*')
        .eq('student_id', studentData.id)
        .order('week_number', { ascending: true });

      setWeeklyProgress(progressData || []);
      
      // Set initial selected week to current/in-progress week
      if (progressData && progressData.length > 0) {
        const inProgress = progressData.find(w => w.status === 'in_progress' || w.status === 'needs_revision');
        const pending = progressData.find(w => w.status === 'pending');
        setSelectedWeek(inProgress?.week_number || pending?.week_number || progressData[0].week_number);
      }

      // Fetch projects for this track
      if (studentData.track_id) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .eq('track_id', studentData.track_id)
          .order('week_number', { ascending: true });

        setProjects(projectsData || []);
      }
    }
    
    setLoading(false);
  };

  const selectedProgress = weeklyProgress.find(w => w.week_number === selectedWeek);
  const selectedProject = selectedProgress?.project_id 
    ? projects.find(p => p.id === selectedProgress.project_id)
    : projects.find(p => p.week_number === selectedWeek);

  const completedCount = weeklyProgress.filter(w => w.status === 'completed').length;
  const totalWeeks = weeklyProgress.length;
  const progressPercent = totalWeeks > 0 ? (completedCount / totalWeeks) * 100 : 0;

  const avgSelfScore = weeklyProgress.length > 0
    ? weeklyProgress.reduce((sum, w) => sum + (w.self_assessment_score || 0), 0) / weeklyProgress.length
    : 0;

  const approvedWeeks = weeklyProgress.filter(w => w.supervisor_score && w.score_approved);
  const avgSupervisorScore = approvedWeeks.length > 0
    ? approvedWeeks.reduce((sum, w) => sum + (w.supervisor_score || 0), 0) / approvedWeeks.length
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-16" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold">My Learning Journey</h1>
          {track && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span>{track.name}</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}/{totalWeeks}</div>
              <Progress value={progressPercent} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">weeks completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Self Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSelfScore.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">average / 10</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Supervisor Score</CardTitle>
              <Award className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSupervisorScore.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">average / 10</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Week</CardTitle>
              <GraduationCap className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Week {selectedWeek || 1}</div>
              <p className="text-xs text-muted-foreground">
                {selectedProgress?.status === 'completed' ? 'Completed' : 'Active'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        {weeklyProgress.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <ProgressTimeline
                weeks={weeklyProgress}
                currentWeek={selectedWeek || 1}
                onWeekClick={setSelectedWeek}
              />
            </CardContent>
          </Card>
        )}

        {/* Week View */}
        {selectedProgress ? (
          <StudentWeekView
            weekProgress={selectedProgress}
            project={selectedProject}
            student={student}
            onUpdate={fetchData}
          />
        ) : (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                No progress records found. Your supervisor will initialize your weekly schedule.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
