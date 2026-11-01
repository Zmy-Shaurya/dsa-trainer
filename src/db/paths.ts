import type { PathDef } from '../content/types';
import { dayKey } from '../domain/dates';
import type { CompressResult } from '../domain/paths';
import { db as defaultDb, type StudioDB } from './schema';
import { loadSettings } from './settings';

/** One row per path the user has started (PRD 9). Generated paths keep their full definition in `snapshot`. */
export interface PathState {
  pathId: string;
  startedAt: string;
  status: 'active' | 'paused' | 'done';
  shiftDays: number;
  completed: Record<string, boolean>;
  moved?: Record<string, number>;
  dropped?: string[];
  snapshot?: PathDef;
  updatedAt: string;
}

export const getPathStates = async (db: StudioDB = defaultDb) => (await db.pathState.toArray()) as unknown as PathState[];
export const getPathState = async (id: string, db: StudioDB = defaultDb) => (await db.pathState.get(id)) as unknown as PathState | undefined;

/** Today's plan is frozen once built; a path change zeroes its budget so the next visit rebuilds it and keeps finished items. */
async function refreshPlan(db: StudioDB, now: Date) {
  const { dayRolloverHour } = await loadSettings(db);
  await db.dailyPlans.update(dayKey(now, dayRolloverHour), { budgetMin: 0 });
}

const put = (db: StudioDB, s: PathState) => db.pathState.put(s as never);

/** Starting (or restarting) a path makes it the one active path; any other active path is paused. */
export async function startPath(def: PathDef, generated: boolean, db: StudioDB = defaultDb, now = new Date()): Promise<PathState> {
  const { dayRolloverHour } = await loadSettings(db);
  const iso = now.toISOString();
  return db.transaction('rw', db.pathState, db.dailyPlans, db.settings, async () => {
    for (const s of await getPathStates(db)) if (s.status === 'active' && s.pathId !== def.id) await put(db, { ...s, status: 'paused', updatedAt: iso });
    const state: PathState = {
      pathId: def.id, startedAt: dayKey(now, dayRolloverHour), status: 'active', shiftDays: 0, completed: {},
      ...(generated ? { snapshot: def } : {}), updatedAt: iso,
    };
    await put(db, state);
    await refreshPlan(db, now);
    return state;
  });
}

async function change(id: string, db: StudioDB, now: Date, fn: (s: PathState) => Partial<PathState>) {
  await db.transaction('rw', db.pathState, db.dailyPlans, db.settings, async () => {
    const s = await getPathState(id, db);
    if (!s) return;
    await put(db, { ...s, ...fn(s), updatedAt: now.toISOString() });
    await refreshPlan(db, now);
  });
}

export const setItem = (id: string, key: string, on: boolean, db: StudioDB = defaultDb, now = new Date()) =>
  change(id, db, now, (s) => {
    const completed = { ...s.completed };
    if (on) completed[key] = true;
    else delete completed[key];
    return { completed };
  });

export const shiftPath = (id: string, days: number, db: StudioDB = defaultDb, now = new Date()) =>
  change(id, db, now, (s) => ({ shiftDays: Math.max(0, s.shiftDays + days) }));

export const applyCompress = (id: string, r: CompressResult, db: StudioDB = defaultDb, now = new Date()) =>
  change(id, db, now, (s) => ({ moved: { ...s.moved, ...r.moved }, dropped: [...new Set([...(s.dropped ?? []), ...r.dropped])] }));

/** Pause, resume (pauses any other active path) or mark done. */
export async function setPathStatus(id: string, status: PathState['status'], db: StudioDB = defaultDb, now = new Date()) {
  if (status === 'active') {
    for (const s of await getPathStates(db)) if (s.status === 'active' && s.pathId !== id) await change(s.pathId, db, now, () => ({ status: 'paused' }));
  }
  await change(id, db, now, () => ({ status }));
}

export const deletePathState = (id: string, db: StudioDB = defaultDb) => db.pathState.delete(id);
