// Break it (PRD 14.2.5): flawed implementations the learner tries to defeat. Pure and independent of the step engine.
import { traversals } from './algos/trees';
import { coinChange, } from './algos/dp';
import { parseInput } from './input';
import { fail, ok, parseGraph, type GraphInput, type Parsed } from './parse';
import type { Lang } from './types';

export interface BreakResult {
  broken: boolean;
  flawed: string;
  reference: string;
  /** one sentence about what happened on this input */
  why: string;
}

export interface Challenge<I = unknown> {
  id: string;
  /** the visualizer this challenge belongs to */
  algoId: string;
  title: string;
  goal: 'wrong-output' | 'worst-case';
  task: string;
  help: string;
  /** an input the flawed code gets right */
  start: string;
  /** a counterexample ("Show me") */
  show: string;
  hint: string;
  lesson: string;
  code: Record<Lang, string>;
  parse(text: string): Parsed<I>;
  run(input: I): BreakResult;
}

const INF = Number.POSITIVE_INFINITY;

// ------------------------------------------------------ 1. greedy coin change
interface CoinIn { coins: number[]; amount: number }
export const greedyCoins = (coins: number[], amount: number): number => {
  let left = amount;
  let n = 0;
  for (const c of [...coins].sort((a, b) => b - a)) { n += Math.floor(left / c); left %= c; }
  return left === 0 ? n : -1;
};
export const bestCoins = (coins: number[], amount: number): number => {
  const dp = Array<number>(amount + 1).fill(INF);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a]!, dp[a - c]! + 1);
  return dp[amount] === INF ? -1 : dp[amount]!;
};
const coinsChallenge: Challenge<CoinIn> = {
  id: 'greedy-coin-change', algoId: 'coin-change-dp', title: 'Greedy coin change', goal: 'wrong-output',
  task: 'This code always takes the largest coin that still fits. Find coins and an amount where it uses more coins than necessary (or gives up when an answer exists).',
  help: 'Coin values, then | amount = N: 1, 5, 10 | amount = 12',
  start: '1, 5, 10 | amount = 12', show: '1, 3, 4 | amount = 6',
  hint: 'Greedy is only safe when every coin is a multiple-ish of the one below it. Try coins where a big coin leaves an awkward remainder, like 4 with 6.',
  lesson: 'With coins 1, 3, 4 and amount 6, greedy takes 4+1+1 (three coins) but 3+3 needs only two. A locally best choice can block a better global one, so use dynamic programming.',
  code: {
    java: `int greedy(int[] coins, int amount) {   // coins sorted, largest first
    int count = 0;
    for (int c : coins) {
        count += amount / c;
        amount %= c;
    }
    return amount == 0 ? count : -1;
}`,
    cpp: `int greedy(vector<int> coins, int amount) {   // coins sorted, largest first
    int count = 0;
    for (int c : coins) {
        count += amount / c;
        amount %= c;
    }
    return amount == 0 ? count : -1;
}`,
  },
  parse: (t) => coinChange.custom!.parse(t),
  run({ coins, amount }) {
    const g = greedyCoins(coins, amount);
    const b = bestCoins(coins, amount);
    return { broken: g !== b, flawed: g < 0 ? 'no answer' : `${g} coins`, reference: b < 0 ? 'no answer' : `${b} coins`, why: g === b ? 'Greedy got it right this time.' : g < 0 ? 'Greedy got stuck with a remainder it cannot make.' : `Greedy used ${g} coins; ${b} is possible.` };
  },
};

