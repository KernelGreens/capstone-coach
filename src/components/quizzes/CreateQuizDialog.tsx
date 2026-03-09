import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateQuizDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'manual' | 'ai'>('manual');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quizType, setQuizType] = useState<'quiz' | 'flashcard_deck'>('quiz');
  const [timeLimit, setTimeLimit] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI fields
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState('5');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [generating, setGenerating] = useState(false);

  const reset = () => {
    setTitle(''); setDescription(''); setQuizType('quiz');
    setTimeLimit(''); setWeekNumber(''); setIsPublished(false);
    setAiTopic(''); setAiCount('5'); setAiDifficulty('medium');
    setTab('manual');
  };

  const handleManualCreate = async () => {
    if (!title.trim()) return toast.error('Title is required');
    setSaving(true);
    const { error } = await supabase.from('quizzes').insert({
      title: title.trim(),
      description: description.trim() || null,
      quiz_type: quizType,
      time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
      week_number: weekNumber ? parseInt(weekNumber) : null,
      is_published: isPublished,
      created_by: user!.id,
    });
    setSaving(false);
    if (error) return toast.error('Failed to create quiz');
    toast.success('Quiz created');
    reset();
    onOpenChange(false);
    onCreated();
  };

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) return toast.error('Topic is required');
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          topic: aiTopic.trim(),
          questionCount: parseInt(aiCount),
          difficulty: aiDifficulty,
          quizType,
        },
      });
      if (error) throw error;

      // Insert quiz
      const { data: quiz, error: qErr } = await supabase.from('quizzes').insert({
        title: data.title || `${aiTopic} Quiz`,
        description: data.description || null,
        quiz_type: quizType,
        is_ai_generated: true,
        is_published: isPublished,
        created_by: user!.id,
        week_number: weekNumber ? parseInt(weekNumber) : null,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
      }).select('id').single();
      if (qErr) throw qErr;

      // Insert questions
      const questions = (data.questions || []).map((q: any, i: number) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        options: q.options || null,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        points: q.points || 1,
        display_order: i,
      }));
      if (questions.length > 0) {
        const { error: qqErr } = await supabase.from('quiz_questions').insert(questions);
        if (qqErr) throw qqErr;
      }

      toast.success(`Generated ${questions.length} questions!`);
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message || 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Quiz / Flashcards</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'manual' | 'ai')}>
          <TabsList className="w-full">
            <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1">
              <Sparkles className="h-4 w-4 mr-1" /> AI Generate
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={quizType} onValueChange={(v) => setQuizType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="flashcard_deck">Flashcards</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Week (optional)</Label>
                <Input type="number" value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} placeholder="e.g. 3" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <Label>Publish immediately</Label>
            </div>
          </div>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            {quizType === 'quiz' && (
              <div>
                <Label>Time Limit (minutes, optional)</Label>
                <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
              </div>
            )}
            <Button onClick={handleManualCreate} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create {quizType === 'quiz' ? 'Quiz' : 'Flashcard Deck'}
            </Button>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            <div>
              <Label>Topic</Label>
              <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="e.g. React Hooks, Python OOP" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Questions</Label>
                <Input type="number" min={1} max={20} value={aiCount} onChange={(e) => setAiCount(e.target.value)} />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAIGenerate} disabled={generating} className="w-full">
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate with AI
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
