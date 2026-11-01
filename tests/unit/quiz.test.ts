import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { saveQuizResult } from '../../src/db/quiz';
import { StudioDB } from '../../src/db/schema';

it('saves a predict result and bumps the activity day', async () => {
  const db = new StudioDB(`quiz-${Math.random()}`);
  const now = new Date(2026, 10, 1, 12, 0);
  await saveQuizResult({ kind: 'predict', itemId: 'bubble-sort:3', conceptId: 'sorting', correct: true, answer: 'Yes', durationMs: 900 }, db, now);
  await saveQuizResult({ kind: 'predict', itemId: 'bubble-sort:4', conceptId: 'sorting', correct: false, answer: 'No', durationMs: 500 }, db, now);
  expect(await db.quizResults.count()).toBe(2);
  const day = await db.activityDays.get('2026-11-01');
  expect(day).toMatchObject({ quizzes: 2, quizCorrect: 1 });
});
