import { describe, it, expect } from "vitest";
import { schedule, isDue, isLearned } from "./srs";

const NOW = 1_000_000_000_000;
const DAY = 86_400_000;

describe("srs.schedule", () => {
  it("schedules a new card 1 day out on first 'good'", () => {
    const r = schedule(undefined, "good", NOW);
    expect(r.reps).toBe(1);
    expect(r.intervalDays).toBe(1);
    expect(r.due).toBe(NOW + DAY);
  });

  it("grows the interval on successive successes", () => {
    let r = schedule(undefined, "good", NOW);
    r = schedule(r, "good", NOW); // reps 2 → 6 days
    expect(r.intervalDays).toBe(6);
    const prevInterval = r.intervalDays;
    r = schedule(r, "good", NOW); // reps 3 → interval * ease
    expect(r.intervalDays).toBeGreaterThan(prevInterval);
  });

  it("'again' resets the card and lowers ease", () => {
    let r = schedule(undefined, "easy", NOW);
    const easeBefore = r.ease;
    r = schedule(r, "again", NOW);
    expect(r.reps).toBe(0);
    expect(r.intervalDays).toBe(0);
    expect(r.ease).toBeLessThan(easeBefore);
    expect(r.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("'easy' grows faster than 'good'", () => {
    const good = schedule(schedule(schedule(undefined, "good", NOW), "good", NOW), "good", NOW);
    const easy = schedule(schedule(schedule(undefined, "easy", NOW), "easy", NOW), "easy", NOW);
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
  });

  it("isDue / isLearned reflect state", () => {
    expect(isDue(undefined, NOW)).toBe(false);
    expect(isLearned(undefined)).toBe(false);
    const r = schedule(undefined, "good", NOW);
    expect(isLearned(r)).toBe(true);
    expect(isDue(r, NOW)).toBe(false); // not yet
    expect(isDue(r, NOW + 2 * DAY)).toBe(true); // past due
  });
});
