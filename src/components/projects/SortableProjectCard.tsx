import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Eye, Edit, Trash2, GripVertical, GraduationCap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LessonList } from '@/components/lessons/LessonList';

interface SortableProjectCardProps {
  project: any;
  onEdit: (project: any) => void;
  onDelete: (project: any) => void;
  onView: (project: any) => void;
  isDraggable?: boolean;
}

export function SortableProjectCard({ project, onEdit, onDelete, onView, isDraggable = false }: SortableProjectCardProps) {
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={isDragging ? 'ring-2 ring-primary shadow-lg' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              {isDraggable && (
                <button
                  className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-5 w-5" />
                </button>
              )}
              <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <CardTitle className="truncate">{project.title}</CardTitle>
                <CardDescription className="mt-1">
                  {project.tracks?.name} {project.week_number && `• Week ${project.week_number}`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={project.project_type === 'capstone' ? 'default' : 'secondary'}>
                {project.project_type}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
          )}
          <div className="flex gap-2 pt-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onView(project)}>
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLessonsOpen(true)}>
              <GraduationCap className="h-4 w-4 mr-1" />
              Lessons
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(project)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(project)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={lessonsOpen} onOpenChange={setLessonsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Lessons — {project.title}
              {project.week_number && ` (Week ${project.week_number})`}
            </DialogTitle>
          </DialogHeader>
          <LessonList
            projectId={project.id}
            isSuperviorView={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
