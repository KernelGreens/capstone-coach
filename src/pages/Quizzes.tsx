import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuizList } from '@/components/quizzes/QuizList';
import { CreateQuizDialog } from '@/components/quizzes/CreateQuizDialog';
import { QuizPlayer } from '@/components/quizzes/QuizPlayer';
import { FlashcardPlayer } from '@/components/quizzes/FlashcardPlayer';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Quizzes() {
  const { userRole } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeFlashcardId, setActiveFlashcardId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (activeQuizId) {
    return (
      <DashboardLayout>
        <QuizPlayer quizId={activeQuizId} onClose={() => setActiveQuizId(null)} />
      </DashboardLayout>
    );
  }

  if (activeFlashcardId) {
    return (
      <DashboardLayout>
        <FlashcardPlayer quizId={activeFlashcardId} onClose={() => setActiveFlashcardId(null)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quizzes & Flashcards</h1>
            <p className="text-muted-foreground">Test your knowledge with interactive quizzes</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>

        <Tabs defaultValue="quizzes">
          <TabsList>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          </TabsList>
          <TabsContent value="quizzes">
            <QuizList
              key={`quiz-${refreshKey}`}
              type="quiz"
              onPlay={(id) => setActiveQuizId(id)}
            />
          </TabsContent>
          <TabsContent value="flashcards">
            <QuizList
              key={`flash-${refreshKey}`}
              type="flashcard_deck"
              onPlay={(id) => setActiveFlashcardId(id)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <CreateQuizDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </DashboardLayout>
  );
}
