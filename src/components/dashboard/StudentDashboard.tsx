import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FileText, Target, TrendingUp, Calendar } from 'lucide-react';

export function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    currentWeek: 0,
    totalWeeks: 16,
    completedTasks: 0,
    avgScore: 0,
    upcomingMeetings: 0,
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    const { data: studentData } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (!studentData) return;

    const { data: progressData } = await supabase
      .from('weekly_progress')
      .select('*')
      .eq('student_id', studentData.id)
      .order('week_number', { ascending: false });

    const currentWeek = progressData?.[0]?.week_number || 0;
    const completed = progressData?.filter((p) => p.status === 'completed').length || 0;
    const avgScore =
      progressData && progressData.length > 0
        ? progressData.reduce((acc, p) => acc + (p.supervisor_score || 0), 0) / progressData.length
        : 0;

    setStats({
      currentWeek,
      totalWeeks: 16,
      completedTasks: completed,
      avgScore: Math.round(avgScore * 10) / 10,
      upcomingMeetings: 0,
    });
  };

  const progress = (stats.currentWeek / stats.totalWeeks) * 100;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome Back!</h1>
        <p className="text-muted-foreground">Track your internship progress and achievements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Week {stats.currentWeek} of {stats.totalWeeks}</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingMeetings}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>This Week's Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No tasks for this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent feedback</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}