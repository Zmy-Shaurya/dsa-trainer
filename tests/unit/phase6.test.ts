import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CURVES, feasibleFor, formatDuration, formatOps, lgamma, table } from '../../src/domain/bigo';
import { buildDailyPlan, type PlanInput } from '../../src/domain/plan';
import { recordQuizAnswer } from '../../src/db/quiz';
import { StudioDB } from '../../src/db/schema';
import { setSetting } from '../../src/db/settings';

const noon = new Date(2026, 10, 1, 12);

describe('big-o maths', () => {
  it('computes n! and formats huge values', () => {
    expect(lgamma(11) / Math.LN10).toBeCloseTo(Math.log10(3628800), 6);
    const fact = CURVES.find((c) => c.id === 'fact')!;
    expect(formatOps(fact.log10(1000))).toBe('∞ (huge)');
    expect(formatOps(Math.log10(1e8))).toBe('1.0e8');
    expect(formatOps(Math.log10(950))).toBe('950');
  });
  it('picks time units and caps at the age of the universe', () => {
    expect(formatDuration(-5)).toBe('< 1 ms');
    expect(formatDuration(0)).toBe('1.00 s');
    expect(formatDuration(Math.log10(7200))).toBe('2.00 h');
    expect(formatDuration(18)).toBe('longer than the age of the universe');
  });
  it('flags rows that exceed one second and gives feasible classes', () => {
    const rows = table(1e5, 1e8);
    expect(rows.find((r) => r.curve.id === 'quad')!.tooSlow).toBe(true);
    expect(rows.find((r) => r.curve.id === 'nlogn')!.tooSlow).toBe(false);
    expect(feasibleFor(1e5)).toContain('O(n log n)');
    expect(feasibleFor(1e5)).not.toContain('O(n²)');
    expect(feasibleFor(10)[0]).toBe('O(n!)');
  });
});

describe('recordQuizAnswer', () => {
  const base = { kind: 'complexity' as const, itemId: 'cq:1', correct: false, answer: 'O(n)', durationMs: 10 };
  const miss = { id: 'cq:1', front: 'f', back: 'b' };
  it('makes a miss card only when wrong and the setting is on', async () => {
    const db = new StudioDB(`q6-${Math.random()}`);
    await recordQuizAnswer({ ...base, correct: true }, miss, db, noon);
    expect(await db.cards.count()).toBe(0);
    await recordQuizAnswer(base, miss, db, noon);
    expect(await db.cards.get('q:cq:1')).toBeTruthy();
    expect(await db.activityDays.get('2026-11-01')).toMatchObject({ quizzes: 2, quizCorrect: 1 });

    const off = new StudioDB(`q6-${Math.random()}`);
    await setSetting('autoCardOnQuizMiss', false, off);
    await recordQuizAnswer(base, miss, off, noon);
    expect(await off.cards.count()).toBe(0);
    expect(await off.quizResults.count()).toBe(1);
  });
});

describe('plan quiz item', () => {
  const input = (patternConcepts: string[]): PlanInput => ({
    now: noon, budgetMin: 60, dueCardCount: 0, resurfaceDue: [],
    concepts: [{ id: 'c', title: 'C', order: 1, depth: 0, prereqs: [], coreProblems: [] }],
    mastery: new Map(), conceptState: new Map(), problems: new Map(), solved: new Set(), conceptAttempts: new Map(),
    quizAvailable: true, patternConcepts: new Set(patternConcepts),
  });
  it('is a complexity quiz without a next concept', () => {
    expect(buildDailyPlan(input([])).find((i) => i.kind === 'quiz')).toMatchObject({ refId: 'complexity' });
  });
  it('is a pattern drill when the next concept is a pattern', () => {
    const i = input(['c']);
    i.concepts[0]!.coreProblems = ['p'];
    expect(buildDailyPlan(i).find((x) => x.kind === 'quiz')).toMatchObject({ refId: 'pattern' });
  });
});
