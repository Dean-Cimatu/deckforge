import { get, set } from 'idb-keyval';

export interface PendingReview {
  cardId: string;
  grade: number;
  queuedAt: number;
}

const QUEUE_KEY = 'df_pending_reviews';

export async function enqueueReview(cardId: string, grade: number): Promise<void> {
  const existing = (await get<PendingReview[]>(QUEUE_KEY)) ?? [];
  // Replace any existing entry for the same card
  const filtered = existing.filter((r) => r.cardId !== cardId);
  await set(QUEUE_KEY, [...filtered, { cardId, grade, queuedAt: Date.now() }]);
}

export async function getPendingReviews(): Promise<PendingReview[]> {
  return (await get<PendingReview[]>(QUEUE_KEY)) ?? [];
}

export async function clearPendingReviews(): Promise<void> {
  await set(QUEUE_KEY, []);
}
