import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Clock, AlertCircle, UserCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface StudentOption {
  student_id: string;
  user_id: string;
  full_name: string;
}

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
}

export default function Evaluations() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [weeks, setWeeks] = useState<WeeklyProgress[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [selectedProgress, setSelectedProgress] = useState<WeeklyProgress | null>(null);
  const [supervisorScore, setSupervisorScore] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [weeksLoading, setWeeksLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchWeeks(selectedStudentId);
      setSelectedWeekId('');
      setSelectedProgress(null);
    } else {
      setWeeks([]);
      setSelectedWeekId('');
      setSelectedProgress(null);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    if (selectedWeekId) {
      const week = weeks.find(w => w.id === selectedWeekId) || null;
      setSelectedProgress(week);
      setSupervisorScore(week?.supervisor_score?.toString() || '');
      setSupervisorNotes(week?.supervisor_notes || '');
    } else {
      setSelectedProgress(null);
      setSupervisorScore('');
      setSupervisorNotes('');
    }
  }, [selectedWeekId, weeks]);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('id, user_id')
      .eq('status', 'active');

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch students', variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = data.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const options: StudentOption[] = data.map(s => ({
        student_id: s.id,
        user_id: s.user_id,
        full_name: profiles?.find(p => p.id === s.user_id)?.full_name || 'Unknown',
      }));
      setStudents(options);
    }
    setLoading(false);
  };

  const fetchWeeks = async (studentId: string) => {
    setWeeksLoading(true);
    const { data, error } = await supabase
      .from('weekly_progress')
      .select('*')
      .eq('student_id', studentId)
      .order('week_number', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch weeks', variant: 'destructive' });
    } else {
      setWeeks((data as WeeklyProgress[]) || []);
    }
    setWeeksLoading(false);
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
      toast({ title: 'Error', description: 'Failed to submit evaluation', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Evaluation submitted successfully' });
      fetchWeeks(selectedStudentId);
    }
  };

  const getStatusBadge = (progress: WeeklyProgress) => {
    if (progress.score_approved) return <Badge variant="secondary">Scored</Badge>;
    if (progress.status === 'completed') return <Badge variant="default">Completed</Badge>;
    if (progress.status === 'pending') return <Badge variant="outline">Pending</Badge>;
    return <Badge variant="outline">{progress.status}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
          <p className="text-muted-foreground">Select a student and week to evaluate</p>
        </div>

        {/* Selection dropdowns */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.student_id} value={s.student_id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Week</Label>
            <Select value={selectedWeekId} onValueChange={setSelectedWeekId} disabled={!selectedStudentId || weeksLoading}>
              <SelectTrigger>
                <SelectValue placeholder={weeksLoading ? 'Loading weeks...' : 'Select a week'} />
              </SelectTrigger>
              <SelectContent>
                {weeks.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    Week {w.week_number} — {w.week_focus || w.status}{w.score_approved ? ' ✓' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected week detail */}
        {selectedProgress && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {students.find(s => s.student_id === selectedStudentId)?.full_name} — Week {selectedProgress.week_number}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{selectedProgress.week_focus || 'No focus set'}</p>
                </div>
                {getStatusBadge(selectedProgress)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Self-Assessment</p>
                  <p className="text-2xl font-bold">{selectedProgress.self_assessment_score ?? 'N/A'}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm text-muted-foreground">Supervisor Score</p>
                  <p className="text-2xl font-bold">
                    {selectedProgress.supervisor_score ? `${selectedProgress.supervisor_score}` : '—'}
                    <span className="text-sm font-normal text-muted-foreground">/10</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
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
                  <Button onClick={handleEvaluate} className="flex-1" disabled={!supervisorScore}>
                    {selectedProgress.score_approved ? 'Update Evaluation' : 'Submit Evaluation'}
                  </Button>
                  <Button
                    onClick={() => { setSelectedWeekId(''); }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedStudentId && !selectedWeekId && !weeksLoading && weeks.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>No weekly progress found for this student.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
