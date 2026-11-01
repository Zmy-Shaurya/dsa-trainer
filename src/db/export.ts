import { db as defaultDb, SCHEMA_VERSION, type StudioDB } from './schema';
import { dayKey } from '../domain/dates';
import { mergeNewer, mergeUnion, rebuildActivityDays, type MergeNote, type Row } from '../domain/merge';
import { migrateEnvelope } from './migrations';
import { loadSettings } from './settings';
import { DATA_TABLES, PRIMARY_KEYS, type DataTable } from './types';

export interface Envelope {
  app: 'dsa-studio';
  schemaVersion: number;
  exportedAt: string;
  deviceId: string;
  contentVersion: string;
  data: Record<DataTable, Record<string, unknown>[]>;
}

export async function exportAll(
  db: StudioDB = defaultDb,
  now = new Date(),
  contentVersion = 'dev',
  /** false for automatic folder sync, so it does not reset the backup reminder */
  markExport = true,
): Promise<Envelope> {
  const data = {} as Envelope['data'];
  for (const t of DATA_TABLES) data[t] = await db.table_(t).toArray();
  const device = await db.meta.get('deviceId');
  if (markExport) await db.meta.put({ key: 'lastExportAt', value: now.toISOString() });
  return {
    app: 'dsa-studio',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    deviceId: String(device?.value ?? ''),
    contentVersion,
    data,
  };
}

/** Returns a list of readable errors; empty means valid. Nothing is written before this passes. */
export function validateEnvelope(input: unknown): string[] {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null) return ['File is not a JSON object.'];
  const e = input as Record<string, unknown>;
  if (e.app !== 'dsa-studio') errors.push('Not a DSA Studio backup (app field mismatch).');
  if (typeof e.schemaVersion !== 'number') errors.push('Missing schemaVersion.');
  else if (e.schemaVersion > SCHEMA_VERSION)
    errors.push(`Backup is from a newer version (v${e.schemaVersion}); update the app first.`);
  const data = e.data as Record<string, unknown> | undefined;
  if (typeof data !== 'object' || data === null) return [...errors, 'Missing data section.'];
  for (const t of DATA_TABLES) {
    const rows = data[t];
    if (!Array.isArray(rows)) {
      errors.push(`Table "${t}" is missing or not a list.`);
      continue;
    }
    const pk = PRIMARY_KEYS[t];
    rows.forEach((r, i) => {
      if (typeof r !== 'object' || r === null || typeof (r as Record<string, unknown>)[pk] !== 'string')
        errors.push(`${t}[${i}]: missing string key "${pk}".`);
    });
  }
  return errors.slice(0, 50);
}

export async function importReplace(input: unknown, db: StudioDB = defaultDb): Promise<void> {
  const errors = validateEnvelope(input);
  if (errors.length) throw new Error(errors.join('\n'));
  const { data } = input as Envelope;
  await db.transaction('rw', DATA_TABLES.map((t) => db.table(t)), async () => {
    for (const t of DATA_TABLES) {
      const table = db.table_(t);
      await table.clear();
      await table.bulkPut(data[t]);
    }
  });
}

export async function clearAll(db: StudioDB = defaultDb): Promise<void> {
  await db.transaction('rw', DATA_TABLES.map((t) => db.table(t)), async () => {
    for (const t of DATA_TABLES) await db.table(t).clear();
  });
}

/** Runs the migration chain, then validates. Returns the envelope or the readable errors. */
export function prepareEnvelope(input: unknown): { envelope: Envelope } | { errors: string[] } {
  let migrated: unknown;
  try {
    migrated = migrateEnvelope(input, SCHEMA_VERSION);
  } catch (e) {
    return { errors: [(e as Error).message] };
  }
  const errors = validateEnvelope(migrated);
  return errors.length ? { errors } : { envelope: migrated as Envelope };
}

export const countsOf = (env: Envelope) => Object.fromEntries(DATA_TABLES.map((t) => [t, env.data[t].length])) as Record<DataTable, number>;

const NEWER_WINS: DataTable[] = ['progress', 'notes', 'cards', 'customSheets', 'conceptState', 'pathState'];
const UNION: DataTable[] = ['attempts', 'reviewLogs', 'quizResults', 'friendSnapshots', 'bookmarks', 'dailyPlans'];

export interface MergeReport {
  exportedAt: string;
  added: Partial<Record<DataTable, number>>;
  notes: MergeNote[];
}

/** Merge import (PRD 10.4). One transaction; the activity cache is rebuilt from the merged logs. */
export async function importMerge(
  input: unknown, opts: { settings?: boolean } = {}, db: StudioDB = defaultDb,
): Promise<MergeReport> {
  const prepared = prepareEnvelope(input);
  if ('errors' in prepared) throw new Error(prepared.errors.join('\n'));
  const { data, exportedAt } = prepared.envelope;
  const report: MergeReport = { exportedAt, added: {}, notes: [] };
  const { dayRolloverHour } = await loadSettings(db);
  await db.transaction('rw', DATA_TABLES.map((t) => db.table(t)), async () => {
    for (const t of NEWER_WINS) {
      const { put, notes } = mergeNewer(t, PRIMARY_KEYS[t], await db.table_(t).toArray(), data[t]);
      await db.table_(t).bulkPut(put);
      report.notes.push(...notes);
      report.added[t] = notes.filter((n) => n.action !== 'kept-local').length;
    }
    for (const t of UNION) {
      const add = mergeUnion(PRIMARY_KEYS[t], await db.table_(t).toArray(), data[t]);
      await db.table_(t).bulkPut(add);
      report.added[t] = add.length;
    }
    if (opts.settings) await db.settings.bulkPut(data.settings as never[]);
    const planDone = new Set<string>([...(await db.activityDays.toArray()), ...data.activityDays].filter((d) => d.planCompleted).map((d) => String(d.date)));
    const rebuilt = rebuildActivityDays({
      attempts: await db.attempts.toArray(), reviewLogs: await db.reviewLogs.toArray(), quizResults: await db.quizResults.toArray(),
      planDone, dayOf: (iso) => dayKey(new Date(iso), dayRolloverHour),
    });
    await db.activityDays.clear();
    await db.activityDays.bulkPut(rebuilt);
  });
  return report;
}

/** Merge notes only (Markdown zip import). */
export async function importNotes(notes: Row[], db: StudioDB = defaultDb): Promise<MergeNote[]> {
  return db.transaction('rw', db.notes, async () => {
    const { put, notes: report } = mergeNewer('notes', 'id', (await db.notes.toArray()) as Row[], notes);
    await db.notes.bulkPut(put as never[]);
    return report;
  });
}

/** Anything recorded since `since`? Drives the backup reminder ("and there is new data since"). */
export async function hasChangesSince(since: string | undefined, db: StudioDB = defaultDb): Promise<boolean> {
  if (!since) return true;
  const [a, r, q, p, n] = await Promise.all([
    db.attempts.where('at').above(since).count(), db.reviewLogs.where('at').above(since).count(),
    db.quizResults.where('at').above(since).count(), db.progress.where('updatedAt').above(since).count(),
    db.notes.where('updatedAt').above(since).count(),
  ]);
  return a + r + q + p + n > 0;
}
