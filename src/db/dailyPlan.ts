// Daily plan storage (PRD 13.2): frozen on first generation, regenerated only when the budget changes.
import { dayKey } from '../domain/dates';
import { regenerate, withDone, type DoneContext, type PlanItem } from '../domain/plan';
import { db as defaultDb, type StudioDB } from './schema';
import { loadSettings } from './settings';

export interface StoredPlan {
  date: string;
  budgetMin: number;
  items: PlanItem[];
  generatedAt: string;
}

export const getPlan = async (date: string, db: StudioDB = defaultDb) =>
  (await db.dailyPlans.get(date)) as unknown as StoredPlan | undefined;

/**
 * Today's plan. The first call builds and stores it; later calls return the stored plan untouched,
 * unless `budgetMin` changed, which rebuilds it and keeps finished items finished.
 */
export async function ensurePlan(
  budgetMin: number, build: () => PlanItem[], db: StudioDB = defaultDb, now = new Date(),
): Promise<StoredPlan> {
  const { dayRolloverHour } = await loadSettings(db);
  const date = dayKey(now, dayRolloverHour);
  return db.transaction('rw', db.dailyPlans, async () => {
    const cur = await getPlan(date, db);
    if (cur && cur.budgetMin === budgetMin) return cur;
    const items = cur ? regenerate(build(), cur.items) : build();
    const plan: StoredPlan = { date, budgetMin, items, generatedAt: now.toISOString() };
    await db.dailyPlans.put(plan as never);
    return plan;
  });
}

/** What today's activity says is finished. */
export async function doneContext(db: StudioDB = defaultDb, now = new Date()): Promise<DoneContext> {
  const { dayRolloverHour } = await loadSettings(db);
  const today = dayKey(now, dayRolloverHour);
  const isToday = (iso: unknown) => typeof iso === 'string' && dayKey(new Date(iso), dayRolloverHour) === today;
  const day = await db.activityDays.get(today);
  const attempts = (await db.attempts.toArray()).filter((a) => isToday(a.at));
  const states = await db.conceptState.toArray();
  return {
    reviewsToday: Number(day?.reviews ?? 0),
    quizAnswersToday: Number(day?.quizzes ?? 0),
    attemptedToday: new Set(attempts.map((a) => String(a.problemId))),
    conceptsDone: new Set(
      states.filter((s) => (s.learned || Number(s.vizRuns) > 0) && isToday(s.updatedAt)).map((s) => String(s.conceptId)),
    ),
  };
}

/** Ticks items from today's activity (sticky) and records `planCompleted` once everything is done. */
export async function syncPlan(db: StudioDB = defaultDb, now = new Date()): Promise<StoredPlan | undefined> {
  const { dayRolloverHour } = await loadSettings(db);
  const date = dayKey(now, dayRolloverHour);
  const ctx = await doneContext(db, now);
  return db.transaction('rw', db.dailyPlans, db.activityDays, async () => {
    const cur = await getPlan(date, db);
    if (!cur) return undefined;
    const items = withDone(cur.items, ctx);
    const changed = items.some((it, i) => it.done !== cur.items[i]!.done);
    const plan = changed ? { ...cur, items } : cur;
    if (changed) await db.dailyPlans.put(plan as never);
    if (plan.items.length > 0 && plan.items.every((i) => i.done)) {
      const day = (await db.activityDays.get(date)) ?? {
        date, solved: 0, attempted: 0, reviews: 0, quizzes: 0, quizCorrect: 0, planCompleted: false,
      };
      if (!day.planCompleted) await db.activityDays.put({ ...day, planCompleted: true });
    }
    return plan;
  });
}
