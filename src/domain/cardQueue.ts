// Pure session queue (PRD §14.8): learning/relearning due, then review due by due date, with new cards
// interleaved about 1 per 4 reviews up to the daily new limit.
export interface QueueCard {
  id: string;
  due: string;
  state: 0 | 1 | 2 | 3;
  suspended: boolean;
  hidden?: boolean;
}

export interface QueueInput {
  cards: QueueCard[];
  now: Date;
  newLimit: number;
  newDoneToday: number;
  /** 0 = unlimited. */
  maxReviews: number;
  reviewsDoneToday: number;
}

export function buildQueue(i: QueueInput): string[] {
  const live = i.cards.filter((c) => !c.suspended && !c.hidden);
  const due = (c: QueueCard) => new Date(c.due).getTime() <= i.now.getTime();
  const byDue = (a: QueueCard, b: QueueCard) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id);
  const learning = live.filter((c) => (c.state === 1 || c.state === 3) && due(c)).sort(byDue);
  const reviews = live.filter((c) => c.state === 2 && due(c)).sort(byDue);
  const room = i.maxReviews > 0 ? Math.max(0, i.maxReviews - i.reviewsDoneToday) : Infinity;
  const review = [...learning, ...reviews].slice(0, room).map((c) => c.id);
  const fresh = live
    .filter((c) => c.state === 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, Math.max(0, i.newLimit - i.newDoneToday))
    .map((c) => c.id);

  const out: string[] = [];
  let n = 0;
  for (const id of review) {
    out.push(id);
    if (++n % 4 === 0 && fresh.length) out.push(fresh.shift()!);
  }
  return [...out, ...fresh];
}
