import { useState, useRef, useCallback } from 'react';
import { ImagePlus, Link, X, Loader } from 'lucide-react';
import { compressImage } from '@/lib/compressImage';

interface Props {
  value: string | null | undefined;
  onChange: (val: string | null) => void;
  side: 'front' | 'back';
}

export function ImagePicker({ value, onChange, side }: Props) {
  const [mode, setMode] = useState<'idle' | 'url'>('idle');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('File must be an image'); return; }
    setLoading(true); setError('');
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
      setMode('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load image');
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) handleFile(file);
    }
  }, [handleFile]);

  const handleUrlConfirm = () => {
    const u = urlInput.trim();
    if (!u) return;
    if (!u.startsWith('http://') && !u.startsWith('https://')) { setError('Must be an http(s) URL'); return; }
    onChange(u);
    setUrlInput('');
    setMode('idle');
    setError('');
  };

  if (value) {
    return (
      <div className="relative mt-2 group">
        <img
          src={value}
          alt={`${side} image`}
          className="w-full max-h-40 object-contain rounded-lg border border-border bg-bg"
        />
        <button
          onClick={() => onChange(null)}
          className="absolute top-1 right-1 p-1 rounded-full bg-bg/80 text-muted hover:text-warn opacity-0 group-hover:opacity-100 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div onPaste={handlePaste}>
      {mode === 'url' ? (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUrlConfirm(); if (e.key === 'Escape') setMode('idle'); }}
            placeholder="https://..."
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button onClick={handleUrlConfirm} className="text-xs text-accent font-medium hover:underline">Add</button>
          <button onClick={() => { setMode('idle'); setError(''); }} className="text-xs text-muted hover:text-fg">Cancel</button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          {loading ? (
            <Loader className="h-4 w-4 animate-spin text-muted" />
          ) : (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                title="Upload or paste image"
                className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
              >
                <ImagePlus className="h-4 w-4" />
                <span>Image</span>
              </button>
              <span className="text-muted/40 text-xs">·</span>
              <button
                onClick={() => { setMode('url'); setError(''); }}
                className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
              >
                <Link className="h-3.5 w-3.5" />
                <span>URL</span>
              </button>
              <span className="text-muted/40 text-xs">· Ctrl+V to paste</span>
            </>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-warn">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}
