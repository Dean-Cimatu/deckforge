import { Youtube, Globe, LayoutGrid } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SourceType } from '@deckforge/shared';

const LABELS: Record<SourceType, string> = {
  text: 'Text',
  pdf: 'PDF',
  image: 'Image',
  images: 'Images',
  youtube: 'YouTube',
  url: 'Article',
  manual: 'Deck',
};

interface Props {
  type: SourceType;
}

export function SourceTypeBadge({ type }: Props) {
  if (type === 'youtube') {
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-red-500 border-red-300 dark:border-red-800">
        <Youtube className="h-3 w-3" />
        YouTube
      </Badge>
    );
  }

  if (type === 'url') {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Globe className="h-3 w-3" />
        Article
      </Badge>
    );
  }

  if (type === 'manual') {
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-accent border-accent/40">
        <LayoutGrid className="h-3 w-3" />
        Deck
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="capitalize">
      {LABELS[type] ?? type}
    </Badge>
  );
}
