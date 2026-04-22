import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Library, Moon, Sun, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

export function AppNav() {
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();

  function navClass(path: string) {
    const active = location.pathname === path || location.pathname.startsWith(path + '/');
    return `text-sm font-medium transition-colors ${active ? 'text-fg' : 'text-muted hover:text-fg'}`;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link to="/" className="font-serif text-lg font-semibold text-fg">DeckForge</Link>
        <nav className="flex items-center gap-4">
          <Link to="/" className={navClass('/')} end>
            <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" />Home</span>
          </Link>
          <Link to="/sources" className={navClass('/sources')}>
            <span className="flex items-center gap-1.5"><Library className="h-4 w-4" />Library</span>
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/settings" className={`rounded p-2 transition-colors ${location.pathname === '/settings' ? 'text-fg' : 'text-muted hover:text-fg'}`} aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Link>
          <button
            onClick={toggle}
            className="rounded p-2 text-muted hover:text-fg transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
        </div>
      </div>
    </header>
  );
}
