import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { DragDropQuestion } from './DragDropQuestion';
import { ArrowLeft, ArrowRight, Check, X, Clock, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  correct_answer: string;
  explanation: string | null;
  points: number;
}

interface QuizPlayerProps {
  quizId: string;
  onClose: () => void;
}

export function QuizPlayer({ quizId, onClose }: QuizPlayerProps) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((p) => (p !== null ? p - 1 : null)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !finished) finishQuiz();
  }, [timeLeft, finished]);

  const loadQuiz = async () => {
    const [{ data: q }, { data: qs }, { data: stu }] = await Promise.all([
      supabase.from('quizzes').select('*').eq('id', quizId).single(),
      supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('display_order'),
      supabase.from('students').select('id').eq('user_id', user!.id).maybeSingle(),
    ]);
    setQuiz(q);
    setQuestions(qs || []);
    setStudentId(stu?.id || null);
    if (q?.time_limit_minutes) setTimeLeft(q.time_limit_minutes * 60);
    setLoading(false);
  };

  const handleAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const revealAnswer = useCallback(() => {
    const q = questions[current];
    setRevealed((prev) => ({ ...prev, [q.id]: true }));
    if (answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) {
      setScore((s) => s + q.points);
    }
  }, [current, questions, answers]);

  const finishQuiz = async () => {
    let totalScore = 0;
    const maxScore = questions.reduce((s, q) => s + q.points, 0);
    questions.forEach((q) => {
      if (answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) {
        totalScore += q.points;
      }
    });
    setScore(totalScore);
    setFinished(true);

    if (studentId) {
      await supabase.from('quiz_attempts').insert({
        quiz_id: quizId,
        student_id: studentId,
        score: totalScore,
        max_score: maxScore,
        answers,
        completed_at: new Date().toISOString(),
      });
    }
  };

  if (loading) return <p className="text-center py-8 text-muted-foreground">Loading quiz…</p>;
  if (!quiz || questions.length === 0) return <p className="text-center py-8 text-muted-foreground">No questions found.</p>;

  if (finished) {
    const maxScore = questions.reduce((s, q) => s + q.points, 0);
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Button variant="ghost" onClick={onClose}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <Card className="text-center">
          <CardHeader>
            <Trophy className={cn('h-12 w-12 mx-auto', pct >= 70 ? 'text-yellow-500' : 'text-muted-foreground')} />
            <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-bold">{pct}%</p>
            <p className="text-muted-foreground">{score} / {maxScore} points</p>
            <Progress value={pct} className="h-3" />
            <Button onClick={onClose} className="mt-4">Done</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = questions[current];
  const isRevealed = revealed[q.id];
  const isCorrect = answers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}><ArrowLeft className="h-4 w-4 mr-2" /> Exit</Button>
        {timeLeft !== null && (
          <Badge variant="outline" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">{current + 1} / {questions.length}</span>
      </div>

      <Progress value={((current + 1) / questions.length) * 100} className="h-2" />

      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit mb-2">{q.question_type.replace('_', ' ')}</Badge>
          <CardTitle className="text-lg">{q.question_text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.question_type === 'multiple_choice' && q.options && (
            <div className="space-y-2">
              {(Array.isArray(q.options) ? q.options : []).map((opt: string, i: number) => (
                <Button
                  key={i}
                  variant={answers[q.id] === opt ? 'default' : 'outline'}
                  className={cn(
                    'w-full justify-start text-left h-auto py-3',
                    isRevealed && opt === q.correct_answer && 'bg-green-100 border-green-400 text-green-900 dark:bg-green-950 dark:text-green-100',
                    isRevealed && answers[q.id] === opt && opt !== q.correct_answer && 'bg-red-100 border-red-400 text-red-900 dark:bg-red-950 dark:text-red-100',
                  )}
                  onClick={() => !isRevealed && handleAnswer(q.id, opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {q.question_type === 'true_false' && (
            <div className="flex gap-3">
              {['True', 'False'].map((opt) => (
                <Button
                  key={opt}
                  variant={answers[q.id] === opt ? 'default' : 'outline'}
                  className={cn(
                    'flex-1',
                    isRevealed && opt === q.correct_answer && 'bg-green-100 border-green-400 dark:bg-green-950',
                    isRevealed && answers[q.id] === opt && opt !== q.correct_answer && 'bg-red-100 border-red-400 dark:bg-red-950',
                  )}
                  onClick={() => !isRevealed && handleAnswer(q.id, opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {q.question_type === 'fill_blank' && (
            <Input
              placeholder="Type your answer…"
              value={answers[q.id] || ''}
              onChange={(e) => handleAnswer(q.id, e.target.value)}
              disabled={isRevealed}
              className={cn(
                isRevealed && isCorrect && 'border-green-400',
                isRevealed && !isCorrect && 'border-red-400',
              )}
            />
          )}

          {q.question_type === 'drag_drop_match' && q.options && !isRevealed && (
            <DragDropQuestion
              pairs={q.options as { left: string; right: string }[]}
              onAnswer={(correct) => {
                handleAnswer(q.id, correct ? q.correct_answer : '__wrong__');
                setRevealed((prev) => ({ ...prev, [q.id]: true }));
                if (correct) setScore((s) => s + q.points);
              }}
            />
          )}

          {isRevealed && (
            <div className={cn('flex items-start gap-2 p-3 rounded-lg text-sm', isCorrect ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950')}>
              {isCorrect ? <Check className="h-4 w-4 text-green-600 mt-0.5" /> : <X className="h-4 w-4 text-red-600 mt-0.5" />}
              <div>
                <p className="font-medium">{isCorrect ? 'Correct!' : `Incorrect. Answer: ${q.correct_answer}`}</p>
                {q.explanation && <p className="text-muted-foreground mt-1">{q.explanation}</p>}
              </div>
            </div>
          )}

          {!isRevealed && q.question_type !== 'drag_drop_match' && answers[q.id] && (
            <Button onClick={revealAnswer} className="w-full">Check Answer</Button>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={finishQuiz}>
            Finish Quiz <Trophy className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
