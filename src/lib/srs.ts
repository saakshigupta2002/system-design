/**
 * Lightweight SM-2-style spaced-repetition scheduler for drills. A three-button
 * grade (Again / Good / Easy) updates an ease factor and the next interval, so
 * cards you know well come back rarely and ones you miss come back soon.
 */

export type ReviewGrade = "again" | "good" | "easy";

export interface SrsRecord {
  /** Ease factor (≥ 1.3); higher = intervals grow faster. */
  ease: number;
  /** Current interval in days. */
  intervalDays: number;
  /** Consecutive successful reviews. */
  reps: number;
  /** Epoch ms when this card is next due. */
  due: number;
  /** Epoch ms of the last review. */
  last: number;
}

const DAY = 86_400_000;
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

/** Compute the next schedule from the previous record (or undefined for a new
 *  card) and the grade. */
export function schedule(prev: SrsRecord | undefined, grade: ReviewGrade, now = Date.now()): SrsRecord {
  const prevEase = prev?.ease ?? DEFAULT_EASE;
  const prevReps = prev?.reps ?? 0;
  const prevInterval = prev?.intervalDays ?? 0;

  let ease = prevEase;
  let reps: number;
  let intervalDays: number;

  if (grade === "again") {
    reps = 0;
    intervalDays = 0; // due again immediately
    ease = Math.max(MIN_EASE, prevEase - 0.2);
  } else {
    reps = prevReps + 1;
    if (grade === "easy") ease = prevEase + 0.15;
    if (reps === 1) intervalDays = grade === "easy" ? 3 : 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.round(prevInterval * ease * (grade === "easy" ? 1.3 : 1));
    intervalDays = Math.max(1, intervalDays);
  }

  return { ease, intervalDays, reps, due: now + intervalDays * DAY, last: now };
}

/** A scheduled card is "due" once its due time has passed. New (unseen) cards
 *  are not counted as due — they're handled separately as "new". */
export function isDue(rec: SrsRecord | undefined, now = Date.now()): boolean {
  return !!rec && rec.due <= now;
}

/** A card counts as "learned" once it has at least one successful review. */
export function isLearned(rec: SrsRecord | undefined): boolean {
  return !!rec && rec.reps > 0;
}
