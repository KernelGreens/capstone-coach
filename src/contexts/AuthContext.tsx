import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export interface StudentMembership {
  studentId: string;
  supervisorId: string;
  supervisorName: string;
  trackId: string | null;
  trackName: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'supervisor' | 'student' | null;
  availableRoles: ('supervisor' | 'student')[];
  studentMemberships: StudentMembership[];
  activeStudentId: string | null;
  activeSupervisorId: string | null;
  needsContextSelection: boolean;
  loading: boolean;
  setActiveContext: (role: 'supervisor' | 'student', studentId?: string | null) => void;
  clearActiveContext: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SS_ROLE = 'imp.activeRole';
const SS_STUDENT = 'imp.activeStudentId';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'supervisor' | 'student' | null>(null);
  const [availableRoles, setAvailableRoles] = useState<('supervisor' | 'student')[]>([]);
  const [studentMemberships, setStudentMemberships] = useState<StudentMembership[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [activeSupervisorId, setActiveSupervisorId] = useState<string | null>(null);
  const [needsContextSelection, setNeedsContextSelection] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => loadUserContext(session.user.id), 0);
      } else {
        resetState();
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserContext(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetState = () => {
    setUserRole(null);
    setAvailableRoles([]);
    setStudentMemberships([]);
    setActiveStudentId(null);
    setActiveSupervisorId(null);
    setNeedsContextSelection(false);
  };

  const loadUserContext = async (userId: string) => {
    try {
      // Fetch all roles
      const { data: rolesData, error: rolesErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (rolesErr) throw rolesErr;

      const roles = new Set<'supervisor' | 'student'>(
        (rolesData ?? []).map((r: any) => r.role)
      );

      // Always check student memberships — a user may be linked via students.user_id
      // even if no user_roles row exists yet (e.g. invited students before role backfill).
      const { data: studentRows } = await supabase
        .from('students')
        .select('id, supervisor_id, track_id, tracks(name), profiles:supervisor_id(full_name)')
        .eq('user_id', userId);

      const memberships: StudentMembership[] = (studentRows ?? []).map((s: any) => ({
        studentId: s.id,
        supervisorId: s.supervisor_id,
        supervisorName: s.profiles?.full_name || 'Supervisor',
        trackId: s.track_id ?? null,
        trackName: s.tracks?.name ?? null,
      }));

      if (memberships.length > 0 && !roles.has('student')) {
        roles.add('student');
        // Backfill user_roles so RLS policies that check has_role() keep working.
        supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'student' })
          .then(({ error }) => {
            if (error && !String(error.message).toLowerCase().includes('duplicate')) {
              console.warn('Could not backfill student role:', error.message);
            }
          });
      }

      const rolesArr = Array.from(roles) as ('supervisor' | 'student')[];
      setAvailableRoles(rolesArr);
      setStudentMemberships(memberships);

      // Restore prior selection from sessionStorage
      const storedRole = sessionStorage.getItem(SS_ROLE) as 'supervisor' | 'student' | null;
      const storedStudent = sessionStorage.getItem(SS_STUDENT);

      const resolveContext = (
        roleChoice: 'supervisor' | 'student' | null,
        studentChoice: string | null
      ) => {
        if (!roleChoice || !rolesArr.includes(roleChoice)) return null;
        if (roleChoice === 'supervisor') {
          return { role: 'supervisor' as const, studentId: null, supervisorId: null };
        }
        if (memberships.length === 0) return null;
        if (memberships.length === 1) {
          return {
            role: 'student' as const,
            studentId: memberships[0].studentId,
            supervisorId: memberships[0].supervisorId,
          };
        }
        const m = memberships.find((x) => x.studentId === studentChoice);
        return m ? { role: 'student' as const, studentId: m.studentId, supervisorId: m.supervisorId } : null;
      };

      // 1) try stored
      let resolved = resolveContext(storedRole, storedStudent);
      // 2) auto-resolve when only one option
      if (!resolved) {
        if (rolesArr.length === 0) {
          resolved = null;
        } else if (rolesArr.length === 1) {
          if (rolesArr[0] === 'supervisor') {
            resolved = { role: 'supervisor', studentId: null, supervisorId: null };
          } else if (memberships.length === 1) {
            resolved = {
              role: 'student',
              studentId: memberships[0].studentId,
              supervisorId: memberships[0].supervisorId,
            };
          }
        }
      }

      if (resolved) {
        setUserRole(resolved.role);
        setActiveStudentId(resolved.studentId);
        setActiveSupervisorId(resolved.supervisorId);
        setNeedsContextSelection(false);
        sessionStorage.setItem(SS_ROLE, resolved.role);
        if (resolved.studentId) sessionStorage.setItem(SS_STUDENT, resolved.studentId);
      } else if (rolesArr.length === 0) {
        setUserRole(null);
        setNeedsContextSelection(false);
      } else {
        // ambiguous — picker required
        setUserRole(null);
        setActiveStudentId(null);
        setActiveSupervisorId(null);
        setNeedsContextSelection(true);
      }
    } catch (err) {
      console.error('Error loading user context:', err);
      resetState();
    } finally {
      setLoading(false);
    }
  };

  const setActiveContext = useCallback(
    (role: 'supervisor' | 'student', studentId: string | null = null) => {
      if (!availableRoles.includes(role)) return;
      if (role === 'supervisor') {
        setUserRole('supervisor');
        setActiveStudentId(null);
        setActiveSupervisorId(null);
        sessionStorage.setItem(SS_ROLE, 'supervisor');
        sessionStorage.removeItem(SS_STUDENT);
        setNeedsContextSelection(false);
        return;
      }
      const m =
        studentMemberships.find((x) => x.studentId === studentId) ??
        (studentMemberships.length === 1 ? studentMemberships[0] : null);
      if (!m) return;
      setUserRole('student');
      setActiveStudentId(m.studentId);
      setActiveSupervisorId(m.supervisorId);
      sessionStorage.setItem(SS_ROLE, 'student');
      sessionStorage.setItem(SS_STUDENT, m.studentId);
      setNeedsContextSelection(false);
    },
    [availableRoles, studentMemberships]
  );

  const clearActiveContext = useCallback(() => {
    sessionStorage.removeItem(SS_ROLE);
    sessionStorage.removeItem(SS_STUDENT);
    setUserRole(null);
    setActiveStudentId(null);
    setActiveSupervisorId(null);
    setNeedsContextSelection(availableRoles.length > 1 || studentMemberships.length > 1);
  }, [availableRoles, studentMemberships]);

  const signOut = async () => {
    sessionStorage.removeItem(SS_ROLE);
    sessionStorage.removeItem(SS_STUDENT);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    resetState();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        availableRoles,
        studentMemberships,
        activeStudentId,
        activeSupervisorId,
        needsContextSelection,
        loading,
        setActiveContext,
        clearActiveContext,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
