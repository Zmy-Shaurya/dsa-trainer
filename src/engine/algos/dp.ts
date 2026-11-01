// Phase 9: dynamic-programming visualizers drawn as tables.
import { arr, Rec, same, table } from '../build';
import { fail, ints, ok, pair, type Parsed } from '../parse';
import type { AlgoDef, Tone } from '../types';

const INF = Number.POSITIVE_INFINITY;
const sh = (d: number) => (d === INF ? '∞' : d);

// ---------------------------------------------------------- climbing stairs
interface NIn { n: number }
export const climbing: AlgoDef<NIn> = {
  id: 'climbing-stairs-dp', name: 'Climbing stairs (1-D DP)', category: 'dp', concepts: ['dp-1d'],
  blurb: 'ways(i) = ways(i−1) + ways(i−2): the last move was either one step or two.',
  time: 'O(n)', space: 'O(n)', input: {}, modes: { predict: true },
  defaults: { n: 8 }, samples: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 20 }],
  custom: {
    help: 'The number of stairs, 1 to 20.',
    parse: (t): Parsed<NIn> => { const r = ints(t, { min: 1, max: 20, len: [1, 1], what: 'stairs' }); return r.ok ? ok({ n: r.value[0]! }) : r; },
    format: (v) => String(v.n),
    presets: [{ label: '5 stairs', text: '5' }, { label: '20 stairs', text: '20' }],
  },
  code: {
    java: `int climb(int n) {
    int[] dp = new int[n + 1];
    dp[0] = 1; dp[1] = 1;
    for (int i = 2; i <= n; i++)
        dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}`,
    cpp: `int climb(int n) {
    vector<int> dp(n + 1);
    dp[0] = 1; dp[1] = 1;
    for (int i = 2; i <= n; i++)
        dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}`,
  },
  lines: same({ base: 2, fill: [3, 4], done: 5 }),
  run({ n }) {
    const r = new Rec();
    const dp: (number | string)[] = Array(n + 1).fill('');
    const cols = Array.from({ length: n + 1 }, (_, i) => String(i));
    const v = (tones: Record<string, Tone> = {}, arrows: { from: [number, number]; to: [number, number] }[] = []) => [table(['ways'], cols, [dp], tones, arrows)];
    dp[0] = 1;
    dp[1] = 1;
    r.count('writes', 2);
    r.add({ views: v({ '0,0': 'found', '0,1': 'found' }), line: 'base', event: 'base', message: 'One way to stand at step 0 (do nothing) and one way to reach step 1.', vars: { n } });
    for (let i = 2; i <= n; i++) {
      const val = (dp[i - 1] as number) + (dp[i - 2] as number);
      r.count('adds');
      r.add({
        views: v({ [`0,${i - 1}`]: 'compare', [`0,${i - 2}`]: 'compare', [`0,${i}`]: 'active' }, [{ from: [0, i - 1], to: [0, i] }, { from: [0, i - 2], to: [0, i] }]), line: 'fill', event: 'fill',
        message: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${val}.`, vars: { i },
        predict: { question: `dp[${i - 1}] = ${dp[i - 1]} and dp[${i - 2}] = ${dp[i - 2]}. What is dp[${i}]?`, kind: 'choice', choices: shuffleNear(val), answer: String(val), explain: `Add the two previous cells: ${dp[i - 1]} + ${dp[i - 2]} = ${val}.` },
      });
      dp[i] = val;
      r.add({ views: v({ [`0,${i}`]: 'found' }), line: 'fill', event: 'set', message: `dp[${i}] = ${val}.`, vars: { i, value: val } });
    }
    r.add({ views: v({ [`0,${n}`]: 'found' }), line: 'done', event: 'done', message: `There are ${dp[n]} ways to climb ${n} stairs.`, vars: { result: dp[n] as number } });
    return r.frames;
  },
  check: ({ n }, f) => {
    let [a, b] = [1, 1];
    for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
    return f.at(-1)!.vars!.result === b ? null : 'wrong count';
  },
};
const shuffleNear = (val: number) => [...new Set([val, val + 1, Math.max(0, val - 1)])].sort((a, b) => a - b).map(String);

// --------------------------------------------------------------- coin change
interface CoinIn { coins: number[]; amount: number }
export const coinChange: AlgoDef<CoinIn> = {
  id: 'coin-change-dp', name: 'Coin change (minimum coins)', category: 'dp', concepts: ['dp-1d'],
  blurb: 'dp[a] = fewest coins that make amount a: try every coin as the last one and look back at dp[a − coin].',
  time: 'O(amount × coins)', space: 'O(amount)', input: {}, modes: {},
  defaults: { coins: [1, 3, 4], amount: 6 },
  samples: [{ coins: [2], amount: 3 }, { coins: [1], amount: 0 }, { coins: [5, 10], amount: 30 }, { coins: [2, 5, 10, 1], amount: 27 }, { coins: [7], amount: 7 }],
  custom: {
    help: 'Coin values (1 to 20, up to 5), then | and the amount (0 to 30): 1, 3, 4 | amount = 6.',
    parse: (t): Parsed<CoinIn> => {
      const [left = '', right = ''] = t.split('|');
      const c = ints(left, { min: 1, max: 20, len: [1, 5], what: 'coin values' });
      if (!c.ok) return c;
      const amount = Number(pair(right, 'amount') ?? NaN);
      return Number.isInteger(amount) && amount >= 0 && amount <= 30 ? ok({ coins: c.value, amount }) : fail('Add | amount = N with N from 0 to 30.');
    },
    format: (v) => `${v.coins.join(', ')} | amount = ${v.amount}`,
    presets: [{ label: 'greedy fails', text: '1, 3, 4 | amount = 6' }, { label: 'impossible', text: '5, 10 | amount = 7' }],
  },
  code: {
    java: `int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, INF); dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins)
            if (c <= a && dp[a - c] != INF)
                dp[a] = Math.min(dp[a], dp[a - c] + 1);
    return dp[amount] == INF ? -1 : dp[amount];
}`,
    cpp: `int coinChange(const vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins)
            if (c <= a && dp[a - c] != INF)
                dp[a] = min(dp[a], dp[a - c] + 1);
    return dp[amount] == INF ? -1 : dp[amount];
}`,
  },
  lines: same({ start: [1, 2], try: [4, 5], skip: 5, update: 6, done: 7 }),
  run({ coins, amount }) {
    const r = new Rec();
    const dp = Array<number>(amount + 1).fill(INF);
    dp[0] = 0;
    const cols = Array.from({ length: amount + 1 }, (_, i) => String(i));
    const shown = (upTo: number) => dp.map((d, i) => (i > upTo ? '' : sh(d)));
    const v = (upTo: number, tones: Record<string, Tone> = {}, arrows: { from: [number, number]; to: [number, number] }[] = []) => [table(['min coins'], cols, [shown(upTo)], tones, arrows)];
    r.add({ views: v(0, { '0,0': 'found' }), line: 'start', event: 'start', message: 'Zero coins make amount 0. Everything else starts unknown (∞).', vars: { amount } });
    for (let a = 1; a <= amount; a++) {
      for (const c of coins) {
        r.count('checks');
        if (c > a || dp[a - c] === INF) {
          r.add({ views: v(a - 1, { [`0,${a}`]: 'active' }), line: 'skip', event: 'skip', message: c > a ? `Coin ${c} is bigger than ${a}: skip.` : `Coin ${c}: dp[${a - c}] is ∞ (unreachable), skip.`, vars: { a, coin: c } });
          continue;
        }
        const cand = dp[a - c]! + 1;
        r.add({ views: v(a, { [`0,${a}`]: 'active', [`0,${a - c}`]: 'compare' }, [{ from: [0, a - c], to: [0, a] }]), line: 'try', event: 'try', message: `Last coin ${c}: dp[${a - c}] + 1 = ${cand} vs dp[${a}] = ${sh(dp[a]!)}.`, vars: { a, coin: c, candidate: cand } });
        if (cand < dp[a]!) {
          dp[a] = cand;
          r.add({ views: v(a, { [`0,${a}`]: 'found', [`0,${a - c}`]: 'compare' }, [{ from: [0, a - c], to: [0, a] }]), line: 'update', event: 'update', message: `Better: dp[${a}] = ${cand}.`, vars: { a, value: cand } });
        }
      }
    }
    r.add({ views: v(amount, { [`0,${amount}`]: dp[amount] === INF ? 'error' : 'found' }), line: 'done', event: 'done', message: dp[amount] === INF ? `Amount ${amount} cannot be made.` : `${dp[amount]} coin${dp[amount] === 1 ? '' : 's'} make ${amount}.`, vars: { result: dp[amount] === INF ? -1 : dp[amount]! } });
    return r.frames;
  },
  check: ({ coins, amount }, f) => {
    const best = Array<number>(amount + 1).fill(INF);
    best[0] = 0;
    for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) best[a] = Math.min(best[a]!, best[a - c]! + 1);
    return f.at(-1)!.vars!.result === (best[amount] === INF ? -1 : best[amount]) ? null : 'wrong count';
  },
};

// ------------------------------------------------------------------ knapsack
interface KnapIn { items: { w: number; v: number }[]; cap: number }
export const knapsack: AlgoDef<KnapIn> = {
  id: 'knapsack-01', name: '0/1 knapsack', category: 'dp', concepts: ['dp-knapsack'],
  blurb: 'dp[i][c] = best value using the first i items with capacity c: either skip item i, or take it and look back.',
  time: 'O(n × W)', space: 'O(n × W)', input: {}, modes: {},
  defaults: { items: [{ w: 2, v: 3 }, { w: 3, v: 4 }, { w: 4, v: 5 }, { w: 5, v: 6 }], cap: 5 },
  samples: [{ items: [{ w: 5, v: 10 }], cap: 4 }, { items: [{ w: 1, v: 1 }], cap: 1 }, { items: [{ w: 1, v: 1 }, { w: 1, v: 2 }, { w: 1, v: 3 }], cap: 2 }, { items: [{ w: 3, v: 4 }, { w: 4, v: 5 }, { w: 2, v: 3 }, { w: 6, v: 9 }, { w: 1, v: 1 }, { w: 2, v: 2 }], cap: 12 }],
  custom: {
    help: 'Items as weight:value (weights 1 to 9, values 1 to 99, up to 6 items), then | and capacity (0 to 12): 2:3, 3:4, 4:5 | cap = 5.',
    parse: (t): Parsed<KnapIn> => {
      const [left = '', right = ''] = t.split('|');
      const toks = left.split(/[\s,;]+/).filter(Boolean);
      if (toks.length < 1 || toks.length > 6) return fail('Enter 1 to 6 items.');
      const items: KnapIn['items'] = [];
      for (const tok of toks) {
        const m = /^(\d+):(\d+)$/.exec(tok);
        if (!m || Number(m[1]) < 1 || Number(m[1]) > 9 || Number(m[2]) < 1 || Number(m[2]) > 99) return fail(`"${tok}" is not weight:value (weight 1 to 9, value 1 to 99).`);
        items.push({ w: Number(m[1]), v: Number(m[2]) });
      }
      const cap = Number(pair(right, 'cap') ?? NaN);
      return Number.isInteger(cap) && cap >= 0 && cap <= 12 ? ok({ items, cap }) : fail('Add | cap = N with N from 0 to 12.');
    },
    format: (v) => `${v.items.map((i) => `${i.w}:${i.v}`).join(', ')} | cap = ${v.cap}`,
    presets: [{ label: 'greedy by ratio fails', text: '1:1, 3:4, 4:5 | cap = 4' }],
  },
  code: {
    java: `int knapsack(int[] w, int[] v, int cap) {
    int n = w.length;
    int[][] dp = new int[n + 1][cap + 1];
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= cap; c++) {
            dp[i][c] = dp[i - 1][c];
            if (w[i - 1] <= c)
                dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w[i - 1]] + v[i - 1]);
        }
    return dp[n][cap];
}`,
    cpp: `int knapsack(const vector<int>& w, const vector<int>& v, int cap) {
    int n = w.size();
    vector<vector<int>> dp(n + 1, vector<int>(cap + 1));
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= cap; c++) {
            dp[i][c] = dp[i - 1][c];
            if (w[i - 1] <= c)
                dp[i][c] = max(dp[i][c], dp[i - 1][c - w[i - 1]] + v[i - 1]);
        }
    return dp[n][cap];
}`,
  },
  lines: same({ start: 2, skip: 5, take: [6, 7], trace: 9, done: 9 }),
  run({ items, cap }) {
    const n = items.length;
    const r = new Rec();
    const dp = Array.from({ length: n + 1 }, () => Array<number>(cap + 1).fill(0));
    const rows = ['none', ...items.map((it, i) => `#${i + 1} (${it.w}:${it.v})`)];
    const cols = Array.from({ length: cap + 1 }, (_, c) => String(c));
    const filled = (i: number, c: number) => i === 0 || i < curI || (i === curI && c <= curC);
    let curI = 0;
    let curC = cap;
    const v = (tones: Record<string, Tone> = {}, arrows: { from: [number, number]; to: [number, number] }[] = []) =>
      [table(rows, cols, dp.map((row, i) => row.map((x, c) => (filled(i, c) ? x : ''))), tones, arrows)];
    r.add({ views: v({}), line: 'start', event: 'start', message: 'Row 0 (no items) is all zeros. Fill each row from the one above.', vars: { cap } });
    for (let i = 1; i <= n; i++) {
      const { w, v: val } = items[i - 1]!;
      for (let c = 0; c <= cap; c++) {
        curI = i;
        curC = c;
        const skip = dp[i - 1]![c]!;
        const take = w <= c ? dp[i - 1]![c - w]! + val : -1;
        dp[i]![c] = Math.max(skip, take);
        r.count('cells');
        const took = take > skip;
        r.add({
          views: v({ [`${i},${c}`]: took ? 'found' : 'active', [`${i - 1},${c}`]: 'compare', ...(w <= c ? { [`${i - 1},${c - w}`]: 'compare' } : {}) }, [{ from: [i - 1, c], to: [i, c] }, ...(w <= c ? [{ from: [i - 1, c - w] as [number, number], to: [i, c] as [number, number] }] : [])]),
          line: took ? 'take' : 'skip', event: took ? 'take' : 'skip',
          message: w > c ? `Item #${i} (weight ${w}) does not fit in ${c}: copy ${skip} from above.` : took ? `Take #${i}: ${val} + dp[${i - 1}][${c - w}] = ${take} beats skipping (${skip}).` : `Skip #${i}: ${skip} is at least ${take}.`,
          vars: { i, c, value: dp[i]![c]! },
        });
      }
    }
    curI = n + 1;
    let c = cap;
    const taken: number[] = [];
    const path: Record<string, Tone> = {};
    for (let i = n; i >= 1; i--) {
      if (dp[i]![c] !== dp[i - 1]![c]) { taken.push(i); path[`${i},${c}`] = 'found'; c -= items[i - 1]!.w; } else path[`${i},${c}`] = 'path';
    }
    r.add({ views: v(path), line: 'trace', event: 'trace', message: taken.length ? `Walk back: items ${taken.reverse().map((t) => '#' + t).join(', ')} were taken.` : 'No item is worth taking.', vars: { taken: taken.join(',') } });
    r.add({ views: v({ [`${n},${cap}`]: 'found' }), line: 'done', event: 'done', message: `Best value: ${dp[n]![cap]}.`, vars: { result: dp[n]![cap]! } });
    return r.frames;
  },
  check: ({ items, cap }, f) => {
    let best = 0;
    for (let m = 0; m < 1 << items.length; m++) {
      let w = 0;
      let val = 0;
      items.forEach((it, i) => { if (m & (1 << i)) { w += it.w; val += it.v; } });
      if (w <= cap) best = Math.max(best, val);
    }
    return f.at(-1)!.vars!.result === best ? null : 'wrong value';
  },
};

