import { dayKey } from '../domain/dates';
import { db as defaultDb, type StudioDB } from './schema';
import { emptyProgress } from './progress';
import { loadSettings } from './settings';
import type { Confidence, ProgressRecord } from './types';

export interface ImportItem {
  problemId: string;
  /** ISO date when the row carried one. */
  solvedAt?: string;
  confidence?: Confidence;
}

interface UndoEntry {
  problemId: string;
  previous: ProgressRecord | null;
  attemptId?: string;
}
interface UndoState {
  at: string;
  entries: UndoEntry[];
}

export interface ImportOutcome {
  imported: string[];
  skippedAlreadySolved: string[];
}

const CONFIDENCE: Confidence[] = ['cleared', 'need_review', 'dont_understand'];
const toConfidence = (c?: string) => CONFIDENCE.find((x) => x === c?.toLowerCase().replace(/[\s']/g, '_'));

/**
 * Marks problems solved from a bulk import (PRD §14.7). Imported rows never inflate streaks unless
 * `credit` is on and the row has a date. The previous records are kept for a 24 h undo.
 */
export async function commitImport(
  items: ImportItem[],
  opts: { credit: boolean; defaultDate?: string },
  db: StudioDB = defaultDb,
  now = new Date(),
): Promise<ImportOutcome> {
  const out: ImportOutcome = { imported: [], skippedAlreadySolved: [] };
  const { dayRolloverHour } = await loadSettings(db);
  await db.transaction('rw', db.progress, db.attempts, db.activityDays, db.meta, async () => {
    const undo: UndoState = { at: now.toISOString(), entries: [] };
    for (const it of items) {
      const prev = (await db.progress.get(it.problemId)) ?? null;
      if (prev?.status === 'solved') {
        out.skippedAlreadySolved.push(it.problemId);
        continue;
      }
      const when = it.solvedAt ?? opts.defaultDate;
      const solvedAt = when ? new Date(when) : undefined;
      const validDate = solvedAt && !Number.isNaN(solvedAt.getTime()) ? solvedAt : undefined;
      const base = prev ?? emptyProgress(it.problemId, now);
      const conf = toConfidence(it.confidence);
      await db.progress.put({
        ...base, status: 'solved', source: 'bulk_import', solveMode: null,
        confidence: conf ?? base.confidence,
        firstSolvedAt: validDate?.toISOString() ?? base.firstSolvedAt,
        updatedAt: now.toISOString(),
      });
      const entry: UndoEntry = { problemId: it.problemId, previous: prev };
      if (validDate) {
        const attemptId = crypto.randomUUID();
        await db.attempts.put({
          id: attemptId, problemId: it.problemId, at: validDate.toISOString(), outcome: 'solved',
          mode: null, durationSec: null, mistakeTags: [], imported: true,
        });
        entry.attemptId = attemptId;
        if (opts.credit) {
          const date = dayKey(validDate, dayRolloverHour);
          const day = (await db.activityDays.get(date)) ?? {
            date, solved: 0, attempted: 0, reviews: 0, quizzes: 0, quizCorrect: 0, planCompleted: false,
          };
          day.solved = Number(day.solved) + 1;
          await db.activityDays.put(day);
        }
      }
      undo.entries.push(entry);
      out.imported.push(it.problemId);
    }
    await db.meta.put({ key: 'lastImportUndo', value: undo });
  });
  return out;
}

const DAY_MS = 24 * 3_600_000;

export async function undoAvailable(db: StudioDB = defaultDb, now = new Date()): Promise<number> {
  const u = (await db.meta.get('lastImportUndo'))?.value as UndoState | undefined;
  if (!u || now.getTime() - new Date(u.at).getTime() > DAY_MS) return 0;
  return u.entries.length;
}

/** Restores the records the last import touched. Activity credit given by the import is not rebuilt here. */
export async function undoLastImport(db: StudioDB = defaultDb, now = new Date()): Promise<number> {
  const u = (await db.meta.get('lastImportUndo'))?.value as UndoState | undefined;
  if (!u || now.getTime() - new Date(u.at).getTime() > DAY_MS) return 0;
  await db.transaction('rw', db.progress, db.attempts, db.meta, async () => {
    for (const e of u.entries) {
      if (e.previous) await db.progress.put(e.previous);
      else await db.progress.delete(e.problemId);
      if (e.attemptId) await db.attempts.delete(e.attemptId);
    }
    await db.meta.delete('lastImportUndo');
  });
  return u.entries.length;
}

/** Rows the user could not resolve are kept so they can be fixed later. */
export async function saveUnmatched(rows: string[], db: StudioDB = defaultDb): Promise<void> {
  const prev = ((await db.meta.get('unmatchedImports'))?.value as string[] | undefined) ?? [];
  await db.meta.put({ key: 'unmatchedImports', value: [...new Set([...prev, ...rows])] });
}
export const loadUnmatched = async (db: StudioDB = defaultDb) =>
  ((await db.meta.get('unmatchedImports'))?.value as string[] | undefined) ?? [];
export const clearUnmatched = (db: StudioDB = defaultDb) => db.meta.delete('unmatchedImports');
