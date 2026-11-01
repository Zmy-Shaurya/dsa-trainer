import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { PathDef } from '../../src/content/types';
import { exportAll } from '../../src/db/export';
import { applyCompress, getPathState, getPathStates, setItem, setPathStatus, shiftPath, startPath } from '../../src/db/paths';
import { listImported, saveImported } from '../../src/db/companies';
import { StudioDB } from '../../src/db/schema';
import { buildCompanies, defaultWindow, locate, parseCompanyCsv, parseCsv, slugify, validateCompany, windowOf } from '../../src/domain/companies';
import {
  compress, generateCompanyPath, isComplete, itemsOf, overdueItems, pathPlanItems, pathProgress, todayIndex, type Auto,
} from '../../src/domain/paths';
import { buildDailyPlan, type PlanInput } from '../../src/domain/plan';

const fresh = () => new StudioDB(`p8-${Math.random()}`);
const none: Auto = { solved: new Set(), learned: new Set() };
const easy = () => 'easy' as const;

const path: PathDef = {
  id: 'demo', name: 'Demo', hoursPerDay: 1,
  days: [
    { day: 1, title: 'A', concepts: ['c1'], problems: ['p1', 'p2'] },
    { day: 2, title: 'B', problems: ['p3', 'p4'], optional: ['p4'] },
    { day: 3, title: 'Review', review: true },
    { day: 4, title: 'C', problems: ['p5', 'p6'], quizzes: ['pattern'] },
    { day: 5, title: 'D', problems: ['p7', 'p8'], optional: ['p8'] },
  ],
};
const sched = (over: Partial<Parameters<typeof todayIndex>[0] & { completed: Record<string, boolean> }> = {}) =>
  ({ startedAt: '2026-11-01', shiftDays: 0, completed: {}, ...over });

describe('schedule', () => {
  it('todayIndex counts from the start, honours shift and never drops below 1', () => {
    expect(todayIndex(sched(), '2026-11-01')).toBe(1);
    expect(todayIndex(sched(), '2026-11-04')).toBe(4);
    expect(todayIndex(sched({ shiftDays: 2 }), '2026-11-04')).toBe(2);
    expect(todayIndex(sched({ shiftDays: 9 }), '2026-11-02')).toBe(1);
  });
  it('lists required items from past days that are not done, crediting solved work', () => {
    const s = sched();
    expect(overdueItems(path, s, '2026-11-03', none).map((i) => i.key)).toEqual(['d1:c:c1', 'd1:p:p1', 'd1:p:p2', 'd2:p:p3']);
    const auto: Auto = { solved: new Set(['p1', 'p3']), learned: new Set(['c1']) };
    expect(overdueItems(path, s, '2026-11-03', auto).map((i) => i.key)).toEqual(['d1:p:p2']);
    expect(overdueItems(path, sched({ completed: { 'd1:p:p2': true } }), '2026-11-03', auto)).toEqual([]);
    expect(overdueItems(path, sched({ shiftDays: 2 }), '2026-11-03', none)).toEqual([]);
  });
  it('optional and dropped items never block finishing', () => {
    const all: Auto = { solved: new Set(['p1', 'p2', 'p3', 'p5', 'p6', 'p7']), learned: new Set(['c1']) };
    expect(pathProgress(path, sched(), all)).toMatchObject({ done: 7, total: 8, finished: false }); // the pattern quiz needs a tick
    const s = sched({ completed: { 'd4:q:pattern': true } });
    expect(pathProgress(path, s, all).finished).toBe(true);
    expect(isComplete(itemsOf(path)[0]!, s, all)).toBe(true);
  });
});

