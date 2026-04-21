import { describe, it, expect } from 'vitest';
import { applyReview, previewIntervals, SM2_INITIAL } from './sm2';
import type { SM2State } from './sm2';

const NOW = new Date('2025-01-01T00:00:00Z');

describe('applyReview', () => {
  it('grade 0 resets repetitions and sets interval to 1', () => {
    const state: SM2State = { interval: 10, easeFactor: 2.5, repetitions: 3 };
    const { next } = applyReview(state, 0, NOW);
    expect(next.repetitions).toBe(0);
    expect(next.interval).toBe(1);
  });

  it('first correct repetition sets interval to 1', () => {
    const { next } = applyReview(SM2_INITIAL, 4, NOW);
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(1);
  });

  it('second correct repetition sets interval to 6', () => {
    const state: SM2State = { interval: 1, easeFactor: 2.5, repetitions: 1 };
    const { next } = applyReview(state, 4, NOW);
    expect(next.interval).toBe(6);
    expect(next.repetitions).toBe(2);
  });

  it('third repetition multiplies interval by easeFactor', () => {
    const state: SM2State = { interval: 6, easeFactor: 2.5, repetitions: 2 };
    const { next } = applyReview(state, 4, NOW);
    expect(next.interval).toBe(Math.round(6 * 2.5));
    expect(next.repetitions).toBe(3);
  });

  it('grade 5 increases easeFactor', () => {
    const { next } = applyReview(SM2_INITIAL, 5, NOW);
    expect(next.easeFactor).toBeGreaterThan(2.5);
  });

  it('grade 3 decreases easeFactor', () => {
    const { next } = applyReview(SM2_INITIAL, 3, NOW);
    expect(next.easeFactor).toBeLessThan(2.5);
  });

  it('easeFactor never drops below 1.3', () => {
    let state = SM2_INITIAL;
    for (let i = 0; i < 10; i++) {
      state = applyReview(state, 3, NOW).next;
    }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('nextReviewAt is interval days after now', () => {
    const { next, nextReviewAt } = applyReview(SM2_INITIAL, 4, NOW);
    const expected = new Date(NOW.getTime() + next.interval * 24 * 60 * 60 * 1000);
    expect(nextReviewAt.getTime()).toBe(expected.getTime());
  });
});

describe('previewIntervals', () => {
  it('returns intervals for all four grades', () => {
    const preview = previewIntervals(SM2_INITIAL);
    expect(preview[0]).toBe(1);
    expect(preview[3]).toBeGreaterThanOrEqual(1);
    expect(preview[4]).toBeGreaterThanOrEqual(preview[3]);
    expect(preview[5]).toBeGreaterThanOrEqual(preview[4]);
  });
});
