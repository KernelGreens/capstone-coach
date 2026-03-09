import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuizListProps {
  type: 'quiz' | 'flashcard_deck';
  onPlay: (quizId: string) => void;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  quiz_type: string;
  is_published: boolean;
  is_ai_generated: boolean;
  time_limit_minutes: number | null;
  week_number: number | null;
  created_by: string;
  created_at: string;
}

export function QuizList({ type, onPlay }: QuizListProps) {
  const { user, userRole } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, [type]);

  const fetchQuizzes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('quiz_type', type)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load quizzes');
    } else {
      setQuizzes(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast.success('Deleted');
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;
  }

  if (quizzes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No {type === 'quiz' ? 'quizzes' : 'flashcard decks'} yet. Create one to get started!
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
      {quizzes.map((quiz) => (
        <Card key={quiz.id} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug">{quiz.title}</CardTitle>
              <div className="flex gap-1">
                {quiz.is_ai_generated && (
                  <Badge variant="secondary" className="shrink-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                )}
                {!quiz.is_published && (
                  <Badge variant="outline" className="shrink-0">Draft</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-3">
            {quiz.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
            )}
            <div className="flex items-center gap-2">
              {quiz.time_limit_minutes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {quiz.time_limit_minutes}m
                </span>
              )}
              {quiz.week_number && (
                <Badge variant="outline" className="text-xs">Week {quiz.week_number}</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => onPlay(quiz.id)}>
                <Play className="h-4 w-4 mr-1" />
                {type === 'quiz' ? 'Take Quiz' : 'Study'}
              </Button>
              {quiz.created_by === user?.id && (
                <Button size="sm" variant="ghost" onClick={() => handleDelete(quiz.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
