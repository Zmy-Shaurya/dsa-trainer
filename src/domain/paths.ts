// Learning paths (PRD 15): schedule, behind detection, shift, compress and generated company paths. All pure.
import type { PathDay, PathDef } from '../content/types';
import { daysBetween } from './dates';
import type { Difficulty, PlanItem } from './plan';

export type ItemKind = 'p' | 'c' | 'q';

export interface PathItem {
  key: string;
  kind: ItemKind;
  ref: string;
  /** day it sits on now (after Compress), 1-based */
  day: number;
  optional: boolean;
  dropped: boolean;
}

/** The part of PathState the schedule maths needs. */
export interface Schedule {
  startedAt: string;
  shiftDays: number;
  completed: Record<string, boolean>;
  moved?: Record<string, number>;
  dropped?: string[];
}

/** Work credited without a tick: solved problems, concepts marked learned. */
export interface Auto {
  solved: ReadonlySet<string>;
  learned: ReadonlySet<string>;
}

export const EST_MIN: Record<Difficulty, number> = { easy: 15, medium: 30, hard: 45 };
const RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
export const CONCEPT_MIN = 10;
export const QUIZ_MIN = 5;

export const itemKey = (day: number, kind: ItemKind, ref: string) => `d${day}:${kind}:${ref}`;

/** Items as authored, in reading order: concepts, problems, quizzes. */
export function authoredItems(day: PathDay): Omit<PathItem, 'dropped'>[] {
  const opt = new Set(day.optional ?? []);
  const problems = [...new Set([...(day.problems ?? []), ...opt])];
  const out: Omit<PathItem, 'dropped'>[] = [];
  for (const c of day.concepts ?? []) out.push({ key: itemKey(day.day, 'c', c), kind: 'c', ref: c, day: day.day, optional: false });
  for (const p of problems) out.push({ key: itemKey(day.day, 'p', p), kind: 'p', ref: p, day: day.day, optional: opt.has(p) });
  for (const q of day.quizzes ?? []) out.push({ key: itemKey(day.day, 'q', q), kind: 'q', ref: q, day: day.day, optional: false });
  return out;
}

export const lastDay = (path: PathDef) => Math.max(0, ...path.days.map((d) => d.day));

/** Every item with its current day (Compress may have moved it) and dropped flag. */
export function itemsOf(path: PathDef, s?: Pick<Schedule, 'moved' | 'dropped'>): PathItem[] {
  const dropped = new Set(s?.dropped ?? []);
  return [...path.days].sort((a, b) => a.day - b.day).flatMap(authoredItems).map((i) => ({
    ...i, day: s?.moved?.[i.key] ?? i.day, dropped: dropped.has(i.key),
  }));
}

/** Day number the schedule is on today (>= 1; may pass the last day when the user is late). */
export const todayIndex = (s: Pick<Schedule, 'startedAt' | 'shiftDays'>, today: string) =>
  Math.max(1, daysBetween(s.startedAt, today) + 1 - s.shiftDays);

export const isComplete = (i: PathItem, s: Pick<Schedule, 'completed'>, auto: Auto) =>
  !!s.completed[i.key] || (i.kind === 'p' && auto.solved.has(i.ref)) || (i.kind === 'c' && auto.learned.has(i.ref));

/** Required items from days before today that are not done ("Behind by k items"). */
export const overdueItems = (path: PathDef, s: Schedule, today: string, auto: Auto): PathItem[] => {
  const idx = todayIndex(s, today);
  return itemsOf(path, s).filter((i) => !i.dropped && !i.optional && i.day < idx && !isComplete(i, s, auto));
};

export interface PathProgress {
  done: number;
  total: number;
  finished: boolean;
}

/** Required items only; optional and dropped items never block finishing. */
export function pathProgress(path: PathDef, s: Schedule, auto: Auto): PathProgress {
  const req = itemsOf(path, s).filter((i) => !i.dropped && !i.optional);
  const done = req.filter((i) => isComplete(i, s, auto)).length;
  return { done, total: req.length, finished: req.length > 0 && done === req.length };
}