describe('compress', () => {
  it('drops optional items ahead, skips review days, and spreads overdue items in order', () => {
    // on day 4 with nothing done: days 1-2 are overdue (required: c1, p1, p2, p3)
    const r = compress(path, sched(), '2026-11-04', none, easy);
    expect(r.dropped).toEqual(['d5:p:p8']);
    expect(Object.keys(r.moved)).toEqual(['d1:c:c1', 'd1:p:p1', 'd1:p:p2', 'd2:p:p3']);
    expect(Object.values(r.moved).every((d) => d === 4 || d === 5)).toBe(true);
    expect(Object.values(r.moved)).not.toContain(3); // day 3 is a review day
    // at most ceil(4 / 2) = 2 extra per day, original order kept
    expect(Object.values(r.moved)).toEqual([4, 4, 5, 5]);
  });
  it('pushes the hardest problems later when a day goes over 125% of the budget, and drops what cannot fit', () => {
    const hard = () => 'hard' as const;
    const heavy: PathDef = { id: 'h', name: 'H', hoursPerDay: 1, days: [
      { day: 1, title: 'a', problems: ['a', 'b'] }, { day: 2, title: 'b', problems: ['c', 'd'] },
    ] };
    // today is day 2, nothing done: day 1's 2 hard problems (90 min) land on day 2 beside its own 2 (limit 75)
    const r = compress(heavy, sched(), '2026-11-02', none, hard);
    expect(r.moved).toEqual({});
    expect(r.dropped.length).toBe(3); // only one 45 min problem fits under 75 minutes
    expect(r.diff.every((m) => m.to === null)).toBe(true);
  });
  it('does nothing when nothing is late', () => {
    expect(compress(path, sched(), '2026-11-01', none, easy)).toMatchObject({ moved: {}, dropped: ['d2:p:p4', 'd5:p:p8'] });
  });
  it('is deterministic and stored moves change the effective day', () => {
    const a = compress(path, sched(), '2026-11-04', none, easy);
    expect(compress(path, sched(), '2026-11-04', none, easy)).toEqual(a);
    const items = itemsOf(path, { moved: a.moved, dropped: a.dropped });
    expect(items.find((i) => i.key === 'd1:p:p1')!.day).toBe(4);
    expect(items.find((i) => i.key === 'd5:p:p8')!.dropped).toBe(true);
    expect(overdueItems(path, { ...sched(), moved: a.moved, dropped: a.dropped }, '2026-11-04', none)).toEqual([]);
  });
});

describe('plan items from a path', () => {
  it('lists slipped items first, then today, optional only on their own day', () => {
    const items = pathPlanItems(path, sched(), '2026-11-02', none, { problem: (id) => ({ title: id, difficulty: 'easy' }), concept: (c) => c });
    expect(items.map((i) => i.id)).toEqual(['path:d1:c:c1', 'path:d1:p:p1', 'path:d1:p:p2', 'path:d2:p:p3', 'path:d2:p:p4']);
    expect(items[1]).toMatchObject({ kind: 'problem', refId: 'p1', estMinutes: 15 });
    expect(items[1]!.reason).toContain('overdue from day 1');
  });
  it('replaces "next concept" in the daily plan and stays inside the budget', () => {
    const base: PlanInput = {
      now: new Date('2026-11-02T10:00:00Z'), budgetMin: 30, dueCardCount: 0, resurfaceDue: [],
      concepts: [{ id: 'arrays', title: 'Arrays', order: 1, depth: 0, prereqs: [], coreProblems: ['x'] }],
      mastery: new Map(), conceptState: new Map(), problems: new Map(), solved: new Set(), conceptAttempts: new Map(), quizAvailable: true,
    };
    const without = buildDailyPlan(base);
    expect(without.some((i) => i.id === 'concept:arrays')).toBe(true);
    const pathItems = pathPlanItems(path, sched(), '2026-11-02', none, { problem: (id) => ({ title: id, difficulty: 'medium' }), concept: (c) => c });
    const plan = buildDailyPlan({ ...base, pathItems });
    expect(plan.some((i) => i.id === 'concept:arrays')).toBe(false);
    expect(plan.map((i) => i.id)[0]).toBe('path:d1:c:c1');
    expect(plan.reduce((a, i) => a + i.estMinutes, 0)).toBeLessThanOrEqual(30);
  });
});

