import 'fake-indexeddb/auto';
import { createEmptyCard, fsrs, generatorParameters, type Grade } from 'ts-fsrs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addConceptToDeck, allCards, allLogs, createUserCard, deleteCards, doneToday, needReviewCard, quizMissCard, reviewCard, setSuspended,
  syncAuthored, syncIfChanged, undoReview, updateCard, type CardRecord,
} from '../../src/db/cards';
import { StudioDB } from '../../src/db/schema';
import { buildQueue, type QueueCard } from '../../src/domain/cardQueue';
import { countByState, forecast, retentionRate, reviewsPerDay } from '../../src/domain/cardStats';
import { toView } from '../../src/domain/cardView';
import { newFsrs, retrievability, review, type Rating } from '../../src/domain/srs';

const t0 = new Date(2026, 10, 1, 10, 0);
const min = (m: number) => new Date(t0.getTime() + m * 60_000);
const day = (d: number) => new Date(t0.getTime() + d * 86_400_000);

describe('srs wrapper matches ts-fsrs', () => {
  it('gives the same schedule as ts-fsrs for a mixed rating sequence (fuzz off)', () => {
    const ratings: Rating[] = [3, 3, 1, 3, 4, 2, 3, 3];
    const ref = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: false }));
    let refCard = createEmptyCard(t0);
    let mine = newFsrs(t0);
    let now = t0;
    for (const r of ratings) {
      now = new Date(Math.max(now.getTime(), refCard.due.getTime()));
      refCard = ref.next(refCard, now, r as Grade).card;
      mine = review(mine, now, r, { retention: 0.9, fuzz: false }).fsrs;
      expect(mine.due).toBe(refCard.due.toISOString());
      expect(mine.stability).toBeCloseTo(refCard.stability, 10);
      expect(mine.difficulty).toBeCloseTo(refCard.difficulty, 10);
      expect(mine.state).toBe(refCard.state);
      expect(mine.reps).toBe(refCard.reps);
      expect(mine.lapses).toBe(refCard.lapses);
    }
  });
  it('is deterministic and survives JSON', () => {
    const a = review(newFsrs(t0), t0, 3, { retention: 0.9, fuzz: false }).fsrs;
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
    expect(review(newFsrs(t0), t0, 3, { retention: 0.9, fuzz: false }).fsrs).toEqual(a);
  });
  it('higher desired retention schedules sooner', () => {
    let lo = newFsrs(t0), hi = newFsrs(t0);
    for (const m of [0, 15, 60 * 24 * 3]) {
      lo = review(lo, min(m), 3, { retention: 0.8, fuzz: false }).fsrs;
      hi = review(hi, min(m), 3, { retention: 0.97, fuzz: false }).fsrs;
    }
    expect(new Date(hi.due).getTime()).toBeLessThan(new Date(lo.due).getTime());
  });
  it('retrievability: 0 when new, near the target at the due date, falling after', () => {
    expect(retrievability(newFsrs(t0), t0, { retention: 0.9 })).toBe(0);
    let c = newFsrs(t0);
    for (const m of [0, 15]) c = review(c, min(m), 3, { retention: 0.9, fuzz: false }).fsrs;
    const atDue = retrievability(c, new Date(c.due), { retention: 0.9 });
    expect(atDue).toBeGreaterThan(0.85);
    expect(retrievability(c, new Date(new Date(c.due).getTime() + 30 * 86_400_000), { retention: 0.9 })).toBeLessThan(atDue);
  });
  it('Again on a review card counts a lapse and enters relearning', () => {
    let c = newFsrs(t0);
    for (const m of [0, 15, 60 * 24 * 2]) c = review(c, min(m), 3, { retention: 0.9, fuzz: false }).fsrs;
    expect(c.state).toBe(2);
    const lapsed = review(c, new Date(c.due), 1, { retention: 0.9, fuzz: false }).fsrs;
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.state).toBe(3);
  });
});

describe('buildQueue', () => {
  const q = (id: string, state: QueueCard['state'], dueMin: number, extra: Partial<QueueCard> = {}): QueueCard => ({
    id, state, due: min(dueMin).toISOString(), suspended: false, ...extra,
  });
  const base = { now: t0, newLimit: 10, newDoneToday: 0, maxReviews: 100, reviewsDoneToday: 0 };

  it('orders learning, then reviews by due date, with 1 new per 4 reviews', () => {
    const cards = [
      q('r3', 2, -30), q('r1', 2, -300), q('r2', 2, -100), q('r4', 2, -10), q('r5', 2, -5),
      q('l1', 1, -1), q('n1', 0, 0), q('n2', 0, 0),
    ];
    expect(buildQueue({ ...base, cards })).toEqual(['l1', 'r1', 'r2', 'r3', 'n1', 'r4', 'r5', 'n2']);
  });
  it('skips suspended, hidden and not-yet-due cards', () => {
    const cards = [q('a', 2, 60), q('b', 2, -1, { suspended: true }), q('c', 2, -1, { hidden: true }), q('d', 2, -1)];
    expect(buildQueue({ ...base, cards })).toEqual(['d']);
  });
  it('respects the new-card limit minus what was already done today', () => {
    const cards = ['a', 'b', 'c'].map((id) => q(id, 0, 0));
    expect(buildQueue({ ...base, cards, newLimit: 2, newDoneToday: 1 })).toEqual(['a']);
    expect(buildQueue({ ...base, cards, newLimit: 2, newDoneToday: 2 })).toEqual([]);
  });
  it('caps reviews per day, 0 meaning unlimited', () => {
    const cards = ['a', 'b', 'c'].map((id, i) => q(id, 2, -10 - i));
    expect(buildQueue({ ...base, cards, maxReviews: 2, reviewsDoneToday: 1 })).toHaveLength(1);
    expect(buildQueue({ ...base, cards, maxReviews: 0, reviewsDoneToday: 999 })).toHaveLength(3);
  });
});

