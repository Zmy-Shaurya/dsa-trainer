import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/export-v1.json';
import { countsOf, exportAll, hasChangesSince, importMerge, importNotes, importReplace, prepareEnvelope } from '../../src/db/export';
import { migrateEnvelope } from '../../src/db/migrations';
import { StudioDB } from '../../src/db/schema';
import { decryptBackup, encryptBackup, isEncrypted } from '../../src/domain/backupCrypto';
import { compare, makeSnapshot, parseSnapshot } from '../../src/domain/compare';
import { ankiTsv, notesZip, parseNotesZip, progressCsv } from '../../src/domain/exports';
import { mergeNewer, mergeUnion, rebuildActivityDays } from '../../src/domain/merge';

const fresh = () => new StudioDB(`p7-${Math.random()}`);

describe('migrations', () => {
  it('imports the v1 fixture and keeps its invariants', async () => {
    const r = prepareEnvelope(fixture);
    expect('envelope' in r).toBe(true);
    const db = fresh();
    await importReplace((r as { envelope: unknown }).envelope, db);
    expect(await db.progress.count()).toBe(1);
    expect(await db.notes.get('n:problem:two-sum')).toMatchObject({ body: 'Use a hash map.' });
  });
  it('runs a chain in order and stamps versions', () => {
    const chain = {
      1: (e: Record<string, unknown>) => ({ ...e, a: 1 }),
      2: (e: Record<string, unknown>) => ({ ...e, b: (e.a as number) + 1 }),
    };
    expect(migrateEnvelope({ schemaVersion: 1 }, 3, chain)).toEqual({ schemaVersion: 3, a: 1, b: 2 });
    expect(() => migrateEnvelope({ schemaVersion: 1 }, 2, {})).toThrow(/No migration/);
    expect(migrateEnvelope({ schemaVersion: 9 }, 3, chain)).toEqual({ schemaVersion: 9 });
  });
  it('rejects newer files with a readable error', () => {
    expect(prepareEnvelope({ ...fixture, schemaVersion: 99 })).toHaveProperty('errors');
    expect(prepareEnvelope({ app: 'other' })).toHaveProperty('errors');
  });
});

describe('merge rules', () => {
  it('newer updatedAt wins and the report lists what happened', () => {
    const local = [{ id: 'a', updatedAt: '2', v: 'local' }, { id: 'b', updatedAt: '1', v: 'local' }, { id: 'c', updatedAt: '5', v: 'same' }];
    const inc = [{ id: 'a', updatedAt: '1', v: 'old' }, { id: 'b', updatedAt: '3', v: 'new' }, { id: 'c', updatedAt: '5', v: 'same' }, { id: 'd', updatedAt: '1', v: 'x' }];
    const { put, notes } = mergeNewer('t', 'id', local, inc);
    expect(put.map((r) => r.id)).toEqual(['b', 'd']);
    expect(notes.map((n) => `${n.key}:${n.action}`)).toEqual(['a:kept-local', 'b:replaced-local', 'd:added']);
  });
  it('union keeps only unseen keys', () => {
    expect(mergeUnion('id', [{ id: 1 }], [{ id: 1 }, { id: 2 }])).toEqual([{ id: 2 }]);
  });
  it('rebuilds the activity cache and ignores bulk-imported attempts', () => {
    const rows = rebuildActivityDays({
      attempts: [{ at: '2026-11-01T10:00:00Z', outcome: 'solved' }, { at: '2026-11-01T11:00:00Z', outcome: 'failed' }, { at: '2026-11-02T10:00:00Z', outcome: 'solved', imported: true }],
      reviewLogs: [{ at: '2026-11-01T12:00:00Z' }],
      quizResults: [{ at: '2026-11-01T13:00:00Z', correct: true }, { at: '2026-11-01T13:01:00Z', correct: false }],
      planDone: new Set(['2026-10-30']), dayOf: (iso) => iso.slice(0, 10),
    });
    expect(rows).toEqual([
      { date: '2026-10-30', solved: 0, attempted: 0, reviews: 0, quizzes: 0, quizCorrect: 0, planCompleted: true },
      { date: '2026-11-01', solved: 1, attempted: 2, reviews: 1, quizzes: 2, quizCorrect: 1, planCompleted: false },
    ]);
  });
  it('merge import keeps newer local data, adds the rest, and recomputes activity', async () => {
    const db = fresh();
    await db.progress.put({ ...fixture.data.progress[0]!, status: 'attempted', updatedAt: '2026-10-15T00:00:00.000Z' } as never);
    await db.activityDays.put({ date: '2020-01-01', solved: 9, attempted: 9, reviews: 0, quizzes: 0, quizCorrect: 0, planCompleted: false });
    const report = await importMerge(fixture, {}, db);
    expect((await db.progress.get('two-sum'))!.status).toBe('attempted'); // local is newer than 2026-09-30
    expect(report.notes.some((n) => n.table === 'progress' && n.action === 'kept-local')).toBe(true);
    expect(await db.attempts.count()).toBe(1);
    expect(await db.notes.count()).toBe(1);
    expect(await db.activityDays.get('2020-01-01')).toBeUndefined(); // stale cache dropped
    expect((await db.activityDays.toArray()).some((d) => d.attempted === 1 && d.quizzes === 1)).toBe(true);
    // settings only on request
    expect(await db.settings.count()).toBe(0);
    await importMerge(fixture, { settings: true }, db);
    expect(await db.settings.get('theme')).toMatchObject({ value: 'dark' });
  });
  it('merging the same file twice changes nothing', async () => {
    const db = fresh();
    await importMerge(fixture, {}, db);
    const snap = async () => JSON.stringify(await exportAll(db, new Date(0)).then((e) => e.data));
    const before = await snap();
    await importMerge(fixture, {}, db);
    expect(await snap()).toBe(before);
    const r = prepareEnvelope(fixture);
    expect(countsOf((r as { envelope: never }).envelope).progress).toBe(1);
  });
  it('notes import merges by newer', async () => {
    const db = fresh();
    await db.notes.put({ id: 'n1', scope: 'free', refId: '', body: 'mine', createdAt: '1', updatedAt: '9' });
    const rep = await importNotes([{ id: 'n1', scope: 'free', refId: '', body: 'theirs', createdAt: '1', updatedAt: '5' }, { id: 'n2', scope: 'free', refId: '', body: 'new', createdAt: '1', updatedAt: '5' }], db);
    expect(rep.map((r) => r.action)).toEqual(['kept-local', 'added']);
    expect((await db.notes.get('n1'))!.body).toBe('mine');
  });
  it('hasChangesSince sees new data only after the last export', async () => {
    const db = fresh();
    await db.attempts.put({ id: 'x', problemId: 'p', at: '2026-11-02T00:00:00.000Z' });
    expect(await hasChangesSince('2026-11-01T00:00:00.000Z', db)).toBe(true);
    expect(await hasChangesSince('2026-11-03T00:00:00.000Z', db)).toBe(false);
    expect(await hasChangesSince(undefined, db)).toBe(true);
  });
});