// ------------------------------------------------- 2. binary search, lo < hi
interface BsIn { arr: number[]; target: number }
export const flawedBinary = (a: number[], t: number): number => {
  let lo = 0;
  let hi = a.length - 1;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (a[mid] === t) return mid;
    if (a[mid]! < t) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
};
const binaryChallenge: Challenge<BsIn> = {
  id: 'binary-search-lt', algoId: 'binary-search', title: 'Binary search with lo < hi', goal: 'wrong-output',
  task: 'This binary search loops while lo < hi instead of lo <= hi. Find a sorted array and a target that IS present but the code returns -1.',
  help: 'Sorted numbers and a target: 1, 3, 5, 7 | target = 5',
  start: '1, 3, 5, 7, 9 | target = 5', show: '4 | target = 4',
  hint: 'What happens when the range shrinks to a single element? Try an array with just one number, or search for the last element of a two-number array.',
  lesson: 'When lo == hi there is still one candidate left, but `lo < hi` stops before checking it. Use `lo <= hi` with `hi = mid - 1`, or switch to the half-open form `lo < hi` with `hi = mid`.',
  code: {
    java: `int binarySearch(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {                 // BUG: skips the lo == hi case
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
    cpp: `int binarySearch(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo < hi) {                 // BUG: skips the lo == hi case
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
  },
  parse: (t) => { const r = parseInput(t.includes('|') ? t.replace('|', ', ') : t, { sorted: true, target: true }); return r.ok ? ok({ arr: r.value.arr, target: r.value.target ?? 0 }) : r; },
  run({ arr, target }) {
    const got = flawedBinary(arr, target);
    const present = arr.includes(target);
    const flawed = got >= 0 && arr[got] === target ? 'found' : 'not found';
    const reference = present ? 'found' : 'not found';
    return { broken: flawed !== reference, flawed, reference, why: flawed === reference ? 'The loop happened to check every candidate.' : `${target} is in the array, but the loop ended with lo == hi unchecked.` };
  },
};

// ---------------------------------------------------- 3. BST validation
interface TreeIn { levels: (number | null)[] }
const kids = (l: (number | null)[], i: number): [number | null, number | null] => [l[2 * i + 1] ?? null, l[2 * i + 2] ?? null];
export const flawedIsBst = (l: (number | null)[], i = 0): boolean => {
  if (l[i] == null) return true;
  const [a, b] = kids(l, i);
  if (a !== null && a >= l[i]!) return false;
  if (b !== null && b <= l[i]!) return false;
  return flawedIsBst(l, 2 * i + 1) && flawedIsBst(l, 2 * i + 2);
};
export const isBst = (l: (number | null)[], i = 0, lo = -INF, hi = INF): boolean => {
  if (l[i] == null) return true;
  const v = l[i]!;
  return v > lo && v < hi && isBst(l, 2 * i + 1, lo, v) && isBst(l, 2 * i + 2, v, hi);
};
const bstChallenge: Challenge<TreeIn> = {
  id: 'bst-validate-children', algoId: 'bst-insert-search-delete', title: 'Validate a BST', goal: 'wrong-output',
  task: 'This validator only compares each node with its direct children. Build a tree (level order, null for gaps) that is NOT a valid BST but that it accepts.',
  help: 'Level order with null: 5, 3, 8, 1, 4, 6, 9',
  start: '5, 3, 8, 1, 4, 6, 9', show: '10, 5, 15, null, null, 6, 20',
  hint: 'A BST needs every node in the left subtree smaller than the root, not just the left child. Put a small value deep inside the right subtree.',
  lesson: 'In 10, 5, 15, null, null, 6, 20 every parent-child pair looks fine, but 6 sits in the right subtree of 10 and is smaller than 10. Carry a (min, max) range down the recursion instead of looking at children only.',
  code: {
    java: `boolean isValid(Node t) {
    if (t == null) return true;
    if (t.left != null && t.left.val >= t.val) return false;     // only looks one level down
    if (t.right != null && t.right.val <= t.val) return false;
    return isValid(t.left) && isValid(t.right);
}`,
    cpp: `bool isValid(Node* t) {
    if (t == nullptr) return true;
    if (t->left != nullptr && t->left->val >= t->val) return false;     // only looks one level down
    if (t->right != nullptr && t->right->val <= t->val) return false;
    return isValid(t->left) && isValid(t->right);
}`,
  },
  parse: (t) => traversals.custom!.parse(t),
  run({ levels }) {
    const f = flawedIsBst(levels);
    const g = isBst(levels);
    return { broken: f !== g, flawed: f ? 'valid BST' : 'not a BST', reference: g ? 'valid BST' : 'not a BST', why: f === g ? 'Both agree on this tree.' : 'Some value breaks the ordering against an ancestor, which the child-only check never compares.' };
  },
};

// ------------------------------------------------ 4. Dijkstra, negative edge
export const flawedDijkstra = (g: GraphInput): number[] => {
  const dist = Array<number>(g.n).fill(INF);
  const done = Array<boolean>(g.n).fill(false);
  dist[g.start] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < g.n; i++) if (!done[i] && dist[i]! < INF && (u < 0 || dist[i]! < dist[u]!)) u = i;
    if (u < 0) break;
    done[u] = true;
    for (const e of g.edges) if (e.from === u && dist[u]! + e.weight < dist[e.to]!) dist[e.to] = dist[u]! + e.weight;
  }
  return dist;
};
export const bellman = (g: GraphInput): number[] | null => {
  const d = Array<number>(g.n).fill(INF);
  d[g.start] = 0;
  for (let i = 0; i < g.n - 1; i++) for (const e of g.edges) if (d[e.from]! + e.weight < d[e.to]!) d[e.to] = d[e.from]! + e.weight;
  return g.edges.some((e) => d[e.from]! + e.weight < d[e.to]!) ? null : d;
};
const fmt = (d: number[] | null) => (d ? d.map((x, i) => `${String.fromCharCode(65 + i)}=${x === INF ? '∞' : x}`).join(' ') : 'negative cycle');
const dijkstraChallenge: Challenge<GraphInput> = {
  id: 'dijkstra-negative-edge', algoId: 'dijkstra', title: 'Dijkstra with a negative edge', goal: 'wrong-output',
  task: 'Dijkstra finalises each node once. Add a negative edge to a directed graph so some distance it reports is wrong.',
  help: 'Directed weighted edges like A>B:1 A>C:4 (negative weights allowed here), then start=A',
  start: 'A>B:1 A>C:4 B>D:2 start=A', show: 'A>B:1 A>C:4 C>B:-5 B>D:1 start=A',
  hint: 'Make a node get finalised at a distance that a later, cheaper route (through a negative edge) could still improve, and give that node an outgoing edge.',
  lesson: 'B is finalised at 1 before C (4) is processed. Later C→B (−5) improves B to −1, but B is already "done", so D keeps the stale 2 instead of 0. Dijkstra assumes a finalised distance can never improve, which only holds for non-negative weights; use Bellman-Ford.',
  code: {
    java: `int[] dijkstra(int n, int[][] edges, int src) {
    int[] dist = new int[n]; boolean[] done = new boolean[n];
    Arrays.fill(dist, INF); dist[src] = 0;
    for (int it = 0; it < n; it++) {
        int u = -1;
        for (int i = 0; i < n; i++)
            if (!done[i] && dist[i] < INF && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0) break;
        done[u] = true;                       // distance treated as final
        for (int[] e : edges)
            if (e[0] == u && dist[u] + e[2] < dist[e[1]]) dist[e[1]] = dist[u] + e[2];
    }
    return dist;
}`,
    cpp: `vector<int> dijkstra(int n, const vector<array<int,3>>& edges, int src) {
    vector<int> dist(n, INF); vector<bool> done(n);
    dist[src] = 0;
    for (int it = 0; it < n; it++) {
        int u = -1;
        for (int i = 0; i < n; i++)
            if (!done[i] && dist[i] < INF && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0) break;
        done[u] = true;                       // distance treated as final
        for (auto& e : edges)
            if (e[0] == u && dist[u] + e[2] < dist[e[1]]) dist[e[1]] = dist[u] + e[2];
    }
    return dist;
}`,
  },
  parse: (t) => parseGraph(t, { directed: true, weighted: true, negative: true }),
  run(g) {
    const f = flawedDijkstra(g);
    const r = bellman(g);
    const same = r !== null && f.every((x, i) => x === r[i]);
    return { broken: !same, flawed: fmt(f), reference: fmt(r), why: same ? 'The negative edge did not change any shortest path here.' : r === null ? 'A reachable negative cycle: no shortest path exists, yet Dijkstra reports numbers.' : 'A finalised node was improved later, and its descendants kept the stale distance.' };
  },
};

