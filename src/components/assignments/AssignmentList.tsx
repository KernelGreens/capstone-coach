import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ClipboardList, Plus, ChevronRight, Calendar, Target, BookOpen, CheckCircle2, ListOrdered, Lightbulb, FileText, Send } from 'lucide-react';
import { format } from 'date-fns';
import { AssignmentDialog } from './AssignmentDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface AssignmentListProps {
  weeklyProgressId: string;
  studentId: string;
  isStudentView: boolean;
}

export function AssignmentList({ weeklyProgressId, studentId, isStudentView }: AssignmentListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<any>(null);
  const [viewAssignment, setViewAssignment] = useState<any>(null);
  const [submitContent, setSubmitContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = async () => {
    const { data } = await supabase
      .from('assignments')
      .select('*')
      .eq('weekly_progress_id', weeklyProgressId)
      .order('display_order');
    setAssignments(data || []);

    // Fetch submissions for this student
    if (studentId) {
      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId)
        .in('assignment_id', (data || []).map((a: any) => a.id));
      
      const subMap: Record<string, any> = {};
      subs?.forEach((s: any) => { subMap[s.assignment_id] = s; });
      setSubmissions(subMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssignments();
  }, [weeklyProgressId, studentId]);

  const handleSubmit = async (assignmentId: string) => {
    if (!submitContent.trim()) {
      toast({ variant: 'destructive', title: 'Please enter your submission' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('assignment_submissions').insert({
      assignment_id: assignmentId,
      student_id: studentId,
      content: submitContent,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Submission sent!' });
      setSubmitContent('');
      fetchAssignments();
    }
    setSubmitting(false);
  };

  if (loading) return null;
  if (assignments.length === 0 && isStudentView) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Assignments ({assignments.length})</span>
        </div>
        {!isStudentView && (
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        )}
      </div>

      {assignments.map((a) => {
        const sub = submissions[a.id];
        return (
          <Card key={a.id} className="border-l-4 border-l-primary/40">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{a.title}</span>
                    {a.is_step_guide && <Badge variant="secondary" className="text-[10px]">Step-by-Step</Badge>}
                    {sub && (
                      <Badge variant={sub.status === 'graded' ? 'default' : 'outline'} className="text-[10px]">
                        {sub.status === 'graded' ? `${sub.score}/${a.max_score}` : sub.status}
                      </Badge>
                    )}
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
                  {a.due_date && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Due: {format(new Date(a.due_date), 'PPp')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setViewAssignment(a)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {!isStudentView && (
                    <Button size="sm" variant="ghost" onClick={() => setEditAssignment(a)}>Edit</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* View Assignment Detail Dialog */}
      {viewAssignment && (
        <Dialog open={!!viewAssignment} onOpenChange={() => setViewAssignment(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewAssignment.title}
                {viewAssignment.is_step_guide && <Badge variant="secondary">Practical Guide</Badge>}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewAssignment.description && (
                <p className="text-sm text-muted-foreground">{viewAssignment.description}</p>
              )}

              {viewAssignment.learning_objectives && (
                <Section icon={Target} title="Learning Objectives" content={viewAssignment.learning_objectives} />
              )}

              {viewAssignment.instructions && (
                <Section icon={BookOpen} title="Instructions" content={viewAssignment.instructions} />
              )}

              {viewAssignment.is_step_guide && viewAssignment.steps?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ListOrdered className="h-4 w-4 text-primary" /> Step-by-Step Guide
                  </div>
                  <Accordion type="single" collapsible className="space-y-1">
                    {viewAssignment.steps.map((step: any, idx: number) => (
                      <AccordionItem key={idx} value={`step-${idx}`} className="border rounded-lg px-3">
                        <AccordionTrigger className="text-sm py-3">
                          <span className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                            {step.title}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm space-y-2 pb-3">
                          <p className="whitespace-pre-wrap">{step.content}</p>
                          {step.tip && (
                            <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>{step.tip}</span>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}

              {viewAssignment.submission_requirements && (
                <Section icon={FileText} title="Submission Requirements" content={viewAssignment.submission_requirements} />
              )}

              {viewAssignment.grading_criteria && (
                <Section icon={CheckCircle2} title="Grading Criteria" content={viewAssignment.grading_criteria} />
              )}

              {viewAssignment.resources && (
                <Section icon={BookOpen} title="Resources" content={viewAssignment.resources} />
              )}

              {viewAssignment.due_date && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Due: {format(new Date(viewAssignment.due_date), 'PPp')} · Max score: {viewAssignment.max_score}
                </p>
              )}

              {/* Student submission area */}
              {isStudentView && !submissions[viewAssignment.id] && (
                <div className="border-t pt-4 space-y-3">
                  <Label className="font-semibold">Your Submission</Label>
                  <Textarea
                    placeholder="Paste your work, links, or describe what you've done..."
                    value={submitContent}
                    onChange={e => setSubmitContent(e.target.value)}
                    rows={4}
                  />
                  <Button onClick={() => handleSubmit(viewAssignment.id)} disabled={submitting}>
                    <Send className="h-4 w-4 mr-2" /> {submitting ? 'Submitting...' : 'Submit'}
                  </Button>
                </div>
              )}

              {submissions[viewAssignment.id] && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" /> Submitted
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submissions[viewAssignment.id].content}</p>
                  {submissions[viewAssignment.id].feedback && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium">Feedback:</p>
                      <p className="text-sm">{submissions[viewAssignment.id].feedback}</p>
                      {submissions[viewAssignment.id].score != null && (
                        <p className="text-xs mt-1 font-semibold">Score: {submissions[viewAssignment.id].score}/{viewAssignment.max_score}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Supervisor grading for submissions */}
              {!isStudentView && submissions[viewAssignment.id] && submissions[viewAssignment.id].status !== 'graded' && (
                <GradeSection
                  submission={submissions[viewAssignment.id]}
                  maxScore={viewAssignment.max_score}
                  onGraded={fetchAssignments}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {createOpen && (
        <AssignmentDialog open={createOpen} onOpenChange={setCreateOpen} weeklyProgressId={weeklyProgressId} onSuccess={fetchAssignments} />
      )}
      {editAssignment && (
        <AssignmentDialog open={!!editAssignment} onOpenChange={() => setEditAssignment(null)} weeklyProgressId={weeklyProgressId} assignment={editAssignment} onSuccess={fetchAssignments} />
      )}
    </div>
  );
}

function Section({ icon: Icon, title, content }: { icon: any; title: string; content: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">{content}</p>
    </div>
  );
}

function GradeSection({ submission, maxScore, onGraded }: { submission: any; maxScore: number; onGraded: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const handleGrade = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        score: parseFloat(score),
        feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: user!.id,
      })
      .eq('id', submission.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Graded!' });
      onGraded();
    }
    setSaving(false);
  };

  return (
    <div className="border-t pt-4 space-y-3">
      <Label className="font-semibold">Grade Submission</Label>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.content}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Score (/{maxScore})</Label>
          <input type="number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" max={maxScore} min={0} value={score} onChange={e => setScore(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Feedback</Label>
        <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Provide feedback..." />
      </div>
      <Button onClick={handleGrade} disabled={saving || !score}>{saving ? 'Saving...' : 'Submit Grade'}</Button>
    </div>
  );
}
