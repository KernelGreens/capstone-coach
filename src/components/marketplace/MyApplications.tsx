import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Clock, ArrowRight } from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  applied: { label: 'Applied', variant: 'secondary' },
  shortlisted: { label: 'Shortlisted', variant: 'default' },
  interviewed: { label: 'Interviewed', variant: 'default' },
  accepted: { label: 'Accepted', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

const pipelineSteps = ['applied', 'shortlisted', 'interviewed', 'accepted'];

export function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    const { data } = await supabase
      .from('internship_applications')
      .select('*, internship_listings(title, location, location_type, duration_weeks, company_profiles(company_name))')
      .eq('applicant_id', user!.id)
      .order('applied_at', { ascending: false });

    setApplications(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-24" /></Card>)}</div>;
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No applications yet</h3>
          <p className="text-sm text-muted-foreground">Browse listings and apply to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map(app => {
        const listing = app.internship_listings;
        const config = statusConfig[app.status] || statusConfig.applied;
        const currentStep = pipelineSteps.indexOf(app.status);

        return (
          <Card key={app.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{listing?.title || 'Unknown Listing'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {listing?.company_profiles?.company_name || 'Unknown Company'}
                  </p>
                </div>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Pipeline visualization */}
              <div className="flex items-center gap-1">
                {pipelineSteps.map((step, i) => (
                  <div key={step} className="flex items-center gap-1 flex-1">
                    <div className={`h-2 flex-1 rounded-full transition-colors ${
                      i <= currentStep && app.status !== 'rejected'
                        ? 'bg-primary'
                        : app.status === 'rejected' ? 'bg-destructive/30' : 'bg-muted'
                    }`} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                {pipelineSteps.map(step => (
                  <span key={step} className="capitalize">{step}</span>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Applied {new Date(app.applied_at).toLocaleDateString()}
                </span>
                {app.reviewer_notes && (
                  <span className="text-foreground">Note: {app.reviewer_notes}</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
