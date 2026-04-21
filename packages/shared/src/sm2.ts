export type Grade = 0 | 3 | 4 | 5;

export interface SM2State {
  interval: number;   // days until next review
  easeFactor: number; // EF, starts at 2.5
  repetitions: number;
}

export const SM2_INITIAL: SM2State = {
  interval: 1,
  easeFactor: 2.5,
  repetitions: 0,
};

export function applyReview(
  state: SM2State,
  grade: Grade,
  now: Date = new Date(),
): { next: SM2State; nextReviewAt: Date } {
  let { interval, easeFactor, repetitions } = state;

  if (grade < 3) {
    // Failed — reset repetitions and interval
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  }

  const nextReviewAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    next: { interval, easeFactor, repetitions },
    nextReviewAt,
  };
}

export function previewIntervals(state: SM2State): Record<Grade, number> {
  return {
    0: applyReview(state, 0).next.interval,
    3: applyReview(state, 3).next.interval,
    4: applyReview(state, 4).next.interval,
    5: applyReview(state, 5).next.interval,
  };
}
