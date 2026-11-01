import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { computeMastery, nextUp, nodeState, problemScore, type ProblemInput } from '../../src/domain/mastery';
import { depths, layout } from '../../src/domain/treeLayout';
import { markViewed, setLearned, setUnlockOverride } from '../../src/db/conceptState';
import { StudioDB } from '../../src/db/schema';

const solved = (solveMode: ProblemInput['solveMode'], confidence: ProblemInput['confidence']): ProblemInput => ({ status: 'solved', solveMode, confidence });
const m = (progress: Record<string, ProblemInput>, extra: Partial<Parameters<typeof computeMastery>[0]> = {}) =>
  computeMastery({ coreProblems: ['a', 'b'], progress: new Map(Object.entries(progress)), weightOf: () => 1, ...extra });

describe('problemScore', () => {
  it.each([
    [undefined, 0],
    [{ status: 'not_started', solveMode: null, confidence: null }, 0],
    [{ status: 'attempted', solveMode: null, confidence: null }, 0.1],
    [solved('alone', 'cleared'), 1],
    [solved('hint', 'cleared'), 0.7],
    [solved('solution', 'cleared'), 0.35],
    [solved(null, 'cleared'), 0.7],
    [solved('alone', 'need_review'), 0.7],
    [solved('alone', 'dont_understand'), 0.3],
    [solved('alone', null), 0.85],
    [solved('hint', 'need_review'), 0.49],
  ] as [ProblemInput | undefined, number][])('%j -> %d', (p, want) => {
    expect(problemScore(p)).toBeCloseTo(want);
  });
});

describe('computeMastery', () => {
  it('is 0 with nothing done', () => {
    expect(m({}).total).toBe(0);
  });
  it('averages problems', () => {
    const r = m({ a: solved('alone', 'cleared') });
    expect(r.problems).toBeCloseTo(0.5);
    expect(r.total).toBeCloseTo(0.5);
  });
  it('weights primary (1) vs secondary (0.5) problems', () => {
    const r = computeMastery({
      coreProblems: ['a', 'b'], progress: new Map([['a', solved('alone', 'cleared')]]), weightOf: (id) => (id === 'a' ? 1 : 0.5),
    });
    expect(r.problems).toBeCloseTo(1 / 1.5);
  });
  it('blends retention and quizzes with 0.6/0.25/0.15 and renormalises', () => {
    const base = { coreProblems: ['a'], progress: new Map([['a', solved('alone', 'cleared')]]), weightOf: () => 1 };
    expect(computeMastery({ ...base, retrievabilities: [0.5] }).total).toBeCloseTo((0.6 * 1 + 0.25 * 0.5) / 0.85);
    expect(computeMastery({ ...base, quizzes: [true, false] }).total).toBeCloseTo((0.6 + 0.15 * 0.5) / 0.75);
    expect(computeMastery({ ...base, retrievabilities: [0.5], quizzes: [false] }).total).toBeCloseTo(0.6 + 0.25 * 0.5);
  });
  it('uses only the last 5 quiz results', () => {
    const r = computeMastery({ coreProblems: [], quizOnly: true, progress: new Map(), weightOf: () => 1, quizzes: [false, false, true, true, true, true, true] });
    expect(r.quiz).toBe(1);
  });
  it('quizOnly concepts ignore problems and use retention and quiz', () => {
    const r = computeMastery({ coreProblems: ['a'], quizOnly: true, progress: new Map([['a', solved('alone', 'cleared')]]), weightOf: () => 1, retrievabilities: [0.8] });
    expect(r.problems).toBeNull();
    expect(r.total).toBeCloseTo(0.8);
  });
  it('quizOnly with nothing is 0, and "I get it" adds 0.05', () => {
    const base = { coreProblems: [], quizOnly: true, progress: new Map(), weightOf: () => 1 };
    expect(computeMastery(base).total).toBe(0);
    expect(computeMastery({ ...base, learned: true }).total).toBeCloseTo(0.05);
  });
  it('caps at 1', () => {
    const r = computeMastery({ coreProblems: ['a'], progress: new Map([['a', solved('alone', 'cleared')]]), weightOf: () => 1, learned: true });
    expect(r.total).toBe(1);
  });
  it('attempted-only problems give a small score', () => {
    const r = computeMastery({ coreProblems: ['a'], progress: new Map([['a', { status: 'attempted', solveMode: null, confidence: null }]]), weightOf: () => 1 });
    expect(r.total).toBeCloseTo(0.1);
  });
});

