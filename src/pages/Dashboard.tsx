import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SupervisorDashboard } from '@/components/dashboard/SupervisorDashboard';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { WelcomeWizard } from '@/components/onboarding/WelcomeWizard';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { useOnboarding } from '@/hooks/use-onboarding';

export default function Dashboard() {
  const { user, userRole } = useAuth();
  const { showWelcome, showTour, completeWelcome, completeTour } = useOnboarding(
    user?.id,
    userRole,
  );

  return (
    <DashboardLayout>
      {userRole === 'supervisor' ? <SupervisorDashboard /> : <StudentDashboard />}

      {userRole && showWelcome && (
        <WelcomeWizard open={showWelcome} role={userRole} onComplete={completeWelcome} />
      )}

      {userRole && showTour && (
        <GuidedTour active={showTour} role={userRole} onComplete={completeTour} />
      )}
    </DashboardLayout>
  );
}
