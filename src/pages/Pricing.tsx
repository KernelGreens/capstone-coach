import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/use-subscription';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Crown, Loader2, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRICES = {
  monthly: 'price_1T8pkiGlS9Id5o6zPfOGdTjP',
  annual: 'price_1T8plCGlS9Id5o6z0FUPeH5z',
};

export default function Pricing() {
  const { user, userRole } = useAuth();
  const { subscribed, isExcluded, loading, createCheckout, openCustomerPortal } = useSubscription();
  const [annual, setAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setCheckoutLoading(true);
    try {
      await createCheckout(annual ? PRICES.annual : PRICES.monthly);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setCheckoutLoading(false);
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

  const content = (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Start free with 1 student. Upgrade to Pro when you're ready to scale your mentorship program.
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

      <div className="grid md:grid-cols-2 gap-6">
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
            {!subscribed && !isExcluded ? (
              <Button variant="outline" className="w-full" disabled>
                Your current plan
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Free
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className={`relative ${subscribed ? 'border-primary ring-2 ring-primary/20' : 'border-2'}`}>
          {subscribed && !isExcluded && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>
          )}
          {isExcluded && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="secondary">Unlimited Access</Badge>
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
            {loading ? (
              <Button className="w-full" disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </Button>
            ) : isExcluded ? (
              <Button className="w-full" disabled variant="outline">
                Unlimited Access Granted
              </Button>
            ) : subscribed ? (
              <Button className="w-full" variant="outline" onClick={openCustomerPortal}>
                Manage Subscription
              </Button>
            ) : (
              <Button className="w-full" onClick={handleSubscribe} disabled={checkoutLoading}>
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Redirecting...
                  </>
                ) : (
                  'Upgrade to Pro'
                )}
              </Button>
            )}
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
