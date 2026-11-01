// Streak replay (PRD 14.11): no stored streak state, always recomputed from ActivityDays.
import { addDays, daysBetween } from './dates';

export interface DayCounts {
  solved: number;
  attempted: number;
  reviews: number;
  quizzes: number;
}

export const isActive = (d: DayCounts | undefined, minReviews: number) =>
  !!d && (d.solved >= 1 || d.attempted >= 1 || d.reviews >= minReviews || d.quizzes >= 5);

export interface StreakResult {
  streak: number;
  longest: number;
  freezes: number;
  frozenDays: string[];
}

export function computeStreak(days: ReadonlyMap<string, DayCounts>, today: string, minReviews = 5): StreakResult {
  const active = [...days].filter(([k, d]) => k <= today && isActive(d, minReviews)).map(([k]) => k).sort();
  const out: StreakResult = { streak: 0, longest: 0, freezes: 0, frozenDays: [] };
  if (active.length === 0) return out;
  const span = daysBetween(active[0]!, today);
  for (let i = 0; i <= span; i++) {
    const k = addDays(active[0]!, i);
    if (isActive(days.get(k), minReviews)) {
      out.streak++;
      out.longest = Math.max(out.longest, out.streak);
      if (out.streak % 7 === 0) out.freezes = Math.min(2, out.freezes + 1);
    } else if (k === today) {
      // today is not over yet, so it cannot break the streak
    } else if (out.freezes > 0) {
      out.freezes--;
      out.frozenDays.push(k);
    } else out.streak = 0;
  }
  return out;
}