// ------------------------------------------------------------ string tables
interface TwoStr { a: string; b: string }
const twoStrings = (help: string, presets: { label: string; text: string }[]) => ({
  help,
  parse: (t: string): Parsed<TwoStr> => {
    const [a = '', b = ''] = t.split('|').map((x) => x.trim());
    return a.length < 1 || a.length > 10 || b.length < 1 || b.length > 10 ? fail('Enter two strings of 1 to 10 characters, separated by |.') : ok({ a, b });
  },
  format: (v: TwoStr) => `${v.a} | ${v.b}`,
  presets,
});

const lcsLen = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = a[i - 1] === b[j - 1] ? d[i - 1]![j - 1]! + 1 : Math.max(d[i - 1]![j]!, d[i]![j - 1]!);
  return d[a.length]![b.length]!;
};

export const lcs: AlgoDef<TwoStr> = {
  id: 'lcs', name: 'Longest common subsequence', category: 'dp', concepts: ['dp-strings', 'dp-2d'],
  blurb: 'Compare prefixes: matching last letters extend the diagonal; otherwise take the better of dropping a letter from either side.',
  time: 'O(m × n)', space: 'O(m × n)', input: {}, modes: {},
  defaults: { a: 'abcde', b: 'ace' },
  samples: [{ a: 'a', b: 'a' }, { a: 'a', b: 'b' }, { a: 'abcbdab', b: 'bdcaba' }, { a: 'aaaa', b: 'aa' }, { a: 'abcdefghij', b: 'jihgfedcba' }],
  custom: twoStrings('Two strings separated by |: abcde | ace (up to 10 characters each).', [{ label: 'classic', text: 'abcbdab | bdcaba' }, { label: 'nothing in common', text: 'abc | xyz' }]),
  code: {
    java: `int lcs(String a, String b) {
    int[][] dp = new int[a.length() + 1][b.length() + 1];
    for (int i = 1; i <= a.length(); i++)
        for (int j = 1; j <= b.length(); j++)
            if (a.charAt(i - 1) == b.charAt(j - 1))
                dp[i][j] = dp[i - 1][j - 1] + 1;
            else
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    return dp[a.length()][b.length()];
}`,
    cpp: `int lcs(const string& a, const string& b) {
    vector<vector<int>> dp(a.size() + 1, vector<int>(b.size() + 1));
    for (int i = 1; i <= (int)a.size(); i++)
        for (int j = 1; j <= (int)b.size(); j++)
            if (a[i - 1] == b[j - 1])
                dp[i][j] = dp[i - 1][j - 1] + 1;
            else
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
    return dp[a.size()][b.size()];
}`,
  },
  lines: same({ start: 1, match: [4, 5], differ: [6, 7], trace: 8, done: 8 }),
  run({ a, b }) {
    const r = new Rec();
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
    let ci = 0;
    let cj = n;
    const rows = ['', ...a.split('')];
    const cols = ['', ...b.split('')];
    const v = (tones: Record<string, Tone> = {}, arrows: { from: [number, number]; to: [number, number] }[] = []) =>
      [table(rows, cols, dp.map((row, i) => row.map((x, j) => (i === 0 || j === 0 || i < ci || (i === ci && j <= cj) ? x : ''))), tones, arrows)];
    r.add({ views: v(), line: 'start', event: 'start', message: 'Row 0 and column 0 are zero: an empty string has nothing in common.', vars: {} });
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      ci = i;
      cj = j;
      r.count('cells');
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
        r.add({ views: v({ [`${i},${j}`]: 'found', [`${i - 1},${j - 1}`]: 'compare' }, [{ from: [i - 1, j - 1], to: [i, j] }]), line: 'match', event: 'match', message: `'${a[i - 1]}' = '${b[j - 1]}': diagonal + 1 = ${dp[i]![j]}.`, vars: { i, j, value: dp[i]![j]! } });
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
        r.add({ views: v({ [`${i},${j}`]: 'active', [`${i - 1},${j}`]: 'compare', [`${i},${j - 1}`]: 'compare' }, [{ from: [i - 1, j], to: [i, j] }, { from: [i, j - 1], to: [i, j] }]), line: 'differ', event: 'differ', message: `'${a[i - 1]}' ≠ '${b[j - 1]}': best of up (${dp[i - 1]![j]}) and left (${dp[i]![j - 1]}) = ${dp[i]![j]}.`, vars: { i, j, value: dp[i]![j]! } });
      }
    }
    ci = m + 1;
    let i = m;
    let j = n;
    let seq = '';
    const path: Record<string, Tone> = {};
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) { seq = a[i - 1] + seq; path[`${i},${j}`] = 'found'; i--; j--; }
      else { path[`${i},${j}`] = 'path'; if (dp[i - 1]![j]! >= dp[i]![j - 1]!) i--; else j--; }
    }
    r.add({ views: v(path), line: 'trace', event: 'trace', message: `Walk back from the corner: one longest common subsequence is "${seq}".`, vars: { seq } });
    r.add({ views: v({ [`${m},${n}`]: 'found' }), line: 'done', event: 'done', message: `Length ${dp[m]![n]}.`, vars: { result: dp[m]![n]!, seq } });
    return r.frames;
  },
  check: ({ a, b }, f) => {
    const { result, seq } = f.at(-1)!.vars!;
    if (result !== lcsLen(a, b) || String(seq).length !== result) return 'wrong length';
    const isSub = (s: string, t: string) => { let k = 0; for (const c of t) if (c === s[k]) k++; return k === s.length; };
    return isSub(String(seq), a) && isSub(String(seq), b) ? null : 'not a common subsequence';
  },
};

