import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Target, 
  FileText, 
  Calendar, 
  Library, 
  LogOut,
  GraduationCap,
  Settings,
  BarChart3
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { userRole, signOut } = useAuth();
  const location = useLocation();

  const supervisorLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/students', label: 'Students', icon: Users },
    { href: '/tracks', label: 'Tracks', icon: Target },
    { href: '/projects', label: 'Projects', icon: BookOpen },
    { href: '/progress', label: 'Progress', icon: FileText },
    { href: '/evaluations', label: 'Evaluations', icon: BarChart3 },
    { href: '/meetings', label: 'Meetings', icon: Calendar },
    { href: '/resources', label: 'Resources', icon: Library },
  ];

  const studentLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/my-progress', label: 'My Progress', icon: FileText },
    { href: '/my-evaluations', label: 'My Evaluations', icon: BarChart3 },
    { href: '/meetings', label: 'Meetings', icon: Calendar },
    { href: '/resources', label: 'Resources', icon: Library },
  ];

  const links = userRole === 'supervisor' ? supervisorLinks : studentLinks;

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-sidebar">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <GraduationCap className="h-6 w-6 text-sidebar-primary" />
            <span className="ml-2 text-lg font-semibold text-sidebar-foreground">
              IMP
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Actions */}
          <div className="border-t border-sidebar-border p-4 space-y-2">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-sidebar-foreground">Notifications</span>
              <NotificationBell />
            </div>
            <Link to="/settings">
              <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50">
                <Settings className="h-5 w-5" />
                Settings
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={signOut}
              className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 bg-background">
        {children}
      </main>
    </div>
  );
}