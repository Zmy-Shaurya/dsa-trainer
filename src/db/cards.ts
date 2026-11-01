import type { CardType } from '../content/types';
import { dayKey } from '../domain/dates';
import { newFsrs, review, type FsrsJson, type Rating } from '../domain/srs';
import { db as defaultDb, type StudioDB } from './schema';
import { loadSettings } from './settings';

export interface CardRecord {
  id: string;
  source: 'authored' | 'generated' | 'user';
  conceptId?: string;
  problemId?: string;
  type?: CardType;
  front?: string;
  back?: string;
  clozeText?: string;
  fsrs: FsrsJson;
  due: string;
  state: 0 | 1 | 2 | 3;
  suspended: boolean;
  orphaned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewLogRecord {
  id: string;
  cardId: string;
  at: string;
  rating: Rating;
  durationMs: number;
  fsrsLog: Record<string, unknown>;
}

export const LEECH_LAPSES = 8;
export const authoredId = (concept: string, n: number) => `c:${concept}:${n}`;

export const allCards = async (db: StudioDB = defaultDb) => (await db.cards.toArray()) as unknown as CardRecord[];
export const allLogs = async (db: StudioDB = defaultDb) => (await db.reviewLogs.toArray()) as unknown as ReviewLogRecord[];

/** Orphaned authored cards are hidden unless the user has review history with them. */
export const isHidden = (c: CardRecord) => !!c.orphaned && c.fsrs.reps === 0;

const blank = (now: Date) => {
  const fsrs = newFsrs(now);
  return { fsrs, due: fsrs.due, state: 0 as const, suspended: false, createdAt: now.toISOString(), updatedAt: now.toISOString() };
};

/**
 * Card sync (PRD 8.17): authored cards new to this device start suspended; ones removed from content are
 * marked orphaned (and un-marked if they come back). Text is read from content, so edits need no work here.
 */
export async function syncAuthored(cardIds: Record<string, number[]>, db: StudioDB = defaultDb, now = new Date()) {
  await db.transaction('rw', db.cards, async () => {
    const existing = new Map((await allCards(db)).filter((c) => c.source === 'authored').map((c) => [c.id, c]));
    const wanted = new Set<string>();
    for (const [concept, ids] of Object.entries(cardIds)) {
      for (const n of ids) {
        const id = authoredId(concept, n);
        wanted.add(id);
        const cur = existing.get(id);
        if (!cur) await db.cards.put({ id, source: 'authored', conceptId: concept, ...blank(now), suspended: true } as never);
        else if (cur.orphaned) await db.cards.put({ ...cur, orphaned: false, updatedAt: now.toISOString() } as never);
      }
    }
    for (const c of existing.values())
      if (!wanted.has(c.id) && !c.orphaned) await db.cards.put({ ...c, orphaned: true, updatedAt: now.toISOString() } as never);
  });
}

/** Runs the sync when the content version changed since this device last saw it. */
export async function syncIfChanged(version: string, cardIds: Record<string, number[]>, db: StudioDB = defaultDb, now = new Date()) {
  const seen = (await db.meta.get('contentVersion'))?.value;
  if (seen === version) return;
  await syncAuthored(cardIds, db, now);
  await db.meta.put({ key: 'contentVersion', value: version });
}

/** "Add this concept's cards to my deck": unsuspends the concept's authored cards. */
export async function addConceptToDeck(conceptId: string, db: StudioDB = defaultDb, now = new Date()): Promise<number> {
  const mine = (await allCards(db)).filter((c) => c.source === 'authored' && c.conceptId === conceptId && c.suspended && !c.orphaned);
  for (const c of mine) await db.cards.put({ ...c, suspended: false, updatedAt: now.toISOString() } as never);
  return mine.length;
}

async function bumpReviews(db: StudioDB, now: Date, by: number) {
  const { dayRolloverHour } = await loadSettings(db);
  const date = dayKey(now, dayRolloverHour);
  const day = (await db.activityDays.get(date)) ?? {
    date, solved: 0, attempted: 0, reviews: 0, quizzes: 0, quizCorrect: 0, planCompleted: false,
  };
  day.reviews = Math.max(0, Number(day.reviews) + by);
  await db.activityDays.put(day);
}

export interface UndoState {
  cardId: string;
  logId: string;
  prev: CardRecord;
  at: string;
}

/** Rates a card: new schedule, a log row, today's activity and the undo snapshot, in one transaction. */
export async function reviewCard(
  cardId: string, rating: Rating, durationMs: number, db: StudioDB = defaultDb, now = new Date(), fuzz = true,
): Promise<{ leech: boolean }> {
  const { desiredRetention } = await loadSettings(db);
  let leech = false;
  await db.transaction('rw', db.cards, db.reviewLogs, db.activityDays, db.meta, db.settings, async () => {
    const prev = (await db.cards.get(cardId)) as CardRecord | undefined;
    if (!prev) throw new Error(`No card ${cardId}`);
    const r = review(prev.fsrs, now, rating, { retention: desiredRetention, fuzz });
    leech = r.fsrs.lapses >= LEECH_LAPSES;
    const logId = crypto.randomUUID();
    await db.cards.put({
      ...prev, fsrs: r.fsrs, due: r.fsrs.due, state: r.fsrs.state, suspended: prev.suspended || leech, updatedAt: now.toISOString(),
    } as never);
    await db.reviewLogs.put({ id: logId, cardId, at: now.toISOString(), rating, durationMs, fsrsLog: r.log } as never);
    await bumpReviews(db, now, 1);
    await db.meta.put({ key: 'lastReview', value: { cardId, logId, prev, at: now.toISOString() } satisfies UndoState });
  });
  return { leech };
}

/** Restores the previous card state and removes the last log (the U key in a session). */
export async function undoReview(db: StudioDB = defaultDb): Promise<string | null> {
  let restored: string | null = null;
  await db.transaction('rw', db.cards, db.reviewLogs, db.activityDays, db.meta, db.settings, async () => {
    const u = (await db.meta.get('lastReview'))?.value as UndoState | undefined;
    if (!u) return;
    await db.cards.put(u.prev as never);
    await db.reviewLogs.delete(u.logId);
    await bumpReviews(db, new Date(u.at), -1);
    await db.meta.delete('lastReview');
    restored = u.cardId;
  });
  return restored;
}

export async function setSuspended(ids: string[], suspended: boolean, db: StudioDB = defaultDb, now = new Date()) {
  for (const id of ids) {
    const c = (await db.cards.get(id)) as CardRecord | undefined;
    if (c) await db.cards.put({ ...c, suspended, updatedAt: now.toISOString() } as never);
  }
}

/** Authored cards are read-only and can only be suspended. */
export async function deleteCards(ids: string[], db: StudioDB = defaultDb) {
  for (const id of ids) {
    const c = (await db.cards.get(id)) as CardRecord | undefined;
    if (c && c.source !== 'authored') {
      await db.cards.delete(id);
      const logs = await allLogs(db);
      await db.reviewLogs.bulkDelete(logs.filter((l) => l.cardId === id).map((l) => l.id));
    }
  }
}

export interface NewCard {
  type: 'basic' | 'cloze';
  front?: string;
  back?: string;
  clozeText?: string;
  conceptId?: string;
}

export async function createUserCard(c: NewCard, db: StudioDB = defaultDb, now = new Date()): Promise<CardRecord> {
  const rec: CardRecord = { id: `u:${crypto.randomUUID()}`, source: 'user', ...c, ...blank(now) };
  await db.cards.put(rec as never);
  return rec;
}

export async function updateCard(
  id: string, patch: Partial<Pick<CardRecord, 'front' | 'back' | 'clozeText'>>, db: StudioDB = defaultDb, now = new Date(),
) {
  const c = (await db.cards.get(id)) as CardRecord | undefined;
  if (c && c.source !== 'authored') await db.cards.put({ ...c, ...patch, updatedAt: now.toISOString() } as never);
}

/** Generated cards are created once; calling again for the same id does nothing. */
export async function ensureGenerated(
  id: string, c: { front: string; back: string; problemId?: string; conceptId?: string }, db: StudioDB = defaultDb, now = new Date(),
): Promise<boolean> {
  if (await db.cards.get(id)) return false;
  await db.cards.put({ id, source: 'generated', type: 'basic', ...c, ...blank(now) } as never);
  return true;
}

type ProblemIdea = { id: string; title: string; insight: string };
const keyIdea = (p: ProblemIdea) => ({ front: `Key idea of ${p.title}?`, back: p.insight, problemId: p.id });

/** Review card from a problem page. */
export const reviewCardForProblem = (p: ProblemIdea, db?: StudioDB, now?: Date) => ensureGenerated(`p:${p.id}:review`, keyIdea(p), db, now);

/** Auto card when confidence drops to need_review / dont_understand. */
export const needReviewCard = (p: ProblemIdea, db?: StudioDB, now?: Date) => ensureGenerated(`p:${p.id}:insight`, keyIdea(p), db, now);

/** Auto card when a quiz question is answered wrong. */
export const quizMissCard = (item: { id: string; front: string; back: string; conceptId?: string }, db?: StudioDB, now?: Date) =>
  ensureGenerated(`q:${item.id}`, { front: item.front, back: item.back, ...(item.conceptId ? { conceptId: item.conceptId } : {}) }, db, now);

/** Reviews done today and how many were brand-new cards, for the daily limits. */
export async function doneToday(db: StudioDB = defaultDb, now = new Date()) {
  const { dayRolloverHour } = await loadSettings(db);
  const today = dayKey(now, dayRolloverHour);
  const logs = (await allLogs(db)).filter((l) => dayKey(new Date(l.at), dayRolloverHour) === today);
  return { reviews: logs.length, fresh: logs.filter((l) => l.fsrsLog.state === 0).length };
}

const FALLBACK_IDEA = 'Reopen the problem page, solve it again, and write the key idea in your own words.';

/** Settings-driven auto cards (PRD 14.8): called after confidence is set or an attempt is logged. */
export async function autoCards(
  p: { id: string; title: string; insight?: string },
  ev: { confidence?: string | null; solved?: boolean },
  db: StudioDB = defaultDb,
  now = new Date(),
): Promise<void> {
  const s = await loadSettings(db);
  const idea = { id: p.id, title: p.title, insight: p.insight ?? FALLBACK_IDEA };
  if (s.autoCardOnNeedReview && (ev.confidence === 'need_review' || ev.confidence === 'dont_understand')) await needReviewCard(idea, db, now);
  if (s.autoCardOnLog && ev.solved) await reviewCardForProblem(idea, db, now);
}