export const itemMinutes = (i: Pick<PathItem, 'kind' | 'ref'>, diff: (id: string) => Difficulty) =>
  i.kind === 'p' ? EST_MIN[diff(i.ref)] : i.kind === 'c' ? CONCEPT_MIN : QUIZ_MIN;

export interface CompressMove {
  key: string;
  kind: ItemKind;
  ref: string;
  from: number;
  /** null = dropped */
  to: number | null;
}

export interface CompressResult {
  moved: Record<string, number>;
  dropped: string[];
  diff: CompressMove[];
}

/** PRD 15.3. Pure; the page previews `diff` and stores `moved` / `dropped` on Apply. */
export function compress(
  path: PathDef, s: Schedule, today: string, auto: Auto, diff: (id: string) => Difficulty,
): CompressResult {
  const idx = todayIndex(s, today);
  const all = itemsOf(path, s).filter((i) => !i.dropped);
  const end = Math.max(lastDay(path), idx);
  const reviewDays = new Set(path.days.filter((d) => d.review).map((d) => d.day));
  const remaining = Array.from({ length: end - idx + 1 }, (_, k) => idx + k);
  const work = remaining.filter((d) => !reviewDays.has(d));
  const slots = work.length ? work : remaining;

  const outcome = new Map<string, CompressMove>();
  const note = (i: PathItem, to: number | null) => outcome.set(i.key, { key: i.key, kind: i.kind, ref: i.ref, from: i.day, to });

  // 1. optional items still ahead go first
  const ahead = all.filter((i) => i.day >= idx && !isComplete(i, s, auto));
  for (const i of ahead.filter((x) => x.optional)) note(i, null);

  const plan = new Map<number, PathItem[]>(slots.map((d) => [d, []]));
  for (const i of ahead.filter((x) => !x.optional)) (plan.get(slots.includes(i.day) ? i.day : slots[slots.length - 1]!) ?? []).push(i);

  // 2. overdue required items spread over the remaining days, in their original order
  const late = all.filter((i) => i.day < idx && !i.optional && !isComplete(i, s, auto));
  const per = Math.max(1, Math.ceil(late.length / slots.length));
  late.forEach((i, n) => plan.get(slots[Math.floor(n / per)]!)!.push(i));

  // 3. a day over 125% of the time budget pushes its hardest problems later, or drops them
  const limit = path.hoursPerDay * 60 * 1.25;
  const minutes = (d: number) => plan.get(d)!.reduce((a, i) => a + itemMinutes(i, diff), 0);
  slots.forEach((d, si) => {
    const list = plan.get(d)!;
    while (minutes(d) > limit) {
      let pick = -1;
      list.forEach((i, n) => {
        if (i.kind === 'p' && (pick < 0 || RANK[diff(i.ref)] >= RANK[diff(list[pick]!.ref)])) pick = n;
      });
      if (pick < 0) break;
      const [it] = list.splice(pick, 1);
      const target = slots.slice(si + 1).find((t) => minutes(t) + itemMinutes(it!, diff) <= limit);
      if (target === undefined) note(it!, null);
      else plan.get(target)!.push(it!);
    }
  });

  for (const [d, list] of plan) for (const i of list) if (i.day !== d) note(i, d);
  const moves = [...outcome.values()].sort((a, b) => a.from - b.from || a.key.localeCompare(b.key));
  return {
    moved: Object.fromEntries(moves.filter((m) => m.to !== null).map((m) => [m.key, m.to!])),
    dropped: moves.filter((m) => m.to === null).map((m) => m.key),
    diff: moves,
  };
}

