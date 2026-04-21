import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NewSourceModal } from '@/components/NewSourceModal';

export default function HomePage() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
      <h1 className="font-serif text-4xl text-fg">Hello, {user?.email}</h1>
      <p className="text-muted text-sm">Your flashcard library is empty. Add a source to get started.</p>

      {/* FAB */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg text-white hover:bg-accent/90 transition-colors active:scale-95"
        aria-label="New source"
      >
        <Plus className="h-6 w-6" />
      </button>

      <NewSourceModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
