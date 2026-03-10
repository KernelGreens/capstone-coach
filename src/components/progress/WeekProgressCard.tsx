import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, MessageSquare, CheckCircle2, Clock, AlertCircle, Sparkles, Loader2, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DeliverablesSection } from './DeliverablesSection';
import { validateFile, getAcceptString, formatFileSize, MAX_FILE_SIZE } from '@/lib/fileValidation';
import { AssignmentList } from '@/components/assignments/AssignmentList';

interface WeekProgressCardProps {
  weekProgress: any;
  student: any;
  isStudentView: boolean;
  onUpdate?: () => void;
}

export function WeekProgressCard({ weekProgress, student, isStudentView, onUpdate }: WeekProgressCardProps) {
  const [showSubmission, setShowSubmission] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selfAssessment, setSelfAssessment] = useState({ score: '', notes: '' });
  const [feedback, setFeedback] = useState({ score: '', notes: '' });
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      in_progress: { variant: 'default', icon: Clock, label: 'In Progress' },
      completed: { variant: 'default', icon: CheckCircle2, label: 'Completed' },
      needs_revision: { variant: 'destructive', icon: AlertCircle, label: 'Needs Revision' },
    };
    const { variant, icon: Icon, label } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: validation.error,
      });
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${student.id}/${weekProgress.week_number}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('deliverables')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('deliverables').insert({
        student_id: student.id,
        weekly_progress_id: weekProgress.id,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Deliverable uploaded successfully',
      });
      onUpdate?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSelfAssessment = async () => {
    if (!selfAssessment.score) {
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
        status: 'in_progress',
      })
      .eq('id', weekProgress.id);

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
      setShowSubmission(false);
      onUpdate?.();
    }
  };

  const handleSupervisorFeedback = async (approve: boolean) => {
    if (!feedback.score && approve) {
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
        supervisor_score: approve ? parseFloat(feedback.score) : null,
        supervisor_notes: feedback.notes,
        score_approved: approve,
        score_approved_at: approve ? new Date().toISOString() : null,
        status: approve ? 'completed' : 'needs_revision',
      })
      .eq('id', weekProgress.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Success',
        description: approve ? 'Progress approved' : 'Revision requested',
      });
      setFeedback({ score: '', notes: '' });
      setShowFeedback(false);
      onUpdate?.();
    }
  };

  const handleAIScoring = async () => {
    setAiLoading(true);
    setShowFeedback(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get deliverables info
      const { data: deliverables } = await supabase
        .from('deliverables')
        .select('file_name, file_type')
        .eq('weekly_progress_id', weekProgress.id);
      
      // Parse self assessment notes
      let selfNotes = weekProgress.self_assessment_notes;
      let completedTasks: string[] = [];
      try {
        const parsed = JSON.parse(selfNotes);
        completedTasks = parsed.completedTasks || [];
        selfNotes = parsed.notes || selfNotes;
      } catch {}

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-score-recommendation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekly_progress_id: weekProgress.id,
          student_name: student.profiles?.full_name || 'Student',
          week_number: weekProgress.week_number,
          tasks: weekProgress.tasks || '',
          completed_tasks: completedTasks.map((i: string) => `Task ${parseInt(i) + 1}`).join(', '),
          self_assessment_score: weekProgress.self_assessment_score,
          self_assessment_notes: selfNotes,
          deliverables: deliverables?.map(d => d.file_name).join(', ') || 'None',
          project_details: weekProgress.week_focus || ''
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'AI scoring failed');
      }

      setAiRecommendation(result.evaluation);
      toast({
        title: 'AI Analysis Complete',
        description: 'Review the AI recommendations below',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: error.message,
      });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Week {weekProgress.week_number}</CardTitle>
              <p className="text-sm text-muted-foreground">{weekProgress.week_focus || 'No focus set'}</p>
            </div>
          </div>
          {getStatusBadge(weekProgress.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {weekProgress.tasks && (
          <div>
            <p className="text-sm font-medium">Tasks:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{weekProgress.tasks}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Self Assessment:</p>
            <p className="text-muted-foreground">
              {weekProgress.self_assessment_score ? `${weekProgress.self_assessment_score}/10` : 'Not submitted'}
            </p>
            {weekProgress.self_assessment_notes && (
              <p className="text-xs text-muted-foreground mt-1">{weekProgress.self_assessment_notes}</p>
            )}
          </div>
          <div>
            <p className="font-medium">Supervisor Score:</p>
            <p className="text-muted-foreground">
              {weekProgress.score_approved && weekProgress.supervisor_score
                ? `${weekProgress.supervisor_score}/10`
                : 'Pending'}
            </p>
          </div>
        </div>

        {isStudentView && !weekProgress.self_assessment_score && (
          <div className="border-t pt-4 space-y-3">
            {!showSubmission ? (
              <Button onClick={() => setShowSubmission(true)} className="w-full">
                Submit Self-Assessment
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Score (0-10)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="Score"
                    value={selfAssessment.score}
                    onChange={(e) => setSelfAssessment({ ...selfAssessment, score: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Add your notes..."
                    value={selfAssessment.notes}
                    onChange={(e) => setSelfAssessment({ ...selfAssessment, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSelfAssessment} disabled={!selfAssessment.score}>
                    Submit
                  </Button>
                  <Button variant="outline" onClick={() => setShowSubmission(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isStudentView && weekProgress.self_assessment_score && (
          <div className="border-t pt-4">
            <Label htmlFor={`file-${weekProgress.id}`} className="cursor-pointer">
              <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent">
                <Upload className="h-4 w-4" />
                <span className="text-sm">{uploading ? 'Uploading...' : 'Upload Deliverable'}</span>
              </div>
            </Label>
            <Input
              id={`file-${weekProgress.id}`}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </div>
        )}

        {!isStudentView && weekProgress.self_assessment_score && !weekProgress.score_approved && (
          <div className="border-t pt-4 space-y-3">
            {!showFeedback ? (
              <div className="flex gap-2">
                <Button onClick={() => setShowFeedback(true)} className="flex-1" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Feedback
                </Button>
                <Button 
                  onClick={handleAIScoring} 
                  variant="secondary"
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Assist
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {aiRecommendation && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Sparkles className="h-4 w-4" />
                      AI Recommendation
                    </div>
                    <p className="text-sm">
                      <strong>Suggested Score:</strong> {aiRecommendation.suggested_score}/10
                    </p>
                    <p className="text-xs text-muted-foreground">{aiRecommendation.score_justification}</p>
                    <div className="text-xs">
                      <strong>Positive:</strong> {aiRecommendation.positive_highlight}
                    </div>
                    <div className="text-xs">
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {aiRecommendation.recommendations?.map((r: string, i: number) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setFeedback({
                          score: aiRecommendation.suggested_score.toString(),
                          notes: `${aiRecommendation.positive_highlight}\n\nRecommendations:\n${aiRecommendation.recommendations?.join('\n- ')}`
                        });
                      }}
                    >
                      Use AI Suggestion
                    </Button>
                  </div>
                )}
                <div>
                  <Label>Score (0-10)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="Score"
                    value={feedback.score}
                    onChange={(e) => setFeedback({ ...feedback, score: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Feedback Notes</Label>
                  <Textarea
                    placeholder="Provide feedback..."
                    value={feedback.notes}
                    onChange={(e) => setFeedback({ ...feedback, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleSupervisorFeedback(true)} disabled={!feedback.score}>
                    Approve
                  </Button>
                  <Button variant="destructive" onClick={() => handleSupervisorFeedback(false)}>
                    Request Revision
                  </Button>
                  <Button variant="outline" onClick={() => { setShowFeedback(false); setAiRecommendation(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {weekProgress.supervisor_notes && weekProgress.score_approved !== null && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Supervisor Feedback:
            </p>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{weekProgress.supervisor_notes}</p>
            {weekProgress.score_approved_at && (
              <p className="text-xs text-muted-foreground mt-2">
                {format(new Date(weekProgress.score_approved_at), 'PPp')}
              </p>
            )}
          </div>
        )}

        <DeliverablesSection
          weekProgressId={weekProgress.id}
          studentId={student.id}
          canDelete={isStudentView}
        />
      </CardContent>
    </Card>
  );
}