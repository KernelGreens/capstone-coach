import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Setup() {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [hasSupervisors, setHasSupervisors] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      
      if (userRole) {
        navigate('/dashboard');
        return;
      }

      checkSupervisors();
    }
  }, [user, userRole, authLoading, navigate]);

  const checkSupervisors = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'supervisor')
        .limit(1);

      if (error) throw error;
      
      setHasSupervisors((data?.length || 0) > 0);
    } catch (error) {
      console.error('Error checking supervisors:', error);
    } finally {
      setChecking(false);
    }
  };

  const assignSupervisorRole = async () => {
    if (!user) return;
    
    setAssigning(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: user.id, role: 'supervisor' }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Supervisor role assigned successfully',
      });

      window.location.href = '/dashboard';
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setAssigning(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Welcome to IMP</CardTitle>
          <CardDescription>
            {!hasSupervisors 
              ? 'Set up your account as the first supervisor'
              : 'Contact your supervisor to assign you a role'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSupervisors ? (
            <Button 
              onClick={assignSupervisorRole} 
              disabled={assigning}
              className="w-full"
            >
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Become Supervisor'
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Your account has been created, but you need a supervisor to assign you a role.
                Please contact your program administrator.
              </p>
              <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