describe('generated company paths', () => {
  const problems = [
    { id: 'a', freq: 90, title: 'A', difficulty: 'hard' as const, concepts: ['trees'] },
    { id: 'b', freq: 80, title: 'B', difficulty: 'easy' as const, concepts: ['arrays'] },
    { id: 'c', freq: 70, title: 'C', difficulty: 'medium' as const, concepts: ['arrays'] },
    { id: 'd', freq: 70, title: 'D', difficulty: 'easy' as const, concepts: ['arrays'] },
    { id: 'e', freq: null, title: 'E', difficulty: 'easy' as const, concepts: [] },
  ];
  const opts = { id: 'gen:x-6m', name: 'X', hoursPerDay: 1, depth: new Map([['arrays', 0], ['trees', 2]]), conceptTitle: (c: string) => c.toUpperCase() };
  it('takes the top N, puts easier ideas first, schedules a lesson the day before and is deterministic', () => {
    const p = generateCompanyPath({ ...opts, problems, count: 4 });
    expect(p).toEqual(generateCompanyPath({ ...opts, problems: [...problems].reverse(), count: 4 }));
    const flat = p.days.flatMap((d) => d.problems ?? []);
    expect(flat).toEqual(['b', 'd', 'c', 'a']); // arrays (depth 0) before trees; easy before medium, higher frequency first; 'e' is outside the top 4
    // 1 h per day: b(15)+d(15)+c(30) = 60 fits, a(45) starts a new day
    expect(p.days.map((d) => d.problems)).toEqual([['b', 'd', 'c'], ['a']]);
    expect(p.days[0]!.concepts).toEqual(['arrays', 'trees']); // arrays: first day has no day before; trees: lesson the day before its first problem
    expect(p.days[0]!.title).toBe('ARRAYS');
    expect(p.days[1]!.concepts).toBeUndefined();
  });
  it('adds a review day after every 6 work days and caps the count', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ id: `p${i}`, freq: 200 - i, title: `P${i}`, difficulty: 'hard' as const, concepts: [] }));
    const p = generateCompanyPath({ ...opts, hoursPerDay: 0.5, problems: many, count: 999 });
    expect(p.days.flatMap((d) => d.problems ?? [])).toHaveLength(150);
    expect(p.days.filter((d) => d.review).every((d, i) => d.day === (i + 1) * 7)).toBe(true);
    expect(p.days.map((d) => d.day)).toEqual(p.days.map((_, i) => i + 1));
  });
});

describe('company parsing', () => {
  it('detects the window from phrases and file names', () => {
    expect(windowOf('1. Thirty Days.csv')).toBe('30d');
    expect(windowOf('2. Three Months.csv')).toBe('3m');
    expect(windowOf('3. Six Months.csv')).toBe('6m');
    expect(windowOf('4. More Than Six Months.csv')).toBe('6m+');
    expect(windowOf('5. All.csv')).toBe('all');
    expect(windowOf('amazon_6months.csv')).toBe('6m');
    expect(windowOf('notes.csv')).toBeUndefined();
    expect(defaultWindow(['3m', 'all'])).toBe('3m');
    expect(defaultWindow(['3m', '6m'])).toBe('6m');
  });
  it('finds the company from the folder, or from a flat file name', () => {
    expect(locate('repo/Goo gle/3. Six Months.csv')).toEqual({ company: 'Goo gle', window: '6m' });
    expect(locate('Amazon/6 months/list.csv')).toEqual({ company: 'Amazon', window: '6m' });
    expect(locate('amazon_6 months.csv').company).toBe('amazon');
    expect(locate('6 months.csv').company).toBe('imported');
    expect(slugify('Goo gle & Co.')).toBe('goo-gle-co');
  });
  it('parses quoted cells, percent frequencies, odd headers and skips rows with no slug', () => {
    expect(parseCsv('a,"b,c"\r\n"x ""y""",z\n')).toEqual([['a', 'b,c'], ['x "y"', 'z']]);
    const { rows, skipped } = parseCompanyCsv(
      '﻿#,Name,Link,Difficulty,Occurrence\n1,"Two Sum, again",https://leetcode.com/problems/two-sum/description/,EASY,85.5%\n2,No Link,,Hard,3\n3,Known Title,,Medium,\n',
      new Map([['known title', 'known-title']]),
    );
    expect(skipped).toBe(1);
    expect(rows).toEqual([
      { problemId: 'two-sum', title: 'Two Sum, again', difficulty: 'easy', freq: 85.5 },
      { problemId: 'known-title', title: 'Known Title', difficulty: 'medium', freq: null },
    ]);
    expect(parseCompanyCsv('foo,bar\n1,2')).toEqual({ rows: [], skipped: 1 });
  });
  it('builds companies per window, keeps the highest frequency and records unknown problems as unverified', () => {
    const csv = (rows: string) => `Title,URL,Difficulty,Frequency\n${rows}`;
    const r = buildCompanies([
      { path: 'Acme/1. Thirty Days.csv', text: csv('Two Sum,https://leetcode.com/problems/two-sum/,Easy,40\nTwo Sum,https://leetcode.com/problems/two-sum/,Easy,95\nNew One,https://leetcode.com/problems/new-one/,Hard,5') },
      { path: 'Acme/5. All.csv', text: csv('Two Sum,https://leetcode.com/problems/two-sum/,Easy,10') },
      { path: 'Acme/readme.txt', text: 'x' },
      { path: 'Acme/misc.csv', text: csv('a,https://leetcode.com/problems/a/,Easy,1') },
    ], { isKnown: (id) => id === 'two-sum', asOf: '2026-11-01', source: { repo: 'r', license: 'l' } });
    expect(r.ignored).toEqual(['Acme/misc.csv', 'Acme/readme.txt']);
    const c = r.companies[0]!;
    expect(c.id).toBe('acme');
    expect(c.windows['30d']).toEqual([{ problemId: 'two-sum', freq: 95 }, { problemId: 'new-one', freq: 5 }]);
    expect(c.windows.all).toEqual([{ problemId: 'two-sum', freq: 10 }]);
    expect(c.extra).toEqual({ 'new-one': { title: 'New One', difficulty: 'hard' } });
    expect(validateCompany(c)).toEqual([]);
    expect(validateCompany({ id: 'Bad Id', windows: {} }).length).toBeGreaterThan(2);
  });
});

