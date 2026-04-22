import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Search, Plus, Users } from 'lucide-react';
import { useSources, useSharedDecks } from '@/hooks/useSources';
import { SourceCard } from '@/components/SourceCard';
import { AppNav } from '@/components/AppNav';
import { NewSourceModal } from '@/components/NewSourceModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import type { SourceType } from '@deckforge/shared';

const TYPE_FILTERS: { label: string; value: SourceType | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Text', value: 'text' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Image', value: 'image' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'Article', value: 'url' },
];

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<SourceType | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 200);
  const { data, isLoading, isError, refetch } = useSources({
    q: debouncedSearch || undefined,
    type: typeFilter,
  });
  const { data: sharedData } = useSharedDecks();

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-4xl text-fg">Your sources</h1>
          <Button onClick={() => setModalOpen(true)}>New source</Button>
        </div>

        {/* Controls */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sources..."
              className="w-full rounded-lg border border-border bg-bg pl-9 pr-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex items-center gap-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setTypeFilter(f.value)}
                className={`px-3 py-1.5 text-sm transition-colors border-b-2 ${
                  typeFilter === f.value
                    ? 'border-accent text-fg font-medium'
                    : 'border-transparent text-muted hover:text-fg'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading && <SkeletonGrid />}

        {isError && (
          <div className="mt-10 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-fg">Failed to load sources.</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {!isLoading && !isError && data?.sources.length === 0 && (
          <EmptyState onNew={() => setModalOpen(true)} />
        )}

        {!isLoading && !isError && data && data.sources.length > 0 && (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.sources.map((source) => (
              <SourceCard key={source.id ?? (source as unknown as { _id: string })._id} source={source} />
            ))}
          </div>
        )}

        {/* Shared with me */}
        {sharedData && sharedData.decks.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-muted" />
              <h2 className="font-serif text-2xl text-fg">Shared with me</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sharedData.decks.map(({ deck, source }) => (
                <Link
                  key={deck.id}
                  to={source ? `/sources/${source.id}` : `/deck/${deck.id}/study`}
                  className="rounded-xl border border-border bg-surface p-5 hover:border-accent/60 transition-colors block"
                >
                  <p className="font-serif text-lg text-fg leading-snug">{deck.title}</p>
                  <p className="mt-1 text-sm text-muted">{deck.cardCount} cards</p>
                </Link>
              ))}
            </div>
          </div>
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

function SkeletonGrid() {
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <Skeleton className="h-36 w-full rounded-none" />
          <div className="p-5 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="mt-24 flex flex-col items-center gap-4 text-center">
      <Upload className="h-16 w-16 text-muted" />
      <h2 className="font-serif text-2xl text-fg">No sources yet</h2>
      <p className="text-muted max-w-xs">Drop in your first piece of content to start studying.</p>
      <Button onClick={onNew} className="mt-2">New source</Button>
    </div>
  );
}
