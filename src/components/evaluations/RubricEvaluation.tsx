import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, CheckCircle } from 'lucide-react';

interface Criterion {
  id: string;
  category: string;
  criterion: string;
  weight: number;
  max_score: number;
}

interface CriterionScore {
  criterion_id: string;
  score: number;
  notes: string;
}

interface RubricEvaluationProps {
  weeklyProgressId: string;
  studentId: string;
  trackId: string | null;
  supervisorId: string;
  onEvaluationSaved: () => void;
  isAlreadyScored: boolean;
}

export function RubricEvaluation({
  weeklyProgressId,
  studentId,
  trackId,
  supervisorId,
  onEvaluationSaved,
  isAlreadyScored,
}: RubricEvaluationProps) {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, CriterionScore>>({});
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCriteriaAndExisting();
  }, [weeklyProgressId, trackId]);

  const fetchCriteriaAndExisting = async () => {
    setLoading(true);

    // Fetch criteria for this track (or general criteria)
    let query = supabase
      .from('evaluation_criteria')
      .select('*')
      .order('category', { ascending: true });

    if (trackId) {
      query = query.or(`track_id.eq.${trackId},track_id.is.null`);
    }

    const [criteriaRes, existingRes, progressRes] = await Promise.all([
      query,
      supabase
        .from('weekly_evaluations')
        .select('*')
        .eq('weekly_progress_id', weeklyProgressId),
      supabase
        .from('weekly_progress')
        .select('supervisor_notes')
        .eq('id', weeklyProgressId)
        .single(),
    ]);

    if (criteriaRes.data) {
      setCriteria(criteriaRes.data as Criterion[]);
    }

    if (progressRes.data?.supervisor_notes) {
      setSupervisorNotes(progressRes.data.supervisor_notes);
    }

    // Pre-populate scores from existing evaluations
    const existingScores: Record<string, CriterionScore> = {};
    if (existingRes.data) {
      for (const ev of existingRes.data) {
        existingScores[ev.criterion_id] = {
          criterion_id: ev.criterion_id,
          score: ev.score as number,
          notes: ev.notes || '',
        };
      }
    }

    // Initialize missing scores to 0
    if (criteriaRes.data) {
      for (const c of criteriaRes.data as Criterion[]) {
        if (!existingScores[c.id]) {
          existingScores[c.id] = {
            criterion_id: c.id,
            score: 0,
            notes: '',
          };
        }
      }
    }

    setScores(existingScores);
    setLoading(false);
  };

  const updateScore = (criterionId: string, score: number) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], criterion_id: criterionId, score },
    }));
  };

  const updateNotes = (criterionId: string, notes: string) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], criterion_id: criterionId, notes },
    }));
  };

  const computeWeightedScore = (): number => {
    if (criteria.length === 0) return 0;
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = criteria.reduce((sum, c) => {
      const s = scores[c.id]?.score || 0;
      const normalized = s / c.max_score; // normalize to 0-1
      return sum + normalized * c.weight;
    }, 0);

    return Math.round((weightedSum / totalWeight) * 10 * 10) / 10; // scale to 0-10
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert each criterion score
      for (const c of criteria) {
        const s = scores[c.id];
        if (!s) continue;

        // Check if exists
        const { data: existing } = await supabase
          .from('weekly_evaluations')
          .select('id')
          .eq('weekly_progress_id', weeklyProgressId)
          .eq('criterion_id', c.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('weekly_evaluations')
            .update({ score: s.score, notes: s.notes || null })
            .eq('id', existing.id);
        } else {
          await supabase.from('weekly_evaluations').insert({
            weekly_progress_id: weeklyProgressId,
            criterion_id: c.id,
            score: s.score,
            notes: s.notes || null,
          });
        }
      }

      // Update the overall supervisor score
      const overallScore = computeWeightedScore();
      await supabase
        .from('weekly_progress')
        .update({
          supervisor_score: overallScore,
          supervisor_notes: supervisorNotes,
          score_approved: true,
          score_approved_at: new Date().toISOString(),
        })
        .eq('id', weeklyProgressId);

      toast({ title: 'Success', description: 'Evaluation saved successfully' });
      onEvaluationSaved();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save evaluation', variant: 'destructive' });
    }
    setSaving(false);
  };

  // Group criteria by category
  const grouped = criteria.reduce<Record<string, Criterion[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (criteria.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No evaluation criteria found for this track.</p>
          <p className="text-sm mt-1">Add criteria in the Evaluation Criteria page first.</p>
        </CardContent>
      </Card>
    );
  }

  const overallScore = computeWeightedScore();

  return (
    <div className="space-y-6">
      {/* Overall Score Preview */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Weighted Overall Score</p>
            <p className="text-3xl font-bold text-primary">{overallScore}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
          </div>
          {isAlreadyScored && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Previously Scored
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Criteria by category */}
      {Object.entries(grouped).map(([category, categoryCriteria]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {categoryCriteria.map((c) => {
              const score = scores[c.id]?.score || 0;
              return (
                <div key={c.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{c.criterion}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{score}</span>
                      <span className="text-xs text-muted-foreground">/ {c.max_score}</span>
                      <Badge variant="outline" className="text-xs">w: {c.weight}</Badge>
                    </div>
                  </div>
                  <Slider
                    value={[score]}
                    onValueChange={([v]) => updateScore(c.id, v)}
                    max={c.max_score}
                    step={0.5}
                    className="py-1"
                  />
                  <Textarea
                    value={scores[c.id]?.notes || ''}
                    onChange={(e) => updateNotes(c.id, e.target.value)}
                    placeholder="Notes for this criterion (optional)"
                    rows={2}
                    className="text-sm"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Overall supervisor notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Overall Supervisor Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={supervisorNotes}
            onChange={(e) => setSupervisorNotes(e.target.value)}
            placeholder="General feedback and comments"
            rows={4}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isAlreadyScored ? 'Update Evaluation' : 'Submit Evaluation'}
      </Button>
    </div>
  );
}
