import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, RotateCcw, BookOpen, ChevronRight } from 'lucide-react';
import { useDeckCards } from '@/hooks/useSources';
import { AppNav } from '@/components/AppNav';
import { Button } from '@/components/ui/button';
import type { CardSchema } from '@deckforge/shared';

interface Question {
  card: CardSchema;
  options: string[];   // 4 shuffled answer strings
  correct: string;     // card.back
}

function pickDistractors(correct: CardSchema, pool: CardSchema[]): string[] {
  const others = pool.filter((c) => c.id !== correct.id);
  const shuffled = [...others].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((c) => c.back);
}

function buildQuestions(cards: CardSchema[], tag?: string): Question[] {
  const pool = tag ? cards.filter((c) => c.tags?.includes(tag)) : cards;
  if (pool.length < 2) return [];

  return pool
    .sort(() => Math.random() - 0.5)
    .map((card) => {
      const distractors = pickDistractors(card, pool.length >= 4 ? pool : cards);
      const options = [...distractors, card.back].sort(() => Math.random() - 0.5);
      return { card, options, correct: card.back };
    });
}

type AnswerState = 'unanswered' | 'correct' | 'wrong';

export default function QuizPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [searchParams] = useSearchParams();
  const activeTag = searchParams.get('tag') ?? undefined;

  const { data, isLoading } = useDeckCards(deckId);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const allTags = useMemo(() => {
    if (!data?.cards) return [];
    const set = new Set<string>();
    data.cards.forEach((c) => c.tags?.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [data]);

  function start(tag?: string) {
    if (!data?.cards) return;
    const qs = buildQuestions(data.cards, tag);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setAnswerState('unanswered');
    setScore(0);
    setDone(false);
  }

  useEffect(() => {
    if (data?.cards && data.cards.length >= 2) start(activeTag);
  }, [data, activeTag]);

  const q = questions[current];

  function choose(option: string) {
    if (answerState !== 'unanswered') return;
    setSelected(option);
    const correct = option === q!.correct;
    setAnswerState(correct ? 'correct' : 'wrong');
    if (correct) setScore((s) => s + 1);
  }

  function next() {
    if (current + 1 >= questions.length) { setDone(true); return; }
    setCurrent((i) => i + 1);
    setSelected(null);
    setAnswerState('unanswered');
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (answerState !== 'unanswered' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight')) {
        e.preventDefault(); next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answerState, current, questions.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  const deck = data?.deck;
  const cards = data?.cards ?? [];

  if (cards.length < 2) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-4">
          <h1 className="font-serif text-3xl text-fg">Not enough cards</h1>
          <p className="text-muted text-sm">You need at least 2 cards to start a quiz.</p>
          <Button asChild variant="outline"><Link to={`/deck/${deckId}/study`}>Study instead</Link></Button>
        </div>
      </div>
    );
  }

  // Tag picker screen shown when deck has tags and no tag was pre-selected
  if (allTags.length > 0 && !activeTag && questions.length === 0) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="max-w-xl mx-auto px-6 py-16 space-y-6">
          <h1 className="font-serif text-3xl text-fg">{deck?.title}</h1>
          <p className="text-muted text-sm">Choose a tag to quiz, or quiz the whole deck.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => start()} className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-fg hover:border-accent hover:text-accent transition-colors">
              All cards
            </button>
            {allTags.map((tag) => (
              <button key={tag} onClick={() => start(tag)} className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-fg hover:border-accent hover:text-accent transition-colors">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 90 ? 'Excellent' : pct >= 70 ? 'Good' : pct >= 50 ? 'Keep going' : 'Keep practising';
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <p className="text-6xl font-serif font-bold text-fg">{pct}%</p>
            <p className="mt-2 text-xl text-muted">{grade}</p>
            <p className="mt-1 text-sm text-muted">{score} / {questions.length} correct</p>
          </motion.div>

          <div className="flex justify-center gap-3 pt-4">
            <Button onClick={() => start(activeTag)} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" /> Retry
            </Button>
            <Button asChild>
              <Link to={`/deck/${deckId}/study`}>
                <BookOpen className="h-4 w-4 mr-2" /> Study mode
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  const progress = (current + 1) / questions.length;

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium text-fg tabular-nums">
              {current + 1} <span className="text-muted">/ {questions.length}</span>
            </p>
            {activeTag && (
              <p className="text-xs text-accent font-medium mt-0.5">{activeTag}</p>
            )}
          </div>
          <Link to={`/deck/${deckId}/study`} className="text-xs text-muted hover:text-fg transition-colors">
            Exit quiz
          </Link>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-border rounded-full mb-8">
          <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
          >
            <div className="rounded-2xl border border-border bg-surface p-8 mb-6 text-center min-h-[140px] flex flex-col items-center justify-center">
              {q.card.frontImage && (
                <img src={q.card.frontImage} alt="" className="mb-4 max-h-40 rounded-xl object-contain border border-border" />
              )}
              <p className="font-serif text-2xl text-fg leading-relaxed">{q.card.front}</p>
              {q.card.tags && q.card.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-3">
                  {q.card.tags.map((t) => (
                    <span key={t} className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {q.options.map((option, i) => {
                const isSelected = selected === option;
                const isCorrectOption = option === q.correct;
                let cls = 'w-full text-left rounded-xl border-2 px-5 py-4 text-sm font-medium transition-all ';

                if (answerState === 'unanswered') {
                  cls += 'border-border bg-surface text-fg hover:border-accent hover:bg-accent/5 cursor-pointer';
                } else if (isCorrectOption) {
                  cls += 'border-green-500 bg-green-500/10 text-fg';
                } else if (isSelected) {
                  cls += 'border-warn bg-warn/10 text-fg';
                } else {
                  cls += 'border-border bg-surface text-muted opacity-50';
                }

                return (
                  <button key={i} className={cls} onClick={() => choose(option)} disabled={answerState !== 'unanswered'}>
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {answerState !== 'unanswered' && isCorrectOption && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                      {answerState !== 'unanswered' && isSelected && !isCorrectOption && <XCircle className="h-5 w-5 text-warn flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Feedback + next */}
            {answerState !== 'unanswered' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-center justify-between"
              >
                <p className={`text-sm font-semibold ${answerState === 'correct' ? 'text-green-500' : 'text-warn'}`}>
                  {answerState === 'correct' ? 'Correct!' : `Correct answer: ${q.correct}`}
                </p>
                <Button onClick={next}>
                  {current + 1 < questions.length ? (
                    <><span>Next</span><ChevronRight className="h-4 w-4 ml-1" /></>
                  ) : 'See results'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <p className="mt-4 text-center text-xs text-muted">Press Space or → after answering to continue</p>
      </div>
    </div>
  );
}
