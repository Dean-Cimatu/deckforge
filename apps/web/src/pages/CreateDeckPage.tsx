import { useState, useRef, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateManualDeck } from '@/hooks/useSources';
import { useToast } from '@/hooks/use-toast';
import { useLang } from '@/i18n';
import { SUPPORTED_LANGUAGES } from '@deckforge/shared';
import type { LanguageCode } from '@deckforge/shared';

interface CardDraft {
  key: string;
  front: string;
  back: string;
}

function emptyCard(): CardDraft {
  return { key: crypto.randomUUID(), front: '', back: '' };
}

export default function CreateDeckPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLang();
  const create = useCreateManualDeck();

  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('original');
  const [cards, setCards] = useState<CardDraft[]>([emptyCard(), emptyCard(), emptyCard()]);
  const bottomRef = useRef<HTMLDivElement>(null);

  function updateCard(key: string, field: 'front' | 'back', value: string) {
    setCards((prev) => prev.map((c) => c.key === key ? { ...c, [field]: value } : c));
  }

  function deleteCard(key: string) {
    setCards((prev) => prev.length > 1 ? prev.filter((c) => c.key !== key) : prev);
  }

  function addCard() {
    setCards((prev) => [...prev, emptyCard()]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
  const canSave = title.trim() && validCards.length >= 1;

  async function handleSave() {
    if (!canSave) return;
    try {
      const result = await create.mutateAsync({
        title: title.trim(),
        cards: validCards.map((c) => ({ front: c.front.trim(), back: c.back.trim() })),
        language,
      });
      navigate(`/sources/${result.id}`);
    } catch {
      toast({ title: 'Failed to create deck', variant: 'destructive' });
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-4xl text-fg">Create a deck</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={!canSave || create.isPending}>
              {create.isPending ? t.common.generating : t.common.create}
            </Button>
          </div>
        </div>

        {/* Title + language */}
        <div className="rounded-xl border border-border bg-surface p-6 space-y-4 mb-6">
          <div>
            <Label htmlFor="deck-title">Title</Label>
            <Input
              id="deck-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cardiovascular System"
              className="mt-1 text-lg"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="deck-lang">{t.modal.flashcardLanguage}</Label>
            <select
              id="deck-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Card count hint */}
        <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">
          {validCards.length} {validCards.length === 1 ? 'card' : 'cards'}
          {cards.length > validCards.length && ` · ${cards.length - validCards.length} empty (won't be saved)`}
        </p>

        {/* Card list */}
        <div className="space-y-3">
          {cards.map((card, i) => (
            <CardEditor
              key={card.key}
              index={i + 1}
              card={card}
              onChange={(field, val) => updateCard(card.key, field, val)}
              onDelete={() => deleteCard(card.key)}
              canDelete={cards.length > 1}
            />
          ))}
        </div>

        {/* Add card */}
        <button
          onClick={addCard}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted hover:border-accent hover:text-accent transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add card
        </button>

        <div ref={bottomRef} />

        {/* Bottom save */}
        <div className="mt-8 flex justify-end">
          <Button onClick={handleSave} disabled={!canSave || create.isPending} size="lg">
            {create.isPending ? t.common.generating : `Save deck (${validCards.length} cards)`}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CardEditorProps {
  index: number;
  card: CardDraft;
  onChange: (field: 'front' | 'back', value: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function CardEditor({ index, card, onChange, onDelete, canDelete }: CardEditorProps) {
  const isEmpty = !card.front.trim() && !card.back.trim();

  return (
    <div className={`rounded-xl border bg-surface transition-colors ${isEmpty ? 'border-border' : 'border-accent/30'}`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <span className="text-xs font-semibold text-muted tabular-nums">{index}</span>
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-1 rounded text-muted hover:text-warn transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Front / Back */}
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="p-4 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">Term</span>
          <textarea
            value={card.front}
            onChange={(e) => onChange('front', e.target.value)}
            placeholder="Enter term"
            rows={3}
            className="w-full bg-transparent text-sm text-fg placeholder:text-muted resize-none focus:outline-none"
          />
        </div>
        <div className="p-4 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">Definition</span>
          <textarea
            value={card.back}
            onChange={(e) => onChange('back', e.target.value)}
            placeholder="Enter definition"
            rows={3}
            className="w-full bg-transparent text-sm text-fg placeholder:text-muted resize-none focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
