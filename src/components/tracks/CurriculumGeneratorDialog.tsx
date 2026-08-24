import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, Check, Edit2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CurriculumWeek {
  week_number: number;
  week_focus: string;
  objectives: string[];
  tasks: string;
  deliverables: string;
  tools: string[];
}

interface CurriculumGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackName: string;
  trackDescription: string;
  onSaved: () => void;
}

export function CurriculumGeneratorDialog({
  open,
  onOpenChange,
  trackId,
  trackName,
  trackDescription,
  onSaved,
}: CurriculumGeneratorDialogProps) {
  const [weeks, setWeeks] = useState('8');
  const [focusAreas, setFocusAreas] = useState('');
  const [outlineText, setOutlineText] = useState('');
  const [outlineFile, setOutlineFile] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [outlineFileName, setOutlineFileName] = useState('');

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([]);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const generateCurriculum = async () => {
    const weekCount = parseInt(weeks);
    if (isNaN(weekCount) || weekCount < 1 || weekCount > 52) {
      toast({
        variant: 'destructive',
        title: 'Invalid weeks',
        description: 'Please enter a number between 1 and 52',
      });
      return;
    }

    setGenerating(true);
    setCurriculum([]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-curriculum`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            trackName,
            trackDescription,
            internshipWeeks: weekCount,
            focusAreas,
            outlineText: outlineText.trim() || undefined,
            outlineFile: outlineFile || undefined,

          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate curriculum');
      }

      setCurriculum(data.curriculum);
      // Expand all weeks initially
      setExpandedWeeks(new Set(data.curriculum.map((w: CurriculumWeek) => w.week_number)));
      
      toast({
        title: 'Curriculum generated',
        description: 'Review and edit the curriculum before saving',
      });
    } catch (error: any) {
      console.error('Error generating curriculum:', error);
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const updateWeek = (weekNumber: number, field: keyof CurriculumWeek, value: any) => {
    setCurriculum(prev =>
      prev.map(week =>
        week.week_number === weekNumber ? { ...week, [field]: value } : week
      )
    );
  };

  const toggleExpanded = (weekNumber: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }
      return next;
    });
  };

  const saveCurriculum = async () => {
    if (curriculum.length === 0) return;

    setSaving(true);
    try {
      // Create projects for each week
      const projects = curriculum.map(week => ({
        track_id: trackId,
        title: week.week_focus,
        description: `**Objectives:**\n${week.objectives.map(o => `- ${o}`).join('\n')}\n\n**Tasks:**\n${week.tasks}`,
        objectives: week.objectives.join('\n'),
        deliverables: week.deliverables,
        tools_technologies: week.tools.join(', '),
        week_number: week.week_number,
        project_type: 'weekly',
      }));

      const { error } = await supabase.from('projects').insert(projects);

      if (error) throw error;

      toast({
        title: 'Curriculum saved',
        description: `${curriculum.length} weeks of curriculum added to the track`,
      });

      onSaved();
      handleClose();
    } catch (error: any) {
      console.error('Error saving curriculum:', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCurriculum([]);
    setEditingWeek(null);
    setExpandedWeeks(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 !flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Curriculum Generator
          </DialogTitle>
          <DialogDescription>
            Generate a complete curriculum for "{trackName}" using AI
          </DialogDescription>
        </DialogHeader>

        {curriculum.length === 0 ? (
          <div className="space-y-4 px-6 py-4 pb-6 overflow-y-auto">
            <div>
              <Label>Internship Duration (weeks) *</Label>
              <Input
                type="number"
                min="1"
                max="52"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                placeholder="e.g., 8"
              />
            </div>
            <div>
              <Label>Additional Focus Areas (optional)</Label>
              <Textarea
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="e.g., Cloud computing, DevOps practices, Security best practices..."
                rows={3}
              />
            </div>
            <Button
              onClick={generateCurriculum}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating curriculum...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Curriculum
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-6 pb-6">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <p className="text-sm text-muted-foreground">
                Review and edit the generated curriculum. Click on a week to expand/collapse.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurriculum([])}>
                  <X className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
                <Button onClick={saveCurriculum} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Curriculum
                    </>
                  )}
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 pr-4">
              <div className="space-y-3 pb-4">
                {curriculum.map((week) => (
                  <Card key={week.week_number} className="overflow-hidden">
                    <CardHeader
                      className="py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => toggleExpanded(week.week_number)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">Week {week.week_number}</Badge>
                          {editingWeek === week.week_number ? (
                            <Input
                              value={week.week_focus}
                              onChange={(e) => updateWeek(week.week_number, 'week_focus', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-8"
                            />
                          ) : (
                            <CardTitle className="text-base">{week.week_focus}</CardTitle>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWeek(editingWeek === week.week_number ? null : week.week_number);
                            }}
                          >
                            {editingWeek === week.week_number ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Edit2 className="h-4 w-4" />
                            )}
                          </Button>
                          {expandedWeeks.has(week.week_number) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedWeeks.has(week.week_number) && (
                      <CardContent className="pt-0 space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Objectives</Label>
                          {editingWeek === week.week_number ? (
                            <Textarea
                              value={week.objectives.join('\n')}
                              onChange={(e) => updateWeek(week.week_number, 'objectives', e.target.value.split('\n'))}
                              rows={3}
                              className="mt-1"
                            />
                          ) : (
                            <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                              {week.objectives.map((obj, i) => (
                                <li key={i}>{obj}</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Tasks</Label>
                          {editingWeek === week.week_number ? (
                            <Textarea
                              value={week.tasks}
                              onChange={(e) => updateWeek(week.week_number, 'tasks', e.target.value)}
                              rows={4}
                              className="mt-1"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {week.tasks}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Deliverables</Label>
                          {editingWeek === week.week_number ? (
                            <Textarea
                              value={week.deliverables}
                              onChange={(e) => updateWeek(week.week_number, 'deliverables', e.target.value)}
                              rows={2}
                              className="mt-1"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              {week.deliverables}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Tools & Technologies</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {week.tools.map((tool, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
