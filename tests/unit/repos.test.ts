import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { commitImport, undoAvailable, undoLastImport } from '../../src/db/bulkImport';
import { addProblems, createSheet, importSheet, moveProblem, parseSheetImport, removeProblem } from '../../src/db/customSheets';
import { clearAll, exportAll, importReplace } from '../../src/db/export';
import { bulkUpdate, logAttempt, saveInsight, setConfidence, setStatus, toggleStar } from '../../src/db/progress';
import { StudioDB } from '../../src/db/schema';

let db: StudioDB;
const t0 = new Date(2026, 10, 1, 12, 0);
beforeEach(() => {
  db = new StudioDB(`repo-${Math.random()}`);
});

describe('progress repo', () => {
  it('logs a solved attempt: progress, attempt row and activity day', async () => {
    await logAttempt(
      { problemId: 'two-sum', outcome: 'solved', mode: 'hint', durationSec: 600, mistakeTags: ['edge_case'], note: 'x'.repeat(400), confidence: 'cleared' },
      db, t0,
    );
    const p = await db.progress.get('two-sum');
    expect(p).toMatchObject({ status: 'solved', solveMode: 'hint', confidence: 'cleared', attempts: 1, totalTimeSec: 600, bestTimeSec: 600, mistakeTags: ['edge_case'] });
    const [a] = await db.attempts.toArray();
    expect((a!.note as string).length).toBe(280);
    expect(await db.activityDays.get('2026-11-01')).toMatchObject({ solved: 1, attempted: 1 });
  });

  it('a failed attempt marks attempted and never downgrades a solved problem', async () => {
    await logAttempt({ problemId: 'a', outcome: 'failed', mode: null, durationSec: 60, mistakeTags: [] }, db, t0);
    expect((await db.progress.get('a'))!.status).toBe('attempted');
    await logAttempt({ problemId: 'a', outcome: 'solved', mode: 'alone', durationSec: 100, mistakeTags: [] }, db, t0);
    await logAttempt({ problemId: 'a', outcome: 'failed', mode: null, durationSec: 5, mistakeTags: [] }, db, t0);
    const p = (await db.progress.get('a'))!;
    expect(p.status).toBe('solved');
    expect(p.attempts).toBe(3);
    expect(p.bestTimeSec).toBe(100);
  });

  it('setting solved creates an attempt; setting it again does not', async () => {
    await setStatus('b', 'solved', db, t0);
    await setStatus('b', 'solved', db, t0);
    expect(await db.attempts.count()).toBe(1);
    await setStatus('b', 'attempted', db, t0);
    expect((await db.progress.get('b'))!.status).toBe('attempted');
  });

  it('confidence, star and bulk update are independent of status', async () => {
    await setConfidence('c', 'need_review', db, t0);
    await toggleStar('c', db, t0);
    expect(await db.progress.get('c')).toMatchObject({ status: 'not_started', confidence: 'need_review', starred: true });
    await bulkUpdate(['c', 'd'], { status: 'solved', starred: false }, db, t0);
    expect(await db.progress.get('c')).toMatchObject({ status: 'solved', starred: false, confidence: 'need_review' });
    expect(await db.progress.get('d')).toMatchObject({ status: 'solved' });
  });

  it('keeps "my insight" to 280 chars and deletes it when emptied', async () => {
    await saveInsight('e', 'y'.repeat(500), db, t0);
    expect(((await db.notes.get('n:problem:e'))!.body as string).length).toBe(280);
    await saveInsight('e', '  ', db, t0);
    expect(await db.notes.get('n:problem:e')).toBeUndefined();
  });
});

