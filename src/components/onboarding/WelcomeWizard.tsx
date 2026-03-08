import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Users,
  Target,
  FileText,
  Calendar,
  BarChart3,
  Briefcase,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeStep {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const supervisorSteps: WelcomeStep[] = [
  {
    icon: Sparkles,
    title: 'Welcome to IMP!',
    description:
      "We're excited to have you on board. Let's take a quick tour of the key features that will help you manage your internship program effectively.",
    color: 'text-primary',
  },
  {
    icon: Target,
    title: 'Create Tracks & Projects',
    description:
      'Start by setting up tracks (learning paths) and projects for your students. Each track can have its own curriculum, resources, and evaluation criteria.',
    color: 'text-blue-500',
  },
  {
    icon: Users,
    title: 'Invite Students',
    description:
      'Add students to your program and assign them to tracks. Students will receive an email invitation to join and start their journey.',
    color: 'text-green-500',
  },
  {
    icon: BarChart3,
    title: 'Track Progress & Evaluate',
    description:
      'Monitor weekly progress, review deliverables, score performance, and provide feedback — all in one place.',
    color: 'text-amber-500',
  },
  {
    icon: Calendar,
    title: 'Schedule Meetings',
    description:
      'Set up office hours, schedule 1-on-1 meetings, and keep communication organized with built-in messaging.',
    color: 'text-purple-500',
  },
];

const studentSteps: WelcomeStep[] = [
  {
    icon: Sparkles,
    title: 'Welcome to IMP!',
    description:
      "Congratulations on starting your internship journey! Let's walk through the tools available to help you succeed.",
    color: 'text-primary',
  },
  {
    icon: FileText,
    title: 'Track Your Progress',
    description:
      "View your weekly curriculum, complete tasks, upload deliverables, and track your progress throughout the program.",
    color: 'text-blue-500',
  },
  {
    icon: Trophy,
    title: 'Capstone Project',
    description:
      'Work on your capstone project, set milestones, and present your findings. This is where you showcase everything you\'ve learned.',
    color: 'text-amber-500',
  },
  {
    icon: Briefcase,
    title: 'Build Your Portfolio',
    description:
      'Create a professional portfolio showcasing your projects, skills, and achievements to potential employers.',
    color: 'text-green-500',
  },
  {
    icon: Calendar,
    title: 'Stay Connected',
    description:
      'Book meetings with your supervisor, message them directly, and access resources shared for your track.',
    color: 'text-purple-500',
  },
];

interface WelcomeWizardProps {
  open: boolean;
  role: 'supervisor' | 'student';
  onComplete: () => void;
}

export function WelcomeWizard({ open, role, onComplete }: WelcomeWizardProps) {
  const [step, setStep] = useState(0);
  const steps = role === 'supervisor' ? supervisorSteps : studentSteps;
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden border-none gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Welcome Wizard</DialogTitle>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center px-8 py-8 gap-4">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors',
            )}
          >
            <Icon className={cn('h-8 w-8', current.color)} />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            {current.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-6">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground">
              Skip
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              if (isLast) {
                onComplete();
              } else {
                setStep(step + 1);
              }
            }}
          >
            {isLast ? "Let's Go!" : 'Next'}
            {!isLast && <ArrowRight className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
