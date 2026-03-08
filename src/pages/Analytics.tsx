import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, CheckCircle2, MessageCircle, Clock, TrendingUp } from 'lucide-react';

interface StudentData {
  id: string;
  user_id: string;
  status: string;
  profile?: { full_name: string };
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [tracks, setTracks] = useState<{ id: string; name: string }[]>([]);

  // Metrics
  const [engagementData, setEngagementData] = useState<any[]>([]);
  const [completionData, setCompletionData] = useState<any[]>([]);
  const [responsivenessData, setResponsivenessData] = useState<any[]>([]);
  const [learningHoursData, setLearningHoursData] = useState<any[]>([]);
  const [skillGrowthData, setSkillGrowthData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalEngagement: 0,
    completionRate: 0,
    avgResponseTime: 0,
    avgLearningHours: 0,
    avgSkillGrowth: 0,
  });

  useEffect(() => {
    if (user) fetchAll();
  }, [user, selectedTrack]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchBaseData(), fetchEngagement(), fetchCompletion(), fetchResponsiveness(), fetchLearningHours(), fetchSkillGrowth()]);
    setLoading(false);
  };

  const fetchBaseData = async () => {
    const [tracksRes, studentsRes] = await Promise.all([
      supabase.from('tracks').select('id, name'),
      supabase.from('students').select('id, user_id, status, track_id'),
    ]);
    setTracks(tracksRes.data || []);
    setStudents(studentsRes.data as any || []);
  };

  const fetchEngagement = async () => {
    // Engagement = messages sent + deliverables uploaded + self-assessments submitted per week
    const [messagesRes, deliverablesRes, progressRes] = await Promise.all([
      supabase.from('messages').select('created_at, sender_id'),
      supabase.from('deliverables').select('uploaded_at, student_id'),
      supabase.from('weekly_progress').select('created_at, student_id, self_assessment_score'),
    ]);

    // Group by week (last 8 weeks)
    const weeks: Record<string, { messages: number; deliverables: number; assessments: number }> = {};
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const key = `W${8 - i}`;
      weeks[key] = { messages: 0, deliverables: 0, assessments: 0 };
    }

    const weekKeys = Object.keys(weeks);
    const getWeekIndex = (dateStr: string) => {
      const diff = Math.floor((now.getTime() - new Date(dateStr).getTime()) / (7 * 24 * 60 * 60 * 1000));
      const idx = 7 - diff;
      if (idx >= 0 && idx < 8) return weekKeys[idx];
      return null;
    };

    (messagesRes.data || []).forEach((m) => {
      const wk = getWeekIndex(m.created_at);
      if (wk) weeks[wk].messages++;
    });
    (deliverablesRes.data || []).forEach((d) => {
      const wk = getWeekIndex(d.uploaded_at);
      if (wk) weeks[wk].deliverables++;
    });
    (progressRes.data || []).forEach((p) => {
      if (p.self_assessment_score !== null) {
        const wk = getWeekIndex(p.created_at);
        if (wk) weeks[wk].assessments++;
      }
    });

    const data = weekKeys.map((k) => ({ week: k, ...weeks[k] }));
    setEngagementData(data);

    const total = data.reduce((s, d) => s + d.messages + d.deliverables + d.assessments, 0);
    setSummaryStats((prev) => ({ ...prev, totalEngagement: total }));
  };

  const fetchCompletion = async () => {
    const { data } = await supabase.from('weekly_progress').select('status, student_id');
    if (!data) return;

    const statusCounts: Record<string, number> = { completed: 0, pending: 0, in_progress: 0, needs_revision: 0 };
    data.forEach((p) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    const total = data.length || 1;
    const rate = Math.round((statusCounts.completed / total) * 100);
    setSummaryStats((prev) => ({ ...prev, completionRate: rate }));

    setCompletionData([
      { name: 'Completed', value: statusCounts.completed, fill: 'hsl(var(--primary))' },
      { name: 'In Progress', value: statusCounts.in_progress, fill: 'hsl(var(--accent))' },
      { name: 'Pending', value: statusCounts.pending, fill: 'hsl(var(--muted))' },
      { name: 'Needs Revision', value: statusCounts.needs_revision, fill: 'hsl(142 76% 36%)' },
    ]);
  };

  const fetchResponsiveness = async () => {
    const { data } = await supabase
      .from('weekly_progress')
      .select('created_at, updated_at, status, supervisor_score, supervisor_notes, week_number')
      .order('week_number');

    if (!data) return;

    // Approximate response time: time between creation and supervisor feedback
    const weeklyResponse: Record<number, number[]> = {};
    data.forEach((p) => {
      if (p.supervisor_score !== null || p.supervisor_notes) {
        const created = new Date(p.created_at).getTime();
        const updated = new Date(p.updated_at).getTime();
        const hours = Math.max(0, (updated - created) / (1000 * 60 * 60));
        if (!weeklyResponse[p.week_number]) weeklyResponse[p.week_number] = [];
        weeklyResponse[p.week_number].push(hours);
      }
    });

    const chartData = Object.entries(weeklyResponse)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-10)
      .map(([wk, hours]) => ({
        week: `Week ${wk}`,
        avgHours: Math.round(hours.reduce((s, h) => s + h, 0) / hours.length),
      }));

    setResponsivenessData(chartData);

    const allHours = Object.values(weeklyResponse).flat();
    const avgH = allHours.length ? Math.round(allHours.reduce((s, h) => s + h, 0) / allHours.length) : 0;
    setSummaryStats((prev) => ({ ...prev, avgResponseTime: avgH }));
  };

  const fetchLearningHours = async () => {
    const { data } = await supabase
      .from('weekly_progress')
      .select('week_number, learning_hours, student_id')
      .order('week_number');

    if (!data) return;

    const weeklyHours: Record<number, number[]> = {};
    data.forEach((p) => {
      const hours = Number(p.learning_hours) || 0;
      if (!weeklyHours[p.week_number]) weeklyHours[p.week_number] = [];
      weeklyHours[p.week_number].push(hours);
    });

    const chartData = Object.entries(weeklyHours)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-10)
      .map(([wk, hrs]) => ({
        week: `Week ${wk}`,
        avgHours: Math.round((hrs.reduce((s, h) => s + h, 0) / hrs.length) * 10) / 10,
      }));

    setLearningHoursData(chartData);

    const allHrs = data.map((p) => Number(p.learning_hours) || 0);
    const avg = allHrs.length ? Math.round((allHrs.reduce((s, h) => s + h, 0) / allHrs.length) * 10) / 10 : 0;
    setSummaryStats((prev) => ({ ...prev, avgLearningHours: avg }));
  };

  const fetchSkillGrowth = async () => {
    const { data } = await supabase
      .from('weekly_progress')
      .select('week_number, supervisor_score, self_assessment_score, student_id')
      .not('supervisor_score', 'is', null)
      .order('week_number');

    if (!data || !data.length) return;

    const weeklyScores: Record<number, { supervisor: number[]; self: number[] }> = {};
    data.forEach((p) => {
      if (!weeklyScores[p.week_number]) weeklyScores[p.week_number] = { supervisor: [], self: [] };
      if (p.supervisor_score !== null) weeklyScores[p.week_number].supervisor.push(Number(p.supervisor_score));
      if (p.self_assessment_score !== null) weeklyScores[p.week_number].self.push(Number(p.self_assessment_score));
    });

    const chartData = Object.entries(weeklyScores)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-10)
      .map(([wk, scores]) => ({
        week: `Week ${wk}`,
        supervisorAvg: scores.supervisor.length
          ? Math.round((scores.supervisor.reduce((s, v) => s + v, 0) / scores.supervisor.length) * 10) / 10
          : 0,
        selfAvg: scores.self.length
          ? Math.round((scores.self.reduce((s, v) => s + v, 0) / scores.self.length) * 10) / 10
          : 0,
      }));

    setSkillGrowthData(chartData);

    // Growth = difference between first and last supervisor avg
    if (chartData.length >= 2) {
      const first = chartData[0].supervisorAvg;
      const last = chartData[chartData.length - 1].supervisorAvg;
      const growth = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
      setSummaryStats((prev) => ({ ...prev, avgSkillGrowth: growth }));
    }
  };

  const engagementConfig = {
    messages: { label: 'Messages', color: 'hsl(var(--primary))' },
    deliverables: { label: 'Deliverables', color: 'hsl(var(--accent))' },
    assessments: { label: 'Assessments', color: 'hsl(142 76% 36%)' },
  };

  const skillConfig = {
    supervisorAvg: { label: 'Supervisor Score', color: 'hsl(var(--primary))' },
    selfAvg: { label: 'Self Assessment', color: 'hsl(var(--accent))' },
  };

  const statCards = [
    { title: 'Total Engagement', value: summaryStats.totalEngagement, subtitle: 'actions (8 weeks)', icon: Users, color: 'text-blue-600' },
    { title: 'Completion Rate', value: `${summaryStats.completionRate}%`, subtitle: 'assignments done', icon: CheckCircle2, color: 'text-green-600' },
    { title: 'Avg Response Time', value: `${summaryStats.avgResponseTime}h`, subtitle: 'mentor turnaround', icon: MessageCircle, color: 'text-orange-600' },
    { title: 'Avg Learning Hours', value: `${summaryStats.avgLearningHours}`, subtitle: 'hours/week', icon: Clock, color: 'text-purple-600' },
    { title: 'Skill Growth', value: `${summaryStats.avgSkillGrowth > 0 ? '+' : ''}${summaryStats.avgSkillGrowth}%`, subtitle: 'score improvement', icon: TrendingUp, color: 'text-emerald-600' },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-5">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics & Insights</h1>
            <p className="text-muted-foreground">Track intern performance and engagement metrics</p>
          </div>
          <Select value={selectedTrack} onValueChange={setSelectedTrack}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Tracks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              {tracks.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Intern Engagement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Intern Engagement (Last 8 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={engagementConfig} className="h-[280px] w-full">
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="messages" fill="var(--color-messages)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deliverables" fill="var(--color-deliverables)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="assessments" fill="var(--color-assessments)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Assignment Completion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment Completion Rate</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer config={{}} className="h-[280px] w-full">
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {completionData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Mentor Responsiveness */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mentor Responsiveness (Avg Hours)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ avgHours: { label: 'Avg Hours', color: 'hsl(var(--primary))' } }} className="h-[280px] w-full">
                <AreaChart data={responsivenessData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="avgHours" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Average Learning Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Average Learning Hours per Week</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ avgHours: { label: 'Avg Hours', color: 'hsl(var(--accent))' } }} className="h-[280px] w-full">
                <BarChart data={learningHoursData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgHours" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Skill Growth */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Skill Growth Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={skillConfig} className="h-[280px] w-full">
                <LineChart data={skillGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="supervisorAvg" stroke="var(--color-supervisorAvg)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="selfAvg" stroke="var(--color-selfAvg)" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
