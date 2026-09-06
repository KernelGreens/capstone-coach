import { CheckCircle2, Circle, Clock, AlertCircle, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressTimelineProps {
  weeks: any[];
  currentWeek: number;
  onWeekClick: (weekNumber: number) => void;
}

export function ProgressTimeline({ weeks, currentWeek, onWeekClick }: ProgressTimelineProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'needs_revision':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {weeks.map((week, index) => (
        <button
          key={week.id}
          onClick={() => onWeekClick(week.week_number)}
          className={cn(
            "flex flex-col items-center min-w-[60px] p-2 rounded-lg transition-all relative",
            currentWeek === week.week_number
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted",
            (week.extension_weeks || 0) > 0 && currentWeek !== week.week_number &&
              "ring-1 ring-amber-500/50"
          )}
          title={(week.extension_weeks || 0) > 0 ? `Extended by ${week.extension_weeks} week(s)` : undefined}
        >
          <span className="text-xs font-medium">
            W{week.week_number}
            {(week.extension_weeks || 0) > 0 && '+'}
          </span>
          <div className={cn(
            "mt-1",
            currentWeek === week.week_number && "text-primary-foreground"
          )}>
            {(week.extension_weeks || 0) > 0
              ? <CalendarClock className="h-4 w-4 text-amber-500" />
              : getStatusIcon(week.status)}
          </div>
        </button>
      ))}

    </div>
  );
}
