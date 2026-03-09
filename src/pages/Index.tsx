import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { GraduationCap, Target, TrendingUp, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already authenticated (e.g. after OAuth redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Internship Mentorship Platform</span>
          </div>
          <Link to="/auth">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight">
            Mentor, Track & Grow — Together
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            The all-in-one platform where supervisors guide and students thrive.
            Manage tracks, monitor progress, and collaborate throughout every internship journey.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg">
              Start Your Journey
            </Button>
          </Link>
        </section>

        <section className="border-t bg-secondary/30 py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">Key Features</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-primary p-3">
                    <Target className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Track Progress</h3>
                <p className="text-muted-foreground">
                  Monitor weekly tasks, deliverables, and milestones throughout the internship
                </p>
              </div>
              
              <div className="rounded-lg border bg-card p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-accent p-3">
                    <TrendingUp className="h-6 w-6 text-accent-foreground" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Performance Evaluation</h3>
                <p className="text-muted-foreground">
                  Comprehensive scoring system with self-assessment and supervisor feedback
                </p>
              </div>
              
              <div className="rounded-lg border bg-card p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-primary p-3">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Collaboration Tools</h3>
                <p className="text-muted-foreground">
                  Comments, meetings, resources, and real-time communication features
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 Internship Mentorship Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
