import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, MapPin, Clock, Building2, Plus, Briefcase, Users, Filter } from 'lucide-react';
import { CreateListingDialog } from '@/components/marketplace/CreateListingDialog';
import { ListingDetailDialog } from '@/components/marketplace/ListingDetailDialog';
import { MyApplications } from '@/components/marketplace/MyApplications';
import { ManageListings } from '@/components/marketplace/ManageListings';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  skills_required: string[];
  location: string | null;
  location_type: string;
  duration_weeks: number | null;
  start_date: string | null;
  application_deadline: string | null;
  max_applicants: number | null;
  status: string;
  created_by: string;
  created_at: string;
  company_profile_id: string | null;
  company_profiles?: {
    company_name: string;
    logo_url: string | null;
    industry: string | null;
    location: string | null;
  } | null;
  creator_profile?: {
    full_name: string;
  } | null;
}

export default function Marketplace() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const canPost = userRole === 'supervisor';

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from('internship_listings')
      .select('*, company_profiles(company_name, logo_url, industry, location)')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load listings' });
    } else {
      // Fetch creator profiles separately
      const creatorIds = [...new Set((data || []).map(d => d.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      setListings((data || []).map(l => ({
        ...l,
        creator_profile: profileMap.get(l.created_by) || null,
      })));
    }
    setLoading(false);
  };

  const filtered = listings.filter(l => {
    const matchSearch = !search || 
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.description?.toLowerCase().includes(search.toLowerCase()) ||
      l.skills_required?.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchLocation = locationFilter === 'all' || l.location_type === locationFilter;
    return matchSearch && matchLocation;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Internship Marketplace</h1>
            <p className="text-muted-foreground">Find internships, mentors, and opportunities</p>
          </div>
          {canPost && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Post Listing
            </Button>
          )}
        </div>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <Users className="h-4 w-4" />
              My Applications
            </TabsTrigger>
            {canPost && (
              <TabsTrigger value="manage" className="gap-2">
                <Building2 className="h-4 w-4" />
                My Listings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, skills, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Listings Grid */}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 space-y-3">
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-16 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No listings found</h3>
                  <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(listing => (
                  <Card 
                    key={listing.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedListing(listing)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-base line-clamp-1">{listing.title}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {listing.company_profiles?.company_name || listing.creator_profile?.full_name || 'Unknown'}
                          </CardDescription>
                        </div>
                        <Badge variant={
                          listing.location_type === 'remote' ? 'default' : 
                          listing.location_type === 'hybrid' ? 'secondary' : 'outline'
                        } className="text-xs shrink-0">
                          {listing.location_type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {listing.description || 'No description provided'}
                      </p>
                      
                      {listing.skills_required && listing.skills_required.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {listing.skills_required.slice(0, 3).map(skill => (
                            <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                          ))}
                          {listing.skills_required.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{listing.skills_required.length - 3}</Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        {listing.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {listing.location}
                          </span>
                        )}
                        {listing.duration_weeks && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {listing.duration_weeks}w
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications">
            <MyApplications />
          </TabsContent>

          {canPost && (
            <TabsContent value="manage">
              <ManageListings onRefresh={fetchListings} />
            </TabsContent>
          )}
        </Tabs>

        <CreateListingDialog 
          open={createOpen} 
          onOpenChange={setCreateOpen} 
          onCreated={fetchListings} 
        />

        <ListingDetailDialog
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      </div>
    </DashboardLayout>
  );
}
