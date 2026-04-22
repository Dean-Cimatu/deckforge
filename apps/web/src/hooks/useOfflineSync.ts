import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getPendingReviews, clearPendingReviews } from '@/lib/offlineQueue';

export function useOfflineSync() {
  const qc = useQueryClient();

  useEffect(() => {
    async function flush() {
      if (!navigator.onLine) return;
      const queue = await getPendingReviews();
      if (queue.length === 0) return;

      const results = await Promise.allSettled(
        queue.map((r) =>
          api.post(`/cards/${r.cardId}/review`, { grade: r.grade }),
        ),
      );

      const allOk = results.every((r) => r.status === 'fulfilled');
      if (allOk) {
        await clearPendingReviews();
        qc.invalidateQueries({ queryKey: ['review-queue'] });
        qc.invalidateQueries({ queryKey: ['due'] });
      }
    }

    window.addEventListener('online', flush);
    flush(); // also try immediately in case we're already online
    return () => window.removeEventListener('online', flush);
  }, [qc]);
}
