import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface WeeklyProgress {
  id: string;
  week_number: number;
  student_id: string;
  week_focus: string;
  status: string;
  self_assessment_score: number;
  supervisor_score: number;
  supervisor_notes: string;
  score_approved: boolean;
  students: {
    id: string;
    user_id: string;
  };
  student_profile?: {
    full_name: string;
  };
}

export default function Evaluations() {
  const [progressData, setProgressData] = useState<WeeklyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgress, setSelectedProgress] = useState<WeeklyProgress | null>(null);
  const [supervisorScore, setSupervisorScore] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchProgressData();
  }, [filterStatus]);

  const fetchProgressData = async () => {
    setLoading(true);
    let query = supabase
      .from('weekly_progress')
      .select(`
        *,
        students!inner(id, user_id)
      `)
      .order('week_number', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch progress data',
        variant: 'destructive',
      });
    } else if (data) {
      // Fetch profiles separately
      const userIds = data.map((p: any) => p.students.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const enrichedData = data.map((p: any) => ({
        ...p,
        student_profile: profiles?.find((prof) => prof.id === p.students.user_id),
      }));
      
      setProgressData(enrichedData || []);
    }
    setLoading(false);
  };

  const handleEvaluate = async () => {
    if (!selectedProgress || !supervisorScore) return;

    const { error } = await supabase
      .from('weekly_progress')
      .update({
        supervisor_score: parseFloat(supervisorScore),
        supervisor_notes: supervisorNotes,
        score_approved: true,
        score_approved_at: new Date().toISOString(),
      })
      .eq('id', selectedProgress.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit evaluation',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Evaluation submitted successfully',
      });
      setSelectedProgress(null);
      setSupervisorScore('');
      setSupervisorNotes('');
      fetchProgressData();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
            <p className="text-muted-foreground">Review and score student progress</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {progressData.map((progress) => (
              <Card key={progress.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {progress.student_profile?.full_name || 'Student'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Week {progress.week_number}</p>
                  </div>
                    <div className="flex gap-2">
                      {getStatusIcon(progress.status)}
                      {progress.score_approved && (
                        <Badge variant="secondary">Scored</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Focus Area</p>
                    <p className="text-sm text-muted-foreground">{progress.week_focus || 'N/A'}</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Self-Assessment:</span>
                    <span className="font-medium">{progress.self_assessment_score || 'N/A'}/10</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Supervisor Score:</span>
                    <span className="font-medium">
                      {progress.supervisor_score ? `${progress.supervisor_score}/10` : 'Not scored'}
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedProgress(progress);
                      setSupervisorScore(progress.supervisor_score?.toString() || '');
                      setSupervisorNotes(progress.supervisor_notes || '');
                    }}
                    className="w-full"
                    variant={progress.score_approved ? 'outline' : 'default'}
                  >
                    {progress.score_approved ? 'Update Evaluation' : 'Evaluate'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedProgress && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Evaluate: {selectedProgress.student_profile?.full_name || 'Student'} - Week {selectedProgress.week_number}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="supervisor_score">Supervisor Score (0-10)</Label>
                <Input
                  id="supervisor_score"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={supervisorScore}
                  onChange={(e) => setSupervisorScore(e.target.value)}
                  placeholder="Enter score"
                />
              </div>
              <div>
                <Label htmlFor="supervisor_notes">Supervisor Notes</Label>
                <Textarea
                  id="supervisor_notes"
                  value={supervisorNotes}
                  onChange={(e) => setSupervisorNotes(e.target.value)}
                  placeholder="Provide feedback and notes"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleEvaluate} className="flex-1">
                  Submit Evaluation
                </Button>
                <Button
                  onClick={() => {
                    setSelectedProgress(null);
                    setSupervisorScore('');
                    setSupervisorNotes('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
