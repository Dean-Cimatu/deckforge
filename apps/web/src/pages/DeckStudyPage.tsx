import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shuffle, RotateCcw, Brain, ListChecks } from 'lucide-react';
import { useDeckCards } from '@/hooks/useSources';
import { Button } from '@/components/ui/button';
import type { CardSchema } from '@deckforge/shared';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export default function DeckStudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useDeckCards(deckId);

  const [queue, setQueue] = useState<CardSchema[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => {
    if (data?.cards) {
      setQueue(data.cards);
      setIndex(0);
      setFlipped(false);
    }
  }, [data]);

  const current = queue[index];
  const total = queue.length;

  const go = useCallback(
    (dir: 1 | -1) => {
      const next = index + dir;
      if (next < 0 || next >= total) return;
      setIndex(next);
      setFlipped(false);
    },
    [index, total],
  );

  const toggleShuffle = useCallback(() => {
    if (!data?.cards) return;
    if (!shuffled) {
      setQueue(shuffle(data.cards));
    } else {
      setQueue(data.cards);
    }
    setIndex(0);
    setFlipped(false);
    setShuffled((s) => !s);
  }, [shuffled, data]);

  const restart = useCallback(() => {
    setIndex(0);
    setFlipped(false);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        go(1);
      } else if (e.code === 'ArrowLeft') {
        go(-1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center">
        <p className="text-muted text-sm">Loading cards…</p>
      </div>
    );
  }

  if (!data || total === 0) {
    return (
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-4">
        <p className="text-muted">No cards in this deck.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const progress = (index + 1) / total;

  return (
    <div className="fixed inset-0 bg-bg flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-border">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted hover:text-fg transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Exit
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-fg tabular-nums">
            {index + 1} <span className="text-muted">/ {total}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleShuffle}
            title="Shuffle"
            className={`p-2 rounded-lg transition-colors ${shuffled ? 'text-accent bg-accent/10' : 'text-muted hover:text-fg'}`}
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button
            onClick={restart}
            title="Restart"
            className="p-2 rounded-lg text-muted hover:text-fg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-4 gap-4">
        {/* Prev arrow */}
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="p-2 rounded-full border border-border text-muted hover:text-fg hover:border-fg transition-colors disabled:opacity-20 disabled:cursor-not-allowed flex-shrink-0"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Card */}
        <div
          className="flex-1 max-w-2xl cursor-pointer"
          onClick={() => setFlipped((f) => !f)}
          style={{ perspective: 1200 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${index}-${flipped ? 'back' : 'front'}`}
              initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-border bg-surface shadow-sm min-h-[300px] flex flex-col items-center justify-center text-center p-10"
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
              {!flipped && (
                <p className="mt-6 text-xs text-muted">Click or press Space to flip</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next arrow */}
        <button
          onClick={() => go(1)}
          disabled={index === total - 1}
          className="p-2 rounded-full border border-border text-muted hover:text-fg hover:border-fg transition-colors disabled:opacity-20 disabled:cursor-not-allowed flex-shrink-0"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 flex flex-col items-center gap-4">
        <p className="text-xs text-muted">← → arrows to navigate</p>
        <div className="flex gap-3">
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to={`/deck/${deckId}/quiz`}>
              <ListChecks className="h-4 w-4" />
              Quiz mode
            </Link>
          </Button>
          <Button asChild size="lg" className="gap-2">
            <Link to={`/review?deckId=${deckId}`}>
              <Brain className="h-4 w-4" />
              Spaced review
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