describe('nodeState / nextUp', () => {
  it('follows the table in §14.1', () => {
    expect(nodeState({ mastery: 0, prereqMastery: [] })).toBe('available');
    expect(nodeState({ mastery: 0, prereqMastery: [0.9, 0.4] })).toBe('locked');
    expect(nodeState({ mastery: 0, prereqMastery: [0.4], unlockOverride: true })).toBe('available');
    expect(nodeState({ mastery: 0, prereqMastery: [0.5] })).toBe('available');
    expect(nodeState({ mastery: 0, prereqMastery: [0.1], viewed: true })).toBe('locked');
    expect(nodeState({ mastery: 0, prereqMastery: [0.6], viewed: true })).toBe('in_progress');
    expect(nodeState({ mastery: 0.3, prereqMastery: [] })).toBe('in_progress');
    expect(nodeState({ mastery: 0.8, prereqMastery: [0] })).toBe('mastered');
  });
  it('picks the shallowest unfinished node', () => {
    const n = (id: string, depth: number, order: number, state: Parameters<typeof nextUp>[0][0]['state'], mastery = 0) => ({ id, depth, order, state, mastery });
    expect(nextUp([n('x', 2, 1, 'available'), n('y', 1, 5, 'in_progress', 0.3), n('z', 0, 1, 'mastered', 0.9), n('w', 0, 2, 'locked')])).toBe('y');
    expect(nextUp([n('z', 0, 1, 'mastered', 0.9)])).toBeUndefined();
  });
});

describe('layout', () => {
  const nodes = [
    { id: 'a', track: 't1', order: 1, prereqs: [] },
    { id: 'b', track: 't1', order: 2, prereqs: ['a'] },
    { id: 'c', track: 't2', order: 3, prereqs: ['a'] },
    { id: 'd', track: 't2', order: 4, prereqs: ['b', 'c'] },
    { id: 'e', track: 't1', order: 5, prereqs: [] },
  ];
  it('computes depth as 1 + max prereq depth', () => {
    expect([...depths(nodes)]).toEqual([['a', 0], ['b', 1], ['c', 1], ['d', 2], ['e', 0]]);
  });
  it('throws on a cycle', () => {
    expect(() => depths([{ id: 'a', track: 't', order: 1, prereqs: ['b'] }, { id: 'b', track: 't', order: 2, prereqs: ['a'] }])).toThrow(/cycle/);
  });
  it('gives every node a unique slot and is deterministic', () => {
    const p = layout(nodes, ['t1', 't2']);
    expect(new Set(p.map((x) => `${x.x},${x.y}`)).size).toBe(nodes.length);
    expect(layout([...nodes].reverse(), ['t1', 't2'])).toEqual(p);
  });
  it('puts children at greater x than their prereqs', () => {
    const p = new Map(layout(nodes, ['t1', 't2']).map((x) => [x.id, x]));
    for (const n of nodes) for (const q of n.prereqs) expect(p.get(n.id)!.x).toBeGreaterThan(p.get(q)!.x);
  });
});

describe('concept state repo', () => {
  it('views once, ticks learned, toggles unlock override', async () => {
    const db = new StudioDB(`cs-${Math.random()}`);
    const t0 = new Date(2026, 10, 1);
    await markViewed('x', db, t0);
    await markViewed('x', db, new Date(2026, 10, 2));
    await setLearned('x', true, db, t0);
    await setUnlockOverride('x', true, db, t0);
    expect(await db.conceptState.get('x')).toMatchObject({ learned: true, unlockOverride: true, viewedAt: t0.toISOString() });
    await setUnlockOverride('x', false, db, t0);
    expect((await db.conceptState.get('x'))!.unlockOverride).toBe(false);
  });
});