// ---------------------------------------- 5. quick sort, first-element pivot
interface ArrIn { arr: number[] }
export const quickComparisons = (input: number[]): number => {
  const a = [...input];
  let cmp = 0;
  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const pivot = a[lo]!;
    let i = lo;
    for (let j = lo + 1; j <= hi; j++) { cmp++; if (a[j]! < pivot) { i++; [a[i], a[j]] = [a[j]!, a[i]!]; } }
    [a[lo], a[i]] = [a[i]!, a[lo]!];
    sort(lo, i - 1);
    sort(i + 1, hi);
  };
  sort(0, a.length - 1);
  return cmp;
};
const quickChallenge: Challenge<ArrIn> = {
  id: 'quick-sort-worst-case', algoId: 'quick-sort', title: 'Quick sort worst case', goal: 'worst-case',
  task: 'This quick sort always picks the first element as the pivot. Give it 6 to 20 numbers that make it do (at least 90% of) the maximum n(n−1)/2 comparisons.',
  help: 'Between 6 and 20 numbers: 5, 3, 8, 1, 9, 2, 7',
  start: '5, 3, 8, 1, 9, 2, 7', show: '1, 2, 3, 4, 5, 6, 7, 8',
  hint: 'The pivot is the first element. What input makes the first element the smallest (or largest) every single time?',
  lesson: 'On sorted (or reverse-sorted) input the first element is the minimum, so each partition peels off one element: n + (n−1) + … = n(n−1)/2 comparisons, O(n²). Pick a random or median-of-three pivot to avoid it.',
  code: {
    java: `void quickSort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[lo], i = lo;            // first element as pivot
    for (int j = lo + 1; j <= hi; j++)
        if (a[j] < pivot) swap(a, ++i, j);
    swap(a, lo, i);
    quickSort(a, lo, i - 1);
    quickSort(a, i + 1, hi);
}`,
    cpp: `void quickSort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[lo], i = lo;            // first element as pivot
    for (int j = lo + 1; j <= hi; j++)
        if (a[j] < pivot) swap(a[++i], a[j]);
    swap(a[lo], a[i]);
    quickSort(a, lo, i - 1);
    quickSort(a, i + 1, hi);
}`,
  },
  parse: (t) => { const r = parseInput(t, {}); return !r.ok ? r : r.value.arr.length < 6 ? fail('Use at least 6 numbers.') : ok({ arr: r.value.arr }); },
  run({ arr }) {
    const n = arr.length;
    const max = (n * (n - 1)) / 2;
    const c = quickComparisons(arr);
    return { broken: c >= 0.9 * max, flawed: `${c} comparisons`, reference: `worst possible ${max} (n log₂ n ≈ ${Math.round(n * Math.log2(n))})`, why: c >= 0.9 * max ? 'Almost every partition split off just one element.' : `Only ${Math.round((100 * c) / max)}% of the maximum: the splits were fairly balanced.` };
  },
};

