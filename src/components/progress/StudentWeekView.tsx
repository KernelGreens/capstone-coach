import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, Clock, AlertCircle, Upload, MessageSquare, 
  Star, Send, BookOpen, ListChecks
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CurriculumCard } from './CurriculumCard';
import { TaskChecklist } from './TaskChecklist';
import { DeliverablesSection } from './DeliverablesSection';
import { validateFile } from '@/lib/fileValidation';

interface StudentWeekViewProps {
  weekProgress: any;
  project: any;
  student: any;
  onUpdate: () => void;
}

export function StudentWeekView({ weekProgress, project, student, onUpdate }: StudentWeekViewProps) {
  const [selfAssessment, setSelfAssessment] = useState({ score: '', notes: '' });
  const [uploading, setUploading] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Parse completed tasks from notes or a stored field
    if (weekProgress.self_assessment_notes) {
      try {
        const parsed = JSON.parse(weekProgress.self_assessment_notes);
        if (parsed.completedTasks) {
          setCompletedTasks(parsed.completedTasks);
        }
      } catch {
        // Not JSON, just notes
      }
    }
  }, [weekProgress]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { variant: any; icon: any; label: string; color: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Not Started', color: 'text-muted-foreground' },
      in_progress: { variant: 'default', icon: Clock, label: 'In Progress', color: 'text-blue-500' },
      completed: { variant: 'default', icon: CheckCircle2, label: 'Completed', color: 'text-green-500' },
      needs_revision: { variant: 'destructive', icon: AlertCircle, label: 'Revision Needed', color: 'text-destructive' },
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(weekProgress.status);
  const StatusIcon = statusConfig.icon;

  const handleTaskToggle = async (taskIndex: number, completed: boolean) => {
    let newCompletedTasks: string[];
    if (completed) {
      newCompletedTasks = [...completedTasks, taskIndex.toString()];
    } else {
      newCompletedTasks = completedTasks.filter(t => t !== taskIndex.toString());
    }
    setCompletedTasks(newCompletedTasks);

    // Save to database
    const notesData = {
      completedTasks: newCompletedTasks,
      notes: selfAssessment.notes || weekProgress.self_assessment_notes
    };

    await supabase
      .from('weekly_progress')
      .update({
        self_assessment_notes: JSON.stringify(notesData),
        status: newCompletedTasks.length > 0 ? 'in_progress' : 'pending'
      })
      .eq('id', weekProgress.id);

    onUpdate();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      toast({ variant: 'destructive', title: 'Invalid File', description: validation.error });
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

      toast({ title: 'Success', description: 'Deliverable uploaded' });
      onUpdate();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!selfAssessment.score) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide a score' });
      return;
    }

    const { error } = await supabase
      .from('weekly_progress')
      .update({
        self_assessment_score: parseFloat(selfAssessment.score),
        self_assessment_notes: JSON.stringify({
          completedTasks,
          notes: selfAssessment.notes
        }),
        status: 'in_progress',
      })
      .eq('id', weekProgress.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Submitted', description: 'Your self-assessment has been submitted for review' });
      setSelfAssessment({ score: '', notes: '' });
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Week {weekProgress.week_number}
            <Badge variant={statusConfig.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </h2>
          {weekProgress.week_focus && (
            <p className="text-muted-foreground mt-1">{weekProgress.week_focus}</p>
          )}
        </div>
        {weekProgress.score_approved && weekProgress.supervisor_score && (
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {weekProgress.supervisor_score}/10
            </div>
            <p className="text-xs text-muted-foreground">Approved Score</p>
          </div>
        )}
      </div>

      <Tabs defaultValue="curriculum" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="curriculum" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Curriculum
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="submit" className="gap-2">
            <Send className="h-4 w-4" />
            Submit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum" className="space-y-4">
          <CurriculumCard project={project} />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskChecklist
                tasks={weekProgress.tasks || ''}
                completedTasks={completedTasks}
                onTaskToggle={handleTaskToggle}
                disabled={weekProgress.status === 'completed'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submit" className="space-y-4">
          {/* Deliverables Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Click to upload files'}
                  </span>
                </div>
              </Label>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              
              <DeliverablesSection
                weekProgressId={weekProgress.id}
                studentId={student.id}
                canDelete={true}
              />
            </CardContent>
          </Card>

          {/* Self Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5" />
                Self Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {weekProgress.self_assessment_score ? (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Your Score</span>
                    <span className="text-xl font-bold">{weekProgress.self_assessment_score}/10</span>
                  </div>
                  {weekProgress.status === 'in_progress' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Waiting for supervisor review...
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Score (0-10)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        placeholder="Rate your work"
                        value={selfAssessment.score}
                        onChange={(e) => setSelfAssessment({ ...selfAssessment, score: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Reflection Notes</Label>
                    <Textarea
                      placeholder="What did you learn? What challenges did you face?"
                      value={selfAssessment.notes}
                      onChange={(e) => setSelfAssessment({ ...selfAssessment, notes: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <Button 
                    onClick={handleSubmitAssessment} 
                    disabled={!selfAssessment.score}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Review
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Supervisor Feedback */}
      {weekProgress.supervisor_notes && weekProgress.score_approved !== null && (
        <Card className={weekProgress.status === 'needs_revision' ? 'border-destructive/50' : 'border-green-500/50'}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Supervisor Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{weekProgress.supervisor_notes}</p>
            {weekProgress.score_approved_at && (
              <p className="text-xs text-muted-foreground mt-3">
                {format(new Date(weekProgress.score_approved_at), 'PPp')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
