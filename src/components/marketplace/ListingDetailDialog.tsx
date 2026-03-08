import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, Building2, Calendar, Loader2, Send } from 'lucide-react';

interface ListingDetailDialogProps {
  listing: any | null;
  onClose: () => void;
}

export function ListingDetailDialog({ listing, onClose }: ListingDetailDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);

  if (!listing) return null;

  const isOwner = listing.created_by === user?.id;

  const handleApply = async () => {
    if (!user) return;
    setApplying(true);
    try {
      const { error } = await supabase.from('internship_applications').insert({
        listing_id: listing.id,
        applicant_id: user.id,
        cover_letter: coverLetter.trim() || null,
        status: 'applied',
      });
      if (error) {
        if (error.code === '23505') {
          toast({ variant: 'destructive', title: 'Already Applied', description: 'You have already applied to this listing.' });
        } else throw error;
      } else {
        toast({ title: 'Application Submitted!', description: 'Your application has been sent to the listing owner.' });
        setShowApply(false);
        setCoverLetter('');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={!!listing} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{listing.title}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {listing.company_profiles?.company_name || listing.creator_profile?.full_name || 'Unknown'}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={listing.location_type === 'remote' ? 'default' : 'secondary'}>
              {listing.location_type}
            </Badge>
            {listing.location && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" /> {listing.location}
              </Badge>
            )}
            {listing.duration_weeks && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" /> {listing.duration_weeks} weeks
              </Badge>
            )}
            {listing.application_deadline && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" /> Deadline: {new Date(listing.application_deadline).toLocaleDateString()}
              </Badge>
            )}
          </div>

          {listing.description && (
            <div>
              <h3 className="font-semibold mb-1">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          {listing.requirements && (
            <div>
              <h3 className="font-semibold mb-1">Requirements</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.requirements}</p>
            </div>
          )}

          {listing.skills_required && listing.skills_required.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Skills Required</h3>
              <div className="flex flex-wrap gap-1">
                {listing.skills_required.map((skill: string) => (
                  <Badge key={skill} variant="outline">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {!isOwner && !showApply && (
            <Button onClick={() => setShowApply(true)} className="w-full gap-2">
              <Send className="h-4 w-4" /> Apply Now
            </Button>
          )}

          {showApply && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold">Submit Your Application</h3>
              <div className="space-y-2">
                <Label>Cover Letter (optional)</Label>
                <Textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell the mentor why you're a great fit..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowApply(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleApply} disabled={applying} className="flex-1 gap-2">
                  {applying && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Application
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
