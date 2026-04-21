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

export function useSources(opts: { type?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  if (opts.page) params.set('page', String(opts.page));
  const qs = params.toString();

  return useQuery<SourceListResponse>({
    queryKey: ['sources', opts],
    queryFn: () => api.get<SourceListResponse>(`/sources${qs ? `?${qs}` : ''}`),
  });
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

export function useCreateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      formData,
      body,
    }: {
      type: 'text' | 'pdf' | 'image';
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
