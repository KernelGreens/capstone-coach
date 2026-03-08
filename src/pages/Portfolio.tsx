import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PortfolioView } from '@/components/portfolio/PortfolioView';
import { PortfolioEditor } from '@/components/portfolio/PortfolioEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit, Share2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Portfolio() {
  const { user, userRole } = useAuth();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token');
  const studentIdParam = searchParams.get('student');
  const [portfolio, setPortfolio] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('preview');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPortfolioData();
  }, [user, shareToken, studentIdParam]);

  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      let studentId: string | null = null;

      if (shareToken) {
        // Public view via share token
        const { data: p } = await supabase
          .from('portfolios')
          .select('*, students(*, profiles:user_id(*))')
          .eq('share_token', shareToken)
          .eq('is_public', true)
          .single();
        if (p) {
          setPortfolio(p);
          setStudent(p.students);
          setProfile((p.students as any)?.profiles);
          studentId = p.student_id;
        }
      } else if (studentIdParam && userRole === 'supervisor') {
        // Supervisor viewing student portfolio
        const { data: s } = await supabase
          .from('students')
          .select('*, profiles:user_id(*)')
          .eq('id', studentIdParam)
          .single();
        if (s) {
          setStudent(s);
          setProfile((s as any).profiles);
          studentId = s.id;
        }
        const { data: p } = await supabase
          .from('portfolios')
          .select('*')
          .eq('student_id', studentIdParam)
          .single();
        setPortfolio(p);
      } else if (user && userRole === 'student') {
        // Student viewing own portfolio
        const { data: s } = await supabase
          .from('students')
          .select('*, profiles:user_id(*)')
          .eq('user_id', user.id)
          .single();
        if (s) {
          setStudent(s);
          setProfile((s as any).profiles);
          studentId = s.id;
          let { data: p } = await supabase
            .from('portfolios')
            .select('*')
            .eq('student_id', s.id)
            .single();
          if (!p) {
            // Auto-create portfolio record
            const { data: newP } = await supabase
              .from('portfolios')
              .insert({ student_id: s.id })
              .select()
              .single();
            p = newP;
          }
          setPortfolio(p);
        }
      }

      if (studentId) {
        const [projRes, badgeRes, wpRes] = await Promise.all([
          supabase.from('portfolio_projects').select('*').eq('portfolio_id', portfolio?.id || '').order('display_order'),
          supabase.from('skill_badges').select('*').eq('portfolio_id', portfolio?.id || ''),
          supabase.from('weekly_progress').select('*, projects(*)').eq('student_id', studentId).order('week_number'),
        ]);
        // Re-fetch with actual portfolio id if we just created it
        if (portfolio?.id) {
          const { data: pp } = await supabase.from('portfolio_projects').select('*').eq('portfolio_id', portfolio.id).order('display_order');
          const { data: bb } = await supabase.from('skill_badges').select('*').eq('portfolio_id', portfolio.id);
          setProjects(pp || []);
          setBadges(bb || []);
        } else {
          setProjects([]);
          setBadges([]);
        }
        setWeeklyProgress(wpRes.data || []);
      }
    } catch (err) {
      console.error('Portfolio fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refetch after portfolio id is known
  useEffect(() => {
    if (portfolio?.id) {
      Promise.all([
        supabase.from('portfolio_projects').select('*').eq('portfolio_id', portfolio.id).order('display_order'),
        supabase.from('skill_badges').select('*').eq('portfolio_id', portfolio.id),
      ]).then(([projRes, badgeRes]) => {
        setProjects(projRes.data || []);
        setBadges(badgeRes.data || []);
      });
    }
  }, [portfolio?.id]);

  const handleShareToggle = async () => {
    if (!portfolio) return;
    const { error } = await supabase
      .from('portfolios')
      .update({ is_public: !portfolio.is_public })
      .eq('id', portfolio.id);
    if (!error) {
      setPortfolio({ ...portfolio, is_public: !portfolio.is_public });
      if (!portfolio.is_public) {
        const url = `${window.location.origin}/portfolio?token=${portfolio.share_token}`;
        navigator.clipboard.writeText(url);
        toast({ title: 'Portfolio link copied!', description: 'Anyone with this link can view your portfolio.' });
      } else {
        toast({ title: 'Portfolio set to private' });
      }
    }
  };

  const handlePrintResume = () => {
    window.print();
  };

  if (loading) {
    return shareToken ? (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-64 w-full max-w-4xl mx-auto" />
      </div>
    ) : (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Public share view — no dashboard layout
  if (shareToken) {
    return (
      <div className="min-h-screen bg-background">
        <PortfolioView
          ref={printRef}
          portfolio={portfolio}
          student={student}
          profile={profile}
          projects={projects}
          badges={badges}
          weeklyProgress={weeklyProgress}
          isPublic
        />
      </div>
    );
  }

  const isOwner = userRole === 'student';
  const canEdit = isOwner || userRole === 'supervisor';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isOwner ? 'My Portfolio' : `${profile?.full_name}'s Portfolio`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {portfolio?.graduation_approved
                ? '🎓 Graduated — Portfolio complete'
                : 'Build and showcase your internship work'}
            </p>
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <Button variant="outline" size="sm" onClick={handleShareToggle}>
                <Share2 className="h-4 w-4 mr-1" />
                {portfolio?.is_public ? 'Make Private' : 'Share Portfolio'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handlePrintResume}>
              <Download className="h-4 w-4 mr-1" />
              Resume
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-1" /> Preview
            </TabsTrigger>
            {canEdit && (
              <TabsTrigger value="edit">
                <Edit className="h-4 w-4 mr-1" /> Edit
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="preview">
            <PortfolioView
              ref={printRef}
              portfolio={portfolio}
              student={student}
              profile={profile}
              projects={projects}
              badges={badges}
              weeklyProgress={weeklyProgress}
            />
          </TabsContent>

          {canEdit && (
            <TabsContent value="edit">
              <PortfolioEditor
                portfolio={portfolio}
                student={student}
                projects={projects}
                badges={badges}
                weeklyProgress={weeklyProgress}
                onUpdate={() => {
                  fetchPortfolioData();
                  setTab('preview');
                }}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
