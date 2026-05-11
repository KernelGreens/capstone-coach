import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  FileText, Target, CheckCircle, Clock, AlertCircle, Plus, Send,
  Calendar, Video, Award, Milestone, GripVertical, Trash2, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

interface Proposal {
  id: string;
  student_id: string;
  project_id: string | null;
  title: string;
  abstract: string | null;
  objectives: string | null;
  methodology: string | null;
  expected_outcomes: string | null;
  timeline: string | null;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  approved_by: string | null;
  created_at: string;
  student?: { user_id: string; profiles?: { full_name: string; email: string } };
}

interface MilestoneItem {
  id: string;
  proposal_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  completed_at: string | null;
  feedback: string | null;
  display_order: number;
}

interface Presentation {
  id: string;
  proposal_id: string;
  scheduled_at: string | null;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  status: string;
  presentation_notes: string | null;
  evaluation_score: number | null;
  evaluation_notes: string | null;
  evaluated_by: string | null;
  evaluated_at: string | null;
}

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle; label: string }> = {
  draft: { variant: 'secondary', icon: FileText, label: 'Draft' },
  submitted: { variant: 'outline', icon: Send, label: 'Submitted' },
  under_review: { variant: 'outline', icon: Clock, label: 'Under Review' },
  revision_requested: { variant: 'destructive', icon: AlertCircle, label: 'Revision Needed' },
  approved: { variant: 'default', icon: CheckCircle, label: 'Approved' },
  pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
  in_progress: { variant: 'outline', icon: Target, label: 'In Progress' },
  completed: { variant: 'default', icon: CheckCircle, label: 'Completed' },
  scheduled: { variant: 'outline', icon: Calendar, label: 'Scheduled' },
  evaluated: { variant: 'default', icon: Award, label: 'Evaluated' },
};

