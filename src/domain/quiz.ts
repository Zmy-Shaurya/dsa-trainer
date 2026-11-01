// Quiz selection and answer checking (PRD 14.9). Pure: randomness comes from a seeded generator.
import type { ComplexityItem, GuideCard, LangAnswer, PatternItem } from '../content/types';

export type Rng = () => number;

/** Small deterministic generator (mulberry32). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** String to seed, so a date or an id gives the same shuffle every time. */
export const seedOf = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export const answerFor = (a: LangAnswer, lang: 'java' | 'cpp') => (typeof a === 'string' ? a : a[lang]);

export interface Attempt {
  itemId: string;
  correct: boolean;
  at: string;
}

/** Weight 1 + 2 x (wrong in the last 3 attempts). Unseen items are handled separately (they come first). */
export function weight(history: readonly Attempt[]): number {
  return 1 + 2 * history.slice(-3).filter((h) => !h.correct).length;
}

/**
 * Complexity session: unseen items first, then a weighted draw of the rest. No repeats.
 * `history` is every past attempt, oldest first.
 */
export function pickComplexity(
  items: readonly ComplexityItem[], history: readonly Attempt[], count: number, rng: Rng,
): ComplexityItem[] {
  const by = new Map<string, Attempt[]>();
  for (const h of history) by.set(h.itemId, [...(by.get(h.itemId) ?? []), h]);
  const out: ComplexityItem[] = [];
  const unseen = shuffle(items.filter((i) => !by.has(`cq:${i.id}`)), rng);
  out.push(...unseen.slice(0, count));
  const pool = items.filter((i) => by.has(`cq:${i.id}`));
  while (out.length < count && pool.length) {
    const ws = pool.map((i) => weight(by.get(`cq:${i.id}`)!));
    let r = rng() * ws.reduce((a, b) => a + b, 0);
    let k = 0;
    while (k < pool.length - 1 && (r -= ws[k]!) >= 0) k++;
    out.push(pool.splice(k, 1)[0]!);
  }
  return out;
}

/** A complexity item is right only if both time and space are right (partial credit is recorded as wrong). */
export function gradeComplexity(item: ComplexityItem, lang: 'java' | 'cpp', time: string | null, space: string | null) {
  const timeOk = time === answerFor(item.time, lang);
  const spaceOk = space === answerFor(item.space, lang);
  return { timeOk, spaceOk, correct: timeOk && spaceOk };
}

/** Six shuffled options: the answer plus five distractors (fewer if the item has fewer). */
export function patternOptions(item: PatternItem, rng: Rng): string[] {
  return shuffle([item.answer, ...shuffle(item.distractors, rng).slice(0, 5)], rng);
}

export interface PatternDrill {
  item: PatternItem;
  options: string[];
}

/**
 * Pattern drill: unseen first, then the weakest patterns. `weakFirst` limits the draw to patterns with accuracy under
 * 70% (falls back to everything when none qualify).
 */
export function pickPatterns(
  items: readonly PatternItem[], history: readonly { itemId: string; correct: boolean }[], count: number, rng: Rng,
  opts: { weakOnly?: boolean } = {},
): PatternDrill[] {
  const seen = new Set(history.map((h) => h.itemId));
  const acc = new Map<string, { right: number; total: number }>();
  for (const h of history) {
    const item = items.find((i) => `pq:${i.id}` === h.itemId);
    if (!item) continue;
    const a = acc.get(item.answer) ?? { right: 0, total: 0 };
    a.total++;
    if (h.correct) a.right++;
    acc.set(item.answer, a);
  }
  let pool = [...items];
  if (opts.weakOnly) {
    const weak = pool.filter((i) => { const a = acc.get(i.answer); return a && a.right / a.total < 0.7; });
    if (weak.length) pool = weak;
  }
  const ordered = [...shuffle(pool.filter((i) => !seen.has(`pq:${i.id}`)), rng), ...shuffle(pool.filter((i) => seen.has(`pq:${i.id}`)), rng)];
  return ordered.slice(0, count).map((item) => ({ item, options: patternOptions(item, rng) }));
}

/** The same trap card for everyone on a given day. */
export function trapOfTheDay(cards: readonly GuideCard[], dateKey: string): GuideCard | undefined {
  if (!cards.length) return undefined;
  return [...cards].sort((a, b) => a.id.localeCompare(b.id))[seedOf(dateKey) % cards.length];
}

/** Mini quiz from the guide cards: "which card does this trap belong to?" */
export function trapQuiz(cards: readonly GuideCard[], count: number, rng: Rng) {
  return shuffle(cards, rng).slice(0, count).map((card) => ({
    card,
    options: shuffle([card, ...shuffle(cards.filter((c) => c.id !== card.id), rng).slice(0, 3)], rng).map((c) => ({ id: c.id, title: c.title })),
  }));
}

/** Template page that teaches each pattern (content/templates), where there is one. */
export const TEMPLATE_OF: Record<string, string> = {
  'two-pointers': 'two-pointers', 'sliding-window': 'sliding-window', 'prefix-sum': 'prefix-sum',
  'binary-search': 'binary-search', 'binary-search-on-answer': 'binary-search', 'monotonic-stack': 'monotonic-stack',
  'monotonic-deque': 'monotonic-stack', 'graph-bfs-shortest': 'bfs', 'tree-bfs': 'bfs', 'flood-fill': 'bfs',
  'graph-dfs-components': 'dfs', 'tree-dfs': 'dfs', 'topological-sort': 'topological-sort', 'union-find': 'union-find',
  dijkstra: 'dijkstra', trie: 'trie', 'top-k-heap': 'heap-top-k', 'two-heaps': 'heap-top-k',
  'backtracking-subsets': 'backtracking', 'backtracking-permutations': 'backtracking', 'backtracking-combinations': 'backtracking',
  'dp-1d': 'dp', 'dp-grid': 'dp', 'dp-knapsack': 'dp', 'dp-lis': 'dp', 'dp-lcs': 'dp',
};

export const prettyPattern = (p: string) => p.replace(/-/g, ' ');
