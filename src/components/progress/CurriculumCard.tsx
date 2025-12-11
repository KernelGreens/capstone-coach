import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Target, Wrench, FileCheck } from 'lucide-react';
import { WeeklyResourcesSection } from './WeeklyResourcesSection';

interface CurriculumCardProps {
  project: any;
  trackId?: string;
  weekNumber?: number;
  canEditResources?: boolean;
}

export function CurriculumCard({ project, trackId, weekNumber, canEditResources = false }: CurriculumCardProps) {
  if (!project) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No curriculum assigned for this week
          </p>
          {trackId && weekNumber && (
            <div className="mt-4">
              <WeeklyResourcesSection 
                trackId={trackId} 
                weekNumber={weekNumber} 
                canEdit={canEditResources} 
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2.5">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{project.title}</CardTitle>
              <Badge variant="outline" className="mt-1 capitalize">
                {project.project_type} Project
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}

        {project.objectives && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-primary" />
              Learning Objectives
            </div>
            <div className="pl-6 text-sm text-muted-foreground whitespace-pre-line">
              {project.objectives}
            </div>
          </div>
        )}

        {project.deliverables && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileCheck className="h-4 w-4 text-primary" />
              Expected Deliverables
            </div>
            <div className="pl-6 text-sm text-muted-foreground whitespace-pre-line">
              {project.deliverables}
            </div>
          </div>
        )}

        {project.tools_technologies && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wrench className="h-4 w-4 text-primary" />
              Tools & Technologies
            </div>
            <div className="flex flex-wrap gap-1.5 pl-6">
              {project.tools_technologies.split(',').map((tool: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tool.trim()}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {trackId && weekNumber && (
          <div className="border-t pt-4 mt-4">
            <WeeklyResourcesSection 
              trackId={trackId} 
              weekNumber={weekNumber} 
              canEdit={canEditResources} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
