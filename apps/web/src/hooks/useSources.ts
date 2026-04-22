import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SourceSchema, DeckSchema, CardSchema } from '@deckforge/shared';

export interface SourceDetail {
  source: SourceSchema;
  deck: DeckSchema | null;
  cards: CardSchema[];
  isOwner: boolean;
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

export interface DeckCardsResponse {
  deck: DeckSchema;
  cards: CardSchema[];
}

export function useDeckCards(deckId: string | undefined) {
  return useQuery<DeckCardsResponse>({
    queryKey: ['deck-cards', deckId],
    queryFn: () => api.get<DeckCardsResponse>(`/decks/${deckId}/cards`),
    enabled: Boolean(deckId),
  });
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

export function usePatchCard(sourceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, front, back, frontImage, backImage, tags, suspended }: { id: string; front?: string; back?: string; frontImage?: string | null; backImage?: string | null; tags?: string[]; suspended?: boolean }) =>
      api.patch(`/cards/${id}`, {
        ...(front !== undefined && { front }),
        ...(back !== undefined && { back }),
        ...(frontImage !== undefined && { frontImage }),
        ...(backImage !== undefined && { backImage }),
        ...(tags !== undefined && { tags }),
        ...(suspended !== undefined && { suspended }),
      }),
    onSuccess: () => {
      if (sourceId) qc.invalidateQueries({ queryKey: ['source', sourceId] });
      qc.invalidateQueries({ queryKey: ['deck-cards'] });
    },
  });
}

export function useDeleteCard(sourceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cards/${id}`),
    onSuccess: () => {
      if (sourceId) qc.invalidateQueries({ queryKey: ['source', sourceId] });
      qc.invalidateQueries({ queryKey: ['deck-cards'] });
    },
  });
}

export function useCreateManualDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; cards: { front: string; back: string }[]; language?: string }) =>
      api.post<{ id: string; status: string }>('/sources/manual', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });
}

export function useAddCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deckId, front, back, frontImage, backImage, tags }: { deckId: string; front: string; back: string; frontImage?: string | null; backImage?: string | null; tags?: string[] }) =>
      api.post(`/cards`, { deckId, front, back, ...(frontImage ? { frontImage } : {}), ...(backImage ? { backImage } : {}), ...(tags ? { tags } : {}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deck-cards'] });
      qc.invalidateQueries({ queryKey: ['source'] });
    },
  });
}

export function useShareDeck(sourceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deckId: string) => api.post<{ shareId: string; isPublic: boolean }>(`/share/${deckId}`, {}),
    onSuccess: () => { if (sourceId) qc.invalidateQueries({ queryKey: ['source', sourceId] }); },
  });
}

export function useUnshareDeck(sourceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deckId: string) => api.delete<{ isPublic: boolean }>(`/share/${deckId}`),
    onSuccess: () => { if (sourceId) qc.invalidateQueries({ queryKey: ['source', sourceId] }); },
  });
}

export function usePublicDeck(shareId: string | undefined) {
  return useQuery<{ deck: { id: string; title: string; cardCount: number; shareId: string; language: string; createdAt: string }; cards: { id: string; front: string; back: string; frontImage?: string | null; backImage?: string | null }[] }>({
    queryKey: ['public-deck', shareId],
    queryFn: () => api.get(`/share/${shareId}`),
    enabled: Boolean(shareId),
  });
}

export interface SharedDeckEntry {
  deck: DeckSchema;
  source: SourceSchema | null;
}

export function useSharedDecks() {
  return useQuery<{ decks: SharedDeckEntry[] }>({
    queryKey: ['shared-with-me'],
    queryFn: () => api.get('/decks/shared-with-me'),
  });
}

export interface CollaboratorEntry {
  id: string;
  email: string;
}

export function useCollaborators(deckId: string | undefined) {
  return useQuery<{ collaborators: CollaboratorEntry[] }>({
    queryKey: ['collaborators', deckId],
    queryFn: () => api.get(`/decks/${deckId}/collaborators`),
    enabled: Boolean(deckId),
  });
}

export function useAddCollaborator(deckId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      api.post<CollaboratorEntry>(`/decks/${deckId}/collaborators`, { email }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collaborators', deckId] }),
  });
}

export function useRemoveCollaborator(deckId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (collaboratorId: string) =>
      api.delete(`/decks/${deckId}/collaborators/${collaboratorId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collaborators', deckId] }),
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
      type: 'text' | 'pdf' | 'image' | 'images' | 'youtube' | 'url';
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
