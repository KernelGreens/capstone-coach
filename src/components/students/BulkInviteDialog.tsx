import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Row {
  full_name: string;
  email: string;
}

interface ResultRow extends Row {
  ok: boolean;
  message?: string;
}

export function BulkInviteDialog({
  tracks,
  onCompleted,
}: {
  tracks: any[];
  onCompleted: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trackId, setTrackId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState<Row[]>([
    { full_name: '', email: '' },
    { full_name: '', email: '' },
    { full_name: '', email: '' },
  ]);
  const [pasted, setPasted] = useState('');
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const reset = () => {
    setTrackId('');
    setStartDate('');
    setEndDate('');
    setRows([
      { full_name: '', email: '' },
      { full_name: '', email: '' },
      { full_name: '', email: '' },
    ]);
    setPasted('');
    setResults(null);
    setProgress({ done: 0, total: 0 });
  };

  const parsePasted = (text: string): Row[] =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        const emailPart = parts.find((p) => p.includes('@')) || '';
        const namePart = parts.filter((p) => p !== emailPart).join(' ').trim();
        return {
          full_name: namePart || emailPart.split('@')[0],
          email: emailPart,
        };
      })
      .filter((r) => r.email);

  const collectRows = (): Row[] => {
    const manual = rows.filter((r) => r.email.trim() && r.full_name.trim());
    const fromPaste = parsePasted(pasted);
    const all = [...manual, ...fromPaste];
    const seen = new Set<string>();
    return all.filter((r) => {
      const key = r.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const handleSubmit = async () => {
    const list = collectRows();
    if (!trackId || !startDate || !endDate) {
      toast({ title: 'Missing details', description: 'Choose a track and both dates.', variant: 'destructive' });
      return;
    }
    if (list.length === 0) {
      toast({ title: 'No students', description: 'Add at least one name and email.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    setResults(null);
    setProgress({ done: 0, total: list.length });

    const { data: { session } } = await supabase.auth.getSession();
    const collected: ResultRow[] = [];

    for (const person of list) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-student`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: person.email,
              full_name: person.full_name,
              track_id: trackId,
              start_date: startDate,
              end_date: endDate,
            }),
          }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to invite');
        collected.push({ ...person, ok: true });
      } catch (error: any) {
        collected.push({ ...person, ok: false, message: error.message });
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setResults(collected);
    setSubmitting(false);

    const succeeded = collected.filter((r) => r.ok).length;
    toast({
      title: 'Invitations processed',
      description: `${succeeded} of ${collected.length} students added successfully.`,
      variant: succeeded === 0 ? 'destructive' : 'default',
    });
    onCompleted();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Add Multiple
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Multiple Students</DialogTitle>
          <DialogDescription>
            Everyone added here joins the same track and dates, and each person gets their own
            invitation email — exactly like adding them one by one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Track *</Label>
            <Select value={trackId} onValueChange={setTrackId}>
              <SelectTrigger>
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                {tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <Tabs defaultValue="rows">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rows">Type names</TabsTrigger>
              <TabsTrigger value="paste">Paste list</TabsTrigger>
            </TabsList>

            <TabsContent value="rows" className="space-y-2 pt-3">
              {rows.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Full name"
                    value={row.full_name}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = { ...next[index], full_name: e.target.value };
                      setRows(next);
                    }}
                  />
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={row.email}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = { ...next[index], email: e.target.value };
                      setRows(next);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRows(rows.filter((_, i) => i !== index))}
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRows([...rows, { full_name: '', email: '' }])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add row
              </Button>
            </TabsContent>

            <TabsContent value="paste" className="pt-3">
              <Label>One student per line: name, email</Label>
              <Textarea
                rows={7}
                className="mt-2 font-mono text-sm"
                placeholder={'Ada Lovelace, ada@example.com\nAlan Turing, alan@example.com'}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
              />
            </TabsContent>
          </Tabs>

          {results && (
            <ScrollArea className="max-h-56 rounded-md border p-3">
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.email} className="flex items-start gap-2 text-sm">
                    {r.ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                    )}
                    <div>
                      <span className="font-medium">{r.full_name}</span>{' '}
                      <span className="text-muted-foreground">({r.email})</span>
                      {!r.ok && <p className="text-destructive text-xs">{r.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary">
              {submitting
                ? `Adding ${progress.done} of ${progress.total}...`
                : `${collectRows().length} student(s) ready`}
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Close
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Students
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