// ------------------------------------------ 6. is selection sort stable?
interface Labelled { v: number; tag: string }
interface LabIn { items: Labelled[] }
export const selectionSortLabelled = (items: Labelled[]): Labelled[] => {
  const a = items.map((x) => ({ ...x }));
  for (let i = 0; i < a.length - 1; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) if (a[j]!.v < a[m]!.v) m = j;
    [a[i], a[m]] = [a[m]!, a[i]!];
  }
  return a;
};
const show = (a: Labelled[]) => a.map((x) => `${x.v}${x.tag}`).join(' ');
const stableChallenge: Challenge<LabIn> = {
  id: 'selection-sort-stable', algoId: 'selection-sort', title: 'Is selection sort stable?', goal: 'wrong-output',
  task: 'A stable sort keeps equal values in their original order. Find an input where selection sort swaps two equal values around (2a ends up after 2b, say).',
  help: 'Numbers; equal values get labels a, b, c… in the order you write them (or write them yourself: 2a, 2b): 3, 1, 3, 2',
  start: '1, 2, 2, 3', show: '2, 2, 1',
  hint: 'Selection sort swaps the minimum with the first unsorted slot. What happens to an equal value that sits in that first slot when something smaller is swapped in?',
  lesson: 'In 2a, 2b, 1 the first pass swaps 1 with 2a, sending 2a to the back: the result is 1, 2b, 2a. The long-distance swap jumps over equal elements, so selection sort is not stable. Insertion sort and merge sort (taking ties from the left) are.',
  code: {
    java: `void selectionSort(int[] a) {
    for (int i = 0; i < a.length - 1; i++) {
        int m = i;
        for (int j = i + 1; j < a.length; j++)
            if (a[j] < a[m]) m = j;
        swap(a, i, m);                // long-distance swap
    }
}`,
    cpp: `void selectionSort(vector<int>& a) {
    for (int i = 0; i < (int)a.size() - 1; i++) {
        int m = i;
        for (int j = i + 1; j < (int)a.size(); j++)
            if (a[j] < a[m]) m = j;
        swap(a[i], a[m]);             // long-distance swap
    }
}`,
  },
  parse: (t) => {
    const toks = t.split(/[\s,;]+/).filter(Boolean);
    if (toks.length < 2 || toks.length > 8) return fail('Enter 2 to 8 values.');
    const raw: { v: number; tag?: string }[] = [];
    for (const tok of toks) {
      const m = /^(-?\d+)([a-z])?$/.exec(tok);
      if (!m || Math.abs(Number(m[1])) > 99) return fail(`"${tok}" is not a number from -99 to 99 (optionally followed by a letter label).`);
      raw.push({ v: Number(m[1]), ...(m[2] ? { tag: m[2] } : {}) });
    }
    const seen = new Map<number, number>();
    const total = new Map<number, number>();
    raw.forEach((x) => total.set(x.v, (total.get(x.v) ?? 0) + 1));
    const items = raw.map((x) => {
      if (x.tag || (total.get(x.v) ?? 0) < 2) return { v: x.v, tag: x.tag ?? '' };
      const k = seen.get(x.v) ?? 0;
      seen.set(x.v, k + 1);
      return { v: x.v, tag: String.fromCharCode(97 + k) };
    });
    return ok({ items });
  },
  run({ items }) {
    const got = selectionSortLabelled(items);
    const ref = items.map((x, i) => ({ ...x, i })).sort((a, b) => a.v - b.v || a.i - b.i);
    const f = show(got);
    const r = show(ref);
    return { broken: f !== r, flawed: f, reference: r, why: f === r ? 'Equal values stayed in their original order here.' : 'Equal values came out in a different order than they went in.' };
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CHALLENGES: Challenge<any>[] = [coinsChallenge, binaryChallenge, bstChallenge, dijkstraChallenge, quickChallenge, stableChallenge];
export const challengeFor = (algoId: string) => CHALLENGES.find((c) => c.algoId === algoId);
