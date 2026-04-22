import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SourceSchema, DeckSchema, CardSchema } from '@deckforge/shared';

export interface SourceDetail {
  source: SourceSchema;
  deck: DeckSchema | null;
  cards: CardSchema[];
}

export interface SourceListResponse {
  sources: SourceSchema[];
  total: number;
  page: number;
}

export function useSource(id: string) {
  return useQuery<SourceDetail>({
    queryKey: ['source', id],
    queryFn: () => api.get<SourceDetail>(`/sources/${id}`),
    refetchInterval: (query) => {
      const status = query.state.data?.source.status;
      return status === 'processing' ? 2000 : false;
    },
    enabled: Boolean(id),
  });
}

export function useSources(opts: { type?: string; page?: number; q?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.q) params.set('q', opts.q);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();

  return useQuery<SourceListResponse>({
    queryKey: ['sources', opts],
    queryFn: () => api.get<SourceListResponse>(`/sources${qs ? `?${qs}` : ''}`),
  });
}

export interface DueSummary {
  totalDue: number;
  byDeck: { deckId: string; sourceId: string; title: string; dueCount: number }[];
}

export function useDueSummary() {
  return useQuery<DueSummary>({
    queryKey: ['due'],
    queryFn: () => api.get<DueSummary>('/due'),
    staleTime: 30_000,
  });
}

export function useRecentSources() {
  return useSources({ limit: 3 });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });
}

export function usePatchSource(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; summary?: string }) =>
      api.patch<SourceDetail>(`/sources/${id}`, body),
    onSuccess: (data) => {
      qc.setQueryData(['source', id], data);
      qc.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

export interface ReviewQueueResponse {
  cards: CardSchema[];
  total: number;
}

export function useReviewQueue(deckId?: string) {
  const qs = deckId ? `?deckId=${deckId}` : '';
  return useQuery<ReviewQueueResponse>({
    queryKey: ['review-queue', deckId],
    queryFn: () => api.get<ReviewQueueResponse>(`/review/queue${qs}`),
  });
}

export function useReviewCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, grade }: { id: string; grade: number }) =>
      api.post<{ interval: number; nextReviewAt: string }>(`/cards/${id}/review`, { grade }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-queue'] });
      qc.invalidateQueries({ queryKey: ['due'] });
    },
  });
}

export function usePatchCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, front, back }: { id: string; front?: string; back?: string }) =>
      api.patch(`/cards/${id}`, { ...(front !== undefined && { front }), ...(back !== undefined && { back }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['source'] }),
  });
}

export function useCreateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      formData,
      body,
    }: {
      type: 'text' | 'pdf' | 'image' | 'youtube' | 'url';
      formData?: FormData;
      body?: unknown;
    }) => {
      if (formData) {
        return api.post<{ id: string; status: string }>(`/sources/${type}`, formData);
      }
      return api.post<{ id: string; status: string }>(`/sources/${type}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });
}
