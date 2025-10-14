import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Target, TrendingUp, Clock } from 'lucide-react';

export function SupervisorDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeTracks: 0,
    avgProgress: 0,
    pendingEvaluations: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [studentsRes, tracksRes, progressRes] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact' }),
      supabase.from('tracks').select('*', { count: 'exact' }),
      supabase.from('weekly_progress').select('*').eq('score_approved', false),
    ]);

    setStats({
      totalStudents: studentsRes.count || 0,
      activeTracks: tracksRes.count || 0,
      avgProgress: 0,
      pendingEvaluations: progressRes.data?.length || 0,
    });
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Active Tracks',
      value: stats.activeTracks,
      icon: Target,
      color: 'text-green-600',
    },
    {
      title: 'Pending Evaluations',
      value: stats.pendingEvaluations,
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'Avg Progress',
      value: `${stats.avgProgress}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
        <p className="text-muted-foreground">Manage and monitor internship progress</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No upcoming meetings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}