const editRef = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = a[i - 1] === b[j - 1] ? d[i - 1]![j - 1]! : 1 + Math.min(d[i - 1]![j - 1]!, d[i - 1]![j]!, d[i]![j - 1]!);
  return d[a.length]![b.length]!;
};

export const editDistance: AlgoDef<TwoStr> = {
  id: 'edit-distance', name: 'Edit distance (Levenshtein)', category: 'dp', concepts: ['dp-strings', 'dp-2d'],
  blurb: 'Fewest inserts, deletes and replacements to turn one word into another, built from shorter prefixes.',
  time: 'O(m × n)', space: 'O(m × n)', input: {}, modes: {},
  defaults: { a: 'horse', b: 'ros' },
  samples: [{ a: 'a', b: 'a' }, { a: 'a', b: 'b' }, { a: 'kitten', b: 'sitting' }, { a: 'abc', b: 'abc' }, { a: 'intention', b: 'execution' }],
  custom: twoStrings('Two strings separated by |: horse | ros (up to 10 characters each).', [{ label: 'kitten → sitting', text: 'kitten | sitting' }, { label: 'identical', text: 'same | same' }]),
  code: {
    java: `int editDistance(String a, String b) {
    int m = a.length(), n = b.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            if (a.charAt(i - 1) == b.charAt(j - 1))
                dp[i][j] = dp[i - 1][j - 1];
            else
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));
    return dp[m][n];
}`,
    cpp: `int editDistance(const string& a, const string& b) {
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1));
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            if (a[i - 1] == b[j - 1])
                dp[i][j] = dp[i - 1][j - 1];
            else
                dp[i][j] = 1 + min({dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]});
    return dp[m][n];
}`,
  },
  lines: same({ base: [3, 4], match: [7, 8], differ: [9, 10], done: 11 }),
  run({ a, b }) {
    const r = new Rec();
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
    let ci = 0;
    let cj = n;
    const v = (tones: Record<string, Tone> = {}, arrows: { from: [number, number]; to: [number, number] }[] = []) =>
      [table(['', ...a.split('')], ['', ...b.split('')], dp.map((row, i) => row.map((x, j) => (i === 0 || j === 0 || i < ci || (i === ci && j <= cj) ? x : ''))), tones, arrows)];
    r.count('writes', m + n + 1);
    r.add({ views: v(), line: 'base', event: 'start', message: `Turning "" into a string of length k takes k inserts; turning a string of length k into "" takes k deletes.`, vars: {} });
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      ci = i;
      cj = j;
      r.count('cells');
      const [d, u, l] = [dp[i - 1]![j - 1]!, dp[i - 1]![j]!, dp[i]![j - 1]!];
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = d;
        r.add({ views: v({ [`${i},${j}`]: 'found', [`${i - 1},${j - 1}`]: 'compare' }, [{ from: [i - 1, j - 1], to: [i, j] }]), line: 'match', event: 'match', message: `'${a[i - 1]}' = '${b[j - 1]}': free, copy the diagonal (${d}).`, vars: { i, j, value: d } });
      } else {
        const best = Math.min(d, u, l);
        dp[i]![j] = best + 1;
        const op = best === d ? 'replace' : best === u ? 'delete' : 'insert';
        r.add({ views: v({ [`${i},${j}`]: 'active', [`${i - 1},${j - 1}`]: 'compare', [`${i - 1},${j}`]: 'compare', [`${i},${j - 1}`]: 'compare' }, [{ from: [i - 1, j - 1], to: [i, j] }, { from: [i - 1, j], to: [i, j] }, { from: [i, j - 1], to: [i, j] }]), line: 'differ', event: 'differ', message: `'${a[i - 1]}' ≠ '${b[j - 1]}': 1 + min(replace ${d}, delete ${u}, insert ${l}) = ${best + 1} (${op}).`, vars: { i, j, value: best + 1 } });
      }
    }
    ci = m + 1;
    const path: Record<string, Tone> = {};
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
      path[`${i},${j}`] = 'path';
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i]![j] === dp[i - 1]![j - 1]) { i--; j--; }
      else if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + 1) { i--; j--; }
      else if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + 1) i--;
      else j--;
    }
    path['0,0'] = 'path';
    r.add({ views: v(path), line: 'done', event: 'trace', message: 'The highlighted path is one cheapest sequence of edits.', vars: {} });
    r.add({ views: v({ [`${m},${n}`]: 'found' }), line: 'done', event: 'done', message: `Edit distance: ${dp[m]![n]}.`, vars: { result: dp[m]![n]! } });
    return r.frames;
  },
  check: ({ a, b }, f) => (f.at(-1)!.vars!.result === editRef(a, b) ? null : 'wrong distance'),
};

