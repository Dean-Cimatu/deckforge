import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload } from 'lucide-react';
import { useDueSummary, useRecentSources } from '@/hooks/useSources';
import { SourceCard } from '@/components/SourceCard';
import { AppNav } from '@/components/AppNav';
import { NewSourceModal } from '@/components/NewSourceModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: due, isLoading: dueLoading } = useDueSummary();
  const { data: recent, isLoading: recentLoading } = useRecentSources();

  const totalDue = due?.totalDue ?? 0;
  const byDeck = due?.byDeck ?? [];
  const estMinutes = Math.ceil(totalDue / 2.5);

  const noSources = !recentLoading && (recent?.total ?? 0) === 0;

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Empty state */}
        {noSources && (
          <div className="flex flex-col items-center gap-4 text-center py-16">
            <Upload className="h-16 w-16 text-muted" />
            <h1 className="font-serif text-5xl text-fg">Ready to start?</h1>
            <p className="text-muted max-w-xs">Add your first piece of content and let DeckForge turn it into flashcards.</p>
            <Button onClick={() => setModalOpen(true)} className="mt-4" size="lg">New source</Button>
          </div>
        )}

        {/* Hero */}
        {!noSources && (
          <>
            {dueLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-2/3" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : totalDue > 0 ? (
              <div>
                <h1 className="font-serif text-5xl text-fg leading-tight">
                  You have {totalDue} card{totalDue !== 1 ? 's' : ''} due today.
                </h1>
                <div className="mt-8">
                  <Button size="lg" asChild>
                    <Link to="/review">Review now →</Link>
                  </Button>
                </div>
                <p className="mt-4 text-sm text-muted">
                  across {byDeck.length} deck{byDeck.length !== 1 ? 's' : ''}, ~{estMinutes} min
                </p>
              </div>
            ) : (
              <div>
                <h1 className="font-serif text-5xl text-fg leading-tight">You're all caught up.</h1>
                <div className="mt-8">
                  <Button size="lg" variant="outline" onClick={() => setModalOpen(true)}>
                    Add new source
                  </Button>
                </div>
                <p className="mt-4 text-sm text-muted">Next review: tomorrow</p>
              </div>
            )}

            {/* Recent sources */}
            <div className="mt-24">
              <h2 className="font-serif text-2xl text-fg">Recent sources</h2>
              {recentLoading ? (
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-xl border border-border overflow-hidden">
                      <Skeleton className="h-36 w-full rounded-none" />
                      <div className="p-5 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {recent?.sources.map((source) => (
                    <SourceCard key={source.id ?? (source as unknown as { _id: string })._id} source={source} />
                  ))}
                </div>
              )}
              <div className="mt-6">
                <Link to="/sources" className="text-sm text-muted hover:text-fg transition-colors">
                  View all sources →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

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
