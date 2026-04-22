import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Pencil, Trash2, BookOpen, Brain, Plus } from 'lucide-react';
import { ImagePicker } from '@/components/ImagePicker';
import { useSource, useDeleteSource, usePatchSource, usePatchCard, useDeleteCard, useAddCard } from '@/hooks/useSources';
import { SourceTypeBadge } from '@/components/SourceTypeBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { relativeTime } from '@/lib/relativeTime';
import { AppNav } from '@/components/AppNav';
import type { CardSchema } from '@deckforge/shared';

export default function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, isError } = useSource(id!);
  const deleteSource = useDeleteSource();
  const patchSource = usePatchSource(id!);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <p className="text-muted">Source not found.</p>
        <Link to="/sources" className="mt-4 inline-block text-accent text-sm">← Back to sources</Link>
      </div>
    );
  }

  const { source, deck, cards } = data;
  const isProcessing = source.status === 'processing';
  const hasError = source.status === 'partial' || source.status === 'failed';

  async function saveTitle() {
    if (!titleDraft.trim()) return;
    try {
      await patchSource.mutateAsync({ title: titleDraft.trim() });
    } catch {
      toast({ title: 'Failed to update title', variant: 'destructive' });
    }
    setEditingTitle(false);
  }

  async function saveSummary() {
    try {
      await patchSource.mutateAsync({ summary: summaryDraft });
    } catch {
      toast({ title: 'Failed to save summary', variant: 'destructive' });
    }
    setEditingSummary(false);
  }

  async function handleDelete() {
    try {
      await deleteSource.mutateAsync(id!);
      navigate('/sources');
    } catch {
      toast({ title: 'Failed to delete source', variant: 'destructive' });
    }
    setConfirmDelete(false);
  }

  return (
    <div className="min-h-screen bg-bg">
    <AppNav />
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted font-sans mb-8">
        <Link to="/sources" className="hover:text-fg transition-colors">Sources</Link>
        <span>/</span>
        <span className="text-fg truncate max-w-[20ch]">{source.title}</span>
      </nav>

      {/* Error / partial banner */}
      {hasError && source.generationError && (
        <div className="mb-6 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-fg">
          <p className="font-medium">Generation issue</p>
          <p className="mt-1 text-muted">{source.generationError}</p>
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
              className="font-serif text-5xl leading-tight bg-transparent border-b border-accent outline-none w-full text-fg"
            />
          ) : (
            <button
              className="group flex items-start gap-2 text-left"
              onClick={() => { setTitleDraft(source.title); setEditingTitle(true); }}
            >
              <h1 className="font-serif text-5xl leading-tight text-fg">{source.title}</h1>
              <Pencil className="mt-3 h-4 w-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            <SourceTypeBadge type={source.type} />
            {source.type === 'images' && source.inputMeta.imageCount && (
              <><span>·</span><span>{source.inputMeta.imageCount} slides</span></>
            )}
            {deck && <><span>·</span><span>{deck.cardCount} cards</span></>}
            <span>·</span>
            <span>{relativeTime(source.createdAt)}</span>
          </div>
        </div>

        {/* Kebab menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="mt-1 flex-shrink-0">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-warn focus:text-warn"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="mt-10 rounded-xl border border-border bg-surface p-8 space-y-4">
          <p className="text-sm text-muted">Extracting text… Generating flashcards…</p>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {/* Tabs */}
      {!isProcessing && (
        <Tabs defaultValue="summary" className="mt-10">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          </TabsList>

          {/* Summary tab */}
          <TabsContent value="summary" className="relative">
            {!editingSummary && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0"
                onClick={() => { setSummaryDraft(source.summary ?? ''); setEditingSummary(true); }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            )}

            {editingSummary ? (
              <div className="space-y-3">
                <textarea
                  autoFocus
                  value={summaryDraft}
                  onChange={(e) => setSummaryDraft(e.target.value)}
                  rows={20}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveSummary} disabled={patchSource.isPending}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingSummary(false)}>Cancel</Button>
                </div>
              </div>
            ) : source.summary ? (
              <div className="prose prose-neutral dark:prose-invert prose-headings:font-serif prose-headings:text-fg prose-p:leading-relaxed max-w-none pt-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {source.summary}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">No summary generated.</p>
            )}
          </TabsContent>

          {/* Flashcards tab */}
          <TabsContent value="flashcards">
            {cards.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No flashcards generated.</p>
            ) : (
              <>
                {/* Study CTAs */}
                <div className="mt-4 flex items-center gap-3">
                  <Link
                    to={`/deck/${deck?.id}/study`}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-accent bg-accent/5 px-4 py-3 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    Flashcards
                  </Link>
                  <Link
                    to={`/review?deckId=${deck?.id}`}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg hover:border-accent transition-colors"
                  >
                    <Brain className="h-4 w-4" />
                    Spaced review
                  </Link>
                </div>

                {/* Card count */}
                <p className="mt-6 mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
                  {cards.length} {cards.length === 1 ? 'card' : 'cards'}
                </p>

                {/* Card list */}
                <ul className="space-y-2">
                  {cards.map((card) => (
                    <CardRow key={card.id} card={card} sourceId={id!} />
                  ))}
                </ul>

                {/* Add card — only for manual decks */}
                {source.type === 'manual' && deck && (
                  <AddCardRow deckId={deck.id} sourceId={id!} />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete source?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">
            This will permanently delete "{source.title}" and all its flashcards. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteSource.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}

function CardRow({ card, sourceId }: { card: CardSchema; sourceId: string }) {
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [frontImage, setFrontImage] = useState<string | null>(card.frontImage ?? null);
  const [backImage, setBackImage] = useState<string | null>(card.backImage ?? null);
  const { toast } = useToast();
  const patchCard = usePatchCard(sourceId);
  const deleteCard = useDeleteCard(sourceId);

  async function saveEdit() {
    if (!front.trim() || !back.trim()) return;
    try {
      await patchCard.mutateAsync({ id: card.id, front: front.trim(), back: back.trim(), frontImage, backImage });
      setEditing(false);
    } catch {
      toast({ title: 'Failed to save card', variant: 'destructive' });
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteCard.mutateAsync(card.id);
    } catch {
      toast({ title: 'Failed to delete card', variant: 'destructive' });
    }
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-accent bg-surface p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">Term</span>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={3}
              autoFocus
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
            <ImagePicker value={frontImage} onChange={setFrontImage} side="front" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">Definition</span>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
            <ImagePicker value={backImage} onChange={setBackImage} side="back" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={saveEdit} disabled={patchCard.isPending}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setFront(card.front); setBack(card.back); setFrontImage(card.frontImage ?? null); setBackImage(card.backImage ?? null); setEditing(false); }}>Cancel</Button>
        </div>
      </li>
    );
  }

  return (
    <li
      className="group relative rounded-xl border border-border bg-surface cursor-pointer hover:border-accent/50 transition-colors overflow-hidden"
      onClick={() => setFlipped((f) => !f)}
      style={{ perspective: 800 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={flipped ? 'back' : 'front'}
          initial={{ rotateX: flipped ? -90 : 90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: flipped ? 90 : -90, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-start gap-4 px-5 py-4 min-h-[72px]"
        >
          <span className={`text-xs font-semibold uppercase tracking-widest flex-shrink-0 pt-0.5 w-16 ${flipped ? 'text-accent' : 'text-muted'}`}>
            {flipped ? 'Def' : 'Term'}
          </span>
          <div className="flex-1 space-y-2">
            <span className={`leading-relaxed ${flipped ? 'text-sm text-fg' : 'font-serif text-base text-fg'}`}>
              {flipped ? card.back : card.front}
            </span>
            {flipped && card.backImage && (
              <img src={card.backImage} alt="" className="max-h-32 rounded-lg object-contain border border-border" />
            )}
            {!flipped && card.frontImage && (
              <img src={card.frontImage} alt="" className="max-h-32 rounded-lg object-contain border border-border" />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="p-1 rounded text-muted hover:text-fg transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteCard.isPending}
          className="p-1 rounded text-muted hover:text-warn transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function AddCardRow({ deckId, sourceId }: { deckId: string; sourceId: string }) {
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const { toast } = useToast();
  const addCard = useAddCard();

  function reset() { setFront(''); setBack(''); setFrontImage(null); setBackImage(null); setOpen(false); }

  async function save() {
    if (!front.trim() || !back.trim()) return;
    try {
      await addCard.mutateAsync({ deckId, front: front.trim(), back: back.trim(), frontImage, backImage });
      reset();
    } catch {
      toast({ title: 'Failed to add card', variant: 'destructive' });
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted hover:border-accent hover:text-accent transition-colors"
      >
        <Plus className="h-4 w-4" /> Add card
      </button>
    );
  }

  return (
    <li className="mt-2 rounded-xl border border-accent bg-surface p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">Term</span>
          <textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Enter term"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
          <ImagePicker value={frontImage} onChange={setFrontImage} side="front" />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">Definition</span>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={3}
            placeholder="Enter definition"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
          <ImagePicker value={backImage} onChange={setBackImage} side="back" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={addCard.isPending || !front.trim() || !back.trim()}>Add</Button>
        <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
      </div>
    </li>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-4 w-40" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}
