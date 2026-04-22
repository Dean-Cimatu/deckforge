import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shuffle, RotateCcw } from 'lucide-react';
import { usePublicDeck } from '@/hooks/useSources';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

type PublicCard = { id: string; front: string; back: string; frontImage?: string | null; backImage?: string | null };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export default function SharedDeckPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const { data, isLoading, isError } = usePublicDeck(shareId);
  const { user } = useAuth();

  const [queue, setQueue] = useState<PublicCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => {
    if (data?.cards) { setQueue(data.cards); setIndex(0); setFlipped(false); }
  }, [data]);

  const go = useCallback((dir: 1 | -1) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0 || next >= queue.length) return i;
      setFlipped(false);
      return next;
    });
  }, [queue.length]);

  const toggleShuffle = useCallback(() => {
    if (!data?.cards) return;
    setQueue(shuffled ? data.cards : shuffle(data.cards));
    setIndex(0); setFlipped(false);
    setShuffled((s) => !s);
  }, [shuffled, data]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.code === 'ArrowRight') go(1);
      else if (e.code === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-muted text-sm">Loading deck…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-3xl text-fg">Deck not found</h1>
        <p className="text-muted text-sm max-w-xs">This link may have expired or the owner made it private.</p>
        <Button asChild variant="outline"><Link to="/">Go to DeckForge</Link></Button>
      </div>
    );
  }

  const { deck, cards } = data;
  const current = queue[index];
  const total = queue.length;
  const progress = total > 0 ? (index + 1) / total : 0;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
          <Link to="/" className="font-serif text-lg font-semibold text-fg">DeckForge</Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/">My decks</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Sign up free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-8">
        {/* Deck info */}
        <div className="mb-6">
          <h1 className="font-serif text-3xl text-fg">{deck.title}</h1>
          <p className="mt-1 text-sm text-muted">{cards.length} cards</p>
        </div>

        {total === 0 ? (
          <p className="text-muted text-sm">This deck has no cards.</p>
        ) : (
          <>
            {/* Progress bar */}
            <div className="h-1 bg-border rounded-full mb-6">
              <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-fg tabular-nums">
                {index + 1} <span className="text-muted">/ {total}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleShuffle}
                  title="Shuffle"
                  className={`p-2 rounded-lg transition-colors ${shuffled ? 'text-accent bg-accent/10' : 'text-muted hover:text-fg'}`}
                >
                  <Shuffle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setIndex(0); setFlipped(false); }}
                  title="Restart"
                  className="p-2 rounded-lg text-muted hover:text-fg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Card + arrows */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => go(-1)}
                disabled={index === 0}
                className="p-2 rounded-full border border-border text-muted hover:text-fg hover:border-fg transition-colors disabled:opacity-20 flex-shrink-0"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <div
                className="flex-1 cursor-pointer"
                onClick={() => setFlipped((f) => !f)}
                style={{ perspective: 1200 }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${index}-${flipped ? 'b' : 'f'}`}
                    initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-2xl border border-border bg-surface shadow-sm min-h-[260px] flex flex-col items-center justify-center text-center p-10"
                  >
                    <span className={`mb-4 text-xs font-medium uppercase tracking-widest ${flipped ? 'text-accent' : 'text-muted'}`}>
                      {flipped ? 'Definition' : 'Term'}
                    </span>
                    <p className={`leading-relaxed text-fg ${flipped ? 'text-lg' : 'font-serif text-2xl'}`}>
                      {flipped ? current?.back : current?.front}
                    </p>
                    {flipped && current?.backImage && (
                      <img src={current.backImage} alt="" className="mt-4 max-h-48 rounded-xl object-contain border border-border" />
                    )}
                    {!flipped && current?.frontImage && (
                      <img src={current.frontImage} alt="" className="mt-4 max-h-48 rounded-xl object-contain border border-border" />
                    )}
                    {!flipped && <p className="mt-6 text-xs text-muted">Click or press Space to flip</p>}
                  </motion.div>
                </AnimatePresence>
              </div>

              <button
                onClick={() => go(1)}
                disabled={index === total - 1}
                className="p-2 rounded-full border border-border text-muted hover:text-fg hover:border-fg transition-colors disabled:opacity-20 flex-shrink-0"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-muted">← → arrows to navigate</p>

            {/* Card list preview */}
            <div className="mt-10">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-3">All cards</h2>
              <div className="space-y-2">
                {cards.map((card, i) => (
                  <button
                    key={card.id}
                    onClick={() => { setIndex(i); setFlipped(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`w-full text-left rounded-xl border px-5 py-3 transition-colors ${i === index ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-accent/40'}`}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <span className="text-sm font-medium text-fg truncate">{card.front}</span>
                      <span className="text-sm text-muted truncate">{card.back}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Sign-up CTA for non-logged-in visitors */}
        {!user && (
          <div className="mt-12 rounded-2xl border border-accent/30 bg-accent/5 px-8 py-8 text-center">
            <h2 className="font-serif text-2xl text-fg">Study smarter with spaced repetition</h2>
            <p className="mt-2 text-sm text-muted max-w-sm mx-auto">
              Sign up free to study this deck with an algorithm that schedules reviews at the perfect moment.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/register">Create free account</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