describe('path storage', () => {
  it('keeps one active path, ticks items, shifts, applies compress and resets the frozen plan', async () => {
    const db = fresh();
    const now = new Date('2026-11-01T12:00:00Z');
    await db.dailyPlans.put({ date: '2026-11-01', budgetMin: 60, items: [], generatedAt: now.toISOString() } as never);
    const a = await startPath(path, false, db, now);
    expect(a).toMatchObject({ pathId: 'demo', status: 'active', startedAt: '2026-11-01', shiftDays: 0 });
    expect((await db.dailyPlans.get('2026-11-01'))!.budgetMin).toBe(0);
    await startPath({ ...path, id: 'other' }, true, db, now);
    expect((await getPathState('demo', db))!.status).toBe('paused');
    expect((await getPathState('other', db))!.snapshot?.id).toBe('other');
    await setPathStatus('demo', 'active', db, now);
    expect((await getPathStates(db)).filter((s) => s.status === 'active').map((s) => s.pathId)).toEqual(['demo']);
    await setItem('demo', 'd1:p:p1', true, db, now);
    await shiftPath('demo', 2, db, now);
    await shiftPath('demo', -9, db, now);
    const r = compress(path, sched(), '2026-11-04', none, easy);
    await applyCompress('demo', r, db, now);
    const s = (await getPathState('demo', db))!;
    expect(s.completed).toEqual({ 'd1:p:p1': true });
    expect(s.shiftDays).toBe(0);
    expect(s.moved).toEqual(r.moved);
    await setItem('demo', 'd1:p:p1', false, db, now);
    expect((await getPathState('demo', db))!.completed).toEqual({});
  });
  it('exports path state but never the imported company lists', async () => {
    const db = fresh();
    await startPath(path, false, db);
    await saveImported([{ id: 'acme', name: 'Acme', asOf: '2026-11-01', source: { repo: 'r', license: 'l' }, windows: { '6m': [{ problemId: 'two-sum', freq: 1 }] } }], db);
    expect((await listImported(db)).map((c) => c.id)).toEqual(['acme']);
    const env = await exportAll(db, new Date());
    expect(env.data.pathState).toHaveLength(1);
    expect(JSON.stringify(env)).not.toContain('acme');
  });
});
