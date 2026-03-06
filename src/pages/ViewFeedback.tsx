import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquareHeart } from 'lucide-react';
import { format } from 'date-fns';

interface Feedback {
  id: string;
  user_email: string;
  category: string;
  message: string;
  created_at: string;
}

const categoryColors: Record<string, string> = {
  general: 'bg-secondary text-secondary-foreground',
  bug: 'bg-destructive text-destructive-foreground',
  feature: 'bg-primary text-primary-foreground',
  improvement: 'bg-accent text-accent-foreground',
  other: 'bg-muted text-muted-foreground',
};

export default function ViewFeedback() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Feedback</h1>
          <p className="text-muted-foreground">Review feedback submitted by users.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : feedback.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquareHeart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No feedback submitted yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{item.user_email}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={categoryColors[item.category] || categoryColors.other}>
                        {item.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{item.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
