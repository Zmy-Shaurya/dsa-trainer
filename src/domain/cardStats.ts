// Review statistics for the Review page and, later, /progress (PRD §14.8).
export interface LogLite {
  at: string;
  rating: 1 | 2 | 3 | 4;
}
export interface CardLite {
  due: string;
  state: 0 | 1 | 2 | 3;
  suspended: boolean;
}

const DAY = 86_400_000;

/** Reviews per local day for the last `days` days, oldest first. */
export function reviewsPerDay(logs: LogLite[], now: Date, days: number, dayKeyOf: (d: Date) => string) {
  const counts = new Map<string, number>();
  for (const l of logs) counts.set(dayKeyOf(new Date(l.at)), (counts.get(dayKeyOf(new Date(l.at))) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const date = dayKeyOf(new Date(now.getTime() - (days - 1 - i) * DAY));
    return { date, count: counts.get(date) ?? 0 };
  });
}

/** Good + Easy over all reviews in the window; null when there are none. */
export function retentionRate(logs: LogLite[], now: Date, days = 30): number | null {
  const since = now.getTime() - days * DAY;
  const recent = logs.filter((l) => new Date(l.at).getTime() >= since);
  return recent.length ? recent.filter((l) => l.rating >= 3).length / recent.length : null;
}

export const countByState = (cards: CardLite[]) => ({
  new: cards.filter((c) => c.state === 0).length,
  learning: cards.filter((c) => c.state === 1 || c.state === 3).length,
  review: cards.filter((c) => c.state === 2).length,
  suspended: cards.filter((c) => c.suspended).length,
});

/** Cards due on each of the next `days` days; overdue cards count toward today. */
export function forecast(cards: CardLite[], now: Date, days = 30): number[] {
  const out = Array.from({ length: days }, () => 0);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  for (const c of cards) {
    if (c.suspended || c.state === 0) continue;
    const d = Math.floor((new Date(c.due).getTime() - start.getTime()) / DAY);
    if (d < days) out[Math.max(0, d)]!++;
  }
  return out;
}
