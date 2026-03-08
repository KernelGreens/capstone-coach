import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTENT_TYPES } from './contentTypes';

interface ContentTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function ContentTypeSelect({ value, onValueChange }: ContentTypeSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        {CONTENT_TYPES.map((ct) => {
          const Icon = ct.icon;
          return (
            <SelectItem key={ct.value} value={ct.value}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{ct.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
