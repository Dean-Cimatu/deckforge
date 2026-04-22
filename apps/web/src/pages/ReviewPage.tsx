import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useReviewQueue, useReviewCard } from '@/hooks/useSources';
import { previewIntervals } from '@deckforge/shared';
import type { CardSchema } from '@deckforge/shared';
import type { Grade } from '@deckforge/shared';
import { enqueueReview } from '@/lib/offlineQueue';
import { Button } from '@/components/ui/button';

const GRADE_LABELS: Record<Grade, string> = {
  0: 'Again',
  3: 'Hard',
  4: 'Good',
  5: 'Easy',
};

const GRADE_KEYS: Record<string, Grade> = {
  '1': 0,
  '2': 3,
  '3': 4,
  '4': 5,
};

function intervalLabel(days: number): string {
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

const GRADE_SCORE: Record<Grade, number> = { 0: 0, 3: 60, 4: 80, 5: 100 };

function letterGrade(pct: number): { letter: string; label: string; color: string } {
  if (pct >= 85) return { letter: 'A', label: 'Excellent', color: 'text-green-400' };
  if (pct >= 70) return { letter: 'B', label: 'Good job', color: 'text-blue-400' };
  if (pct >= 55) return { letter: 'C', label: 'Keep practising', color: 'text-yellow-400' };
  if (pct >= 40) return { letter: 'D', label: 'Needs work', color: 'text-orange-400' };
  return { letter: 'F', label: 'Review these again soon', color: 'text-red-400' };
}

export default function ReviewPage() {
  const [params] = useSearchParams();
  const deckId = params.get('deckId') ?? undefined;
  const { data, isLoading } = useReviewQueue(deckId);
  const reviewCard = useReviewCard();

  const [queue, setQueue] = useState<CardSchema[]>([]);
  const [reviewed, setReviewed] = useState(0);
  const [gradeCounts, setGradeCounts] = useState<Record<Grade, number>>({ 0: 0, 3: 0, 4: 0, 5: 0 });
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    if (data?.cards) {
      setQueue(data.cards);
      setDone(false);
      setReviewed(0);
      setGradeCounts({ 0: 0, 3: 0, 4: 0, 5: 0 });
      setFlipped(false);
    }
  }, [data]);

  useEffect(() => {
    function onOnline() { setOffline(false); }
    function onOffline() { setOffline(true); }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const current = queue[0];

  const grade = useCallback(
    async (g: Grade) => {
      if (!current) return;
      setFlipped(false);
      try {
        await reviewCard.mutateAsync({ id: current.id, grade: g });
      } catch {
        await enqueueReview(current.id, g);
      }
      setGradeCounts((prev) => ({ ...prev, [g]: prev[g] + 1 }));
      setQueue((q) => q.slice(1));
      setReviewed((n) => n + 1);
      if (queue.length === 1) setDone(true);
    },
    [current, queue.length, reviewCard],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!flipped) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          setFlipped(true);
        }
        return;
      }
      const g = GRADE_KEYS[e.key];
      if (g !== undefined) grade(g);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, grade]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center">
        <p className="text-muted text-sm">Loading cards…</p>
      </div>
    );
  }

  if (done || (!isLoading && queue.length === 0 && reviewed === 0)) {
    const isEmpty = reviewed === 0;

    if (isEmpty) {
      return (
        <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-6 text-center px-6">
          <h1 className="font-serif text-5xl text-fg">All caught up.</h1>
          <p className="text-muted text-sm max-w-xs">No cards are due right now. Check back later or add more sources.</p>
          <div className="flex gap-3">
            <Button asChild variant="outline"><Link to="/">Home</Link></Button>
            <Button asChild><Link to="/sources">Sources</Link></Button>
          </div>
        </div>
      );
    }

    const totalScore = (Object.entries(gradeCounts) as [string, number][]).reduce(
      (sum, [g, count]) => sum + GRADE_SCORE[Number(g) as Grade] * count,
      0,
    );
    const avgPct = Math.round(totalScore / reviewed);
    const { letter, label, color } = letterGrade(avgPct);
    const struggleCount = gradeCounts[0] + gradeCounts[3];
    const strugglePct = Math.round((struggleCount / reviewed) * 100);

    const gradeRows: { label: string; g: Grade; bar: string }[] = [
      { label: 'Again', g: 0, bar: 'bg-red-500' },
      { label: 'Hard', g: 3, bar: 'bg-orange-400' },
      { label: 'Good', g: 4, bar: 'bg-blue-400' },
      { label: 'Easy', g: 5, bar: 'bg-green-400' },
    ];

    return (
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
          <h1 className="font-serif text-4xl text-fg">Session complete</h1>

          {/* Grade */}
          <div className="flex flex-col items-center gap-1">
            <span className={`font-serif text-8xl font-bold leading-none ${color}`}>{letter}</span>
            <span className="text-muted text-sm">{label}</span>
            <span className="text-muted text-xs mt-1">{avgPct}% average score · {reviewed} card{reviewed !== 1 ? 's' : ''} reviewed</span>
          </div>

          {/* Breakdown */}
          <div className="w-full rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
            {gradeRows.map(({ label: l, g, bar }) => {
              const count = gradeCounts[g];
              const pct = reviewed > 0 ? (count / reviewed) * 100 : 0;
              return (
                <div key={g} className="flex items-center gap-3">
                  <span className="text-sm text-muted w-10 text-left">{l}</span>
                  <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                    <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-fg tabular-nums w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Reflection hint */}
          {strugglePct > 0 && (
            <p className="text-sm text-muted max-w-xs">
              {strugglePct}% of cards were marked Again or Hard — consider reviewing those again soon to reinforce them.
            </p>
          )}

          <div className="flex gap-3">
            <Button asChild variant="outline"><Link to="/">Home</Link></Button>
            <Button asChild><Link to="/sources">Sources</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const sm2State = {
    interval: current.interval,
    easeFactor: current.easeFactor,
    repetitions: current.repetitions,
  };
  const previews = previewIntervals(sm2State);

  const progress = reviewed / (reviewed + queue.length);

  return (
    <div className="fixed inset-0 bg-bg flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-border">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="text-sm text-muted hover:text-fg transition-colors">← Exit</Link>
        <div className="flex items-center gap-3">
          {offline && (
            <span className="flex items-center gap-1 text-xs text-warn">
              <WifiOff className="h-3.5 w-3.5" /> Offline — progress saved locally
            </span>
          )}
          <span className="text-sm text-muted">{queue.length} remaining</span>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div
          className="w-full max-w-xl cursor-pointer"
          onClick={() => !flipped && setFlipped(true)}
          style={{ perspective: 1200 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={flipped ? 'back' : 'front'}
              initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-border bg-surface p-10 min-h-[240px] flex flex-col items-center justify-center text-center shadow-sm"
            >
              {flipped ? (
                <>
                  <p className="text-lg text-fg leading-relaxed">{current.back}</p>
                  {current.backImage && (
                    <img src={current.backImage} alt="" className="mt-4 max-h-48 rounded-xl object-contain border border-border" />
                  )}
                </>
              ) : (
                <>
                  <p className="font-serif text-2xl text-fg leading-snug">{current.front}</p>
                  {current.frontImage && (
                    <img src={current.frontImage} alt="" className="mt-4 max-h-48 rounded-xl object-contain border border-border" />
                  )}
                  <p className="mt-6 text-xs text-muted">Space / click to reveal</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Grade buttons */}
      <div className="px-6 pb-10">
        {flipped ? (
          <div className="flex gap-3 justify-center flex-wrap">
            {([0, 3, 4, 5] as Grade[]).map((g) => (
              <button
                key={g}
                onClick={() => grade(g)}
                disabled={reviewCard.isPending}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-5 py-3 text-sm hover:border-accent hover:bg-surface/80 transition-colors disabled:opacity-50"
              >
                <span className="font-medium text-fg">{GRADE_LABELS[g]}</span>
                <span className="text-xs text-muted">{intervalLabel(previews[g])}</span>
                <span className="text-xs text-muted/60">[{g === 0 ? '1' : g === 3 ? '2' : g === 4 ? '3' : '4'}]</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <Button size="lg" onClick={() => setFlipped(true)}>
              Show answer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
