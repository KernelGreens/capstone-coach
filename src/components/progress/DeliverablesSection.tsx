import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, Trash2, Link as LinkIcon, Type } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DeliverablesSectionProps {
  weekProgressId: string;
  studentId: string;
  canDelete: boolean;
}

export function DeliverablesSection({ weekProgressId, studentId, canDelete }: DeliverablesSectionProps) {
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeliverables();
  }, [weekProgressId]);

  const fetchDeliverables = async () => {
    const { data } = await supabase
      .from('deliverables')
      .select('*')
      .eq('weekly_progress_id', weekProgressId)
      .order('uploaded_at', { ascending: false });

    setDeliverables(data || []);
    setLoading(false);
  };

  const handleDownload = async (deliverable: any) => {
    if (!deliverable.file_path) return;
    const { data, error } = await supabase.storage
      .from('deliverables')
      .download(deliverable.file_path);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to download file' });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = deliverable.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (deliverable: any) => {
    if (!confirm('Are you sure you want to delete this deliverable?')) return;

    // Only delete from storage if it has a file path
    if (deliverable.file_path) {
      await supabase.storage.from('deliverables').remove([deliverable.file_path]);
    }

    const { error: dbError } = await supabase
      .from('deliverables')
      .delete()
      .eq('id', deliverable.id);

    if (dbError) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete deliverable record' });
      return;
    }

    toast({ title: 'Success', description: 'Deliverable deleted successfully' });
    fetchDeliverables();
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) return null;
  if (deliverables.length === 0) return null;

  const isTextOrLink = (d: any) => d.file_type === 'text' || d.file_type === 'link';

  return (
    <div className="border-t pt-4 space-y-2">
      <p className="text-sm font-medium">Deliverables:</p>
      <div className="space-y-2">
        {deliverables.map((deliverable) => (
          <div
            key={deliverable.id}
            className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {deliverable.file_type === 'link' ? (
                <LinkIcon className="h-4 w-4 text-primary flex-shrink-0" />
              ) : deliverable.file_type === 'text' ? (
                <Type className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{deliverable.file_name}</p>
                {isTextOrLink(deliverable) && deliverable.description ? (
                  <p className="text-xs text-muted-foreground mt-0.5 break-all line-clamp-2">
                    {deliverable.file_type === 'link' ? (
                      <a href={deliverable.description} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {deliverable.description}
                      </a>
                    ) : (
                      deliverable.description
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(deliverable.file_size)}{deliverable.file_size ? ' • ' : ''}{format(new Date(deliverable.uploaded_at), 'PPp')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isTextOrLink(deliverable) && deliverable.file_path && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(deliverable)}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(deliverable)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
