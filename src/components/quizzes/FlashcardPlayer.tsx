import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, RotateCcw, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlashcardPlayerProps {
  quizId: string;
  onClose: () => void;
}

interface FlashQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
}

export function FlashcardPlayer({ quizId, onClose }: FlashcardPlayerProps) {
  const [cards, setCards] = useState<FlashQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, 'got' | 'miss'>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('quiz_questions').select('id, question_text, correct_answer')
      .eq('quiz_id', quizId).order('display_order')
      .then(({ data }) => { setCards(data || []); setLoading(false); });
  }, [quizId]);

  if (loading) return <p className="text-center py-8 text-muted-foreground">Loading…</p>;
  if (cards.length === 0) return <p className="text-center py-8 text-muted-foreground">No flashcards found.</p>;

  const done = Object.keys(results).length === cards.length;
  const gotCount = Object.values(results).filter((r) => r === 'got').length;

  if (done) {
    return (
      <div className="max-w-md mx-auto space-y-6 text-center">
        <Button variant="ghost" onClick={onClose} className="self-start"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <p className="text-4xl font-bold text-primary mb-2">{gotCount} / {cards.length}</p>
          <p className="text-muted-foreground mb-4">cards mastered</p>
          <Progress value={(gotCount / cards.length) * 100} className="h-3 mb-4" />
          <Button onClick={() => { setResults({}); setCurrent(0); setFlipped(false); }}>
            <RotateCcw className="h-4 w-4 mr-2" /> Study Again
          </Button>
        </Card>
      </div>
    );
  }

  const card = cards[current];

  const markCard = (result: 'got' | 'miss') => {
    setResults((prev) => ({ ...prev, [card.id]: result }));
    setFlipped(false);
    if (current < cards.length - 1) setCurrent((c) => c + 1);
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}><ArrowLeft className="h-4 w-4 mr-2" /> Exit</Button>
        <span className="text-sm text-muted-foreground">{current + 1} / {cards.length}</span>
      </div>

      <Progress value={((current + 1) / cards.length) * 100} className="h-2" />

      <div
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer perspective-1000"
      >
        <Card className={cn(
          'min-h-[240px] flex items-center justify-center p-8 transition-all duration-500',
          'hover:shadow-lg',
          flipped && 'bg-primary/5',
        )}>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-3">{flipped ? 'ANSWER' : 'QUESTION'}</p>
            <p className="text-xl font-medium">{flipped ? card.correct_answer : card.question_text}</p>
            {!flipped && <p className="text-xs text-muted-foreground mt-4">Tap to reveal answer</p>}
          </div>
        </Card>
      </div>

      {flipped && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => markCard('miss')}
          >
            <X className="h-4 w-4 mr-2" /> Don't Know
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => markCard('got')}
          >
            <Check className="h-4 w-4 mr-2" /> Got It
          </Button>
        </div>
      )}

      {!flipped && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => { setCurrent((c) => c - 1); setFlipped(false); }} disabled={current === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <Button variant="outline" onClick={() => { setCurrent((c) => c + 1); setFlipped(false); }} disabled={current >= cards.length - 1}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
