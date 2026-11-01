// Problem resurfacing ladder (PRD 13.3). Pure: given a progress record and what just happened,
// returns the new { stage, nextAt }.
import type { ProgressRecord } from '../db/types';

export const INTERVALS = [3, 7, 14, 30, 60];
const DAY = 86_400_000;
const after = (now: Date, days: number) => new Date(now.getTime() + days * DAY).toISOString();

export interface Resurface {
  stage: number;
  nextAt: string | null;
}

type Fields = Pick<ProgressRecord, 'status' | 'confidence' | 'solveMode' | 'lastAttemptAt'>;

export function eligible(p: Fields, now: Date): boolean {
  if (p.status === 'solved')
    return p.confidence === 'need_review' || p.confidence === 'dont_understand' || p.solveMode === 'hint' || p.solveMode === 'solution';
  if (p.status === 'attempted') return !!p.lastAttemptAt && now.getTime() - new Date(p.lastAttemptAt).getTime() >= 2 * DAY;
  return false;
}

/** The ladder is finished once the stage runs past the last interval. */
export const finished = (r: Resurface) => r.stage >= INTERVALS.length;

/**
 * `prev` is the schedule before the change, `next` the progress after it. `attempt` is set when an attempt was
 * logged. A problem enters the ladder when it first becomes eligible and then stays on it until done.
 */
export function resurfaceAfter(
  prev: Resurface,
  next: Fields,
  now: Date,
  opts: { attempt?: 'solved' | 'failed' | 'abandoned'; resurfaceAll?: boolean } = {},
): Resurface {
  if (finished(prev)) return prev;
  if (prev.nextAt !== null) {
    if (!opts.attempt) return prev;
    const cleared = next.solveMode === 'alone' && next.confidence === 'cleared';
    if (opts.attempt !== 'solved' || next.confidence === 'dont_understand') return { stage: 0, nextAt: after(now, INTERVALS[0]!) };
    if (cleared) {
      const stage = prev.stage + 1;
      return stage >= INTERVALS.length ? { stage, nextAt: null } : { stage, nextAt: after(now, INTERVALS[stage]!) };
    }
    return { stage: prev.stage, nextAt: after(now, INTERVALS[prev.stage]!) };
  }
  if (eligible(next, now)) return { stage: 0, nextAt: after(now, INTERVALS[0]!) };
  if (opts.resurfaceAll && next.status === 'solved') return { stage: 0, nextAt: after(now, 30) };
  return prev;
}

/** Problems whose revisit date has arrived, most overdue first. */
export function resurfaceDue<T extends { problemId: string; resurface: Resurface }>(rows: T[], now: Date): (T & { overdueDays: number })[] {
  return rows
    .filter((r) => r.resurface.nextAt && new Date(r.resurface.nextAt).getTime() <= now.getTime())
    .map((r) => ({ ...r, overdueDays: (now.getTime() - new Date(r.resurface.nextAt!).getTime()) / DAY }))
    .sort((a, b) => b.overdueDays - a.overdueDays || a.problemId.localeCompare(b.problemId));
}
