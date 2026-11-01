// Daily plan (PRD 13.2). Pure and deterministic: same input, same plan, and never over budget.

export type PlanKind = 'review' | 'resurface' | 'concept' | 'problem' | 'quiz' | 'path';

export interface PlanItem {
  id: string;
  kind: PlanKind;
  title: string;
  refId?: string;
  estMinutes: number;
  done: boolean;
  reason: string;
  /** review items: how many reviews today complete the item */
  count?: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PlanConcept {
  id: string;
  title: string;
  order: number;
  depth: number;
  prereqs: string[];
  coreProblems: string[];
}

export interface PlanProblem {
  title: string;
  difficulty: Difficulty;
}

export interface PlanInput {
  now: Date;
  budgetMin: number;
  dueCardCount: number;
  resurfaceDue: { problemId: string; overdueDays: number }[];
  concepts: PlanConcept[];
  mastery: ReadonlyMap<string, number>;
  conceptState: ReadonlyMap<string, { unlockOverride?: boolean; viewedAt?: string | null }>;
  problems: ReadonlyMap<string, PlanProblem>;
  solved: ReadonlySet<string>;
  /** attempts logged on each concept's core problems */
  conceptAttempts: ReadonlyMap<string, number>;
  quizAvailable: boolean;
  /** concepts taught by a pattern (the quiz item becomes a pattern drill when the next concept is one) */
  patternConcepts?: ReadonlySet<string>;
  /** Items the active learning path wants today (slipped first). When present they replace "next concept". */
  pathItems?: Omit<PlanItem, 'done'>[];
}

const EST: Record<Difficulty, number> = { easy: 15, medium: 30, hard: 45 };
const RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
const DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildDailyPlan(i: PlanInput): PlanItem[] {
  const items: PlanItem[] = [];
  let used = 0;
  const room = () => i.budgetMin - used;
  const add = (it: Omit<PlanItem, 'done'>) => {
    items.push({ ...it, done: false });
    used += it.estMinutes;
  };
  const prob = (id: string): PlanProblem => i.problems.get(id) ?? { title: id, difficulty: 'medium' };

  // 1. Reviews
  const reviewMin = Math.min(0.5 * i.dueCardCount, 0.35 * i.budgetMin);
  const cards = Math.floor(reviewMin / 0.5);
  if (cards > 0) {
    add({ id: 'review', kind: 'review', title: `Review ${cards} cards`, estMinutes: cards * 0.5, count: cards, reason: `${i.dueCardCount} in today's queue` });
  }

  // 2. Resurfacing
  let resurfaceMin = 0;
  let taken = 0;
  for (const r of [...i.resurfaceDue].sort((a, b) => b.overdueDays - a.overdueDays || a.problemId.localeCompare(b.problemId))) {
    if (taken === 2) break;
    const p = prob(r.problemId);
    const cost = round1(0.6 * EST[p.difficulty]);
    if (resurfaceMin + cost > 0.3 * i.budgetMin || cost > room()) continue;
    resurfaceMin += cost;
    taken++;
    add({ id: `resurface:${r.problemId}`, kind: 'resurface', title: `Revisit ${p.title}`, refId: r.problemId, estMinutes: cost, reason: `${Math.floor(r.overdueDays)} days overdue` });
  }

  // 3. New learning: the next concept in the tree
  let nextConcept: PlanConcept | undefined;
  const open = (c: PlanConcept) =>
    !!i.conceptState.get(c.id)?.unlockOverride || c.prereqs.every((p) => (i.mastery.get(p) ?? 0) >= 0.5);
  const next = i.pathItems?.length ? undefined : i.concepts
    .filter((c) => (i.mastery.get(c.id) ?? 0) < 0.8 && open(c) && c.coreProblems.length > 0)
    .sort((a, b) => a.depth - b.depth || a.order - b.order || a.id.localeCompare(b.id))[0];
  for (const it of i.pathItems ?? []) if (it.estMinutes <= room()) add(it);
  if (next) {
    nextConcept = next;
    const viewed = i.conceptState.get(next.id)?.viewedAt;
    const recent = !!viewed && i.now.getTime() - new Date(viewed).getTime() < 3 * DAY;
    if (!recent && room() >= 10) {
      add({ id: `concept:${next.id}`, kind: 'concept', title: `Learn ${next.title}`, refId: next.id, estMinutes: 10, reason: 'next node in your tree' });
    }
    const todo = next.coreProblems
      .filter((p) => !i.solved.has(p))
      .map((p, idx) => ({ p, idx, d: RANK[prob(p).difficulty] }))
      .sort((a, b) => a.d - b.d || a.idx - b.idx)
      .slice(0, 3);
    for (const { p } of todo) {
      const est = EST[prob(p).difficulty];
      if (est <= room()) add({ id: `problem:${p}`, kind: 'problem', title: prob(p).title, refId: p, estMinutes: est, reason: `core problem of ${next.title}` });
    }
  }

  // 4. Fill
  if (room() >= 10 && i.quizAvailable && !items.some((x) => x.kind === 'quiz')) {
    const pattern = !!nextConcept && !!i.patternConcepts?.has(nextConcept.id);
    add({
      id: 'quiz', kind: 'quiz', refId: pattern ? 'pattern' : 'complexity', estMinutes: 8,
      title: pattern ? '5-question pattern drill' : '5-question complexity quiz', reason: 'quick retrieval practice',
    });
  }
  if (room() >= 20) {
    const weak = i.concepts
      .filter((c) => (i.conceptAttempts.get(c.id) ?? 0) >= 3)
      .sort((a, b) => (i.mastery.get(a.id) ?? 0) - (i.mastery.get(b.id) ?? 0) || a.order - b.order || a.id.localeCompare(b.id))[0];
    const pick = weak?.coreProblems.find((p) => !i.solved.has(p) && !items.some((x) => x.refId === p));
    if (weak && pick && EST[prob(pick).difficulty] <= room()) {
      add({ id: `problem:${pick}`, kind: 'problem', title: prob(pick).title, refId: pick, estMinutes: EST[prob(pick).difficulty], reason: `weak spot: ${weak.title}` });
    }
  }
  return items;
}

export interface DoneContext {
  reviewsToday: number;
  attemptedToday: ReadonlySet<string>;
  quizAnswersToday: number;
  /** concept id -> opened today with a visualizer run, or ticked "I get it" */
  conceptsDone: ReadonlySet<string>;
}

export function isDone(it: PlanItem, c: DoneContext): boolean {
  switch (it.kind) {
    case 'review': return c.reviewsToday >= (it.count ?? 1);
    case 'resurface':
    case 'problem': return !!it.refId && c.attemptedToday.has(it.refId);
    case 'concept': return !!it.refId && c.conceptsDone.has(it.refId);
    case 'quiz': return c.quizAnswersToday >= 5;
    default: return false;
  }
}

/** Marks items done from today's activity; items already done stay done (undo never un-ticks the checklist). */
export const withDone = (items: PlanItem[], c: DoneContext): PlanItem[] => items.map((it) => ({ ...it, done: it.done || isDone(it, c) }));

/** Regenerating keeps every finished item (listed first), even one the new plan would not have picked. */
export function regenerate(fresh: PlanItem[], old: PlanItem[]): PlanItem[] {
  const kept = old.filter((o) => o.done);
  const ids = new Set(kept.map((o) => o.id));
  return [...kept, ...fresh.filter((f) => !ids.has(f.id))];
}