/** What today's plan should take from the path: slipped items first, then today's, in path order. */
export function pathPlanItems(
  path: PathDef, s: Schedule, today: string, auto: Auto,
  info: { problem: (id: string) => { title: string; difficulty: Difficulty }; concept: (id: string) => string },
): Omit<PlanItem, 'done'>[] {
  const idx = todayIndex(s, today);
  const n = lastDay(path);
  return itemsOf(path, s)
    .filter((i) => !i.dropped && i.day <= idx && !isComplete(i, s, auto) && (!i.optional || i.day === idx))
    .sort((a, b) => Number(a.optional) - Number(b.optional) || a.day - b.day)
    .map((i) => {
      const reason = i.day < idx ? `overdue from day ${i.day} · ${path.name}` : `day ${Math.min(idx, n)} of ${n} · ${path.name}`;
      if (i.kind === 'p') {
        const p = info.problem(i.ref);
        return { id: `path:${i.key}`, kind: 'problem', refId: i.ref, title: p.title, estMinutes: EST_MIN[p.difficulty], reason };
      }
      if (i.kind === 'c') return { id: `path:${i.key}`, kind: 'concept', refId: i.ref, title: `Learn ${info.concept(i.ref)}`, estMinutes: CONCEPT_MIN, reason };
      return { id: `path:${i.key}`, kind: 'quiz', refId: i.ref, title: `5-question ${i.ref} ${i.ref === 'pattern' ? 'drill' : 'quiz'}`, estMinutes: QUIZ_MIN, reason };
    });
}

export interface GenProblem {
  id: string;
  freq: number | null;
  title: string;
  difficulty: Difficulty;
  concepts: string[];
}

export interface GenOptions {
  id: string;
  name: string;
  problems: GenProblem[];
  count: number;
  hoursPerDay: number;
  /** depth in the skill tree; concepts missing here are ignored (no concept item) */
  depth: ReadonlyMap<string, number>;
  conceptTitle: (id: string) => string;
}

export const GEN_MAX_PROBLEMS = 150;

/** PRD 15.4: top-N by frequency, easiest concepts first, filled to the daily budget, a review day after every 6 days. */
export function generateCompanyPath(o: GenOptions): PathDef {
  const count = Math.max(1, Math.min(o.count, GEN_MAX_PROBLEMS));
  const top = [...o.problems]
    .sort((a, b) => (b.freq ?? -1) - (a.freq ?? -1) || RANK[a.difficulty] - RANK[b.difficulty] || a.id.localeCompare(b.id))
    .slice(0, count);
  const depthOf = (p: GenProblem) => o.depth.get(p.concepts[0] ?? '') ?? 999;
  const ordered = top.sort((a, b) => depthOf(a) - depthOf(b) || RANK[a.difficulty] - RANK[b.difficulty] || (b.freq ?? -1) - (a.freq ?? -1) || a.id.localeCompare(b.id));

  const budget = o.hoursPerDay * 60;
  const work: { problems: GenProblem[]; minutes: number }[] = [];
  for (const p of ordered) {
    const est = EST_MIN[p.difficulty];
    let cur = work[work.length - 1];
    if (!cur || (cur.minutes + est > budget && cur.problems.length > 0)) work.push((cur = { problems: [], minutes: 0 }));
    cur.problems.push(p);
    cur.minutes += est;
  }

  // a concept's lesson goes on the day before its first problem (day 1 if that is the first day)
  const lessons = new Map<number, string[]>();
  const seen = new Set<string>();
  work.forEach((w, i) => {
    for (const p of w.problems) {
      const c = p.concepts[0];
      if (!c || !o.depth.has(c) || seen.has(c)) continue;
      seen.add(c);
      const at = Math.max(0, i - 1);
      lessons.set(at, [...(lessons.get(at) ?? []), c]);
    }
  });

  const days: PathDay[] = [];
  work.forEach((w, i) => {
    const first = w.problems[0]?.concepts[0];
    days.push({
      day: days.length + 1,
      title: first && o.depth.has(first) ? o.conceptTitle(first) : 'Practice',
      ...(lessons.has(i) ? { concepts: lessons.get(i)! } : {}),
      problems: w.problems.map((p) => p.id),
    });
    if ((i + 1) % 6 === 0) days.push({ day: days.length + 1, title: 'Review', review: true, problems: [] });
  });
  return {
    id: o.id, name: o.name, description: `Top ${top.length} problems by frequency, easiest ideas first.`, language: 'any', hoursPerDay: o.hoursPerDay, days,
    info: Object.fromEntries(top.map((p) => [p.id, { title: p.title, difficulty: p.difficulty }])),
  };
}
