import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  applied: { label: 'Applied', variant: 'secondary' },
  shortlisted: { label: 'Shortlisted', variant: 'default' },
  interviewed: { label: 'Interviewed', variant: 'default' },
  accepted: { label: 'Accepted', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

interface ManageListingsProps {
  onRefresh: () => void;
}

export function ManageListings({ onRefresh }: ManageListingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [applications, setApplications] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedListing, setExpandedListing] = useState<string | null>(null);
  const [updatingApp, setUpdatingApp] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchMyListings();
  }, [user]);

  const fetchMyListings = async () => {
    const { data } = await supabase
      .from('internship_listings')
      .select('*')
      .eq('created_by', user!.id)
      .order('created_at', { ascending: false });

    setListings(data || []);
    setLoading(false);
  };

  const fetchApplicationsForListing = async (listingId: string) => {
    const { data } = await supabase
      .from('internship_applications')
      .select('*, profiles:applicant_id(full_name, email)')
      .eq('listing_id', listingId)
      .order('applied_at', { ascending: false });

    setApplications(prev => ({ ...prev, [listingId]: data || [] }));
  };

  const toggleExpand = async (listingId: string) => {
    if (expandedListing === listingId) {
      setExpandedListing(null);
    } else {
      setExpandedListing(listingId);
      if (!applications[listingId]) {
        await fetchApplicationsForListing(listingId);
      }
    }
  };

  const toggleListingStatus = async (listing: any) => {
    const newStatus = listing.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('internship_listings')
      .update({ status: newStatus })
      .eq('id', listing.id);

    if (!error) {
      fetchMyListings();
      onRefresh();
      toast({ title: 'Updated', description: `Listing ${newStatus === 'published' ? 'published' : 'unpublished'}` });
    }
  };

  const updateApplicationStatus = async (appId: string, newStatus: string, listingId: string) => {
    setUpdatingApp(appId);
    const updateData: any = { status: newStatus, reviewed_by: user!.id };
    if (newStatus === 'shortlisted') updateData.shortlisted_at = new Date().toISOString();
    if (newStatus === 'interviewed') updateData.interviewed_at = new Date().toISOString();
    if (newStatus === 'accepted' || newStatus === 'rejected') updateData.decided_at = new Date().toISOString();

    const { error } = await supabase
      .from('internship_applications')
      .update(updateData)
      .eq('id', appId);

    if (!error) {
      await fetchApplicationsForListing(listingId);
      toast({ title: 'Updated', description: `Application marked as ${newStatus}` });
    }
    setUpdatingApp(null);
  };

  const saveReviewerNotes = async (appId: string, notes: string, listingId: string) => {
    await supabase.from('internship_applications').update({ reviewer_notes: notes }).eq('id', appId);
    await fetchApplicationsForListing(listingId);
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-24" /></Card>)}</div>;
  }

  if (listings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <h3 className="text-lg font-medium">No listings yet</h3>
          <p className="text-sm text-muted-foreground">Create your first internship listing to start finding interns</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {listings.map(listing => {
        const isExpanded = expandedListing === listing.id;
        const apps = applications[listing.id] || [];

        return (
          <Card key={listing.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{listing.title}</CardTitle>
                  <CardDescription>
                    Created {new Date(listing.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={listing.status === 'published' ? 'default' : 'secondary'}>
                    {listing.status}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => toggleListingStatus(listing)}>
                    {listing.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => toggleExpand(listing.id)}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Applications ({apps.length || '...'})
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {isExpanded && (
                <div className="mt-4 space-y-3">
                  {apps.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No applications yet</p>
                  ) : (
                    apps.map(app => {
                      const config = statusConfig[app.status] || statusConfig.applied;
                      return (
                        <div key={app.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{app.profiles?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{app.profiles?.email}</p>
                              <p className="text-xs text-muted-foreground">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={app.status}
                                onValueChange={(v) => updateApplicationStatus(app.id, v, listing.id)}
                                disabled={updatingApp === app.id}
                              >
                                <SelectTrigger className="w-36 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="applied">Applied</SelectItem>
                                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                  <SelectItem value="interviewed">Interviewed</SelectItem>
                                  <SelectItem value="accepted">Accepted</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {app.cover_letter && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Cover Letter</p>
                              <p className="text-sm mt-1">{app.cover_letter}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