export default function CapstoneProject() {
  const { user, userRole, activeStudentId } = useAuth();
  const isSupervisor = userRole === 'supervisor';

  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showPresentationDialog, setShowPresentationDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showEvalDialog, setShowEvalDialog] = useState(false);

  // Form state
  const [proposalForm, setProposalForm] = useState({ title: '', abstract: '', objectives: '', methodology: '', expected_outcomes: '', timeline: '' });
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', due_date: '' });
  const [presentationForm, setPresentationForm] = useState({ scheduled_at: '', duration_minutes: '30', location: '', meeting_link: '' });
  const [reviewForm, setReviewForm] = useState({ status: '', reviewer_notes: '' });
  const [evalForm, setEvalForm] = useState({ evaluation_score: '', evaluation_notes: '' });

  useEffect(() => { if (user) fetchProposals(); }, [user]);

  async function fetchProposals() {
    setLoading(true);
    try {
      let query = supabase.from('capstone_proposals').select('*');
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Enrich with student info
      const enriched = await Promise.all((data || []).map(async (p: any) => {
        const { data: student } = await supabase.from('students').select('user_id').eq('id', p.student_id).single();
        if (student) {
          const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', student.user_id).single();
          return { ...p, student: { ...student, profiles: profile } };
        }
        return p;
      }));

      setProposals(enriched);
      if (enriched.length > 0 && !selectedProposal) {
        setSelectedProposal(enriched[0]);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedProposal) {
      fetchMilestones(selectedProposal.id);
      fetchPresentation(selectedProposal.id);
    }
  }, [selectedProposal?.id]);

  async function fetchMilestones(proposalId: string) {
    const { data } = await supabase.from('capstone_milestones').select('*').eq('proposal_id', proposalId).order('display_order');
    setMilestones((data as MilestoneItem[]) || []);
  }

  async function fetchPresentation(proposalId: string) {
    const { data } = await supabase.from('capstone_presentations').select('*').eq('proposal_id', proposalId).maybeSingle();
    setPresentation(data as Presentation | null);
  }

  async function handleCreateProposal() {
    if (!user) return;
    const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).single();
    if (!student) { toast({ title: 'Error', description: 'Student record not found', variant: 'destructive' }); return; }

    const { error } = await supabase.from('capstone_proposals').insert({
      student_id: student.id,
      ...proposalForm,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Proposal created' });
    setShowProposalDialog(false);
    setProposalForm({ title: '', abstract: '', objectives: '', methodology: '', expected_outcomes: '', timeline: '' });
    fetchProposals();
  }

  async function handleSubmitProposal() {
    if (!selectedProposal) return;
    const { error } = await supabase.from('capstone_proposals').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', selectedProposal.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Proposal submitted for review' });
    fetchProposals();
    setSelectedProposal(prev => prev ? { ...prev, status: 'submitted' } : null);
  }

  async function handleReviewProposal() {
    if (!selectedProposal || !user) return;
    const { error } = await supabase.from('capstone_proposals').update({
      status: reviewForm.status,
      reviewer_notes: reviewForm.reviewer_notes,
      reviewed_at: new Date().toISOString(),
      approved_by: reviewForm.status === 'approved' ? user.id : null,
    }).eq('id', selectedProposal.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: reviewForm.status === 'approved' ? 'Proposal approved!' : 'Revision requested' });
    setShowReviewDialog(false);
    setReviewForm({ status: '', reviewer_notes: '' });
    fetchProposals();
    setSelectedProposal(prev => prev ? { ...prev, status: reviewForm.status } : null);
  }

  async function handleAddMilestone() {
    if (!selectedProposal) return;
    const { error } = await supabase.from('capstone_milestones').insert({
      proposal_id: selectedProposal.id,
      title: milestoneForm.title,
      description: milestoneForm.description || null,
      due_date: milestoneForm.due_date || null,
      display_order: milestones.length,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Milestone added' });
    setShowMilestoneDialog(false);
    setMilestoneForm({ title: '', description: '', due_date: '' });
    fetchMilestones(selectedProposal.id);
  }

  async function handleToggleMilestone(m: MilestoneItem) {
    const newStatus = m.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('capstone_milestones').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', m.id);
    if (selectedProposal) fetchMilestones(selectedProposal.id);
  }

  async function handleDeleteMilestone(id: string) {
    await supabase.from('capstone_milestones').delete().eq('id', id);
    if (selectedProposal) fetchMilestones(selectedProposal.id);
  }

  async function handleMilestoneFeedback(m: MilestoneItem, feedback: string) {
    await supabase.from('capstone_milestones').update({ feedback }).eq('id', m.id);
    if (selectedProposal) fetchMilestones(selectedProposal.id);
  }

  async function handleSchedulePresentation() {
    if (!selectedProposal) return;
    const { error } = await supabase.from('capstone_presentations').insert({
      proposal_id: selectedProposal.id,
      scheduled_at: presentationForm.scheduled_at ? new Date(presentationForm.scheduled_at).toISOString() : null,
      duration_minutes: parseInt(presentationForm.duration_minutes) || 30,
      location: presentationForm.location || null,
      meeting_link: presentationForm.meeting_link || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Presentation scheduled' });
    setShowPresentationDialog(false);
    setPresentationForm({ scheduled_at: '', duration_minutes: '30', location: '', meeting_link: '' });
    fetchPresentation(selectedProposal.id);
  }

  async function handleEvaluatePresentation() {
    if (!presentation || !user) return;
    const { error } = await supabase.from('capstone_presentations').update({
      evaluation_score: parseFloat(evalForm.evaluation_score),
      evaluation_notes: evalForm.evaluation_notes,
      evaluated_by: user.id,
      evaluated_at: new Date().toISOString(),
      status: 'evaluated',
    }).eq('id', presentation.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Presentation evaluated!' });
    setShowEvalDialog(false);
    setEvalForm({ evaluation_score: '', evaluation_notes: '' });
    if (selectedProposal) fetchPresentation(selectedProposal.id);
  }

  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const milestoneProgress = milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;

  function renderStatusBadge(status: string) {
    const cfg = statusConfig[status] || statusConfig.pending;
    const Icon = cfg.icon;
    return <Badge variant={cfg.variant} className="gap-1"><Icon className="h-3 w-3" />{cfg.label}</Badge>;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Capstone Projects</h1>
            <p className="text-muted-foreground">
              {isSupervisor ? 'Review and evaluate student capstone projects' : 'Manage your capstone project proposal and milestones'}
            </p>
          </div>
          {!isSupervisor && (
            <Button onClick={() => setShowProposalDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Proposal
            </Button>
          )}
        </div>

        {proposals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Capstone Proposals Yet</h3>
              <p className="text-muted-foreground mt-1">
                {isSupervisor ? 'No students have submitted capstone proposals yet.' : 'Start by creating your capstone project proposal.'}
              </p>
              {!isSupervisor && (
                <Button className="mt-4" onClick={() => setShowProposalDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Create Proposal
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Proposal List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground px-1">Proposals</h3>
              {proposals.map(p => (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${selectedProposal?.id === p.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedProposal(p)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{p.title}</p>
                        {isSupervisor && p.student?.profiles && (
                          <p className="text-xs text-muted-foreground mt-0.5">{p.student.profiles.full_name}</p>
                        )}
                      </div>
                      {renderStatusBadge(p.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detail View */}
            {selectedProposal && (
              <Tabs defaultValue="proposal" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="proposal"><FileText className="h-4 w-4 mr-1" />Proposal</TabsTrigger>
                  <TabsTrigger value="milestones"><Milestone className="h-4 w-4 mr-1" />Milestones</TabsTrigger>
                  <TabsTrigger value="presentation"><Video className="h-4 w-4 mr-1" />Presentation</TabsTrigger>
                </TabsList>

                {/* Proposal Tab */}
                <TabsContent value="proposal">
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{selectedProposal.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {selectedProposal.submitted_at
                              ? `Submitted ${format(new Date(selectedProposal.submitted_at), 'PPP')}`
                              : `Created ${format(new Date(selectedProposal.created_at), 'PPP')}`}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {renderStatusBadge(selectedProposal.status)}
                          {!isSupervisor && selectedProposal.status === 'draft' && (
                            <Button size="sm" onClick={handleSubmitProposal}>
                              <Send className="h-4 w-4 mr-1" /> Submit
                            </Button>
                          )}
                          {isSupervisor && (selectedProposal.status === 'submitted' || selectedProposal.status === 'under_review') && (
                            <Button size="sm" onClick={() => setShowReviewDialog(true)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {selectedProposal.abstract && (
                        <div><h4 className="text-sm font-semibold text-muted-foreground mb-1">Abstract</h4><p className="text-sm whitespace-pre-wrap">{selectedProposal.abstract}</p></div>
                      )}
                      {selectedProposal.objectives && (
                        <div><h4 className="text-sm font-semibold text-muted-foreground mb-1">Objectives</h4><p className="text-sm whitespace-pre-wrap">{selectedProposal.objectives}</p></div>
                      )}
                      {selectedProposal.methodology && (
                        <div><h4 className="text-sm font-semibold text-muted-foreground mb-1">Methodology</h4><p className="text-sm whitespace-pre-wrap">{selectedProposal.methodology}</p></div>
                      )}
                      {selectedProposal.expected_outcomes && (
                        <div><h4 className="text-sm font-semibold text-muted-foreground mb-1">Expected Outcomes</h4><p className="text-sm whitespace-pre-wrap">{selectedProposal.expected_outcomes}</p></div>
                      )}
                      {selectedProposal.timeline && (
                        <div><h4 className="text-sm font-semibold text-muted-foreground mb-1">Timeline</h4><p className="text-sm whitespace-pre-wrap">{selectedProposal.timeline}</p></div>
                      )}
                      {selectedProposal.reviewer_notes && (
                        <div className="rounded-lg border border-dashed p-4 bg-muted/50">
                          <h4 className="text-sm font-semibold mb-1 flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Mentor Feedback</h4>
                          <p className="text-sm whitespace-pre-wrap">{selectedProposal.reviewer_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Milestones Tab */}
                <TabsContent value="milestones">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Milestones</CardTitle>
                          <CardDescription>{completedMilestones} of {milestones.length} completed</CardDescription>
                        </div>
                        {(selectedProposal.status === 'approved' || !isSupervisor) && (
                          <Button size="sm" onClick={() => setShowMilestoneDialog(true)}>
                            <Plus className="h-4 w-4 mr-1" /> Add Milestone
                          </Button>
                        )}
                      </div>
                      {milestones.length > 0 && <Progress value={milestoneProgress} className="mt-3" />}
                    </CardHeader>
                    <CardContent>
                      {milestones.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No milestones defined yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {milestones.map(m => (
                            <div key={m.id} className="flex items-start gap-3 rounded-lg border p-3">
                              <button onClick={() => handleToggleMilestone(m)} className="mt-0.5">
                                {m.status === 'completed'
                                  ? <CheckCircle className="h-5 w-5 text-primary" />
                                  : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`font-medium ${m.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{m.title}</p>
                                  <div className="flex items-center gap-1">
                                    {m.due_date && <span className="text-xs text-muted-foreground">{format(new Date(m.due_date), 'MMM d')}</span>}
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteMilestone(m.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                {m.description && <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>}
                                {m.feedback && (
                                  <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                                    <span className="font-medium">Mentor:</span> {m.feedback}
                                  </div>
                                )}
                                {isSupervisor && m.status === 'completed' && !m.feedback && (
                                  <MilestoneFeedbackInline milestone={m} onSubmit={(fb) => handleMilestoneFeedback(m, fb)} />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Presentation Tab */}
                <TabsContent value="presentation">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Final Presentation</CardTitle>
                        {isSupervisor && !presentation && selectedProposal.status === 'approved' && (
                          <Button size="sm" onClick={() => setShowPresentationDialog(true)}>
                            <Calendar className="h-4 w-4 mr-1" /> Schedule
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!presentation ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {selectedProposal.status !== 'approved'
                            ? 'Proposal must be approved before scheduling a presentation.'
                            : 'No presentation scheduled yet.'}
                        </p>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Date & Time</p>
                              <p className="font-medium">{presentation.scheduled_at ? format(new Date(presentation.scheduled_at), 'PPPp') : 'TBD'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Duration</p>
                              <p className="font-medium">{presentation.duration_minutes} minutes</p>
                            </div>
                            {presentation.location && (
                              <div>
                                <p className="text-xs text-muted-foreground">Location</p>
                                <p className="font-medium">{presentation.location}</p>
                              </div>
                            )}
                            {presentation.meeting_link && (
                              <div>
                                <p className="text-xs text-muted-foreground">Meeting Link</p>
                                <a href={presentation.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{presentation.meeting_link}</a>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {renderStatusBadge(presentation.status)}
                            {isSupervisor && presentation.status === 'scheduled' && (
                              <Button size="sm" onClick={() => setShowEvalDialog(true)}>
                                <Award className="h-4 w-4 mr-1" /> Evaluate
                              </Button>
                            )}
                          </div>

                          {presentation.evaluation_score !== null && (
                            <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">Evaluation Result</h4>
                                <span className="text-2xl font-bold text-primary">{presentation.evaluation_score}/10</span>
                              </div>
                              {presentation.evaluation_notes && (
                                <p className="text-sm whitespace-pre-wrap">{presentation.evaluation_notes}</p>
                              )}
                              {presentation.evaluated_at && (
                                <p className="text-xs text-muted-foreground">Evaluated on {format(new Date(presentation.evaluated_at), 'PPP')}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>

      {/* New Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Capstone Proposal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={proposalForm.title} onChange={e => setProposalForm(f => ({ ...f, title: e.target.value }))} placeholder="Project title" /></div>
            <div><Label>Abstract</Label><Textarea value={proposalForm.abstract} onChange={e => setProposalForm(f => ({ ...f, abstract: e.target.value }))} placeholder="Brief overview of your project" /></div>
            <div><Label>Objectives</Label><Textarea value={proposalForm.objectives} onChange={e => setProposalForm(f => ({ ...f, objectives: e.target.value }))} placeholder="Key objectives" /></div>
            <div><Label>Methodology</Label><Textarea value={proposalForm.methodology} onChange={e => setProposalForm(f => ({ ...f, methodology: e.target.value }))} placeholder="Your approach and methods" /></div>
            <div><Label>Expected Outcomes</Label><Textarea value={proposalForm.expected_outcomes} onChange={e => setProposalForm(f => ({ ...f, expected_outcomes: e.target.value }))} placeholder="What you expect to achieve" /></div>
            <div><Label>Timeline</Label><Textarea value={proposalForm.timeline} onChange={e => setProposalForm(f => ({ ...f, timeline: e.target.value }))} placeholder="Week-by-week plan" /></div>
            <Button onClick={handleCreateProposal} disabled={!proposalForm.title} className="w-full">Create Proposal</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Proposal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Decision</Label>
              <Select value={reviewForm.status} onValueChange={v => setReviewForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue placeholder="Select decision" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="revision_requested">Request Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={reviewForm.reviewer_notes} onChange={e => setReviewForm(f => ({ ...f, reviewer_notes: e.target.value }))} placeholder="Feedback for the student" /></div>
            <Button onClick={handleReviewProposal} disabled={!reviewForm.status} className="w-full">Submit Review</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={showMilestoneDialog} onOpenChange={setShowMilestoneDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={milestoneForm.description} onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Due Date</Label><Input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <Button onClick={handleAddMilestone} disabled={!milestoneForm.title} className="w-full">Add Milestone</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Presentation Dialog */}
      <Dialog open={showPresentationDialog} onOpenChange={setShowPresentationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Presentation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Date & Time</Label><Input type="datetime-local" value={presentationForm.scheduled_at} onChange={e => setPresentationForm(f => ({ ...f, scheduled_at: e.target.value }))} /></div>
            <div><Label>Duration (minutes)</Label><Input type="number" value={presentationForm.duration_minutes} onChange={e => setPresentationForm(f => ({ ...f, duration_minutes: e.target.value }))} /></div>
            <div><Label>Location</Label><Input value={presentationForm.location} onChange={e => setPresentationForm(f => ({ ...f, location: e.target.value }))} placeholder="Room or building" /></div>
            <div><Label>Meeting Link</Label><Input value={presentationForm.meeting_link} onChange={e => setPresentationForm(f => ({ ...f, meeting_link: e.target.value }))} placeholder="https://..." /></div>
            <Button onClick={handleSchedulePresentation} className="w-full">Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evaluation Dialog */}
      <Dialog open={showEvalDialog} onOpenChange={setShowEvalDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Evaluate Presentation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Score (0-10)</Label><Input type="number" min="0" max="10" step="0.5" value={evalForm.evaluation_score} onChange={e => setEvalForm(f => ({ ...f, evaluation_score: e.target.value }))} /></div>
            <div><Label>Evaluation Notes</Label><Textarea value={evalForm.evaluation_notes} onChange={e => setEvalForm(f => ({ ...f, evaluation_notes: e.target.value }))} placeholder="Strengths, areas for improvement..." /></div>
            <Button onClick={handleEvaluatePresentation} disabled={!evalForm.evaluation_score} className="w-full">Submit Evaluation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Inline feedback component for milestones
function MilestoneFeedbackInline({ milestone, onSubmit }: { milestone: MilestoneItem; onSubmit: (fb: string) => void }) {
  const [feedback, setFeedback] = useState('');
  const [show, setShow] = useState(false);

  if (!show) return (
    <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs" onClick={() => setShow(true)}>
      <MessageSquare className="h-3 w-3 mr-1" /> Add Feedback
    </Button>
  );

  return (
    <div className="mt-2 flex gap-2">
      <Input value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Feedback..." className="h-8 text-xs" />
      <Button size="sm" className="h-8" onClick={() => { onSubmit(feedback); setShow(false); }} disabled={!feedback}>Send</Button>
    </div>
  );
}
