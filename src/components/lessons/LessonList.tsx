import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Video, Headphones, FileText, Download, Trash2, Play,
  ExternalLink, Loader2, GraduationCap, WifiOff, Check
} from 'lucide-react';
import { CreateLessonDialog } from './CreateLessonDialog';

interface LessonListProps {
  projectId: string;
  projectTitle?: string;
  isSuperviorView?: boolean;
}

const TYPE_CONFIG: Record<string, { icon: typeof Video; label: string; color: string }> = {
  video: { icon: Video, label: 'Video', color: 'text-blue-500' },
  audio: { icon: Headphones, label: 'Audio', color: 'text-purple-500' },
  text: { icon: FileText, label: 'PDF', color: 'text-amber-500' },
};

export function LessonList({ projectId, projectTitle, isSuperviorView = false }: LessonListProps) {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [offlineLessons, setOfflineLessons] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchLessons();
    loadOfflineStatus();
  }, [projectId]);

  const fetchLessons = async () => {
    setLoading(false);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('project_id', projectId)
      .order('display_order', { ascending: true });

    if (!error) setLessons(data || []);
    setLoading(false);
  };

  const loadOfflineStatus = async () => {
    try {
      if ('caches' in window) {
        const cache = await caches.open('lessons-offline-v1');
        const keys = await cache.keys();
        const ids = new Set<string>();
        keys.forEach(req => {
          const url = new URL(req.url);
          const id = url.searchParams.get('lessonId');
          if (id) ids.add(id);
        });
        setOfflineLessons(ids);
      }
    } catch {
      // Cache API not available
    }
  };

  const handleDownload = async (lesson: any) => {
    setDownloadingId(lesson.id);
    try {
      if (lesson.external_url) {
        window.open(lesson.external_url, '_blank');
        return;
      }

      if (!lesson.file_path) {
        toast({ variant: 'destructive', title: 'Error', description: 'No file available' });
        return;
      }

      const { data, error } = await supabase.storage
        .from('lessons')
        .download(lesson.file_path);

      if (error) throw error;

      // Save to cache for offline access
      if ('caches' in window && lesson.is_downloadable) {
        try {
          const cache = await caches.open('lessons-offline-v1');
          const cacheUrl = `/offline-lesson?lessonId=${lesson.id}&name=${encodeURIComponent(lesson.file_name)}`;
          const response = new Response(data, {
            headers: {
              'Content-Type': lesson.file_type || 'application/octet-stream',
              'X-Lesson-Title': lesson.title,
              'X-Lesson-Type': lesson.lesson_type,
            },
          });
          await cache.put(cacheUrl, response);
          setOfflineLessons(prev => new Set(prev).add(lesson.id));
          toast({ title: 'Saved offline', description: `"${lesson.title}" is now available offline` });
        } catch {
          // Cache failed silently
        }
      }

      // Trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = lesson.file_name || 'lesson';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Download failed', description: error.message });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSaveOffline = async (lesson: any) => {
    setDownloadingId(lesson.id);
    try {
      if (!lesson.file_path) {
        toast({ variant: 'destructive', title: 'Error', description: 'No file to cache offline' });
        return;
      }

      const { data, error } = await supabase.storage
        .from('lessons')
        .download(lesson.file_path);

      if (error) throw error;

      if ('caches' in window) {
        const cache = await caches.open('lessons-offline-v1');
        const cacheUrl = `/offline-lesson?lessonId=${lesson.id}&name=${encodeURIComponent(lesson.file_name)}`;
        const response = new Response(data, {
          headers: {
            'Content-Type': lesson.file_type || 'application/octet-stream',
            'X-Lesson-Title': lesson.title,
            'X-Lesson-Type': lesson.lesson_type,
          },
        });
        await cache.put(cacheUrl, response);
        setOfflineLessons(prev => new Set(prev).add(lesson.id));
        toast({ title: 'Available offline', description: `"${lesson.title}" saved for offline access` });
      } else {
        toast({ variant: 'destructive', title: 'Not supported', description: 'Offline storage is not available in your browser' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (lesson: any) => {
    try {
      // Delete file from storage
      if (lesson.file_path) {
        await supabase.storage.from('lessons').remove([lesson.file_path]);
      }

      // Delete DB record
      const { error } = await supabase.from('lessons').delete().eq('id', lesson.id);
      if (error) throw error;

      // Remove from offline cache
      if ('caches' in window) {
        const cache = await caches.open('lessons-offline-v1');
        const cacheUrl = `/offline-lesson?lessonId=${lesson.id}&name=${encodeURIComponent(lesson.file_name)}`;
        await cache.delete(cacheUrl);
      }

      toast({ title: 'Deleted', description: 'Lesson removed successfully' });
      fetchLessons();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleOpenLesson = async (lesson: any) => {
    if (lesson.external_url) {
      window.open(lesson.external_url, '_blank');
      return;
    }

    if (!lesson.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('lessons')
        .createSignedUrl(lesson.file_path, 3600); // 1 hour

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      // Try offline cache
      if ('caches' in window) {
        try {
          const cache = await caches.open('lessons-offline-v1');
          const cacheUrl = `/offline-lesson?lessonId=${lesson.id}&name=${encodeURIComponent(lesson.file_name)}`;
          const cached = await cache.match(cacheUrl);
          if (cached) {
            const blob = await cached.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            return;
          }
        } catch {}
      }
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Lessons {projectTitle && <span className="text-muted-foreground font-normal text-sm">— {projectTitle}</span>}
        </h3>
        {isSuperviorView && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            + Add Lesson
          </Button>
        )}
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {isSuperviorView ? 'No lessons yet. Add your first lesson!' : 'No lessons available for this week.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson) => {
            const config = TYPE_CONFIG[lesson.lesson_type] || TYPE_CONFIG.text;
            const Icon = config.icon;
            const isOffline = offlineLessons.has(lesson.id);
            const isDownloading = downloadingId === lesson.id;

            return (
              <Card key={lesson.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lesson.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                      {lesson.file_size && (
                        <span className="text-xs text-muted-foreground">
                          {(lesson.file_size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      )}
                      {isOffline && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <WifiOff className="h-3 w-3" />
                          Offline
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Open/Play button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenLesson(lesson)}
                      title={lesson.lesson_type === 'video' ? 'Play' : 'Open'}
                    >
                      {lesson.external_url ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Download button */}
                    {lesson.is_downloadable && lesson.file_path && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(lesson)}
                        disabled={isDownloading}
                        title="Download"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {/* Save offline button (students only) */}
                    {!isSuperviorView && lesson.is_downloadable && lesson.file_path && !isOffline && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSaveOffline(lesson)}
                        disabled={isDownloading}
                        title="Save for offline"
                      >
                        <WifiOff className="h-4 w-4" />
                      </Button>
                    )}

                    {isOffline && !isSuperviorView && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}

                    {/* Delete (supervisor only) */}
                    {isSuperviorView && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(lesson)}
                        title="Delete lesson"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateLessonDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        onCreated={fetchLessons}
      />
    </div>
  );
}
