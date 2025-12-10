import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface TaskChecklistProps {
  tasks: string;
  completedTasks: string[];
  onTaskToggle: (taskIndex: number, completed: boolean) => void;
  disabled?: boolean;
}

export function TaskChecklist({ tasks, completedTasks, onTaskToggle, disabled }: TaskChecklistProps) {
  const taskList = tasks
    .split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  if (taskList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No tasks defined for this week</p>
    );
  }

  const completedCount = completedTasks.length;
  const totalCount = taskList.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Task Progress</span>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{totalCount} completed
        </span>
      </div>
      
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-2">
        {taskList.map((task, index) => {
          const isCompleted = completedTasks.includes(index.toString());
          return (
            <label
              key={index}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                isCompleted 
                  ? "bg-primary/5 border-primary/20" 
                  : "hover:bg-muted",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) => onTaskToggle(index, !!checked)}
                disabled={disabled}
                className="mt-0.5"
              />
              <span className={cn(
                "text-sm leading-relaxed",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {task.replace(/^[-*•]\s*/, '')}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
