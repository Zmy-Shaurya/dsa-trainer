// Weekly goal (PRD 14.11): problems solved + card reviews per calendar week.
import { addDays, weekStartKey } from './dates';

export interface WeekCounts {
  solved: number;
  reviews: number;
}

export interface Goal {
  problems: number;
  reviews: number;
}

export function weekTotals(days: ReadonlyMap<string, WeekCounts>, weekStart: string): WeekCounts {
  let solved = 0;
  let reviews = 0;
  for (let i = 0; i < 7; i++) {
    const d = days.get(addDays(weekStart, i));
    solved += d?.solved ?? 0;
    reviews += d?.reviews ?? 0;
  }
  return { solved, reviews };
}

export const goalMet = (t: WeekCounts, g: Goal) => t.solved >= g.problems && t.reviews >= g.reviews;

/** Consecutive goal-met weeks ending now (the current week counts once met, otherwise the run ends last week). */
export function perfectWeekRun(
  days: ReadonlyMap<string, WeekCounts>, today: string, g: Goal, weekStart: 'monday' | 'sunday' = 'monday',
): number {
  const thisWeek = weekStartKey(today, weekStart);
  let run = 0;
  let w = goalMet(weekTotals(days, thisWeek), g) ? thisWeek : addDays(thisWeek, -7);
  while (goalMet(weekTotals(days, w), g)) {
    run++;
    w = addDays(w, -7);
  }
  return run;
}

/** Longest run of consecutive goal-met weeks anywhere in history. */
export function bestWeekRun(
  days: ReadonlyMap<string, WeekCounts>, today: string, g: Goal, weekStart: 'monday' | 'sunday' = 'monday',
): number {
  const keys = [...days.keys()].sort();
  if (!keys.length) return 0;
  let best = 0;
  let run = 0;
  for (let w = weekStartKey(keys[0]!, weekStart); w <= today; w = addDays(w, 7)) {
    run = goalMet(weekTotals(days, w), g) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
