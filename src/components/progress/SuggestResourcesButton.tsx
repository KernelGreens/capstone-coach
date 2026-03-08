import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, ExternalLink, BookOpen, Video, FileText, Wrench, GraduationCap, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SuggestResourcesButtonProps {
  project: any;
  weekNumber: number;
  studentNotes?: string;
}

const typeIcons: Record<string, any> = {
  article: FileText,
  tutorial: BookOpen,
  video: Video,
  documentation: FileText,
  course: GraduationCap,
  tool: Wrench,
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-700 dark:text-green-400',
  intermediate: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  advanced: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export function SuggestResourcesButton({ project, weekNumber, studentNotes }: SuggestResourcesButtonProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleSuggest = async () => {
    setLoading(true);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-resources`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: project?.title || 'General learning',
            week_number: weekNumber,
            objectives: project?.objectives || '',
            tools_technologies: project?.tools_technologies || '',
            student_notes: studentNotes || '',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to suggest resources');
      }

      setResults(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (results) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Suggested Resources
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setResults(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {results.summary && (
            <p className="text-sm text-muted-foreground">{results.summary}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {results.resources?.map((resource: any, i: number) => {
            const Icon = typeIcons[resource.type] || FileText;
            return (
              <a
                key={i}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-1.5 mt-0.5">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {resource.title}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{resource.relevance}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{resource.type}</Badge>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${difficultyColors[resource.difficulty] || ''}`}>
                        {resource.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
          <Button variant="outline" size="sm" className="w-full" onClick={handleSuggest} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
            Refresh Suggestions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleSuggest}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {loading ? 'Searching resources...' : 'Suggest Resources'}
    </Button>
  );
}