describe('toView', () => {
  it('renders each card type', () => {
    expect(toView({ id: 1, type: 'basic', front: 'F', back: 'B' })).toEqual({ type: 'basic', question: 'F', answer: 'B' });
    expect(toView({ id: 2, type: 'cloze', text: 'A {{c1::hole}} here' })).toEqual({ type: 'cloze', question: 'A […] here', answer: 'hole', filled: 'A hole here' });
    expect(toView({ type: 'cloze', clozeText: 'x {{c1::y}}' })?.answer).toBe('y');
    const code = { java: 'a ____', cpp: 'b ____' };
    expect(toView({ id: 3, type: 'code', prompt: 'P', code, answer: 'A' })).toMatchObject({ type: 'code', code, answer: 'A' });
    expect(toView({ id: 4, type: 'complexity', prompt: 'P', answer: 'O(1)' })?.question).toBe('P');
  });
  it('returns null for incomplete cards', () => {
    expect(toView({ id: 1, type: 'basic', front: 'F' })).toBeNull();
    expect(toView({ id: 2, type: 'cloze', text: 'no hole' })).toBeNull();
  });
});

describe('stats', () => {
  const key = (d: Date) => d.toISOString().slice(0, 10);
  it('counts reviews per day and retention', () => {
    const logs = [{ at: t0.toISOString(), rating: 3 as const }, { at: t0.toISOString(), rating: 1 as const }, { at: day(-1).toISOString(), rating: 4 as const }, { at: day(-60).toISOString(), rating: 1 as const }];
    const r = reviewsPerDay(logs, t0, 3, key);
    expect(r.map((x) => x.count)).toEqual([0, 1, 2]);
    expect(retentionRate(logs, t0, 30)).toBeCloseTo(2 / 3);
    expect(retentionRate([], t0)).toBeNull();
  });
  it('counts states and forecasts due cards (overdue falls on today)', () => {
    const cards = [
      { due: day(-2).toISOString(), state: 2 as const, suspended: false },
      { due: day(1).toISOString(), state: 2 as const, suspended: false },
      { due: day(1).toISOString(), state: 2 as const, suspended: true },
      { due: t0.toISOString(), state: 0 as const, suspended: false },
      { due: day(40).toISOString(), state: 2 as const, suspended: false },
    ];
    const f = forecast(cards, t0, 30);
    expect(f[0]).toBe(1);
    expect(f[1]).toBe(1);
    expect(f.reduce((a, b) => a + b, 0)).toBe(2);
    expect(countByState(cards)).toEqual({ new: 1, learning: 0, review: 4, suspended: 1 });
  });
});

