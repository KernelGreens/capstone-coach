import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Github, Plus, Trash2, Loader2, Award, RefreshCw, GraduationCap } from 'lucide-react';

interface PortfolioEditorProps {
  portfolio: any;
  student: any;
  projects: any[];
  badges: any[];
  weeklyProgress: any[];
  onUpdate: () => void;
}

export function PortfolioEditor({ portfolio, student, projects, badges, weeklyProgress, onUpdate }: PortfolioEditorProps) {
  const { userRole } = useAuth();
  const [bio, setBio] = useState(portfolio?.bio || '');
  const [githubUsername, setGithubUsername] = useState(portfolio?.github_username || '');
  const [fetchingGithub, setFetchingGithub] = useState(false);
  const [saving, setSaving] = useState(false);

  // New project form
  const [newProject, setNewProject] = useState({ title: '', description: '', github_url: '', technologies: '' });
  const [addingProject, setAddingProject] = useState(false);

  // New badge form (supervisor only)
  const [newBadge, setNewBadge] = useState({ name: '', category: 'technical', level: 'beginner', description: '' });
  const [addingBadge, setAddingBadge] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('portfolios')
      .update({ bio, github_username: githubUsername })
      .eq('id', portfolio.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error saving profile', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated' });
      onUpdate();
    }
  };

  const handleFetchGithub = async () => {
    if (!githubUsername.trim()) return;
    setFetchingGithub(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-github-profile', {
        body: { username: githubUsername.trim() },
      });
      if (error) throw error;
      await supabase
        .from('portfolios')
        .update({ github_data: data, github_username: githubUsername.trim() })
        .eq('id', portfolio.id);
      toast({ title: 'GitHub profile synced!' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'GitHub sync failed', description: err.message, variant: 'destructive' });
    } finally {
      setFetchingGithub(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProject.title.trim()) return;
    setAddingProject(true);

    let githubStats = null;
    if (newProject.github_url) {
      // Try to extract repo stats from github data
      const githubData = portfolio.github_data as any;
      if (githubData?.repos) {
        const repoName = newProject.github_url.split('/').pop();
        const match = githubData.repos.find((r: any) => r.name === repoName);
        if (match) githubStats = match;
      }
    }

    const { error } = await supabase.from('portfolio_projects').insert({
      portfolio_id: portfolio.id,
      title: newProject.title,
      description: newProject.description || null,
      github_url: newProject.github_url || null,
      github_stats: githubStats,
      technologies: newProject.technologies ? newProject.technologies.split(',').map((t: string) => t.trim()) : [],
      display_order: projects.length,
    });

    setAddingProject(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewProject({ title: '', description: '', github_url: '', technologies: '' });
      toast({ title: 'Project added' });
      onUpdate();
    }
  };

  const handleDeleteProject = async (id: string) => {
    await supabase.from('portfolio_projects').delete().eq('id', id);
    toast({ title: 'Project removed' });
    onUpdate();
  };

  const handleAddBadge = async () => {
    if (!newBadge.name.trim()) return;
    setAddingBadge(true);
    const { error } = await supabase.from('skill_badges').insert({
      portfolio_id: portfolio.id,
      name: newBadge.name,
      category: newBadge.category,
      level: newBadge.level,
      description: newBadge.description || null,
      awarded_by: (await supabase.auth.getUser()).data.user?.id,
    });
    setAddingBadge(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewBadge({ name: '', category: 'technical', level: 'beginner', description: '' });
      toast({ title: 'Badge awarded' });
      onUpdate();
    }
  };

  const handleDeleteBadge = async (id: string) => {
    await supabase.from('skill_badges').delete().eq('id', id);
    toast({ title: 'Badge removed' });
    onUpdate();
  };

  const handleApproveGraduation = async () => {
    const now = new Date().toISOString();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase
      .from('portfolios')
      .update({
        graduation_approved: true,
        graduation_approved_at: now,
        graduation_approved_by: userId,
        certificate_issued: true,
      })
      .eq('id', portfolio.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '🎓 Graduation approved!', description: 'Certificate has been issued.' });
      onUpdate();
    }
  };

  const internshipEnded = student && new Date(student.end_date) <= new Date();
  const canGraduate = userRole === 'supervisor' && internshipEnded && !portfolio?.graduation_approved;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile & Bio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Bio / Tagline</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Brief introduction..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Github className="h-4 w-4" /> GitHub Username</Label>
            <div className="flex gap-2">
              <Input value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} placeholder="e.g. octocat" />
              <Button variant="outline" onClick={handleFetchGithub} disabled={fetchingGithub || !githubUsername.trim()}>
                {fetchingGithub ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync
              </Button>
            </div>
            {portfolio?.github_data && (
              <p className="text-xs text-muted-foreground">
                Last synced: {new Date((portfolio.github_data as any)?.fetched_at).toLocaleString()}
              </p>
            )}
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Projects Section */}
      <Card>
        <CardHeader>
          <CardTitle>Project Showcase</CardTitle>
          <CardDescription>Add projects to highlight in your portfolio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.map((p: any) => (
            <div key={p.id} className="flex items-start justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-foreground">{p.title}</p>
                {p.technologies?.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {p.technologies.map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteProject(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <Separator />

          <div className="space-y-3">
            <Label>Add New Project</Label>
            <Input placeholder="Project title" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} />
            <Textarea placeholder="Description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} rows={2} />
            <Input placeholder="GitHub URL (optional)" value={newProject.github_url} onChange={(e) => setNewProject({ ...newProject, github_url: e.target.value })} />
            <Input placeholder="Technologies (comma-separated)" value={newProject.technologies} onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })} />
            <Button onClick={handleAddProject} disabled={addingProject || !newProject.title.trim()}>
              {addingProject ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skill Badges — supervisor only */}
      {userRole === 'supervisor' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Skill Badges</CardTitle>
            <CardDescription>Award skill badges to this student</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {badges.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{b.name}</Badge>
                  <span className="text-xs text-muted-foreground capitalize">{b.level} • {b.category}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteBadge(b.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Badge Name</Label>
                <Input value={newBadge.name} onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })} placeholder="e.g. React" />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={newBadge.category} onValueChange={(v) => setNewBadge({ ...newBadge, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="soft_skill">Soft Skill</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Level</Label>
                <Select value={newBadge.level} onValueChange={(v) => setNewBadge({ ...newBadge, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Description (optional)</Label>
                <Input value={newBadge.description} onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleAddBadge} disabled={addingBadge || !newBadge.name.trim()}>
              {addingBadge ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Award className="h-4 w-4 mr-1" />}
              Award Badge
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Graduation Approval — supervisor only */}
      {canGraduate && (
        <Card className="border-2 border-accent/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-accent" /> Approve Graduation
            </CardTitle>
            <CardDescription>
              This student's internship has ended. Approve graduation to issue their certificate and finalize the portfolio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleApproveGraduation} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <GraduationCap className="h-4 w-4 mr-1" /> Approve Graduation & Issue Certificate
            </Button>
          </CardContent>
        </Card>
      )}

      {portfolio?.graduation_approved && (
        <Card className="border-accent/30">
          <CardContent className="py-4 text-center text-muted-foreground">
            ✅ Graduation approved on {new Date(portfolio.graduation_approved_at).toLocaleDateString()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
