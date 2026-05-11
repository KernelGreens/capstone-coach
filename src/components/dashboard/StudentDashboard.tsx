import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FileText, TrendingUp, Calendar, MessageCircle, BookOpen, Trophy, Bell, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export function StudentDashboard() {
  const { user, activeStudentId } = useAuth();
  const isMobile = useIsMobile();
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
  }, [user, activeStudentId]);

  const fetchStats = async () => {
    let q = supabase.from('students').select('*');
    q = activeStudentId ? q.eq('id', activeStudentId) : q.eq('user_id', user?.id);
    const { data: studentData } = await q.maybeSingle();

    if (!studentData) return;

    const { data: progressData } = await supabase
      .from('weekly_progress')
      .select('*')
      .eq('student_id', studentData.id)
      .order('week_number', { ascending: false });

    const { data: meetingsData } = await supabase
      .from('meetings')
      .select('id')
      .eq('student_id', studentData.id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString());

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
      upcomingMeetings: meetingsData?.length || 0,
    });
  };

  const progress = (stats.currentWeek / stats.totalWeeks) * 100;

  const quickActions = [
    { href: '/my-progress', label: 'My Progress', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: `Week ${stats.currentWeek}` },
    { href: '/messages', label: 'Mentor Chat', icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Send a message' },
    { href: '/resources', label: 'Learn', icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'View modules' },
    { href: '/meetings', label: 'Meetings', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: `${stats.upcomingMeetings} upcoming` },
    { href: '/capstone', label: 'Capstone', icon: Trophy, color: 'text-rose-500', bg: 'bg-rose-500/10', desc: 'Final project' },
    { href: '/settings', label: 'Reminders', icon: Bell, color: 'text-cyan-500', bg: 'bg-cyan-500/10', desc: 'Notifications' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>Welcome Back!</h1>
        <p className="text-sm text-muted-foreground">Track your internship progress and achievements</p>
      </div>

      {/* Progress Summary Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
              <p className="text-2xl font-bold">Week {stats.currentWeek}<span className="text-sm font-normal text-muted-foreground"> / {stats.totalWeeks}</span></p>
            </div>
            <div className="h-14 w-14 rounded-full border-4 border-primary flex items-center justify-center">
              <span className="text-sm font-bold">{Math.round(progress)}%</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className={`h-10 w-10 rounded-xl ${action.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-bold">{stats.completedTasks}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-bold">{stats.avgScore}</p>
            <p className="text-[10px] text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-4 w-4 mx-auto text-purple-500 mb-1" />
            <p className="text-xl font-bold">{stats.upcomingMeetings}</p>
            <p className="text-[10px] text-muted-foreground">Meetings</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/my-progress">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">This Week's Tasks</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View your current week assignments and submit deliverables</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/messages">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Messages</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Chat with your mentor and stay updated on feedback</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