describe('card repository', () => {
  let db: StudioDB;
  beforeEach(() => { db = new StudioDB(`cards-${Math.random()}`); });
  const get = async (id: string) => (await db.cards.get(id)) as unknown as CardRecord;

  it('sync adds new authored cards suspended, orphans removed ones, restores returning ones', async () => {
    await syncAuthored({ hashing: [1, 2], stack: [1] }, db, t0);
    expect((await allCards(db)).every((c) => c.suspended && c.source === 'authored')).toBe(true);
    await addConceptToDeck('hashing', db, t0);
    await syncAuthored({ hashing: [1] }, db, t0);
    expect((await get('c:hashing:2')).orphaned).toBe(true);
    expect((await get('c:hashing:1')).suspended).toBe(false);
    expect((await get('c:stack:1')).orphaned).toBe(true);
    await syncAuthored({ hashing: [1, 2], stack: [1] }, db, t0);
    expect((await get('c:hashing:2')).orphaned).toBe(false);
  });

  it('sync keeps scheduling state and only runs when the content version changes', async () => {
    await syncIfChanged('v1', { hashing: [1] }, db, t0);
    await addConceptToDeck('hashing', db, t0);
    await reviewCard('c:hashing:1', 3, 1000, db, t0, false);
    const before = await get('c:hashing:1');
    await syncIfChanged('v1', { hashing: [1, 2] }, db, t0);
    expect(await db.cards.get('c:hashing:2')).toBeUndefined();
    await syncIfChanged('v2', { hashing: [1, 2] }, db, t0);
    expect(await db.cards.get('c:hashing:2')).toBeDefined();
    expect((await get('c:hashing:1')).fsrs).toEqual(before.fsrs);
  });

  it('reviewing writes the card, a log and today\'s activity; undo restores all of it exactly', async () => {
    await syncAuthored({ hashing: [1] }, db, t0);
    await addConceptToDeck('hashing', db, t0);
    const before = await get('c:hashing:1');
    const activityBefore = await db.activityDays.toArray();
    await reviewCard('c:hashing:1', 3, 4200, db, t0, false);
    const after = await get('c:hashing:1');
    expect(after.state).not.toBe(0);
    expect(after.due).toBe(after.fsrs.due);
    expect(await allLogs(db)).toHaveLength(1);
    expect((await db.activityDays.get('2026-11-01'))!.reviews).toBe(1);
    expect(await doneToday(db, t0)).toEqual({ reviews: 1, fresh: 1 });

    expect(await undoReview(db)).toBe('c:hashing:1');
    expect(await get('c:hashing:1')).toEqual(before);
    expect(await allLogs(db)).toHaveLength(0);
    expect(await db.activityDays.toArray()).toEqual(activityBefore.length ? activityBefore : [expect.objectContaining({ reviews: 0 })]);
    expect(await undoReview(db)).toBeNull();
  });

  it('suspends a card automatically at 8 lapses (leech)', async () => {
    await syncAuthored({ hashing: [1] }, db, t0);
    await addConceptToDeck('hashing', db, t0);
    const c = await get('c:hashing:1');
    const due = new Date(Date.now() - 1000);
    await db.cards.put({ ...c, state: 2, fsrs: { ...c.fsrs, state: 2, reps: 9, lapses: 7, stability: 5, difficulty: 5, due: due.toISOString(), last_review: new Date(due.getTime() - 5 * 86_400_000).toISOString() } } as never);
    const r = await reviewCard('c:hashing:1', 1, 500, db, new Date(), false);
    expect(r.leech).toBe(true);
    expect((await get('c:hashing:1')).suspended).toBe(true);
  });

  it('user and generated cards: create, edit, dedupe, delete; authored cards are protected', async () => {
    const u = await createUserCard({ type: 'basic', front: 'a', back: 'b' }, db, t0);
    await updateCard(u.id, { back: 'c' }, db, t0);
    expect((await get(u.id)).back).toBe('c');
    const p = { id: 'two-sum', title: 'Two Sum', insight: 'seen map' };
    expect(await needReviewCard(p, db, t0)).toBe(true);
    expect(await needReviewCard(p, db, t0)).toBe(false);
    expect((await get('p:two-sum:insight')).front).toBe('Key idea of Two Sum?');
    await quizMissCard({ id: 'loops-3', front: 'Time?', back: 'O(n)' }, db, t0);
    await syncAuthored({ hashing: [1] }, db, t0);
    await deleteCards([u.id, 'c:hashing:1'], db);
    expect(await db.cards.get(u.id)).toBeUndefined();
    expect(await db.cards.get('c:hashing:1')).toBeDefined();
    await updateCard('c:hashing:1', { back: 'hack' }, db, t0);
    expect((await get('c:hashing:1')).back).toBeUndefined();
    await setSuspended(['c:hashing:1'], false, db, t0);
    expect((await get('c:hashing:1')).suspended).toBe(false);
  });

  it('export round-trips cards and logs', async () => {
    const { exportAll, importReplace, clearAll } = await import('../../src/db/export');
    await syncAuthored({ hashing: [1] }, db, t0);
    await addConceptToDeck('hashing', db, t0);
    await reviewCard('c:hashing:1', 3, 10, db, t0, false);
    const before = await exportAll(db, t0);
    await clearAll(db);
    await importReplace(JSON.parse(JSON.stringify(before)), db);
    expect(await exportAll(db, t0)).toEqual(before);
    expect(before.data.reviewLogs).toHaveLength(1);
  });
});

describe('auto cards', () => {
  it('follow the settings and never duplicate', async () => {
    const { autoCards } = await import('../../src/db/cards');
    const { setSetting } = await import('../../src/db/settings');
    const db = new StudioDB(`auto-${Math.random()}`);
    const p = { id: 'two-sum', title: 'Two Sum', insight: 'seen map' };
    await autoCards(p, { confidence: 'cleared', solved: true }, db, t0);
    expect(await db.cards.count()).toBe(0);                       // autoCardOnLog is off by default
    await autoCards(p, { confidence: 'need_review' }, db, t0);
    await autoCards(p, { confidence: 'dont_understand' }, db, t0);
    expect((await db.cards.get('p:two-sum:insight')) as unknown as CardRecord).toMatchObject({ source: 'generated', back: 'seen map' });
    expect(await db.cards.count()).toBe(1);
    await setSetting('autoCardOnNeedReview', false, db);
    await autoCards({ ...p, id: 'x' }, { confidence: 'need_review' }, db, t0);
    expect(await db.cards.get('p:x:insight')).toBeUndefined();
    await setSetting('autoCardOnLog', true, db);
    await autoCards({ id: 'y', title: 'Y' }, { solved: true }, db, t0);
    expect(((await db.cards.get('p:y:review')) as unknown as CardRecord).back).toMatch(/key idea/);
  });
});
