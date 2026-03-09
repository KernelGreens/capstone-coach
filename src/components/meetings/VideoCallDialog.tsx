import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, ExternalLink } from 'lucide-react';

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string;
  meetingTitle: string;
  userDisplayName: string;
}

export function VideoCallDialog({
  open,
  onOpenChange,
  roomName,
  meetingTitle,
  userDisplayName,
}: VideoCallDialogProps) {
  const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}#userInfo.displayName="${encodeURIComponent(userDisplayName)}"&config.prejoinConfig.enabled=true`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              {meetingTitle}
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a href={jitsiUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </a>
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <iframe
            src={jitsiUrl}
            className="w-full h-full border-0"
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
