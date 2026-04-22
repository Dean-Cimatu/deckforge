import { useState } from 'react';
import { Copy, Trash2, Plus, Check } from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from '@/hooks/useApiKeys';
import { useToast } from '@/hooks/use-toast';
import { relativeTime } from '@/lib/relativeTime';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function SettingsPage() {
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const deleteKey = useDeleteApiKey();
  const { toast } = useToast();

  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    try {
      const result = await createKey.mutateAsync(newKeyName.trim());
      setRevealedKey(result.key);
      setNewKeyName('');
    } catch {
      toast({ title: 'Failed to create API key', variant: 'destructive' });
    }
  }

  async function handleCopy() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete(id: string) {
    try {
      await deleteKey.mutateAsync(id);
      setConfirmDeleteId(null);
    } catch {
      toast({ title: 'Failed to revoke key', variant: 'destructive' });
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-serif text-4xl text-fg">Settings</h1>

        {/* API Keys */}
        <section className="mt-12">
          <h2 className="font-serif text-2xl text-fg">API Keys</h2>
          <p className="mt-2 text-sm text-muted">
            Use API keys to access DeckForge programmatically via{' '}
            <code className="text-xs bg-surface px-1 py-0.5 rounded">/api/v1</code>.
          </p>

          {/* Create form */}
          <div className="mt-6 flex gap-3">
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Key name (e.g. My Script)"
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <Button onClick={handleCreate} disabled={createKey.isPending || !newKeyName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Create
            </Button>
          </div>

          {/* Key list */}
          <div className="mt-6 divide-y divide-border rounded-xl border border-border overflow-hidden">
            {isLoading && (
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            )}
            {!isLoading && (!keys || keys.length === 0) && (
              <p className="px-4 py-6 text-sm text-muted text-center">No API keys yet.</p>
            )}
            {keys?.map((k) => (
              <div key={k.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-surface">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{k.name}</p>
                  <p className="text-xs text-muted font-mono mt-0.5">{k.prefix}…</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted">
                    {k.lastUsedAt ? `Used ${relativeTime(k.lastUsedAt)}` : 'Never used'}
                  </p>
                  <p className="text-xs text-muted">Created {relativeTime(k.createdAt)}</p>
                </div>
                <button
                  onClick={() => setConfirmDeleteId(k.id)}
                  className="p-1.5 rounded text-muted hover:text-warn transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* API reference hint */}
        <section className="mt-12">
          <h2 className="font-serif text-2xl text-fg">API Reference</h2>
          <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm font-mono text-muted space-y-1">
            <p>GET  /api/v1/sources</p>
            <p>GET  /api/v1/decks</p>
            <p>GET  /api/v1/review/queue</p>
            <p>POST /api/v1/cards/:id/review  {"{"} grade: 0|3|4|5 {"}"}</p>
          </div>
          <p className="mt-2 text-xs text-muted">
            Pass your key as <code className="bg-surface px-1 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code>
          </p>
        </section>
      </div>

      {/* Revealed key dialog */}
      <Dialog open={Boolean(revealedKey)} onOpenChange={(open) => { if (!open) { setRevealedKey(null); setCopied(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">Copy it now — you won't be able to see it again.</p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
            <code className="flex-1 text-xs text-fg break-all font-mono">{revealedKey}</code>
            <button onClick={handleCopy} className="flex-shrink-0 text-muted hover:text-fg transition-colors">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <DialogFooter>
            <Button onClick={() => { setRevealedKey(null); setCopied(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm revoke dialog */}
      <Dialog open={Boolean(confirmDeleteId)} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API key?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">Any scripts using this key will stop working immediately.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteKey.isPending}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
