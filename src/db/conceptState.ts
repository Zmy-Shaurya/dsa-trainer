import { db as defaultDb, type StudioDB } from './schema';

export interface ConceptState {
  conceptId: string;
  learned: boolean;
  unlockOverride: boolean;
  viewedAt: string | null;
  vizRuns: number;
  updatedAt: string;
}

const empty = (conceptId: string, now: Date): ConceptState => ({
  conceptId, learned: false, unlockOverride: false, viewedAt: null, vizRuns: 0, updatedAt: now.toISOString(),
});

async function patch(
  conceptId: string, f: (s: ConceptState) => Partial<ConceptState>, db: StudioDB, now: Date,
): Promise<void> {
  await db.transaction('rw', db.conceptState, async () => {
    const cur = ((await db.conceptState.get(conceptId)) as unknown as ConceptState | undefined) ?? empty(conceptId, now);
    await db.conceptState.put({ ...cur, ...f(cur), updatedAt: now.toISOString() } as never);
  });
}

/** Opening a hub marks the concept viewed (first time only). */
export const markViewed = (id: string, db: StudioDB = defaultDb, now = new Date()) =>
  patch(id, (s) => (s.viewedAt ? {} : { viewedAt: now.toISOString() }), db, now);

/** A visualizer linked to the concept was opened. */
export const markVizRun = (id: string, db: StudioDB = defaultDb, now = new Date()) =>
  patch(id, (s) => ({ vizRuns: s.vizRuns + 1 }), db, now);

export const setLearned = (id: string, learned: boolean, db: StudioDB = defaultDb, now = new Date()) =>
  patch(id, () => ({ learned }), db, now);

export const setUnlockOverride = (id: string, unlockOverride: boolean, db: StudioDB = defaultDb, now = new Date()) =>
  patch(id, () => ({ unlockOverride }), db, now);

/** "My insight" on a concept hub: at most 1000 characters; emptied text deletes the note. */
export async function saveConceptInsight(id: string, body: string, db: StudioDB = defaultDb, now = new Date()) {
  const key = `n:concept:${id}`;
  const text = body.slice(0, 1000);
  if (!text.trim()) return void (await db.notes.delete(key));
  const prev = await db.notes.get(key);
  await db.notes.put({ id: key, scope: 'concept', refId: id, body: text, createdAt: prev?.createdAt ?? now.toISOString(), updatedAt: now.toISOString() });
}