// ---------------------------------------------------------------------- LIS
const lisRef = (a: number[]) => {
  const d = a.map(() => 1);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < i; j++) if (a[j]! < a[i]!) d[i] = Math.max(d[i]!, d[j]! + 1);
  return Math.max(...d);
};
export const lis: AlgoDef = {
  id: 'lis', name: 'Longest increasing subsequence', category: 'dp', concepts: ['dp-1d'],
  blurb: 'dp[i] = length of the longest increasing subsequence that ends at i: extend the best earlier smaller element.',
  time: 'O(n²)', space: 'O(n)', input: {}, modes: {},
  defaults: { arr: [10, 9, 2, 5, 3, 7, 101, 18] },
  samples: [{ arr: [5] }, { arr: [1, 2, 3, 4, 5] }, { arr: [5, 4, 3, 2, 1] }, { arr: [3, 3, 3] }, { arr: [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15, 20, 19, 18, 17] }],
  code: {
    java: `int lis(int[] a) {
    int n = a.length, best = 1;
    int[] dp = new int[n];
    Arrays.fill(dp, 1);
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++)
            if (a[j] < a[i])
                dp[i] = Math.max(dp[i], dp[j] + 1);
        best = Math.max(best, dp[i]);
    }
    return best;
}`,
    cpp: `int lis(const vector<int>& a) {
    int n = a.size(), best = 1;
    vector<int> dp(n, 1);
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++)
            if (a[j] < a[i])
                dp[i] = max(dp[i], dp[j] + 1);
        best = max(best, dp[i]);
    }
    return best;
}`,
  },
  lines: same({ start: [1, 3], compare: [5, 6], extend: 7, best: 8, done: 10 }),
  run({ arr: a }) {
    const r = new Rec();
    const dp = a.map(() => 1);
    const prev = a.map(() => -1);
    const v = (i: number, j: number, t: Record<number, Tone> = {}) => [
      arr(a, { name: 'values', tones: t, pointers: i >= 0 ? [['i', i], ...(j >= 0 ? [['j', j] as [string, number]] : [])] : [] }),
      arr(dp, { name: 'dp (longest ending here)', tones: i >= 0 ? { [i]: 'active' } : {} }),
    ];
    r.add({ views: v(-1, -1), line: 'start', event: 'start', message: 'Every element alone is an increasing subsequence of length 1.', vars: {} });
    let best = 1;
    for (let i = 1; i < a.length; i++) {
      for (let j = 0; j < i; j++) {
        r.count('comparisons');
        const up = a[j]! < a[i]!;
        const better = up && dp[j]! + 1 > dp[i]!;
        if (better) { dp[i] = dp[j]! + 1; prev[i] = j; }
        r.add({ views: v(i, j, { [i]: 'active', [j]: up ? 'found' : 'dim' }), line: better ? 'extend' : 'compare', event: better ? 'extend' : 'compare', message: !up ? `a[${j}] = ${a[j]} is not smaller than a[${i}] = ${a[i]}: cannot extend.` : better ? `a[${j}] = ${a[j]} < ${a[i]}: extend, dp[${i}] = ${dp[i]}.` : `a[${j}] < a[${i}] but dp[${i}] is already at least ${dp[j]! + 1}.`, vars: { i, j, dp_i: dp[i]! } });
      }
      best = Math.max(best, dp[i]!);
      r.add({ views: v(i, -1, { [i]: 'found' }), line: 'best', event: 'best', message: `dp[${i}] = ${dp[i]}; best so far ${best}.`, vars: { i, best } });
    }
    let end = dp.indexOf(best);
    const chain: number[] = [];
    while (end >= 0) { chain.unshift(end); end = prev[end]!; }
    r.add({ views: v(-1, -1, Object.fromEntries(chain.map((k) => [k, 'found' as Tone]))), line: 'done', event: 'done', message: `Longest increasing subsequence: ${chain.map((k) => a[k]).join(', ')} (length ${best}).`, vars: { result: best } });
    return r.frames;
  },
  check: (inp, f) => (f.at(-1)!.vars!.result === lisRef(inp.arr) ? null : 'wrong length'),
};

export const DP_ALGOS = [climbing, coinChange, knapsack, lcs, editDistance, lis];
