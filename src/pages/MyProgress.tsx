import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WeekProgressCard } from '@/components/progress/WeekProgressCard';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Target, Award } from 'lucide-react';

export default function MyProgress() {
  const { user } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: studentData } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (studentData) {
      setStudent(studentData);
      
      const { data: progressData } = await supabase
        .from('weekly_progress')
        .select('*')
        .eq('student_id', studentData.id)
        .order('week_number', { ascending: false });

      setWeeklyProgress(progressData || []);
    }
    setLoading(false);
  };

  const completedCount = weeklyProgress.filter(w => w.status === 'completed').length;
  const progress = weeklyProgress.length > 0 ? (completedCount / weeklyProgress.length) * 100 : 0;
  
  const avgSelfScore = weeklyProgress.length > 0
    ? weeklyProgress.reduce((sum, w) => sum + (w.self_assessment_score || 0), 0) / weeklyProgress.length
    : 0;
  
  const avgSupervisorScore = weeklyProgress.filter(w => w.supervisor_score).length > 0
    ? weeklyProgress
        .filter(w => w.supervisor_score)
        .reduce((sum, w) => sum + (w.supervisor_score || 0), 0) / weeklyProgress.filter(w => w.supervisor_score).length
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Progress</h1>
          <p className="text-muted-foreground">Track your weekly tasks and deliverables</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Weeks</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
              <p className="text-xs text-muted-foreground">of {weeklyProgress.length} total</p>
              <Progress value={progress} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Self Assessment Avg</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSelfScore.toFixed(1)}/10</div>
              <p className="text-xs text-muted-foreground">Your average score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Supervisor Score Avg</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSupervisorScore.toFixed(1)}/10</div>
              <p className="text-xs text-muted-foreground">Supervisor's average</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {weeklyProgress.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">No progress records found</p>
              </CardContent>
            </Card>
          ) : (
            weeklyProgress.map((week) => (
              <WeekProgressCard
                key={week.id}
                weekProgress={week}
                student={student}
                isStudentView={true}
                onUpdate={fetchData}
              />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}