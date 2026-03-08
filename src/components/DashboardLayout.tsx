import { ReactNode, useState } from 'react';
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
  BarChart3,
  TrendingUp,
  MessageSquareHeart,
  MessageCircle,
  Menu,
  X,
  Briefcase,
  Trophy,
  Store,
  Crown,
  Sparkles
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MobileBottomNav } from './MobileBottomNav';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = user?.email === 'abiodunahmadaws@gmail.com';

  const supervisorLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tracks', label: 'Tracks', icon: Target },
    { href: '/projects', label: 'Projects', icon: BookOpen },
    { href: '/evaluation-criteria', label: 'Criteria', icon: Target },
    { href: '/students', label: 'Students', icon: Users },
    { href: '/meetings', label: 'Meetings', icon: Calendar },
    { href: '/messages', label: 'Messages', icon: MessageCircle },
    { href: '/evaluations', label: 'Evaluations', icon: BarChart3 },
    { href: '/analytics', label: 'Analytics', icon: TrendingUp },
    { href: '/progress', label: 'Progress', icon: FileText },
    { href: '/capstone', label: 'Capstone', icon: Trophy },
    { href: '/resources', label: 'Resources', icon: Library },
    { href: '/marketplace', label: 'Marketplace', icon: Store },
    { href: '/pricing', label: 'Pricing', icon: Crown },
    ...(isSuperAdmin
      ? [{ href: '/feedback', label: 'User Feedback', icon: MessageSquareHeart }]
      : [{ href: '/submit-feedback', label: 'Feedback', icon: MessageSquareHeart }]),
  ];

  const studentLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/my-progress', label: 'My Progress', icon: FileText },
    { href: '/my-evaluations', label: 'My Evaluations', icon: BarChart3 },
    { href: '/meetings', label: 'Meetings', icon: Calendar },
    { href: '/messages', label: 'Messages', icon: MessageCircle },
    { href: '/capstone', label: 'Capstone', icon: Trophy },
    { href: '/resources', label: 'Resources', icon: Library },
    { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { href: '/marketplace', label: 'Marketplace', icon: Store },
    { href: '/submit-feedback', label: 'Feedback', icon: MessageSquareHeart },
  ];

  const links = userRole === 'supervisor' ? supervisorLinks : studentLinks;

  const navContent = (
    <>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.href;
          
          return (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-sidebar-foreground">Notifications</span>
          <NotificationBell />
        </div>
        <Link to="/settings" onClick={() => setMobileOpen(false)}>
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
    </>
  );

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-sidebar px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="text-sidebar-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <GraduationCap className="h-5 w-5 text-sidebar-primary" />
            <span className="text-base font-semibold text-sidebar-foreground">IMP</span>
          </div>
          <NotificationBell />
        </header>

        {/* Mobile Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex h-14 items-center border-b border-sidebar-border px-6">
              <GraduationCap className="h-6 w-6 text-sidebar-primary" />
              <span className="ml-2 text-lg font-semibold text-sidebar-foreground">IMP</span>
            </div>
            <div className="flex flex-col h-[calc(100%-3.5rem)]">
              {navContent}
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 p-4 pb-20 bg-background">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-sidebar">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <GraduationCap className="h-6 w-6 text-sidebar-primary" />
            <span className="ml-2 text-lg font-semibold text-sidebar-foreground">IMP</span>
          </div>
          {navContent}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 bg-background">
        {children}
      </main>
    </div>
  );
}
