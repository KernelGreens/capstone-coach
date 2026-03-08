import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStep {
  selector: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const supervisorTourSteps: TourStep[] = [
  {
    selector: 'a[href="/tracks"]',
    title: 'Tracks',
    description: 'Create learning paths with curriculums, projects, and resources for your students.',
    position: 'right',
  },
  {
    selector: 'a[href="/students"]',
    title: 'Students',
    description: 'Invite and manage your interns. Assign them to tracks and monitor their journey.',
    position: 'right',
  },
  {
    selector: 'a[href="/progress"]',
    title: 'Progress',
    description: 'Review weekly submissions, score deliverables, and provide feedback.',
    position: 'right',
  },
  {
    selector: 'a[href="/messages"]',
    title: 'Messages',
    description: 'Communicate directly with students or create group discussions.',
    position: 'right',
  },
  {
    selector: 'a[href="/meetings"]',
    title: 'Meetings',
    description: 'Schedule check-ins and set up recurring office hours.',
    position: 'right',
  },
];

const studentTourSteps: TourStep[] = [
  {
    selector: 'a[href="/my-progress"]',
    title: 'My Progress',
    description: 'View your curriculum, complete tasks, and upload deliverables each week.',
    position: 'right',
  },
  {
    selector: 'a[href="/capstone"]',
    title: 'Capstone',
    description: 'Manage your capstone project, milestones, and final presentation.',
    position: 'right',
  },
  {
    selector: 'a[href="/portfolio"]',
    title: 'Portfolio',
    description: 'Build and share your professional portfolio with potential employers.',
    position: 'right',
  },
  {
    selector: 'a[href="/messages"]',
    title: 'Messages',
    description: 'Chat with your supervisor and fellow students.',
    position: 'right',
  },
  {
    selector: 'a[href="/resources"]',
    title: 'Resources',
    description: 'Access learning materials and guides shared by your supervisor.',
    position: 'right',
  },
];

interface GuidedTourProps {
  active: boolean;
  role: 'supervisor' | 'student';
  onComplete: () => void;
}

export function GuidedTour({ active, role, onComplete }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const steps = role === 'supervisor' ? supervisorTourSteps : studentTourSteps;
  const current = steps[step];

  const updateRect = useCallback(() => {
    if (!active || !current) return;
    const el = document.querySelector(current.selector);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setRect(null);
    }
  }, [active, current]);

  useEffect(() => {
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [updateRect]);

  if (!active || !rect) return null;

  const padding = 6;
  const tooltipOffset = 12;

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = {};
  const pos = current.position || 'right';
  switch (pos) {
    case 'right':
      tooltipStyle = {
        top: rect.top + rect.height / 2,
        left: rect.right + tooltipOffset,
        transform: 'translateY(-50%)',
      };
      break;
    case 'bottom':
      tooltipStyle = {
        top: rect.bottom + tooltipOffset,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      };
      break;
    case 'left':
      tooltipStyle = {
        top: rect.top + rect.height / 2,
        right: window.innerWidth - rect.left + tooltipOffset,
        transform: 'translateY(-50%)',
      };
      break;
    case 'top':
      tooltipStyle = {
        bottom: window.innerHeight - rect.top + tooltipOffset,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      };
      break;
  }

  return createPortal(
    <>
      {/* Overlay with cutout */}
      <div className="fixed inset-0 z-[9998]" onClick={(e) => e.stopPropagation()}>
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - padding}
                y={rect.top - padding}
                width={rect.width + padding * 2}
                height={rect.height + padding * 2}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.5)"
            mask="url(#tour-mask)"
          />
        </svg>
      </div>

      {/* Highlight border */}
      <div
        className="fixed z-[9999] rounded-lg ring-2 ring-primary ring-offset-2 pointer-events-none transition-all duration-300"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] w-72 rounded-xl bg-card border shadow-lg p-4"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-foreground">{current.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground"
            onClick={onComplete}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{current.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {step + 1} of {steps.length}
          </span>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 px-3"
              onClick={() => {
                if (step === steps.length - 1) {
                  onComplete();
                } else {
                  setStep(step + 1);
                }
              }}
            >
              {step === steps.length - 1 ? 'Done' : 'Next'}
              {step < steps.length - 1 && <ArrowRight className="ml-1 h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
