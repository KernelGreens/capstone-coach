import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Video, Headphones, FileText, Link } from 'lucide-react';

interface CreateLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}

const LESSON_TYPE_CONFIG = {
  video: { icon: Video, label: 'Video', accept: 'video/*', color: 'text-blue-500' },
  audio: { icon: Headphones, label: 'Audio', accept: 'audio/*', color: 'text-purple-500' },
  text: { icon: FileText, label: 'Document (PDF)', accept: '.pdf', color: 'text-amber-500' },
};

export function CreateLessonDialog({ open, onOpenChange, projectId, onCreated }: CreateLessonDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    lesson_type: 'text' as 'video' | 'audio' | 'text',
    is_downloadable: true,
    external_url: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [useExternalUrl, setUseExternalUrl] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // 100MB limit for lesson files
    if (selected.size > 100 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Maximum file size is 100MB' });
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a lesson title' });
      return;
    }

    if (!file && !formData.external_url) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please upload a file or provide a URL' });
      return;
    }

    setUploading(true);
    try {
      let filePath = '';
      let fileName = '';
      let fileSize = 0;
      let fileType = '';

      if (file) {
        const ext = file.name.split('.').pop();
        filePath = `${projectId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('lessons')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        fileName = file.name;
        fileSize = file.size;
        fileType = file.type;
      }

      const { error } = await supabase.from('lessons').insert({
        project_id: projectId,
        created_by: user!.id,
        title: formData.title,
        description: formData.description || null,
        lesson_type: formData.lesson_type,
        file_path: filePath || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        file_type: fileType || null,
        external_url: formData.external_url || null,
        is_downloadable: formData.is_downloadable,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Lesson created successfully' });
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', lesson_type: 'text', is_downloadable: true, external_url: '' });
    setFile(null);
    setUseExternalUrl(false);
  };

  const typeConfig = LESSON_TYPE_CONFIG[formData.lesson_type];
  const TypeIcon = typeConfig.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
            Create Lesson
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Lesson Type</Label>
            <Select
              value={formData.lesson_type}
              onValueChange={(v: 'video' | 'audio' | 'text') => {
                setFormData({ ...formData, lesson_type: v });
                setFile(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LESSON_TYPE_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        {config.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title *</Label>
            <Input
              placeholder="e.g., Introduction to REST APIs"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Brief description of the lesson content..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Source toggle */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={!useExternalUrl ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUseExternalUrl(false)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload File
            </Button>
            <Button
              type="button"
              variant={useExternalUrl ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUseExternalUrl(true)}
            >
              <Link className="h-4 w-4 mr-1" />
              External URL
            </Button>
          </div>

          {useExternalUrl ? (
            <div>
              <Label>External URL</Label>
              <Input
                placeholder="https://youtube.com/watch?v=... or link to file"
                value={formData.external_url}
                onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                YouTube, Vimeo, Google Drive, or direct file links
              </p>
            </div>
          ) : (
            <div>
              <Label>Upload {typeConfig.label}</Label>
              <label className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : `Click to upload ${typeConfig.label.toLowerCase()}`}
                  </span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept={typeConfig.accept}
                  onChange={handleFileChange}
                />
              </label>
              {file && (
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Download</Label>
              <p className="text-xs text-muted-foreground">Students can download for offline use</p>
            </div>
            <Switch
              checked={formData.is_downloadable}
              onCheckedChange={(v) => setFormData({ ...formData, is_downloadable: v })}
            />
          </div>

          <Button onClick={handleSubmit} disabled={uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Create Lesson'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
