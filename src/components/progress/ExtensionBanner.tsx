import { CalendarClock } from 'lucide-react';

interface ExtensionBannerProps {
  weekProgress: any;
  isStudentView?: boolean;
}

export function ExtensionBanner({ weekProgress, isStudentView }: ExtensionBannerProps) {
  const extra = weekProgress?.extension_weeks || 0;
  if (extra < 1) return null;

  const endWeek = weekProgress.week_number + extra;

  return (
    <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="space-y-1 text-sm">
        <p className="font-medium">
          {isStudentView
            ? `Your mentor gave this topic ${extra} more week${extra > 1 ? 's' : ''}`
            : `Extended by ${extra} week${extra > 1 ? 's' : ''}`}
        </p>
        <p className="text-muted-foreground">
          Week {weekProgress.week_number} runs through week {endWeek}.{' '}
          {weekProgress.extension_shifted_schedule
            ? 'The rest of the schedule was pushed back to match.'
            : 'The rest of the schedule keeps its original dates.'}
        </p>
        {weekProgress.extension_reason && (
          <p className="text-muted-foreground italic">"{weekProgress.extension_reason}"</p>
        )}
      </div>
    </div>
  );
}
