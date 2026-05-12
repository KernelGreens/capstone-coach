import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, GraduationCap, ShieldCheck, Users } from 'lucide-react';

export default function SelectContext() {
  const {
    user,
    loading,
    availableRoles,
    studentMemberships,
    userRole,
    activeStudentId,
    needsContextSelection,
    setActiveContext,
  } = useAuth();
  const navigate = useNavigate();
  const [pickingStudent, setPickingStudent] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [user, loading, navigate]);

  // If selection is no longer needed (resolved), bounce to dashboard
  useEffect(() => {
    if (!loading && user && !needsContextSelection && userRole) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, needsContextSelection, userRole, activeStudentId, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasMultipleRoles = availableRoles.length > 1;
  const showRoleStep = hasMultipleRoles && !userRole && !pickingStudent;
  const showSupervisorStep =
    !showRoleStep &&
    (pickingStudent ||
      userRole === 'student' ||
      (!userRole && availableRoles.length === 1 && availableRoles[0] === 'student')) &&
    studentMemberships.length > 1 &&
    !activeStudentId;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle>How would you like to continue?</CardTitle>
          <CardDescription>
            Your account has access to multiple {showRoleStep ? 'roles' : 'supervisors'}. Choose
            one for this session — you can sign out and back in to switch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {showRoleStep && (
            <>
              {availableRoles.includes('supervisor') && (
                <button
                  onClick={() => setActiveContext('supervisor')}
                  className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:bg-accent transition"
                >
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <div>
                    <div className="font-medium">Continue as Supervisor</div>
                    <div className="text-sm text-muted-foreground">
                      Manage tracks, students, evaluations and more.
                    </div>
                  </div>
                </button>
              )}
              {availableRoles.includes('student') && (
                <button
                  onClick={() => {
                    if (studentMemberships.length === 1) {
                      setActiveContext('student', studentMemberships[0].studentId);
                    } else if (studentMemberships.length > 1) {
                      setPickingStudent(true);
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:bg-accent transition"
                >
                  <GraduationCap className="h-6 w-6 text-primary" />
                  <div>
                    <div className="font-medium">Continue as Student</div>
                    <div className="text-sm text-muted-foreground">
                      View your curriculum, submit deliverables, message your supervisor.
                    </div>
                  </div>
                </button>
              )}
            </>
          )}

          {showSupervisorStep && (
            <>
              <div className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> Choose which supervisor's program to enter:
              </div>
              {studentMemberships.map((m) => (
                <button
                  key={m.studentId}
                  onClick={() => setActiveContext('student', m.studentId)}
                  className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:bg-accent transition"
                >
                  <div>
                    <div className="font-medium">{m.supervisorName}</div>
                    <div className="text-sm text-muted-foreground">
                      {m.trackName ? `Track: ${m.trackName}` : 'No track assigned'}
                    </div>
                  </div>
                </button>
              ))}
              {hasMultipleRoles && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setPickingStudent(false)}
                >
                  Back to role selection
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
