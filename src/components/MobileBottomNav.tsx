import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, FileText, MessageCircle, BookOpen, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadMessageCount } from '@/hooks/use-unread-count';
import { Badge } from '@/components/ui/badge';

export function MobileBottomNav() {
  const { userRole } = useAuth();
  const location = useLocation();

  const studentNav = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/my-progress', label: 'Progress', icon: FileText },
    { href: '/messages', label: 'Chat', icon: MessageCircle },
    { href: '/ai-assistant', label: 'AI', icon: Sparkles },
    { href: '/resources', label: 'Learn', icon: BookOpen },
    { href: '/capstone', label: 'Capstone', icon: BarChart3 },
  ];

  const supervisorNav = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/students', label: 'Students', icon: FileText },
    { href: '/messages', label: 'Chat', icon: MessageCircle },
    { href: '/progress', label: 'Progress', icon: BarChart3 },
    { href: '/resources', label: 'Learn', icon: BookOpen },
  ];

  const navItems = userRole === 'supervisor' ? supervisorNav : studentNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-sidebar backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive
                  ? 'text-sidebar-primary'
                  : 'text-sidebar-foreground/60'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
