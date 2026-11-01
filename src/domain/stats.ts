// Aggregations for the Progress page (PRD 14.6 mistake journal, 14.11 weak topics and charts). Pure.
import { addDays, weekStartKey } from './dates';

export interface AttemptLite {
  problemId: string;
  at: string;
  outcome: 'solved' | 'failed' | 'abandoned';
  mode: 'alone' | 'hint' | 'solution' | null;
  durationSec: number | null;
  mistakeTags: string[];
  imported?: boolean;
}

export interface ProblemLite {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  patterns: string[];
  concepts: string[];
}

const DAY = 86_400_000;

/** Problems solved per week for the last `weeks` weeks, oldest first (imported rows excluded). */
export function solvedPerWeek(attempts: AttemptLite[], dayOf: (iso: string) => string, today: string, weeks = 12, weekStart: 'monday' | 'sunday' = 'monday') {
  const first = addDays(weekStartKey(today, weekStart), -7 * (weeks - 1));
  const rows = Array.from({ length: weeks }, (_, i) => ({ week: addDays(first, 7 * i), count: 0 }));
  for (const a of attempts) {
    if (a.outcome !== 'solved' || a.imported) continue;
    const w = weekStartKey(dayOf(a.at), weekStart);
    const row = rows.find((r) => r.week === w);
    if (row) row.count++;
  }
  return rows;
}

export const solveModes = (attempts: AttemptLite[]) => {
  const out = { alone: 0, hint: 0, solution: 0 };
  for (const a of attempts) if (a.outcome === 'solved' && a.mode) out[a.mode]++;
  return out;
};

export function difficultySolved(solvedIds: string[], byId: ReadonlyMap<string, ProblemLite>) {
  const out = { easy: 0, medium: 0, hard: 0 };
  for (const id of solvedIds) {
    const d = byId.get(id)?.difficulty;
    if (d) out[d]++;
  }
  return out;
}

/** Minutes spent per primary pattern. */
export function timePerPattern(attempts: AttemptLite[], byId: ReadonlyMap<string, ProblemLite>) {
  const m = new Map<string, number>();
  for (const a of attempts) {
    const p = byId.get(a.problemId)?.patterns[0];
    if (p && a.durationSec) m.set(p, (m.get(p) ?? 0) + a.durationSec / 60);
  }
  return [...m].map(([pattern, minutes]) => ({ pattern, minutes: Math.round(minutes) })).sort((a, b) => b.minutes - a.minutes || a.pattern.localeCompare(b.pattern));
}

export interface QuizLite {
  kind: string;
  itemId: string;
  conceptId?: string;
  correct: boolean;
}

/** Accuracy per pattern from pattern-trainer results (itemId is `<pattern>:<n>`; conceptId-free). */
export function patternAccuracy(results: QuizLite[]) {
  const m = new Map<string, { right: number; total: number }>();
  for (const r of results) {
    if (r.kind !== 'pattern') continue;
    const k = r.itemId.split(':')[0]!;
    const cur = m.get(k) ?? { right: 0, total: 0 };
    cur.total++;
    if (r.correct) cur.right++;
    m.set(k, cur);
  }
  return [...m].map(([pattern, v]) => ({ pattern, ...v, accuracy: v.right / v.total })).sort((a, b) => a.accuracy - b.accuracy || a.pattern.localeCompare(b.pattern));
}

/** Longest current run of correct answers, newest last. */
export const correctStreak = (results: { correct: boolean }[]) => {
  let best = 0;
  let run = 0;
  for (const r of results) {
    run = r.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
};

export interface WeakConcept {
  id: string;
  mastery: number;
  lastActivity?: string;
}

/** Concepts below 0.5 mastery with some activity, weakest first. */
export const weakConcepts = (cs: WeakConcept[], hasActivity: (id: string) => boolean) =>
  cs.filter((c) => c.mastery < 0.5 && hasActivity(c.id)).sort((a, b) => a.mastery - b.mastery || a.id.localeCompare(b.id));

/** Concepts at 0.5+ that have not been touched for `days` days (retention risk). */
export const staleConcepts = (cs: WeakConcept[], now: Date, days = 30) =>
  cs
    .filter((c) => c.mastery >= 0.5 && c.lastActivity && now.getTime() - new Date(c.lastActivity).getTime() >= days * DAY)
    .sort((a, b) => a.lastActivity!.localeCompare(b.lastActivity!) || a.id.localeCompare(b.id));

export interface MistakeReport {
  distribution: { tag: string; count: number }[];
  /** a tag in at least 3 of the last 10 attempts */
  recurring: string[];
  /** tag -> concept -> count */
  matrix: Map<string, Map<string, number>>;
}

export function mistakeReport(attempts: AttemptLite[], byId: ReadonlyMap<string, ProblemLite>, now: Date, sinceDays?: number): MistakeReport {
  const sorted = [...attempts].sort((a, b) => a.at.localeCompare(b.at));
  const inWindow = sinceDays ? sorted.filter((a) => now.getTime() - new Date(a.at).getTime() <= sinceDays * DAY) : sorted;
  const dist = new Map<string, number>();
  const matrix = new Map<string, Map<string, number>>();
  for (const a of inWindow)
    for (const t of a.mistakeTags) {
      dist.set(t, (dist.get(t) ?? 0) + 1);
      const row = matrix.get(t) ?? new Map<string, number>();
      for (const c of byId.get(a.problemId)?.concepts.slice(0, 1) ?? []) row.set(c, (row.get(c) ?? 0) + 1);
      matrix.set(t, row);
    }
  const last10 = sorted.slice(-10);
  const recurring = [...new Set(last10.flatMap((a) => a.mistakeTags))].filter((t) => last10.filter((a) => a.mistakeTags.includes(t)).length >= 3).sort();
  return {
    distribution: [...dist].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    recurring, matrix,
  };
}

/** Problems where a mistake tag occurred (the "drill this" list). */
export const problemsWithMistake = (attempts: AttemptLite[], tag: string) => [...new Set(attempts.filter((a) => a.mistakeTags.includes(tag)).map((a) => a.problemId))].sort();
