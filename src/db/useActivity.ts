import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dayKey, weekStartKey } from '../domain/dates';
import { goalMet, perfectWeekRun, weekTotals } from '../domain/goals';
import { computeStreak } from '../domain/streak';
import { db } from './schema';
import { useSettings } from './hooks';

export interface Day {
  solved: number;
  attempted: number;
  reviews: number;
  quizzes: number;
  quizCorrect: number;
  planCompleted: boolean;
}

/** ActivityDays plus everything derived from them: today's key, streak replay and weekly goal. */
export function useActivity() {
  const s = useSettings();
  const rows = useLiveQuery(() => db.activityDays.toArray(), [], []);
  return useMemo(() => {
    const today = dayKey(new Date(), s.dayRolloverHour);
    const days = new Map<string, Day>(rows.map((r) => [String(r.date), {
      solved: Number(r.solved), attempted: Number(r.attempted), reviews: Number(r.reviews),
      quizzes: Number(r.quizzes), quizCorrect: Number(r.quizCorrect), planCompleted: !!r.planCompleted,
    }]));
    const streak = computeStreak(days, today, s.streakMinReviews);
    const week = weekTotals(days, weekStartKey(today, s.weekStart));
    return {
      s, today, days, streak, week,
      weekMet: goalMet(week, s.weeklyGoal),
      weekRun: perfectWeekRun(days, today, s.weeklyGoal, s.weekStart),
      frozen: new Set(streak.frozenDays),
    };
  }, [rows, s]);
}
