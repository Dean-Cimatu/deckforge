import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
      <h1 className="font-serif text-4xl text-fg">Hello, {user?.email}</h1>
      <Button variant="ghost" onClick={logout}>
        Sign out
      </Button>
    </div>
  );
}
