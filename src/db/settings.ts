import type { StudioDB } from './schema';
import { db as defaultDb } from './schema';
import type { Language } from './types';

export interface Settings {
  language: Language;
  showBothLanguages: boolean;
  theme: 'system' | 'light' | 'dark';
  palette: 'default' | 'colorblind';
  reducedMotion: 'system' | 'on' | 'off';
  dayRolloverHour: number;
  weekStart: 'monday' | 'sunday';
  defaultBudgetMin: 30 | 60 | 90;
  newCardsPerDay: number;
  maxReviewsPerDay: number;
  desiredRetention: number;
  revealGate: boolean;
  autoCardOnNeedReview: boolean;
  autoCardOnQuizMiss: boolean;
  autoCardOnLog: boolean;
  streakMinReviews: number;
  weeklyGoal: { problems: number; reviews: number };
  backupReminderDays: number;
  creditImportedActivity: boolean;
  resurfaceAllSolved: boolean;
  playerSpeed: number;
  confirmDestructive: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'java',
  showBothLanguages: false,
  theme: 'system',
  palette: 'default',
  reducedMotion: 'system',
  dayRolloverHour: 4,
  weekStart: 'monday',
  defaultBudgetMin: 60,
  newCardsPerDay: 10,
  maxReviewsPerDay: 100,
  desiredRetention: 0.9,
  revealGate: true,
  autoCardOnNeedReview: true,
  autoCardOnQuizMiss: true,
  autoCardOnLog: false,
  streakMinReviews: 5,
  weeklyGoal: { problems: 5, reviews: 50 },
  backupReminderDays: 7,
  creditImportedActivity: false,
  resurfaceAllSolved: false,
  playerSpeed: 1,
  confirmDestructive: true,
};

export async function loadSettings(db: StudioDB = defaultDb): Promise<Settings> {
  const rows = await db.settings.toArray();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
  db: StudioDB = defaultDb,
): Promise<void> {
  await db.settings.put({ key, value });
}

/** Creates deviceId / createdAt / schemaVersion on first run (§9.2 meta keys). */
export async function bootstrapMeta(db: StudioDB = defaultDb, now = new Date()): Promise<void> {
  await db.transaction('rw', db.meta, async () => {
    if (!(await db.meta.get('deviceId'))) {
      await db.meta.bulkPut([
        { key: 'deviceId', value: crypto.randomUUID() },
        { key: 'createdAt', value: now.toISOString() },
        { key: 'schemaVersion', value: 1 },
      ]);
    }
  });
}
