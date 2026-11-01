// Badges are derived from your data, never stored (PRD 14.11). Each has a pure `earned(state)`.

export interface BadgeState {
  solvedCount: number;
  firstSolveAt?: string;
  longestStreak: number;
  conceptsMastered: number;
  /** tracks where every concept has mastery >= 0.8 */
  tracksMastered: number;
  /** best sheet completion, 0-1 */
  bestSheetPct: number;
  reviews: number;
  bestQuizRun: number;
  patternAnswers: number;
  patternAccuracy: number;
  perfectWeeks: number;
}

export interface Badge {
  id: string;
  title: string;
  hint: string;
  earned: (s: BadgeState) => boolean;
}

const solved = (n: number): Badge => ({ id: `solved-${n}`, title: `${n} problems solved`, hint: `Solve ${n} problems`, earned: (s) => s.solvedCount >= n });
const streak = (n: number): Badge => ({ id: `streak-${n}`, title: `${n}-day streak`, hint: `Be active ${n} days in a row`, earned: (s) => s.longestStreak >= n });

export const BADGES: Badge[] = [
  { id: 'first-solve', title: 'First solve', hint: 'Solve your first problem', earned: (s) => s.solvedCount >= 1 },
  ...[10, 50, 100, 250, 500].map(solved),
  ...[7, 30, 100].map(streak),
  { id: 'first-mastered', title: 'First concept mastered', hint: 'Reach 80% mastery on a concept', earned: (s) => s.conceptsMastered >= 1 },
  { id: 'track-mastered', title: 'Track mastered', hint: 'Master every concept in a track', earned: (s) => s.tracksMastered >= 1 },
  { id: 'sheet-25', title: 'Sheet 25%', hint: 'Finish a quarter of a sheet', earned: (s) => s.bestSheetPct >= 0.25 },
  { id: 'sheet-50', title: 'Sheet 50%', hint: 'Finish half of a sheet', earned: (s) => s.bestSheetPct >= 0.5 },
  { id: 'sheet-100', title: 'Sheet complete', hint: 'Finish a whole sheet', earned: (s) => s.bestSheetPct >= 1 },
  { id: 'reviews-100', title: '100 reviews', hint: 'Review 100 cards', earned: (s) => s.reviews >= 100 },
  { id: 'reviews-1000', title: '1000 reviews', hint: 'Review 1000 cards', earned: (s) => s.reviews >= 1000 },
  { id: 'quiz-20', title: '20 correct in a row', hint: 'Answer 20 quiz questions correctly in a row', earned: (s) => s.bestQuizRun >= 20 },
  { id: 'pattern-spotter', title: 'Pattern spotter', hint: '90% or better on 50 pattern questions', earned: (s) => s.patternAnswers >= 50 && s.patternAccuracy >= 0.9 },
  { id: 'perfect-week', title: 'Perfect week', hint: 'Meet your weekly goal 4 weeks in a row', earned: (s) => s.perfectWeeks >= 4 },
];

export const earnedBadges = (s: BadgeState) => BADGES.map((b) => ({ ...b, got: b.earned(s) }));
