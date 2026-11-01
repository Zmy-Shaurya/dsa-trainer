import { dayKey } from '../domain/dates';
import { quizMissCard } from './cards';
import { db as defaultDb, type StudioDB } from './schema';
import { loadSettings } from './settings';

export interface QuizResultInput {
  kind: 'complexity' | 'pattern' | 'predict';
  itemId: string;
  conceptId?: string;
  correct: boolean;
  answer: string;
  durationMs: number;
}

/** Saves a QuizResult and bumps today's ActivityDay in one transaction (PRD §9.3). */
export async function saveQuizResult(
  r: QuizResultInput,
  db: StudioDB = defaultDb,
  now = new Date(),
): Promise<void> {
  const { dayRolloverHour } = await loadSettings(db);
  const date = dayKey(now, dayRolloverHour);
  await db.transaction('rw', db.quizResults, db.activityDays, async () => {
    await db.quizResults.put({ id: crypto.randomUUID(), ...r, at: now.toISOString() });
    const day = (await db.activityDays.get(date)) ?? {
      date, solved: 0, attempted: 0, reviews: 0, quizzes: 0, quizCorrect: 0, planCompleted: false,
    };
    day.quizzes = Number(day.quizzes) + 1;
    day.quizCorrect = Number(day.quizCorrect) + (r.correct ? 1 : 0);
    await db.activityDays.put(day);
  });
}

/** What a wrong answer turns into: a flashcard (PRD 14.8, setting `autoCardOnQuizMiss`). */
export interface MissCard {
  id: string;
  front: string;
  back: string;
  conceptId?: string;
}

/** Saves the result and, on a wrong answer, makes a quiz-miss card when the setting is on. */
export async function recordQuizAnswer(
  r: QuizResultInput, miss?: MissCard, db: StudioDB = defaultDb, now = new Date(),
): Promise<void> {
  await saveQuizResult(r, db, now);
  if (!r.correct && miss && (await loadSettings(db)).autoCardOnQuizMiss) await quizMissCard(miss, db, now);
}
