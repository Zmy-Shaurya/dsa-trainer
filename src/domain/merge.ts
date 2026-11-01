// Merge import rules (PRD 10.4). Pure: takes rows, returns the rows to write plus a report.
export type Row = Record<string, unknown>;

export interface MergeNote {
  table: string;
  key: string;
  action: 'added' | 'replaced-local' | 'kept-local';
}

const stamp = (r: Row) => String(r.updatedAt ?? r.viewedAt ?? '');

/** Per key, the record with the newer `updatedAt` wins; ties keep local. Only differing records are reported. */
export function mergeNewer(table: string, pk: string, local: Row[], incoming: Row[]): { put: Row[]; notes: MergeNote[] } {
  const mine = new Map(local.map((r) => [String(r[pk]), r]));
  const put: Row[] = [];
  const notes: MergeNote[] = [];
  for (const r of incoming) {
    const key = String(r[pk]);
    const cur = mine.get(key);
    if (!cur) {
      put.push(r);
      notes.push({ table, key, action: 'added' });
    } else if (stamp(r) > stamp(cur)) {
      put.push(r);
      notes.push({ table, key, action: 'replaced-local' });
    } else if (JSON.stringify(r) !== JSON.stringify(cur)) {
      notes.push({ table, key, action: 'kept-local' });
    }
  }
  return { put, notes };
}

/** Union by key: records only on the incoming side are added; existing ones are never touched. */
export function mergeUnion(pk: string, local: Row[], incoming: Row[]): Row[] {
  const have = new Set(local.map((r) => String(r[pk])));
  return incoming.filter((r) => !have.has(String(r[pk])));
}

export interface DayRebuildInput {
  attempts: Row[];
  reviewLogs: Row[];
  quizResults: Row[];
  /** day keys whose plan was completed on either side */
  planDone: ReadonlySet<string>;
  dayOf: (iso: string) => string;
}

/**
 * ActivityDays is a cache. Recomputed from the logs; bulk-imported attempts carry no real activity
 * and contribute nothing (PRD 14.7).
 */
export function rebuildActivityDays(i: DayRebuildInput): Row[] {
  const days = new Map<string, Row>();
  const day = (date: string) => {
    let d = days.get(date);
    if (!d) days.set(date, (d = { date, solved: 0, attempted: 0, reviews: 0, quizzes: 0, quizCorrect: 0, planCompleted: i.planDone.has(date) }));
    return d;
  };
  const bump = (d: Row, k: string) => void (d[k] = Number(d[k]) + 1);
  for (const a of i.attempts) {
    if (a.imported) continue;
    const d = day(i.dayOf(String(a.at)));
    bump(d, 'attempted');
    if (a.outcome === 'solved') bump(d, 'solved');
  }
  for (const l of i.reviewLogs) bump(day(i.dayOf(String(l.at))), 'reviews');
  for (const q of i.quizResults) {
    const d = day(i.dayOf(String(q.at)));
    bump(d, 'quizzes');
    if (q.correct) bump(d, 'quizCorrect');
  }
  for (const date of i.planDone) day(date);
  return [...days.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