describe('bulk import', () => {
  it('imports solved rows without crediting activity by default, skips already solved', async () => {
    await setStatus('two-sum', 'solved', db, t0);
    const before = await db.activityDays.get('2026-11-01');
    const out = await commitImport(
      [{ problemId: 'two-sum' }, { problemId: '3sum', solvedAt: '2026-01-05T00:00:00Z' }, { problemId: 'valid-anagram', confidence: 'cleared' }],
      { credit: false }, db, t0,
    );
    expect(out.imported).toEqual(['3sum', 'valid-anagram']);
    expect(out.skippedAlreadySolved).toEqual(['two-sum']);
    expect(await db.progress.get('3sum')).toMatchObject({ status: 'solved', source: 'bulk_import', confidence: null });
    expect((await db.progress.get('valid-anagram'))!.confidence).toBe('cleared');
    expect(await db.activityDays.get('2026-11-01')).toEqual(before);
    expect(await db.activityDays.get('2026-01-05')).toBeUndefined();
    const imported = (await db.attempts.toArray()).filter((a) => a.imported);
    expect(imported).toHaveLength(1);   // only the dated row gets an attempt
  });

  it('credits the heatmap only for dated rows when asked', async () => {
    await commitImport([{ problemId: 'p1', solvedAt: '2026-02-02T10:00:00' }, { problemId: 'p2' }], { credit: true }, db, t0);
    expect(await db.activityDays.get('2026-02-02')).toMatchObject({ solved: 1 });
    expect(await db.activityDays.count()).toBe(1);
  });

  it('undo restores previous records within 24 h only', async () => {
    await setStatus('x', 'attempted', db, t0);
    await commitImport([{ problemId: 'x' }, { problemId: 'y', solvedAt: '2026-01-01T00:00:00Z' }], { credit: false }, db, t0);
    expect(await undoAvailable(db, t0)).toBe(2);
    const late = new Date(t0.getTime() + 25 * 3_600_000);
    expect(await undoAvailable(db, late)).toBe(0);
    expect(await undoLastImport(db, late)).toBe(0);
    expect(await undoLastImport(db, t0)).toBe(2);
    expect((await db.progress.get('x'))!.status).toBe('attempted');
    expect(await db.progress.get('y')).toBeUndefined();
    expect((await db.attempts.toArray()).some((a) => a.imported)).toBe(false);
  });
});

describe('custom sheets', () => {
  it('create, add (deduped), reorder, remove', async () => {
    const s = await createSheet('Mine', db, t0);
    expect(await addProblems(s.id, ['a', 'b', 'a'], 'Problems', db, t0)).toBe(2);
    expect(await addProblems(s.id, ['b', 'c'], 'Extra', db, t0)).toBe(1);
    await moveProblem(s.id, 'b', -1, db, t0);
    await removeProblem(s.id, 'c', db, t0);
    const got = (await db.customSheets.get(s.id))!;
    expect(got.sections).toEqual([{ title: 'Problems', problems: ['b', 'a'] }, { title: 'Extra', problems: [] }]);
  });

  it('imports CSV through the matcher and reports unmatched rows', () => {
    const cands = [{ id: 'two-sum', title: 'Two Sum' }, { id: '3sum', title: '3Sum' }];
    const { sheet, unmatched } = parseSheetImport('section,problem\nArrays,Two Sum\nArrays,https://leetcode.com/problems/3sum/\nMisc,Nope Nope', 'S', cands);
    expect(sheet.sections).toEqual([{ title: 'Arrays', problems: ['two-sum', '3sum'] }]);
    expect(unmatched).toEqual(['Nope Nope']);
  });

  it('imports Sheet JSON', async () => {
    const { sheet } = await importSheet(JSON.stringify({ name: 'J', sections: [{ title: 'T', problems: ['two-sum'] }] }), 'fallback', [], db, t0);
    expect(sheet.name).toBe('J');
    expect(await db.customSheets.count()).toBe(1);
  });
});

describe('export includes the Phase 2 tables', () => {
  it('round-trips progress, attempts, notes and custom sheets', async () => {
    await logAttempt({ problemId: 'two-sum', outcome: 'solved', mode: 'alone', durationSec: 30, mistakeTags: [] }, db, t0);
    await saveInsight('two-sum', 'seen map', db, t0);
    await createSheet('Mine', db, t0);
    const before = await exportAll(db, t0);
    await clearAll(db);
    await importReplace(JSON.parse(JSON.stringify(before)), db);
    expect(await exportAll(db, t0)).toEqual(before);
    expect(before.data.attempts).toHaveLength(1);
    expect(before.data.customSheets).toHaveLength(1);
  });
});
