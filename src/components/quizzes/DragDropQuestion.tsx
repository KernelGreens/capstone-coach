import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DragDropQuestionProps {
  pairs: { left: string; right: string }[];
  onAnswer: (correct: boolean) => void;
}

export function DragDropQuestion({ pairs, onAnswer }: DragDropQuestionProps) {
  const [leftItems] = useState(() => pairs.map((p) => p.left));
  const [rightItems] = useState(() => [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5));
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleLeftClick = (item: string) => {
    if (submitted) return;
    setSelectedLeft(item === selectedLeft ? null : item);
  };

  const handleRightClick = (item: string) => {
    if (submitted || !selectedLeft) return;
    setMatches((prev) => ({ ...prev, [selectedLeft]: item }));
    setSelectedLeft(null);
  };

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    const correctCount = pairs.filter((p) => matches[p.left] === p.right).length;
    onAnswer(correctCount === pairs.length);
  }, [matches, pairs, onAnswer]);

  const allMatched = Object.keys(matches).length === pairs.length;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted-foreground">Match items on the left to the right</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {leftItems.map((item) => (
            <Card
              key={item}
              onClick={() => handleLeftClick(item)}
              className={cn(
                'p-3 cursor-pointer text-sm transition-all select-none',
                selectedLeft === item && 'ring-2 ring-primary',
                matches[item] && !submitted && 'bg-secondary',
                submitted && matches[item] === pairs.find((p) => p.left === item)?.right && 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700',
                submitted && matches[item] !== pairs.find((p) => p.left === item)?.right && 'bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700',
              )}
            >
              {item}
              {matches[item] && <span className="text-xs text-muted-foreground ml-2">→ {matches[item]}</span>}
            </Card>
          ))}
        </div>
        <div className="space-y-2">
          {rightItems.map((item) => {
            const isUsed = Object.values(matches).includes(item);
            return (
              <Card
                key={item}
                onClick={() => handleRightClick(item)}
                className={cn(
                  'p-3 text-sm transition-all select-none',
                  !submitted && !isUsed && selectedLeft && 'cursor-pointer hover:ring-2 hover:ring-primary/50',
                  isUsed && 'opacity-50',
                )}
              >
                {item}
              </Card>
            );
          })}
        </div>
      </div>
      {!submitted && (
        <Button onClick={handleSubmit} disabled={!allMatched} className="w-full">
          Check Answers
        </Button>
      )}
    </div>
  );
}
