import { dayKey } from '../domain/dates';
import { resurfaceAfter } from '../domain/resurface';
import { db as defaultDb, type StudioDB } from './schema';
import { loadSettings } from './settings';
import type { Confidence, ProgressRecord, SolveMode, Status } from './types';

export type MistakeTag =
  | 'wrong_pattern' | 'wrong_data_structure' | 'off_by_one' | 'edge_case' | 'tle' | 'overflow'
  | 'logic_bug' | 'language_syntax' | 'misread_problem' | 'gave_up_early' | 'forgot_template';

export const MISTAKE_TAGS: MistakeTag[] = [
  'wrong_pattern', 'wrong_data_structure', 'off_by_one', 'edge_case', 'tle', 'overflow',
  'logic_bug', 'language_syntax', 'misread_problem', 'gave_up_early', 'forgot_template',
];

export const emptyProgress = (problemId: string, now: Date): ProgressRecord => ({
  problemId, status: 'not_started', confidence: null, solveMode: null, firstSolvedAt: null,
  lastAttemptAt: null, attempts: 0, totalTimeSec: 0, bestTimeSec: null, mistakeTags: [],
  resurface: { stage: 0, nextAt: null }, starred: false, source: 'manual', updatedAt: now.toISOString(),
});

export interface AttemptInput {
  problemId: string;
  outcome: 'solved' | 'failed' | 'abandoned';
  mode: SolveMode | null;
  durationSec: number | null;
  approachId?: string;
  language?: 'java' | 'cpp';
  mistakeTags: MistakeTag[];
  note?: string;
  confidence?: Confidence | null;
}

async function bumpActivity(
  db: StudioDB, now: Date, patch: { solved?: number; attempted?: number },
): Promise<void> {
  const { dayRolloverHour } = await loadSettings(db);
  const date = dayKey(now, dayRolloverHour);
  const day = (await db.activityDays.get(date)) ?? {
    date, solved: 0, attempted: 0, reviews: 0, quizzes: 0, quizCorrect: 0, planCompleted: false,
  };
  day.solved = Number(day.solved) + (patch.solved ?? 0);
  day.attempted = Number(day.attempted) + (patch.attempted ?? 0);
  await db.activityDays.put(day);
}

/** Every mutation goes through here: updates `updatedAt`, writes attempts and activity (PRD §9.3). */
export async function logAttempt(a: AttemptInput, db: StudioDB = defaultDb, now = new Date()): Promise<void> {
  const note = a.note?.slice(0, 280);
  await db.transaction('rw', db.progress, db.attempts, db.activityDays, db.settings, async () => {
    const p = (await db.progress.get(a.problemId)) ?? emptyProgress(a.problemId, now);
    const iso = now.toISOString();
    await db.attempts.put({
      id: crypto.randomUUID(), problemId: a.problemId, at: iso, outcome: a.outcome, mode: a.mode,
      durationSec: a.durationSec, mistakeTags: a.mistakeTags,
      ...(a.approachId ? { approachId: a.approachId } : {}),
      ...(a.language ? { language: a.language } : {}),
      ...(note ? { note } : {}),
    });
    const recent = (await db.attempts.where('problemId').equals(a.problemId).sortBy('at')).slice(-5);
    const solved = a.outcome === 'solved';
    const wasSolved = p.status === 'solved';
    const next: ProgressRecord = {
      ...p,
      status: solved || wasSolved ? 'solved' : 'attempted',
      confidence: solved && a.confidence !== undefined ? a.confidence : p.confidence,
      solveMode: solved ? a.mode : p.solveMode,
      firstSolvedAt: p.firstSolvedAt ?? (solved ? iso : null),
      lastAttemptAt: iso,
      attempts: p.attempts + 1,
      totalTimeSec: p.totalTimeSec + (a.durationSec ?? 0),
      bestTimeSec: solved && a.durationSec ? Math.min(p.bestTimeSec ?? Infinity, a.durationSec) : p.bestTimeSec,
      mistakeTags: [...new Set(recent.flatMap((r) => r.mistakeTags as string[]))],
      source: 'manual',
      updatedAt: iso,
    };
    next.resurface = resurfaceAfter(p.resurface, next, now, { attempt: a.outcome, resurfaceAll: (await loadSettings(db)).resurfaceAllSolved });
    await db.progress.put(next);
    await bumpActivity(db, now, { attempted: 1, solved: solved ? 1 : 0 });
  });
}

/** Quick status toggle. Setting `solved` without an attempt creates one (PRD §14.6). */
export async function setStatus(problemId: string, status: Status, db: StudioDB = defaultDb, now = new Date()): Promise<void> {
  const cur = await db.progress.get(problemId);
  if (cur?.status === status) return;
  if (status === 'solved') {
    return logAttempt({ problemId, outcome: 'solved', mode: null, durationSec: null, mistakeTags: [] }, db, now);
  }
  const p = cur ?? emptyProgress(problemId, now);
  await db.progress.put({ ...p, status, updatedAt: now.toISOString() });
}

export async function setConfidence(problemId: string, confidence: Confidence | null, db: StudioDB = defaultDb, now = new Date()) {
  const p = (await db.progress.get(problemId)) ?? emptyProgress(problemId, now);
  const next = { ...p, confidence, updatedAt: now.toISOString() };
  const { resurfaceAllSolved } = await loadSettings(db);
  await db.progress.put({ ...next, resurface: resurfaceAfter(p.resurface, next, now, { resurfaceAll: resurfaceAllSolved }) });
}

export async function toggleStar(problemId: string, db: StudioDB = defaultDb, now = new Date()) {
  const p = (await db.progress.get(problemId)) ?? emptyProgress(problemId, now);
  await db.progress.put({ ...p, starred: !p.starred, updatedAt: now.toISOString() });
}

/** Many problems at once (bulk actions); one transaction. */
export async function bulkUpdate(
  problemIds: string[],
  patch: { status?: Status; confidence?: Confidence | null; starred?: boolean },
  db: StudioDB = defaultDb,
  now = new Date(),
): Promise<void> {
  const solvedNow = patch.status === 'solved';
  for (const id of problemIds) {
    if (solvedNow) await setStatus(id, 'solved', db, now);
    await db.transaction('rw', db.progress, async () => {
      const p = (await db.progress.get(id)) ?? emptyProgress(id, now);
      await db.progress.put({
        ...p,
        ...(patch.status && !solvedNow ? { status: patch.status } : {}),
        ...(patch.confidence !== undefined ? { confidence: patch.confidence } : {}),
        ...(patch.starred !== undefined ? { starred: patch.starred } : {}),
        updatedAt: now.toISOString(),
      });
    });
  }
}

const NOTE_ID = (problemId: string) => `n:problem:${problemId}`;

/** "My insight" note: at most 280 characters. */
export async function saveInsight(problemId: string, body: string, db: StudioDB = defaultDb, now = new Date()) {
  const text = body.slice(0, 280);
  if (!text.trim()) return void (await db.notes.delete(NOTE_ID(problemId)));
  const prev = await db.notes.get(NOTE_ID(problemId));
  await db.notes.put({
    id: NOTE_ID(problemId), scope: 'problem', refId: problemId, body: text,
    createdAt: prev?.createdAt ?? now.toISOString(), updatedAt: now.toISOString(),
  });
}
