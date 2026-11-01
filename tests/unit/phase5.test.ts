import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BADGES, earnedBadges, type BadgeState } from '../../src/domain/badges';
import { addDays, dayKey, daysBetween, weekStartKey, weekday } from '../../src/domain/dates';
import { bestWeekRun, goalMet, perfectWeekRun, weekTotals } from '../../src/domain/goals';
import { grid, level, units, yearGrid } from '../../src/domain/heatmap';
import { buildDailyPlan, isDone, regenerate, withDone, type PlanConcept, type PlanInput, type PlanProblem } from '../../src/domain/plan';
import { eligible, resurfaceAfter, resurfaceDue } from '../../src/domain/resurface';
import {
  correctStreak, difficultySolved, mistakeReport, patternAccuracy, solveModes, solvedPerWeek, staleConcepts, timePerPattern, weakConcepts,
  type AttemptLite, type ProblemLite,
} from '../../src/domain/stats';
import { computeStreak, isActive, type DayCounts } from '../../src/domain/streak';
import { StudioDB } from '../../src/db/schema';
import { logAttempt, setConfidence } from '../../src/db/progress';

const d = (over: Partial<DayCounts> = {}): DayCounts => ({ solved: 0, attempted: 0, reviews: 0, quizzes: 0, ...over });
const run = (start: string, n: number, c: DayCounts = d({ solved: 1 })) => new Map(Array.from({ length: n }, (_, i) => [addDays(start, i), c]));

describe('day keys', () => {
  it('applies the rollover hour', () => {
    expect(dayKey(new Date(2026, 10, 2, 2, 0), 4)).toBe('2026-11-01');
    expect(dayKey(new Date(2026, 10, 2, 5, 0), 4)).toBe('2026-11-02');
  });
  it('does arithmetic without DST drift', () => {
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(weekday('2026-11-01')).toBe(6);                  // a Sunday
    expect(weekStartKey('2026-11-01')).toBe('2026-10-26');
    expect(weekStartKey('2026-11-01', 'sunday')).toBe('2026-11-01');
  });
});

describe('streak', () => {
  it('empty history', () => {
    expect(computeStreak(new Map(), '2026-11-01')).toEqual({ streak: 0, longest: 0, freezes: 0, frozenDays: [] });
  });
  it('a single active day', () => {
    expect(computeStreak(run('2026-11-01', 1), '2026-11-01')).toMatchObject({ streak: 1, longest: 1 });
  });
  it('a gap without a freeze resets, but keeps the longest', () => {
    const days = new Map([...run('2026-10-20', 3), ...run('2026-10-25', 1)]);
    expect(computeStreak(days, '2026-10-25')).toMatchObject({ streak: 1, longest: 3 });
  });
  it('7 days bank a freeze that covers one missed day', () => {
    const days = new Map([...run('2026-10-01', 7), ...run('2026-10-09', 2)]);
    const r = computeStreak(days, '2026-10-10');
    expect(r.frozenDays).toEqual(['2026-10-08']);
    expect(r.streak).toBe(9);
    expect(r.freezes).toBe(0);
  });
  it('caps banked freezes at 2', () => {
    expect(computeStreak(run('2026-10-01', 28), '2026-10-28').freezes).toBe(2);
  });
  it('today not being active yet does not break the streak', () => {
    expect(computeStreak(run('2026-10-29', 3), '2026-11-01')).toMatchObject({ streak: 3 });
  });
  it('active-day rules: reviews and quizzes count at their thresholds', () => {
    expect(isActive(d({ reviews: 4 }), 5)).toBe(false);
    expect(isActive(d({ reviews: 5 }), 5)).toBe(true);
    expect(isActive(d({ quizzes: 5 }), 5)).toBe(true);
    expect(isActive(d({ attempted: 1 }), 5)).toBe(true);
  });
  it('rollover: a 02:00 session belongs to the previous day', () => {
    const k = dayKey(new Date(2026, 10, 2, 2, 0), 4);
    expect(computeStreak(new Map([[k, d({ solved: 1 })]]), '2026-11-02')).toMatchObject({ streak: 1 });
  });
});

