import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

// ── How-it-works card data ───────────────────────────────────────────────────

const steps = [
  {
    Icon: Upload,
    title: 'Paste, upload, or link',
    body: 'Drop in text, PDFs, slides, photos, YouTube videos, or article URLs.',
  },
  {
    Icon: Sparkles,
    title: 'AI generates instantly',
    body: 'Claude reads your content and creates flashcards plus a clean structured summary in seconds.',
  },
  {
    Icon: RotateCcw,
    title: 'Review on any device',
    body: 'Spaced repetition keeps cards in rotation until you know them. Works offline on your phone.',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-2xl px-6 py-32 text-center">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="font-serif text-4xl font-semibold leading-tight text-fg md:text-6xl"
          >
            Stop re-reading your notes.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-6 text-lg text-muted md:text-xl"
          >
            Turn any lecture, slide deck, or PDF into flashcards you'll actually remember.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-10 flex flex-col items-center gap-4"
          >
            <Button asChild size="lg">
              <Link to="/register">Start studying →</Link>
            </Button>
            <p className="text-sm text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-fg underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Hero screenshot ── */}
      <div className="px-6 pb-24">
        {/* Replace with real source-detail screenshot after Phase 2 ships */}
        <img
          src="/landing-hero.png"
          alt="DeckForge — source detail view with generated flashcards"
          width={1400}
          height={900}
          className="mx-auto max-w-[95%] rounded-xl shadow-2xl md:max-w-4xl"
          style={{ transform: 'rotate(-2deg)' }}
        />
      </div>

      {/* ── How it works ── */}
      <section className="px-6 py-24">
        <h2 className="text-center font-serif text-4xl font-semibold text-fg">How it works</h2>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3">
          {steps.map(({ Icon, title, body }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="rounded-xl border border-border bg-surface p-8 transition-shadow duration-[150ms] hover:shadow-md"
            >
              <Icon size={28} strokeWidth={1.5} className="text-accent" />
              <h3 className="mt-5 font-serif text-xl font-semibold text-fg">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Demo GIF ── */}
      <section className="px-6 py-24">
        {/* Replace with /public/demo.gif after Phase 5 ships */}
        <div className="mx-auto flex aspect-video max-w-3xl items-center justify-center rounded-xl border border-border bg-surface text-sm text-muted">
          Demo video coming soon
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-6 py-24 text-center">
        <h2 className="font-serif text-4xl font-semibold text-fg">Start studying smarter.</h2>
        <div className="mt-10">
          <Button asChild size="lg">
            <Link to="/register">Create your account →</Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="text-sm text-muted">DeckForge © 2026</span>
          <nav className="flex gap-6">
            <a
              href="https://github.com/Dean-Cimatu/deckforge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              GitHub
            </a>
            <a
              href="https://deancimatu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              Built by Dean Cimatu
            </a>
            <Link
              to="/roadmap"
              className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              Roadmap
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
