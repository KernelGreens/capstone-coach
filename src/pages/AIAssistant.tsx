import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Bot, User, Loader2, Lock, Lightbulb, Bug, BookOpen, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function streamChat({ messages, onDelta, onDone }: { messages: Msg[]; onDelta: (t: string) => void; onDone: () => void }) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Error ${resp.status}`);
  }
  if (!resp.body) throw new Error('No response body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { done = true; break; }
      try {
        const p = JSON.parse(json);
        const c = p.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }
  onDone();
}

const quickActions = [
  { label: 'Explain a concept', icon: Lightbulb, prompt: 'Can you explain ' },
  { label: 'Debug my code', icon: Bug, prompt: 'I need help debugging this code:\n\n```\n\n```' },
  { label: 'Recommend resources', icon: BookOpen, prompt: 'Can you recommend resources for learning ' },
  { label: 'Ask a question', icon: HelpCircle, prompt: '' },
];

export default function AIAssistant() {
  const { subscribed, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (subLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  if (!subscribed) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
          <div className="rounded-full bg-primary/10 p-6"><Lock className="h-12 w-12 text-primary" /></div>
          <h2 className="text-2xl font-bold">AI Learning Assistant</h2>
          <p className="text-muted-foreground max-w-md">Upgrade to Pro or Premium to unlock the AI Learning Assistant — your personal tutor for concept explanations, debugging, resources, and more.</p>
          <Button onClick={() => navigate('/pricing')} className="gap-2"><Sparkles className="h-4 w-4" /> View Plans</Button>
        </div>
      </DashboardLayout>
    );
  }

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;
    setInput('');
    const userMsg: Msg = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamChat({ messages: [...messages, userMsg], onDelta: upsert, onDone: () => setIsLoading(false) });
    } catch (e: any) {
      setIsLoading(false);
      toast.error(e.message || 'Failed to get response');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="rounded-full bg-primary/10 p-2"><Sparkles className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-lg font-semibold">AI Learning Assistant</h1>
            <p className="text-xs text-muted-foreground">Concept explanations · Debugging · Resources · Q&A</p>
          </div>
          <Badge variant="secondary" className="ml-auto">Pro</Badge>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <Bot className="h-16 w-16 text-muted-foreground/30" />
              <p className="text-muted-foreground text-center">How can I help you today?</p>
              <div className="grid grid-cols-2 gap-3 max-w-md w-full">
                {quickActions.map((a) => (
                  <Button key={a.label} variant="outline" className="h-auto py-3 px-4 flex flex-col items-start gap-1 text-left" onClick={() => { setInput(a.prompt); }}>
                    <a.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm">{a.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="rounded-full bg-primary/10 p-1.5 h-8 w-8 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <Card className={`max-w-[80%] p-3 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background [&_pre]:p-3 [&_pre]:rounded-md [&_code]:text-xs">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                )}
              </Card>
              {m.role === 'user' && (
                <div className="rounded-full bg-secondary p-1.5 h-8 w-8 flex items-center justify-center shrink-0 mt-1">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3">
              <div className="rounded-full bg-primary/10 p-1.5 h-8 w-8 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <Card className="p-3 bg-muted"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></Card>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="min-h-[44px] max-h-32 resize-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <Button onClick={() => send()} disabled={!input.trim() || isLoading} size="icon" className="shrink-0 h-11 w-11">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
