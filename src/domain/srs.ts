// FSRS wrapper (PRD §14.8). Cards are stored with ISO-string dates; ts-fsrs sees real Dates.
import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from 'ts-fsrs';

export interface FsrsJson {
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3;
  last_review?: string;
}

export type Rating = 1 | 2 | 3 | 4;

const toJson = (c: Card): FsrsJson => ({
  due: c.due.toISOString(), stability: c.stability, difficulty: c.difficulty, scheduled_days: c.scheduled_days,
  learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state as FsrsJson['state'],
  ...(c.last_review ? { last_review: c.last_review.toISOString() } : {}),
});

const fromJson = (j: FsrsJson): Card => ({
  ...j, due: new Date(j.due), state: j.state, ...(j.last_review ? { last_review: new Date(j.last_review) } : { last_review: undefined }),
});

export const newFsrs = (now: Date): FsrsJson => toJson(createEmptyCard(now));

export interface SrsOptions {
  retention: number;
  /** Off in tests so intervals are reproducible. */
  fuzz?: boolean;
}

const scheduler = (o: SrsOptions) =>
  fsrs(generatorParameters({ request_retention: o.retention, enable_fuzz: o.fuzz ?? true }));

export interface ReviewResult {
  fsrs: FsrsJson;
  /** ts-fsrs ReviewLog with dates as ISO strings. */
  log: Record<string, unknown>;
}

export function review(card: FsrsJson, now: Date, rating: Rating, o: SrsOptions): ReviewResult {
  const { card: next, log } = scheduler(o).next(fromJson(card), now, rating as Grade);
  return {
    fsrs: toJson(next),
    log: { ...log, due: log.due.toISOString(), review: log.review.toISOString() },
  };
}

/** Probability of recall right now (0 for a card never reviewed). */
export const retrievability = (card: FsrsJson, now: Date, o: SrsOptions): number =>
  card.reps === 0 ? 0 : scheduler(o).retrievability(fromJson(card), now);
