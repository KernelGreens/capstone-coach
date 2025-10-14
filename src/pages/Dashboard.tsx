import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SupervisorDashboard } from '@/components/dashboard/SupervisorDashboard';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';

export default function Dashboard() {
  const { userRole } = useAuth();

  return (
    <DashboardLayout>
      {userRole === 'supervisor' ? <SupervisorDashboard /> : <StudentDashboard />}
    </DashboardLayout>
  );
}