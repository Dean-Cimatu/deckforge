import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ value, onChange }: Props) {
  const [input, setInput] = useState('');

  function add(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || value.includes(tag) || value.length >= 10) return;
    onChange([...value, tag]);
    setInput('');
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
    if (e.key === 'Backspace' && !input && value.length > 0) remove(value[value.length - 1]!);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-bg px-2 py-1.5 min-h-[36px] focus-within:ring-1 focus-within:ring-accent">
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
          {tag}
          <button type="button" onClick={() => remove(tag)} className="hover:text-warn transition-colors">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => add(input)}
        placeholder={value.length === 0 ? 'Add tags (Enter or comma)' : ''}
        className="flex-1 min-w-[120px] bg-transparent text-xs text-fg placeholder:text-muted outline-none"
      />
    </div>
  );
}
