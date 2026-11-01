import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { ensurePlan, getPlan, syncPlan } from '../../src/db/dailyPlan';
import { markVizRun } from '../../src/db/conceptState';
import { logAttempt } from '../../src/db/progress';
import { StudioDB } from '../../src/db/schema';
import type { PlanItem } from '../../src/domain/plan';

const item = (id: string, kind: PlanItem['kind'], refId?: string): PlanItem =>
  ({ id, kind, title: id, refId, estMinutes: 10, done: false, reason: 'test', ...(kind === 'review' ? { count: 3 } : {}) });
const noon = new Date(2026, 10, 1, 12);

describe('daily plan storage', () => {
  it('freezes on first generation and rebuilds only when the budget changes, keeping finished items', async () => {
    const db = new StudioDB(`plan-${Math.random()}`);
    let builds = 0;
    const build = () => { builds++; return [item('concept:a', 'concept', 'a'), item('problem:p1', 'problem', 'p1')]; };
    const first = await ensurePlan(60, build, db, noon);
    await ensurePlan(60, build, db, noon);
    expect(builds).toBe(1);
    expect(first.date).toBe('2026-11-01');

    await logAttempt({ problemId: 'p1', outcome: 'solved', mode: 'alone', durationSec: 60, mistakeTags: [] }, db, noon);
    expect((await syncPlan(db, noon))!.items.map((i) => i.done)).toEqual([false, true]);

    const again = await ensurePlan(30, () => { builds++; return [item('problem:p1', 'problem', 'p1'), item('problem:p2', 'problem', 'p2')]; }, db, noon);
    expect(builds).toBe(2);
    expect(again.items.map((i) => [i.id, i.done])).toEqual([['problem:p1', true], ['problem:p2', false]]);

    const third = await ensurePlan(90, () => [item('review', 'review')], db, noon);
    expect(third.items.map((i) => [i.id, i.done])).toEqual([['problem:p1', true], ['review', false]]);
  });

  it('ticks reviews and visualizer concepts, then sets planCompleted exactly when everything is done', async () => {
    const db = new StudioDB(`plan-${Math.random()}`);
    await ensurePlan(60, () => [item('review', 'review'), item('concept:a', 'concept', 'a')], db, noon);
    await db.activityDays.put({ date: '2026-11-01', solved: 0, attempted: 0, reviews: 3, quizzes: 0, quizCorrect: 0, planCompleted: false });
    await syncPlan(db, noon);
    expect((await db.activityDays.get('2026-11-01'))!.planCompleted).toBe(false);
    await markVizRun('a', db, noon);
    const plan = await syncPlan(db, noon);
    expect(plan!.items.every((i) => i.done)).toBe(true);
    expect((await db.activityDays.get('2026-11-01'))!.planCompleted).toBe(true);
  });

  it('done flags are sticky and a new day starts without a plan', async () => {
    const db = new StudioDB(`plan-${Math.random()}`);
    await ensurePlan(60, () => [item('problem:p1', 'problem', 'p1')], db, noon);
    await logAttempt({ problemId: 'p1', outcome: 'failed', mode: null, durationSec: null, mistakeTags: [] }, db, noon);
    await syncPlan(db, noon);
    await db.attempts.clear();
    expect((await syncPlan(db, noon))!.items[0]!.done).toBe(true);
    expect(await getPlan('2026-11-02', db)).toBeUndefined();
  });
});
