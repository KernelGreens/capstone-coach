import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileText, CheckCircle2, Clock, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function MyProgress() {
  const { user } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [selfAssessment, setSelfAssessment] = useState({ score: '', notes: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
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
  };

  const handleSelfAssessment = async () => {
    if (!selectedWeek || !selfAssessment.score) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please provide a score',
      });
      return;
    }

    const { error } = await supabase
      .from('weekly_progress')
      .update({
        self_assessment_score: parseFloat(selfAssessment.score),
        self_assessment_notes: selfAssessment.notes,
      })
      .eq('id', selectedWeek.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Success',
        description: 'Self-assessment submitted successfully',
      });
      setSelfAssessment({ score: '', notes: '' });
      setSelectedWeek(null);
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'default',
      overdue: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const completedCount = weeklyProgress.filter(w => w.status === 'completed').length;
  const progress = weeklyProgress.length > 0 ? (completedCount / weeklyProgress.length) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Progress</h1>
          <p className="text-muted-foreground">Track your weekly tasks and deliverables</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completedCount} of {weeklyProgress.length} weeks completed
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {weeklyProgress.map((week) => (
            <Card key={week.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Week {week.week_number}</CardTitle>
                      <p className="text-sm text-muted-foreground">{week.week_focus}</p>
                    </div>
                  </div>
                  {getStatusBadge(week.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {week.tasks && (
                  <div>
                    <p className="text-sm font-medium">Tasks:</p>
                    <p className="text-sm text-muted-foreground">{week.tasks}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Self Assessment:</p>
                    <p className="text-muted-foreground">
                      {week.self_assessment_score ? `${week.self_assessment_score}/10` : 'Not submitted'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Supervisor Score:</p>
                    <p className="text-muted-foreground">
                      {week.score_approved && week.supervisor_score
                        ? `${week.supervisor_score}/10`
                        : 'Pending'}
                    </p>
                  </div>
                </div>

                {!week.self_assessment_score && (
                  <div className="space-y-3 border-t pt-4">
                    <Label>Submit Self-Assessment</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        placeholder="Score (0-10)"
                        value={selectedWeek?.id === week.id ? selfAssessment.score : ''}
                        onChange={(e) => {
                          setSelectedWeek(week);
                          setSelfAssessment({ ...selfAssessment, score: e.target.value });
                        }}
                        className="w-32"
                      />
                      <Textarea
                        placeholder="Add notes (optional)"
                        value={selectedWeek?.id === week.id ? selfAssessment.notes : ''}
                        onChange={(e) => {
                          setSelectedWeek(week);
                          setSelfAssessment({ ...selfAssessment, notes: e.target.value });
                        }}
                        rows={1}
                        className="flex-1"
                      />
                      <Button onClick={handleSelfAssessment} disabled={selectedWeek?.id !== week.id || !selfAssessment.score}>
                        Submit
                      </Button>
                    </div>
                  </div>
                )}

                {week.supervisor_notes && week.score_approved && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium">Supervisor Feedback:</p>
                    <p className="text-sm text-muted-foreground">{week.supervisor_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}