import type { ProblemSummary, Sheet } from '../content/types';

/** Resolve aliases (renamed ids) and equivalentTo (same problem on another site) to the canonical id. */
export function canonicalId(
  id: string,
  aliases: Record<string, string>,
  byId: ReadonlyMap<string, Pick<ProblemSummary, 'equivalentTo'>>,
): string {
  const cur = aliases[id] ?? id;
  const eq = byId.get(cur)?.equivalentTo;
  return eq ? (aliases[eq] ?? eq) : cur;
}

export interface SheetLike {
  sections: { title: string; problems: string[] }[];
}

export const sheetProblemIds = (s: SheetLike, canon: (id: string) => string = (x) => x) =>
  [...new Set(s.sections.flatMap((sec) => sec.problems.map(canon)))];

export interface Progress {
  solved: number;
  total: number;
}

export function sheetProgress(
  s: SheetLike,
  solved: ReadonlySet<string>,
  canon: (id: string) => string = (x) => x,
): { overall: Progress; sections: (Progress & { title: string })[] } {
  const sections = s.sections.map((sec) => {
    const ids = [...new Set(sec.problems.map(canon))];
    return { title: sec.title, total: ids.length, solved: ids.filter((i) => solved.has(i)).length };
  });
  const all = sheetProblemIds(s, canon);
  return { overall: { total: all.length, solved: all.filter((i) => solved.has(i)).length }, sections };
}

export interface Overlap {
  both: string[];
  onlyA: string[];
  onlyB: string[];
  /** Share of B that finishing A already covers (0-1). */
  coversB: number;
  solved: { both: number; onlyA: number; onlyB: number };
}

export function overlap(
  a: SheetLike | Sheet,
  b: SheetLike | Sheet,
  solved: ReadonlySet<string>,
  canon: (id: string) => string = (x) => x,
): Overlap {
  const A = sheetProblemIds(a, canon);
  const B = new Set(sheetProblemIds(b, canon));
  const aSet = new Set(A);
  const both = A.filter((x) => B.has(x));
  const onlyA = A.filter((x) => !B.has(x));
  const onlyB = [...B].filter((x) => !aSet.has(x));
  const count = (xs: string[]) => xs.filter((x) => solved.has(x)).length;
  return {
    both, onlyA, onlyB,
    coversB: B.size ? both.length / B.size : 0,
    solved: { both: count(both), onlyA: count(onlyA), onlyB: count(onlyB) },
  };
}
