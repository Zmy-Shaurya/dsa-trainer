import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { StudioDB } from '../../src/db/schema';
import { clearAll, exportAll, importReplace, validateEnvelope } from '../../src/db/export';
import { bootstrapMeta, DEFAULT_SETTINGS, loadSettings, setSetting } from '../../src/db/settings';
import { dayKey } from '../../src/domain/dates';

let db: StudioDB;
beforeEach(async () => {
  db = new StudioDB(`test-${Math.random()}`);
  await bootstrapMeta(db);
});

describe('export/import', () => {
  it('round-trips: export -> clear -> import restores everything', async () => {
    await setSetting('language', 'cpp', db);
    await db.progress.put({
      problemId: 'two-sum', status: 'solved', confidence: 'cleared', solveMode: 'alone',
      firstSolvedAt: '2026-11-01T00:00:00.000Z', lastAttemptAt: null, attempts: 1, totalTimeSec: 60,
      bestTimeSec: 60, mistakeTags: [], resurface: { stage: 0, nextAt: null }, starred: false,
      source: 'manual', updatedAt: '2026-11-01T00:00:00.000Z',
    });
    await db.table_('notes').put({ id: 'n:problem:two-sum', scope: 'problem', body: 'hi' });
    const before = await exportAll(db, new Date('2026-11-01T06:00:00Z'));
    await clearAll(db);
    expect(await db.progress.count()).toBe(0);
    await importReplace(JSON.parse(JSON.stringify(before)), db);
    const after = await exportAll(db, new Date('2026-11-01T06:00:00Z'));
    expect(after).toEqual(before);
  });

  it('rejects bad files without writing', async () => {
    await setSetting('language', 'cpp', db);
    expect(validateEnvelope({ app: 'other' }).length).toBeGreaterThan(0);
    const env = await exportAll(db);
    await expect(importReplace({ ...env, schemaVersion: 99 }, db)).rejects.toThrow(/newer/);
    expect((await loadSettings(db)).language).toBe('cpp');
  });
});

describe('settings & dates', () => {
  it('applies defaults', async () => {
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
  });
  it('dayKey honours rollover hour', () => {
    const t = new Date(2026, 10, 2, 2, 0); // 02:00 local on Nov 2
    expect(dayKey(t, 4)).toBe('2026-11-01');
    expect(dayKey(t, 0)).toBe('2026-11-02');
  });
});
