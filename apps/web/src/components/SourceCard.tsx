import { Link } from 'react-router-dom';
import { FileText, Image, Globe } from 'lucide-react';
import { SourceTypeBadge } from './SourceTypeBadge';
import type { SourceSchema } from '@deckforge/shared';

interface Props {
  source: SourceSchema;
  cardCount?: number;
  dueCount?: number;
}

export function SourceCard({ source, cardCount, dueCount }: Props) {
  return (
    <Link
      to={`/sources/${source.id}`}
      className="group block rounded-xl border border-border bg-surface hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
    >
      <div className="h-36 rounded-t-xl bg-bg flex items-center justify-center overflow-hidden">
        <Thumbnail source={source} />
      </div>
      <div className="p-5">
        <p className="font-serif text-lg text-fg line-clamp-2">{source.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <SourceTypeBadge type={source.type} />
          {cardCount !== undefined && <span>{cardCount} cards</span>}
          {dueCount !== undefined && dueCount > 0 && (
            <span className="text-accent font-medium">· {dueCount} due</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Thumbnail({ source }: { source: SourceSchema }) {
  if (source.type === 'text') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-amber-50 dark:bg-amber-950/20">
        <span className="font-serif text-6xl font-bold text-accent/50 select-none">
          {source.title.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  if (source.type === 'pdf') {
    return <FileText className="h-12 w-12 text-muted" />;
  }

  if (source.type === 'image' || source.type === 'images') {
    return <Image className="h-12 w-12 text-muted" />;
  }

  if (source.type === 'youtube') {
    const videoId = (source.inputMeta as { videoId?: string }).videoId;
    if (videoId) {
      return (
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt={source.title}
          className="h-full w-full object-cover rounded-t-xl"
        />
      );
    }
    return <Globe className="h-12 w-12 text-muted" />;
  }

  if (source.type === 'url') {
    const url = (source.inputMeta as { url?: string }).url;
    let hostname = '';
    try { hostname = new URL(url ?? '').hostname; } catch { /* ignore */ }
    return (
      <div className="flex flex-col items-center gap-1 text-muted">
        <Globe className="h-10 w-10" />
        {hostname && <span className="text-xs">{hostname}</span>}
      </div>
    );
  }

  return <FileText className="h-12 w-12 text-muted" />;
}
