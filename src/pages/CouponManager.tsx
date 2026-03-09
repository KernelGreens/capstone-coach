import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Copy, Trash2, Ticket, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  plan_tier: string;
  duration_days: number;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Redemption {
  id: string;
  user_id: string;
  plan_tier: string;
  redeemed_at: string;
  access_expires_at: string;
  coupon_id: string;
}

export default function CouponManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [planTier, setPlanTier] = useState('pro');
  const [durationDays, setDurationDays] = useState('30');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const isSuperAdmin = user?.email === 'abiodunahmadaws@gmail.com';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCoupons();
      fetchRedemptions();
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  async function fetchCoupons() {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setCoupons(data);
    setLoading(false);
  }

  async function fetchRedemptions() {
    const { data, error } = await supabase
      .from('coupon_redemptions')
      .select('*')
      .order('redeemed_at', { ascending: false });
    if (!error && data) setRedemptions(data);
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
    setCode(result);
  }

  async function handleCreate() {
    if (!code.trim()) {
      toast({ title: 'Error', description: 'Please enter a coupon code', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('coupons').insert({
      code: code.toUpperCase().trim(),
      plan_tier: planTier,
      duration_days: parseInt(durationDays),
      max_uses: maxUses ? parseInt(maxUses) : null,
      expires_at: expiresAt || null,
      created_by: user!.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Coupon created', description: `Code: ${code.toUpperCase()}` });
      setDialogOpen(false);
      setCode('');
      setMaxUses('');
      setExpiresAt('');
      fetchCoupons();
    }
    setCreating(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id);
    fetchCoupons();
  }

  async function deleteCoupon(id: string) {
    await supabase.from('coupons').delete().eq('id', id);
    fetchCoupons();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied', description: `${code} copied to clipboard` });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Ticket className="h-6 w-6" /> Coupon Manager
            </h1>
            <p className="text-muted-foreground">Create and manage coupon codes for subscription access</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Coupon</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Coupon Code</DialogTitle>
                <DialogDescription>Generate a code that grants subscription access when redeemed.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME2024" />
                    <Button variant="outline" onClick={generateCode} type="button">Generate</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Plan Tier</Label>
                  <Select value={planTier} onValueChange={setPlanTier}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (days)</Label>
                  <Input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Max Uses (leave empty for unlimited)</Label>
                  <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Expires At (optional)</Label>
                  <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Coupon
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Coupons</CardTitle>
            <CardDescription>{coupons.length} coupon(s) total</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : coupons.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No coupons created yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                      <TableCell>
                        <Badge variant={c.plan_tier === 'premium' ? 'default' : 'secondary'}>
                          {c.plan_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.duration_days} days</TableCell>
                      <TableCell>{c.times_used}{c.max_uses ? ` / ${c.max_uses}` : ' / ∞'}</TableCell>
                      <TableCell>
                        <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.expires_at ? format(new Date(c.expires_at), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => copyCode(c.code)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteCoupon(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redemptions</CardTitle>
            <CardDescription>{redemptions.length} redemption(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {redemptions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No redemptions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Redeemed</TableHead>
                    <TableHead>Access Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}...</TableCell>
                      <TableCell><Badge variant="secondary">{r.plan_tier}</Badge></TableCell>
                      <TableCell>{format(new Date(r.redeemed_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(r.access_expires_at), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