describe('encrypted backup', () => {
  it('round-trips and rejects a wrong passphrase', async () => {
    const enc = await encryptBackup('{"hello":"world"}', 'correct horse', 1000);
    expect(isEncrypted(enc)).toBe(true);
    expect(enc.kdf.iterations).toBe(1000);
    expect(JSON.stringify(enc)).not.toContain('hello');
    expect(await decryptBackup(enc, 'correct horse')).toBe('{"hello":"world"}');
    await expect(decryptBackup(enc, 'wrong')).rejects.toThrow(/Wrong passphrase/);
    await expect(decryptBackup({ ...enc, ciphertext: enc.ciphertext.replace(/^./, (c) => (c === 'A' ? 'B' : 'A')) }, 'correct horse')).rejects.toThrow();
  });
});

describe('exports', () => {
  it('CSV quotes cells and defuses formulas', () => {
    const csv = progressCsv([{ problemId: 'p1', status: 'solved', attempts: 2, mistakeTags: ['off-by-one', 'edge'], confidence: null }], () => '=Two, "Sum"');
    const [head, row] = csv.trim().split('\r\n');
    expect(head!.split(',')).toHaveLength(10);
    expect(row).toContain(`"'=Two, ""Sum"""`);
    expect(row).toContain('off-by-one;edge');
  });
  it('Anki TSV keeps cloze syntax, adds tags and skips cards it cannot render', () => {
    const tsv = ankiTsv(
      [
        { id: 'c:a:1', source: 'authored', conceptId: 'arrays' },
        { id: 'u1', source: 'user', type: 'basic', front: 'Q\twith tab', back: 'A', conceptId: 'x y' },
        { id: 'g1', source: 'generated', type: 'cloze', clozeText: 'Use a {{c1::heap}}.' },
        { id: 'gone', source: 'authored' },
      ],
      new Map([['c:a:1', { type: 'basic', front: 'F', back: 'B' }]]),
    );
    expect(tsv.trim().split('\n')).toEqual(['F\tB\tarrays authored', 'Q with tab\tA\tx_y user', 'Use a {{c1::heap}}.\t\tgenerated']);
  });
  it('notes zip round-trips, including awkward ids and multi-line bodies', () => {
    const notes = [
      { id: 'n:problem:two-sum', scope: 'problem', refId: 'two-sum', body: 'line 1\n\n---\nline "3"', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
      { id: 'n:free:abc', scope: 'free', refId: '', body: 'free text', createdAt: '2026-01-01', updatedAt: '2026-01-03' },
    ];
    const { notes: back, skipped } = parseNotesZip(notesZip(notes));
    expect(skipped).toEqual([]);
    expect(back.sort((a, b) => String(a.id).localeCompare(String(b.id)))).toEqual([notes[1], notes[0]]);
  });
});

describe('friend compare', () => {
  it('reads a snapshot or a full backup and splits you / both / friend', () => {
    const snap = parseSnapshot(makeSnapshot('Sam', [{ problemId: 'a', status: 'solved' }, { problemId: 'b', status: 'attempted' }, { problemId: 'c', status: 'solved' }]));
    expect(snap).toMatchObject({ name: 'Sam', solved: ['a', 'c'], attempted: ['b'] });
    expect(parseSnapshot(fixture)).toMatchObject({ solved: ['two-sum'] });
    expect(parseSnapshot({ app: 'x' })).toBe('Not a DSA Studio file.');
    expect(compare(new Set(['a', 'b']), new Set(['b', 'c']))).toEqual({ you: ['a'], both: ['b'], friend: ['c'] });
    expect(compare(new Set(['a', 'b']), new Set(['b', 'c']), ['b', 'c'])).toEqual({ you: [], both: ['b'], friend: ['c'] });
  });
});
