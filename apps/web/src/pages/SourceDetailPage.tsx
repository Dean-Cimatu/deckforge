import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useSource, useDeleteSource, usePatchSource } from '@/hooks/useSources';
import { Badge } from '@/components/ui/badge';
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
            <Badge variant="outline" className="capitalize">{source.type}</Badge>
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
            <div className="sticky top-0 z-10 flex items-center justify-between bg-bg py-3 border-b border-border">
              <span className="text-sm font-medium text-fg">{cards.length} cards</span>
            </div>
            {cards.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No flashcards generated.</p>
            ) : (
              <ul className="divide-y divide-border">
                {cards.map((card) => (
                  <CardRow key={card.id} card={card} sourceId={id!} />
                ))}
              </ul>
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
  );
}

function CardRow({ card }: { card: CardSchema; sourceId: string }) {
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  if (editing) {
    return (
      <li className="py-4 space-y-2">
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          rows={2}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          placeholder="Front"
        />
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          rows={2}
          className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          placeholder="Back"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setEditing(false)}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setFront(card.front); setBack(card.back); setEditing(false); }}>Cancel</Button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-start justify-between gap-4 py-4">
      <span className="font-serif text-lg font-medium text-fg flex-1">{card.front}</span>
      <span className="text-base text-muted max-w-lg flex-1">{card.back}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded text-muted hover:text-fg transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
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
