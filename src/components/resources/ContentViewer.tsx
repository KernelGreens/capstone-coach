import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Maximize2, X } from 'lucide-react';
import { getContentTypeConfig } from './contentTypes';

interface ContentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: {
    title: string;
    description?: string | null;
    url?: string | null;
    resource_type: string;
  };
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

function getColabEmbedUrl(url: string): string | null {
  const match = url.match(/colab\.research\.google\.com\/(?:drive|github|notebooks)\/([\w-]+)/);
  if (match) return url;
  if (url.includes('colab.research.google.com')) return url;
  return null;
}

function getJupyterEmbedUrl(url: string): string | null {
  // nbviewer or direct .ipynb links
  if (url.includes('nbviewer.org') || url.includes('nbviewer.jupyter.org')) return url;
  if (url.endsWith('.ipynb') && url.includes('github.com')) {
    return url.replace('github.com', 'nbviewer.org/github');
  }
  if (url.includes('jupyter.org') || url.includes('mybinder.org')) return url;
  return null;
}

function EmbeddedContent({ url, resourceType }: { url: string; resourceType: string }) {
  const youtubeId = resourceType === 'video' ? extractYouTubeId(url) : null;

  if (youtubeId) {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  if (resourceType === 'video' && url) {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          src={url}
          title="Video content"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  if (resourceType === 'notebook') {
    const colabUrl = getColabEmbedUrl(url);
    if (colabUrl) {
      return (
        <div className="relative w-full rounded-lg overflow-hidden border bg-card" style={{ height: '70vh' }}>
          <iframe
            src={colabUrl}
            title="Google Colab"
            className="absolute inset-0 w-full h-full"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      );
    }

    const jupyterUrl = getJupyterEmbedUrl(url);
    if (jupyterUrl) {
      return (
        <div className="relative w-full rounded-lg overflow-hidden border bg-card" style={{ height: '70vh' }}>
          <iframe
            src={jupyterUrl}
            title="Jupyter Notebook"
            className="absolute inset-0 w-full h-full"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      );
    }
  }

  if (resourceType === 'slide_deck') {
    // Google Slides, Slideshare, etc.
    if (url.includes('docs.google.com/presentation')) {
      const embedUrl = url.includes('/embed') ? url : url.replace(/\/edit.*$/, '/embed?start=false&loop=false&delayms=3000');
      return (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-card">
          <iframe
            src={embedUrl}
            title="Google Slides"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      );
    }
  }

  if (resourceType === 'code_example') {
    // GitHub gist or repo embed
    if (url.includes('gist.github.com')) {
      return (
        <div className="relative w-full rounded-lg overflow-hidden border bg-card" style={{ height: '60vh' }}>
          <iframe
            src={`${url}.pibb`}
            title="GitHub Gist"
            className="absolute inset-0 w-full h-full"
          />
        </div>
      );
    }
  }

  // Fallback: generic iframe embed
  return (
    <div className="relative w-full rounded-lg overflow-hidden border bg-card" style={{ height: '70vh' }}>
      <iframe
        src={url}
        title="Embedded content"
        className="absolute inset-0 w-full h-full"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}

export function ContentViewer({ open, onOpenChange, resource }: ContentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const config = getContentTypeConfig(resource.resource_type);

  if (!resource.url) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isFullscreen ? 'max-w-[98vw] h-[95vh]' : 'max-w-4xl max-h-[90vh]'}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <config.icon className="h-5 w-5 text-primary flex-shrink-0" />
              <DialogTitle className="truncate">{resource.title}</DialogTitle>
              <Badge variant="outline" className="capitalize flex-shrink-0">
                {config.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(resource.url!, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {resource.description && (
            <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
          )}
        </DialogHeader>
        <div className="overflow-auto flex-1">
          <EmbeddedContent url={resource.url} resourceType={resource.resource_type} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
