import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/use-subscription';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Loader2, Users, Zap, Gem, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRICES = {
  pro_monthly: 'price_1T8pkiGlS9Id5o6zPfOGdTjP',
  pro_annual: 'price_1T8plCGlS9Id5o6z0FUPeH5z',
  premium_monthly: 'price_1T8q3PGlS9Id5o6znOLWQPg9',
  premium_annual: 'price_1T8q3lGlS9Id5o6zIEFpU4z2',
};

export const PRODUCT_IDS = {
  pro_monthly: 'prod_U73snos34o73rK',
  pro_annual: 'prod_U73sNZTbvAiTsa',
  premium_monthly: 'prod_U74B4nS5LsUWIU',
  premium_annual: 'prod_U74C240Qcx85oz',
};

export default function Pricing() {
  const { user, userRole } = useAuth();
  const { subscribed, isExcluded, loading, productId, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();
  const [annual, setAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isPro = subscribed && (productId === PRODUCT_IDS.pro_monthly || productId === PRODUCT_IDS.pro_annual);
  const isPremium = subscribed && (productId === PRODUCT_IDS.premium_monthly || productId === PRODUCT_IDS.premium_annual);

  const handleSubscribe = async (tier: 'pro' | 'premium') => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setCheckoutLoading(tier);
    try {
      const priceId = tier === 'pro'
        ? (annual ? PRICES.pro_annual : PRICES.pro_monthly)
        : (annual ? PRICES.premium_annual : PRICES.premium_monthly);
      await createCheckout(priceId);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleRedeemCoupon = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!couponCode.trim()) { toast({ title: 'Enter a coupon code', variant: 'destructive' }); return; }
    setCouponLoading(true);
    try {
      // Find the coupon
      const { data: coupon, error: findError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (findError || !coupon) {
        toast({ title: 'Invalid coupon', description: 'This coupon code is not valid.', variant: 'destructive' });
        setCouponLoading(false);
        return;
      }

      // Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast({ title: 'Expired', description: 'This coupon has expired.', variant: 'destructive' });
        setCouponLoading(false);
        return;
      }

      // Check max uses
      if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
        toast({ title: 'Limit reached', description: 'This coupon has reached its usage limit.', variant: 'destructive' });
        setCouponLoading(false);
        return;
      }

      // Check if user already redeemed this coupon
      const { data: existing } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('coupon_id', coupon.id)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Already redeemed', description: 'You have already used this coupon.', variant: 'destructive' });
        setCouponLoading(false);
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + coupon.duration_days);

      const { error: redeemError } = await supabase.from('coupon_redemptions').insert({
        coupon_id: coupon.id,
        user_id: user.id,
        plan_tier: coupon.plan_tier,
        access_expires_at: expiresAt.toISOString(),
      });

      if (redeemError) throw redeemError;

      // Increment times_used
      await supabase.from('coupons').update({ times_used: coupon.times_used + 1 }).eq('id', coupon.id);

      toast({ title: '🎉 Coupon applied!', description: `You now have ${coupon.plan_tier} access for ${coupon.duration_days} days.` });
      setCouponCode('');
      checkSubscription();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to redeem coupon', variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  };

  const freeFeatures = [
    '1 active student',
    'Weekly progress tracking',
    'Evaluation & scoring',
    'Meeting scheduling',
    'Messaging',
    'Resource library',
  ];

  const proFeatures = [
    'Up to 10 active students',
    'Everything in Free',
    'Analytics dashboard',
    'Internship marketplace',
    'Capstone project management',
    'Portfolio & graduation',
    'Priority support',
  ];

  const premiumFeatures = [
    'Unlimited active students',
    'Everything in Pro',
    'Advanced analytics',
    'Custom branding',
    'Dedicated support',
    'API access',
  ];

  const renderPlanButton = (tier: 'free' | 'pro' | 'premium') => {
    if (loading) {
      return (
        <Button className="w-full" disabled>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading...
        </Button>
      );
    }
    if (isExcluded) {
      return (
        <Button className="w-full" disabled variant="outline">
          Unlimited Access Granted
        </Button>
      );
    }

    if (tier === 'free') {
      return !subscribed ? (
        <Button variant="outline" className="w-full" disabled>Your current plan</Button>
      ) : (
        <Button variant="outline" className="w-full" disabled>Free</Button>
      );
    }

    if (tier === 'pro') {
      return isPro ? (
        <Button className="w-full" variant="outline" onClick={openCustomerPortal}>Manage Subscription</Button>
      ) : (
        <Button className="w-full" onClick={() => handleSubscribe('pro')} disabled={!!checkoutLoading}>
          {checkoutLoading === 'pro' ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting...</> : 'Upgrade to Pro'}
        </Button>
      );
    }

    return isPremium ? (
      <Button className="w-full" variant="outline" onClick={openCustomerPortal}>Manage Subscription</Button>
    ) : (
      <Button className="w-full" onClick={() => handleSubscribe('premium')} disabled={!!checkoutLoading}>
        {checkoutLoading === 'premium' ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting...</> : 'Upgrade to Premium'}
      </Button>
    );
  };

  const content = (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Start free with 1 student. Scale your mentorship program with Pro or go unlimited with Premium.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Label htmlFor="billing-toggle" className={!annual ? 'font-semibold' : 'text-muted-foreground'}>Monthly</Label>
        <Switch id="billing-toggle" checked={annual} onCheckedChange={setAnnual} />
        <Label htmlFor="billing-toggle" className={annual ? 'font-semibold' : 'text-muted-foreground'}>
          Annual
          <Badge variant="secondary" className="ml-2">Save 20%</Badge>
        </Label>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Free Plan */}
        <Card className={`relative ${!subscribed && !isExcluded ? 'border-primary ring-2 ring-primary/20' : ''}`}>
          {!subscribed && !isExcluded && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Free
            </CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className="pt-2">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {renderPlanButton('free')}
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className={`relative ${isPro ? 'border-primary ring-2 ring-primary/20' : 'border-2'}`}>
          {isPro && !isExcluded && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Pro
            </CardTitle>
            <CardDescription>For growing mentorship programs</CardDescription>
            <div className="pt-2">
              {annual ? (
                <>
                  <span className="text-4xl font-bold">$7.99</span>
                  <span className="text-muted-foreground">/month</span>
                  <p className="text-sm text-muted-foreground mt-1">$95.90 billed annually</p>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">$9.99</span>
                  <span className="text-muted-foreground">/month</span>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {renderPlanButton('pro')}
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className={`relative ${isPremium ? 'border-primary ring-2 ring-primary/20' : 'border-2'}`}>
          {isPremium && !isExcluded && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>
          )}
          {isExcluded && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="secondary">Unlimited Access</Badge>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gem className="h-5 w-5 text-primary" />
              Premium
            </CardTitle>
            <CardDescription>For large-scale programs</CardDescription>
            <div className="pt-2">
              {annual ? (
                <>
                  <span className="text-4xl font-bold">$19.99</span>
                  <span className="text-muted-foreground">/month</span>
                  <p className="text-sm text-muted-foreground mt-1">$239.90 billed annually</p>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">$24.99</span>
                  <span className="text-muted-foreground">/month</span>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Gem className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {renderPlanButton('premium')}
          </CardFooter>
        </Card>
      </div>
    </div>
  );

  if (user && userRole) {
    return <DashboardLayout>{content}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {content}
    </div>
  );
}
