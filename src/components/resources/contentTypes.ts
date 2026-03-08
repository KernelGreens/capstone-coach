import {
  Video,
  FileText,
  BookOpen,
  Link as LinkIcon,
  Presentation,
  Code2,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react';

export interface ContentTypeConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  description: string;
  badgeClass: string;
  placeholder: string;
}

export const CONTENT_TYPES: ContentTypeConfig[] = [
  {
    value: 'video',
    label: 'Video Lesson',
    icon: Video,
    description: 'YouTube, Vimeo, or direct video links',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    placeholder: 'https://youtube.com/watch?v=...',
  },
  {
    value: 'tutorial',
    label: 'Text Tutorial',
    icon: BookOpen,
    description: 'Written guides, blog posts, documentation',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    placeholder: 'https://docs.example.com/tutorial',
  },
  {
    value: 'slide_deck',
    label: 'Slide Deck',
    icon: Presentation,
    description: 'Google Slides, SlideShare presentations',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    placeholder: 'https://docs.google.com/presentation/d/...',
  },
  {
    value: 'code_example',
    label: 'Code Example',
    icon: Code2,
    description: 'GitHub repos, Gists, CodeSandbox',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    placeholder: 'https://github.com/user/repo',
  },
  {
    value: 'link',
    label: 'External Link',
    icon: LinkIcon,
    description: 'Any external URL or reference',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
    placeholder: 'https://example.com',
  },
  {
    value: 'notebook',
    label: 'Notebook',
    icon: NotebookPen,
    description: 'Google Colab, Jupyter Notebook',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    placeholder: 'https://colab.research.google.com/drive/...',
  },
  {
    value: 'document',
    label: 'Document',
    icon: FileText,
    description: 'PDFs, Word docs, spreadsheets',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    placeholder: 'https://example.com/document.pdf',
  },
];

export function getContentTypeConfig(type: string): ContentTypeConfig {
  return CONTENT_TYPES.find((ct) => ct.value === type) || CONTENT_TYPES.find((ct) => ct.value === 'link')!;
}
