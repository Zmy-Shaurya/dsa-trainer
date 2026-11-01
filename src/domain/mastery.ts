// Pure mastery + skill-tree state (PRD §14.1). No React, no Dexie.
import type { Confidence, SolveMode, Status } from '../db/types';

export interface ProblemInput {
  status: Status;
  solveMode: SolveMode | null;
  confidence: Confidence | null;
}

export interface MasteryInputs {
  coreProblems: string[];
  /** Missing entry = not started. */
  progress: ReadonlyMap<string, ProblemInput>;
  /** 1 when this concept is the problem's primary concept, else 0.5. */
  weightOf: (problemId: string) => number;
  quizOnly?: boolean;
  /** FSRS retrievability (0-1) of each started, unsuspended card of this concept. */
  retrievabilities?: number[];
  /** Correctness of this concept's quiz results, oldest first; the last 5 count. */
  quizzes?: boolean[];
  learned?: boolean;
}

export interface Mastery {
  total: number;
  problems: number | null;
  retention: number | null;
  quiz: number | null;
  learnedBonus: number;
}

const BASE: Record<SolveMode, number> = { alone: 1, hint: 0.7, solution: 0.35 };
const CONF: Record<Confidence, number> = { cleared: 1, need_review: 0.7, dont_understand: 0.3 };
const W = { problems: 0.6, retention: 0.25, quiz: 0.15 };

export function problemScore(p: ProblemInput | undefined): number {
  if (!p || p.status === 'not_started') return 0;
  if (p.status === 'attempted') return 0.1;
  const base = p.solveMode ? BASE[p.solveMode] : 0.7;
  return base * (p.confidence ? CONF[p.confidence] : 0.85);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clamp = (x: number) => Math.min(1, Math.max(0, x));

export function computeMastery(c: MasteryInputs): Mastery {
  let problems: number | null = null;
  if (!c.quizOnly && c.coreProblems.length > 0) {
    let num = 0;
    let den = 0;
    for (const id of c.coreProblems) {
      const w = c.weightOf(id);
      num += w * problemScore(c.progress.get(id));
      den += w;
    }
    problems = den > 0 ? num / den : 0;
  }
  const retention = c.retrievabilities?.length ? mean(c.retrievabilities) : null;
  const last = c.quizzes?.slice(-5) ?? [];
  const quiz = last.length ? mean(last.map((x) => (x ? 1 : 0))) : null;

  const parts: [number | null, number][] = [[problems, W.problems], [retention, W.retention], [quiz, W.quiz]];
  const live = parts.filter((p): p is [number, number] => p[0] !== null);
  const wsum = live.reduce((a, [, w]) => a + w, 0);
  const base = wsum > 0 ? live.reduce((a, [v, w]) => a + v * w, 0) / wsum : 0;
  const learnedBonus = c.learned ? 0.05 : 0;
  return { total: clamp(base + learnedBonus), problems, retention, quiz, learnedBonus };
}

export type NodeState = 'locked' | 'available' | 'in_progress' | 'mastered';

export const UNLOCK_AT = 0.5;
export const MASTERED_AT = 0.8;

export function nodeState(a: {
  mastery: number;
  prereqMastery: number[];
  unlockOverride?: boolean;
  viewed?: boolean;
}): NodeState {
  if (a.mastery >= MASTERED_AT) return 'mastered';
  const open = a.unlockOverride || a.prereqMastery.every((m) => m >= UNLOCK_AT);
  if (a.mastery > 0) return 'in_progress';
  // Opening a locked concept to read it must not unlock it; only progress or the override does.
  if (!open) return 'locked';
  return a.viewed ? 'in_progress' : 'available';
}

export interface NextUpNode {
  id: string;
  depth: number;
  order: number;
  state: NodeState;
  mastery: number;
}

/** Available or in-progress node with the smallest depth, then order, whose mastery < 0.8. */
export function nextUp(nodes: NextUpNode[]): string | undefined {
  return nodes
    .filter((n) => (n.state === 'available' || n.state === 'in_progress') && n.mastery < MASTERED_AT)
    .sort((a, b) => a.depth - b.depth || a.order - b.order)[0]?.id;
}