describe('heatmap', () => {
  it('units and levels', () => {
    expect(units(d({ solved: 1, attempted: 2, reviews: 25, quizzes: 10 }))).toBe(3 + 2 + 2 + 2);
    expect([0, 1, 2, 3, 5, 6, 9, 10, 40].map(level)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
  it('builds 53 x 7 cells ending with this week, Monday first', () => {
    const cells = grid('2026-11-01', new Map([['2026-11-01', d({ solved: 4 })]]));
    expect(cells).toHaveLength(53 * 7);
    expect(cells[0]!.date).toBe(addDays('2026-10-26', -7 * 52));
    expect(weekday(cells[0]!.date)).toBe(0);
    expect(cells.find((c) => c.date === '2026-11-01')!.level).toBe(4);
    expect(cells.filter((c) => c.pad)).toHaveLength(0);
  });
  it('a calendar year pads the edges', () => {
    const cells = yearGrid(2026, new Map());
    expect(cells.filter((c) => !c.pad)).toHaveLength(365);
    expect(cells.length % 7).toBe(0);
  });
});

describe('weekly goal', () => {
  const g = { problems: 2, reviews: 10 };
  const day = (solved: number, reviews: number) => ({ solved, reviews });
  it('sums a Monday-Sunday week and checks the goal', () => {
    const days = new Map([['2026-10-26', day(1, 6)], ['2026-11-01', day(1, 4)], ['2026-11-02', day(5, 50)]]);
    expect(weekTotals(days, '2026-10-26')).toEqual({ solved: 2, reviews: 10 });
    expect(goalMet(weekTotals(days, '2026-10-26'), g)).toBe(true);
  });
  it('counts consecutive met weeks, ignoring an unfinished current week', () => {
    const met = (w: string) => [[w, day(2, 10)] as const];
    const days = new Map([...met('2026-10-12'), ...met('2026-10-19'), ...met('2026-10-26')]);
    expect(perfectWeekRun(days, '2026-11-04', g)).toBe(3);
    expect(perfectWeekRun(new Map(met('2026-10-26')), '2026-11-04', g)).toBe(1);
    expect(bestWeekRun(days, '2026-11-04', g)).toBe(3);
  });
});

describe('resurfacing ladder', () => {
  const t0 = new Date(2026, 10, 1, 12);
  const days = (n: number) => new Date(t0.getTime() + n * 86_400_000);
  const solved = (over = {}) => ({ status: 'solved' as const, confidence: null, solveMode: 'hint' as const, lastAttemptAt: t0.toISOString(), ...over });
  it('eligibility', () => {
    expect(eligible(solved(), t0)).toBe(true);
    expect(eligible(solved({ solveMode: 'alone', confidence: 'cleared' }), t0)).toBe(false);
    expect(eligible(solved({ solveMode: 'alone', confidence: 'need_review' }), t0)).toBe(true);
    expect(eligible({ status: 'attempted', confidence: null, solveMode: null, lastAttemptAt: days(-1).toISOString() }, t0)).toBe(false);
    expect(eligible({ status: 'attempted', confidence: null, solveMode: null, lastAttemptAt: days(-2).toISOString() }, t0)).toBe(true);
  });
  it('enters at stage 0 with a 3 day wait', () => {
    expect(resurfaceAfter({ stage: 0, nextAt: null }, solved(), t0)).toEqual({ stage: 0, nextAt: days(3).toISOString() });
    expect(resurfaceAfter({ stage: 0, nextAt: null }, solved({ solveMode: 'alone', confidence: 'cleared' }), t0)).toEqual({ stage: 0, nextAt: null });
  });
  it('climbs the ladder on clean revisits and finishes after the last stage', () => {
    let r: { stage: number; nextAt: string | null } = { stage: 0, nextAt: days(3).toISOString() };
    const clean = solved({ solveMode: 'alone', confidence: 'cleared' });
    const gaps: number[] = [];
    for (let i = 0; i < 5; i++) {
      r = resurfaceAfter(r, clean, t0, { attempt: 'solved' });
      gaps.push(r.nextAt ? Math.round((new Date(r.nextAt).getTime() - t0.getTime()) / 86_400_000) : -1);
    }
    expect(gaps).toEqual([7, 14, 30, 60, -1]);
    expect(r.stage).toBe(5);
    expect(resurfaceAfter(r, solved(), t0)).toEqual(r);       // done problems never re-enter
  });
  it('keeps the stage after a hinted revisit and resets after a failure', () => {
    const at2 = { stage: 2, nextAt: days(-1).toISOString() };
    expect(resurfaceAfter(at2, solved({ confidence: 'need_review' }), t0, { attempt: 'solved' })).toEqual({ stage: 2, nextAt: days(14).toISOString() });
    expect(resurfaceAfter(at2, solved(), t0, { attempt: 'failed' })).toEqual({ stage: 0, nextAt: days(3).toISOString() });
    expect(resurfaceAfter(at2, solved({ confidence: 'dont_understand', solveMode: 'alone' }), t0, { attempt: 'solved' }).stage).toBe(0);
  });
  it('optionally resurfaces every solved problem after 30 days', () => {
    const clean = solved({ solveMode: 'alone', confidence: 'cleared' });
    expect(resurfaceAfter({ stage: 0, nextAt: null }, clean, t0, { resurfaceAll: true })).toEqual({ stage: 0, nextAt: days(30).toISOString() });
  });
  it('lists due problems most overdue first', () => {
    const rows = [
      { problemId: 'b', resurface: { stage: 0, nextAt: days(-1).toISOString() } },
      { problemId: 'a', resurface: { stage: 0, nextAt: days(-5).toISOString() } },
      { problemId: 'c', resurface: { stage: 0, nextAt: days(2).toISOString() } },
    ];
    expect(resurfaceDue(rows, t0).map((r) => r.problemId)).toEqual(['a', 'b']);
  });
  it('is applied by the progress repo', async () => {
    const db = new StudioDB(`res-${Math.random()}`);
    await logAttempt({ problemId: 'p', outcome: 'solved', mode: 'hint', durationSec: 60, mistakeTags: [] }, db, t0);
    expect((await db.progress.get('p'))!.resurface).toEqual({ stage: 0, nextAt: days(3).toISOString() });
    await logAttempt({ problemId: 'p', outcome: 'solved', mode: 'alone', durationSec: 60, mistakeTags: [], confidence: 'cleared' }, db, days(3));
    expect((await db.progress.get('p'))!.resurface.stage).toBe(1);
    await logAttempt({ problemId: 'q', outcome: 'solved', mode: 'alone', durationSec: 60, mistakeTags: [], confidence: 'cleared' }, db, t0);
    expect((await db.progress.get('q'))!.resurface.nextAt).toBeNull();
    await setConfidence('q', 'need_review', db, t0);
    expect((await db.progress.get('q'))!.resurface.nextAt).toBe(days(3).toISOString());
  });
});

describe('buildDailyPlan', () => {
  const concepts: PlanConcept[] = [
    { id: 'a', title: 'A', order: 1, depth: 0, prereqs: [], coreProblems: ['a1', 'a2', 'a3', 'a4'] },
    { id: 'b', title: 'B', order: 2, depth: 1, prereqs: ['a'], coreProblems: ['b1'] },
  ];
  const problems = new Map<string, PlanProblem>([
    ['a1', { title: 'A1', difficulty: 'hard' }], ['a2', { title: 'A2', difficulty: 'easy' }], ['a3', { title: 'A3', difficulty: 'medium' }],
    ['a4', { title: 'A4', difficulty: 'easy' }], ['b1', { title: 'B1', difficulty: 'medium' }],
  ]);
  const base = (over: Partial<PlanInput> = {}): PlanInput => ({
    now: new Date(2026, 10, 1), budgetMin: 60, dueCardCount: 0, resurfaceDue: [], concepts, mastery: new Map(), conceptState: new Map(),
    problems, solved: new Set(), conceptAttempts: new Map(), quizAvailable: false, ...over,
  });

  it('starts from the first concept and its easiest core problems', () => {
    const plan = buildDailyPlan(base());
    expect(plan.map((p) => p.id)).toEqual(['concept:a', 'problem:a2', 'problem:a4']);
  });
  it('caps review time at 35% of the budget and sizes the item in cards', () => {
    const r = buildDailyPlan(base({ dueCardCount: 100 }))[0]!;
    expect(r).toMatchObject({ kind: 'review', count: 42, estMinutes: 21 });
    expect(buildDailyPlan(base({ dueCardCount: 10 }))[0]).toMatchObject({ count: 10, estMinutes: 5 });
  });
  it('resurfaces at most 2 problems at 0.6x cost within 30% of the budget', () => {
    const plan = buildDailyPlan(base({ budgetMin: 90, resurfaceDue: [{ problemId: 'a2', overdueDays: 1 }, { problemId: 'a3', overdueDays: 9 }, { problemId: 'a4', overdueDays: 5 }] }));
    const res = plan.filter((p) => p.kind === 'resurface');
    expect(res.map((p) => p.refId)).toEqual(['a3', 'a4']);
    expect(res.map((p) => p.estMinutes)).toEqual([18, 9]);
  });
  it('moves to the next concept once prerequisites reach 0.5, and honours an unlock override', () => {
    const solved = new Set(['a1', 'a2', 'a3', 'a4']);
    expect(buildDailyPlan(base({ mastery: new Map([['a', 0.85]]), solved }))[0]!.id).toBe('concept:b');
    expect(buildDailyPlan(base({ mastery: new Map([['a', 0.3]]), solved: new Set(), conceptState: new Map([['b', { unlockOverride: true }]]) }))[0]!.id).toBe('concept:a');
  });
  it('skips the concept item when it was viewed in the last 3 days', () => {
    const plan = buildDailyPlan(base({ conceptState: new Map([['a', { viewedAt: new Date(2026, 9, 30).toISOString() }]]) }));
    expect(plan.some((p) => p.kind === 'concept')).toBe(false);
  });
  it('adds a quiz when time remains and the tools exist, and a weak-spot problem', () => {
    const plan = buildDailyPlan(base({ budgetMin: 90, quizAvailable: true, conceptAttempts: new Map([['b', 4]]), mastery: new Map([['a', 0.9], ['b', 0.2]]), solved: new Set(['a1', 'a2', 'a3', 'a4']) }));
    expect(plan.map((p) => p.kind)).toContain('quiz');
  });
  it('tracks completion and keeps finished items on regenerate', () => {
    const items = buildDailyPlan(base({ dueCardCount: 10 }));
    const ctx = { reviewsToday: 10, attemptedToday: new Set(['a2']), quizAnswersToday: 0, conceptsDone: new Set<string>() };
    const done = withDone(items, ctx);
    expect(done.filter((i) => i.done).map((i) => i.id)).toEqual(['review', 'problem:a2']);
    expect(isDone(items.find((i) => i.kind === 'concept')!, { ...ctx, conceptsDone: new Set(['a']) })).toBe(true);
    expect(regenerate(buildDailyPlan(base({ dueCardCount: 10 })), done).filter((i) => i.done)).toHaveLength(2);
  });

  it('property: deterministic, within budget, unique ids (500 random inputs)', () => {
    let s = 12345;
    const rnd = (n: number) => ((s = (s * 1103515245 + 12345) & 0x7fffffff) % n);
    const diffs = ['easy', 'medium', 'hard'] as const;
    for (let t = 0; t < 500; t++) {
      const cs: PlanConcept[] = Array.from({ length: 1 + rnd(6) }, (_, i) => ({
        id: `c${i}`, title: `C${i}`, order: i, depth: rnd(3), prereqs: i ? [`c${rnd(i)}`] : [], coreProblems: Array.from({ length: rnd(6) }, (_, j) => `p${i}-${j}`),
      }));
      const probs = new Map(cs.flatMap((c) => c.coreProblems.map((p) => [p, { title: p, difficulty: diffs[rnd(3)]! }] as const)));
      const input: PlanInput = {
        now: new Date(2026, 10, 1), budgetMin: [30, 60, 90][rnd(3)]!, dueCardCount: rnd(200),
        resurfaceDue: [...probs.keys()].filter(() => rnd(3) === 0).map((problemId) => ({ problemId, overdueDays: rnd(20) })),
        concepts: cs, mastery: new Map(cs.map((c) => [c.id, rnd(100) / 100])), conceptState: new Map(),
        problems: probs, solved: new Set([...probs.keys()].filter(() => rnd(2) === 0)),
        conceptAttempts: new Map(cs.map((c) => [c.id, rnd(6)])), quizAvailable: rnd(2) === 0,
      };
      const plan = buildDailyPlan(input);
      expect(plan.reduce((a, p) => a + p.estMinutes, 0)).toBeLessThanOrEqual(input.budgetMin + 1e-9);
      expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
      expect(buildDailyPlan({ ...input })).toEqual(plan);
      const order = ['review', 'resurface', 'concept', 'problem', 'quiz'];
      const idx = plan.map((p) => order.indexOf(p.kind));
      expect(idx.filter((v, i) => i > 0 && v < idx[i - 1]! && !(plan[i]!.kind === 'problem' || plan[i - 1]!.kind === 'problem'))).toEqual([]);
    }
  });
});

describe('stats', () => {
  const iso = (k: string) => `${k}T12:00:00.000Z`;
  const a = (over: Partial<AttemptLite>): AttemptLite => ({ problemId: 'p', at: iso('2026-11-01'), outcome: 'solved', mode: 'alone', durationSec: 600, mistakeTags: [], ...over });
  const byId = new Map<string, ProblemLite>([
    ['p', { id: 'p', difficulty: 'easy', patterns: ['two-pointers'], concepts: ['two-pointers'] }],
    ['q', { id: 'q', difficulty: 'hard', patterns: ['dp-1d'], concepts: ['dp-1d'] }],
  ]);
  it('solved per week skips imports and failures', () => {
    const rows = solvedPerWeek([a({}), a({ imported: true }), a({ outcome: 'failed' }), a({ at: iso('2026-10-20') })], (x) => x.slice(0, 10), '2026-11-01', 3);
    expect(rows.map((r) => r.count)).toEqual([0, 1, 1]);
  });
  it('distributions', () => {
    expect(solveModes([a({}), a({ mode: 'hint' }), a({ mode: 'solution' }), a({ outcome: 'failed', mode: null })])).toEqual({ alone: 1, hint: 1, solution: 1 });
    expect(difficultySolved(['p', 'q', 'zzz'], byId)).toEqual({ easy: 1, medium: 0, hard: 1 });
    expect(timePerPattern([a({}), a({ problemId: 'q', durationSec: 1800 })], byId)).toEqual([{ pattern: 'dp-1d', minutes: 30 }, { pattern: 'two-pointers', minutes: 10 }]);
  });
  it('pattern accuracy, quiz runs', () => {
    const r = patternAccuracy([
      { kind: 'pattern', itemId: 'dp-1d:1', correct: true }, { kind: 'pattern', itemId: 'dp-1d:2', correct: false },
      { kind: 'pattern', itemId: 'greedy:1', correct: true }, { kind: 'complexity', itemId: 'loops:1', correct: false },
    ]);
    expect(r.map((x) => [x.pattern, x.accuracy])).toEqual([['dp-1d', 0.5], ['greedy', 1]]);
    expect(correctStreak([{ correct: true }, { correct: true }, { correct: false }, { correct: true }])).toBe(2);
  });
  it('weak and stale concepts', () => {
    const cs = [{ id: 'a', mastery: 0.2 }, { id: 'b', mastery: 0.4 }, { id: 'c', mastery: 0.1 }, { id: 'd', mastery: 0.7, lastActivity: iso('2026-09-01') }, { id: 'e', mastery: 0.7, lastActivity: iso('2026-10-30') }];
    expect(weakConcepts(cs, (id) => id !== 'c').map((c) => c.id)).toEqual(['a', 'b']);
    expect(staleConcepts(cs, new Date('2026-11-01'), 30).map((c) => c.id)).toEqual(['d']);
  });
  it('mistake journal: distribution, recurring tags, concept matrix', () => {
    const at = (n: number) => iso(`2026-10-${String(10 + n).padStart(2, '0')}`);
    const attempts = [
      a({ at: at(0), mistakeTags: ['off_by_one'] }), a({ at: at(1), mistakeTags: ['off_by_one', 'tle'] }), a({ at: at(2), problemId: 'q', mistakeTags: ['off_by_one'] }),
      a({ at: at(3), mistakeTags: [] }),
    ];
    const r = mistakeReport(attempts, byId, new Date('2026-11-01'));
    expect(r.distribution).toEqual([{ tag: 'off_by_one', count: 3 }, { tag: 'tle', count: 1 }]);
    expect(r.recurring).toEqual(['off_by_one']);
    expect([...r.matrix.get('off_by_one')!]).toEqual([['two-pointers', 2], ['dp-1d', 1]]);
    expect(mistakeReport(attempts, byId, new Date('2026-11-01'), 21).distribution).toHaveLength(2);
  });
});

describe('badges', () => {
  const none: BadgeState = { solvedCount: 0, longestStreak: 0, conceptsMastered: 0, tracksMastered: 0, bestSheetPct: 0, reviews: 0, bestQuizRun: 0, patternAnswers: 0, patternAccuracy: 0, perfectWeeks: 0 };
  it('earns nothing from nothing and has unique ids', () => {
    expect(earnedBadges(none).filter((b) => b.got)).toEqual([]);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
  it('earns by thresholds', () => {
    const got = (s: Partial<BadgeState>) => earnedBadges({ ...none, ...s }).filter((b) => b.got).map((b) => b.id);
    expect(got({ solvedCount: 50 })).toEqual(['first-solve', 'solved-10', 'solved-50']);
    expect(got({ longestStreak: 30 })).toEqual(['streak-7', 'streak-30']);
    expect(got({ patternAnswers: 49, patternAccuracy: 1 })).toEqual([]);
    expect(got({ patternAnswers: 50, patternAccuracy: 0.9 })).toEqual(['pattern-spotter']);
    expect(got({ bestSheetPct: 1 })).toEqual(['sheet-25', 'sheet-50', 'sheet-100']);
  });
});
