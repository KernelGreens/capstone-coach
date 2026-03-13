import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

const EMOJI_CATEGORIES = [
  { label: '😀', emojis: ['😀','😂','🤣','😊','😍','🥰','😘','😜','🤗','😎','🥳','😢','😭','😤','🤔','😴','🤯','🥺','😇','🤩'] },
  { label: '👍', emojis: ['👍','👎','👏','🙌','🤝','✌️','🤞','💪','🙏','❤️','🔥','⭐','💯','✅','❌','⚡','🎉','🎊','💡','📌'] },
  { label: '📚', emojis: ['📚','📖','✏️','📝','💻','🖥️','⌨️','🎯','🏆','📊','📈','🔧','⚙️','🧪','🔬','🎨','🗂️','📁','📋','🔗'] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start" side="top">
        <div className="space-y-2">
          {EMOJI_CATEGORIES.map((cat, ci) => (
            <div key={ci}>
              <div className="flex flex-wrap gap-1">
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
                    onClick={() => {
                      onSelect(emoji);
                      setOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {ci < EMOJI_CATEGORIES.length - 1 && <div className="border-b my-1" />}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
