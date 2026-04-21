import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolved, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md',
        'text-muted hover:text-fg hover:bg-surface',
        'transition-colors duration-tab',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className
      )}
    >
      {resolved === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  );
}
