// Phase 9: backtracking, hashing, string matching, sieve and recursion visualizers.
import { arr, aux, grid, Rec, same, table } from '../build';
import { fail, ints, ok, pair, type Parsed } from '../parse';
import type { AlgoDef, Frame, TreeView, Tone } from '../types';

const tokens = (t: string) => t.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
const key = (a: number[]) => `[${a.join(',')}]`;

// ---------------------------------------------------------------- subsets
const smallArray = (max: number, min = -99): AlgoDef['custom'] => ({
  help: `Up to ${max} distinct-or-not numbers, separated by commas.`,
  parse: (t) => { const r = ints(t, { min, max: 99, len: [1, max] }); return r.ok ? ok({ arr: r.value }) : r; },
  format: (v) => v.arr.join(', '),
});

export const subsets: AlgoDef = {
  id: 'subsets', name: 'Subsets (backtracking)', category: 'backtracking', concepts: ['backtracking', 'recursion-basics'],
  blurb: 'For each element make two choices, include it or not. Choose, explore, then undo the choice.',
  time: 'O(2ⁿ × n)', space: 'O(n)', input: {}, defaults: { arr: [1, 2, 3] }, modes: {},
  samples: [{ arr: [7] }, { arr: [1, 2] }, { arr: [3, 1, 2, 5, 4] }, { arr: [-1, 0, 1, 2] }],
  custom: smallArray(5),
  code: {
    java: `void subsets(int[] a, int i, List<Integer> cur, List<List<Integer>> out) {
    if (i == a.length) {
        out.add(new ArrayList<>(cur));
        return;
    }
    cur.add(a[i]);
    subsets(a, i + 1, cur, out);
    cur.remove(cur.size() - 1);
    subsets(a, i + 1, cur, out);
}`,
    cpp: `void subsets(const vector<int>& a, int i, vector<int>& cur, vector<vector<int>>& out) {
    if (i == (int)a.size()) {
        out.push_back(cur);
        return;
    }
    cur.push_back(a[i]);
    subsets(a, i + 1, cur, out);
    cur.pop_back();
    subsets(a, i + 1, cur, out);
}`,
  },
  lines: same({ record: [2, 3], include: [5, 6], undo: 7, exclude: 8, done: 9 }),
  run({ arr: a }) {
    const r = new Rec();
    const cur: number[] = [];
    const out: string[] = [];
    const state: Tone[] = a.map(() => 'neutral');
    const f = (line: string, message: string, i: number, event: string) =>
      r.add({ views: [arr(a, { tones: Object.fromEntries(state.map((t, k) => [k, k === i ? 'active' : t])), pointers: i < a.length ? [['i', i]] : [] })], aux: [aux('stack', 'current subset', cur), aux('list', `found ${out.length}`, out)], line, event, message, vars: { i } });
    const go = (i: number) => {
      r.count('calls');
      if (i === a.length) { out.push(key(cur)); f('record', `All elements decided: record ${key(cur)}.`, i, 'record'); return; }
      cur.push(a[i]!);
      state[i] = 'found';
      f('include', `Include ${a[i]}.`, i, 'choose');
      go(i + 1);
      cur.pop();
      state[i] = 'dim';
      f('undo', `Undo: take ${a[i]} back out.`, i, 'undo');
      f('exclude', `Exclude ${a[i]} and explore the other branch.`, i, 'choose');
      go(i + 1);
      state[i] = 'neutral';
    };
    go(0);
    r.add({ views: [arr(a)], aux: [aux('list', `all ${out.length} subsets`, out)], line: 'done', event: 'done', message: `${out.length} subsets (2^${a.length}).`, vars: { result: out.length, all: out.join('|') } });
    return r.frames;
  },
  check: ({ arr: a }, f) => {
    const v = f.at(-1)!.vars!;
    const exp: string[] = [];
    for (let m = 0; m < 1 << a.length; m++) exp.push(key(a.filter((_, i) => m & (1 << i))));
    return v.result === exp.length && String(v.all).split('|').sort().join() === exp.sort().join() ? null : 'wrong subsets';
  },
};

// ------------------------------------------------------------ permutations
export const permutations: AlgoDef = {
  id: 'permutations', name: 'Permutations (backtracking)', category: 'backtracking', concepts: ['backtracking', 'recursion-basics'],
  blurb: 'Build the arrangement one slot at a time, trying every unused element, then undo and try the next.',
  time: 'O(n! × n)', space: 'O(n)', input: {}, defaults: { arr: [1, 2, 3] }, modes: {},
  samples: [{ arr: [4] }, { arr: [1, 2] }, { arr: [1, 2, 3, 4] }, { arr: [5, 3, 1, 2, 4] }],
  custom: smallArray(5),
  code: {
    java: `void permute(int[] a, boolean[] used, List<Integer> cur, List<List<Integer>> out) {
    if (cur.size() == a.length) {
        out.add(new ArrayList<>(cur));
        return;
    }
    for (int i = 0; i < a.length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.add(a[i]);
        permute(a, used, cur, out);
        cur.remove(cur.size() - 1); used[i] = false;
    }
}`,
    cpp: `void permute(const vector<int>& a, vector<bool>& used, vector<int>& cur, vector<vector<int>>& out) {
    if (cur.size() == a.size()) {
        out.push_back(cur);
        return;
    }
    for (int i = 0; i < (int)a.size(); i++) {
        if (used[i]) continue;
        used[i] = true; cur.push_back(a[i]);
        permute(a, used, cur, out);
        cur.pop_back(); used[i] = false;
    }
}`,
  },
  lines: same({ record: [2, 3], skip: 6, choose: 7, undo: 9, done: 10 }),
  run({ arr: a }) {
    const r = new Rec();
    const cur: number[] = [];
    const used = a.map(() => false);
    const out: string[] = [];
    const f = (line: string, message: string, i: number, event: string) =>
      r.add({ views: [arr(a, { tones: Object.fromEntries(used.map((u, k) => [k, k === i ? 'active' : u ? 'dim' : 'neutral'])), pointers: i >= 0 ? [['i', i]] : [] })], aux: [aux('stack', 'current arrangement', cur), aux('list', `found ${out.length}`, out)], line, event, message, vars: { depth: cur.length } });
    const go = () => {
      r.count('calls');
      if (cur.length === a.length) { out.push(key(cur)); f('record', `Full arrangement: record ${key(cur)}.`, -1, 'record'); return; }
      for (let i = 0; i < a.length; i++) {
        r.count('checks');
        if (used[i]) { f('skip', `${a[i]} is already used: skip.`, i, 'skip'); continue; }
        used[i] = true;
        cur.push(a[i]!);
        f('choose', `Choose ${a[i]} for slot ${cur.length - 1}.`, i, 'choose');
        go();
        cur.pop();
        used[i] = false;
        f('undo', `Undo ${a[i]}.`, i, 'undo');
      }
    };
    go();
    r.add({ views: [arr(a)], aux: [aux('list', `all ${out.length} permutations`, out)], line: 'done', event: 'done', message: `${out.length} permutations.`, vars: { result: out.length, all: out.join('|') } });
    return r.frames;
  },
  check: ({ arr: a }, f) => {
    const v = f.at(-1)!.vars!;
    let n = 1;
    for (let i = 2; i <= a.length; i++) n *= i;
    const all = String(v.all).split('|');
    return v.result === n && new Set(all).size === n ? null : 'wrong permutations';
  },
};

// ----------------------------------------------------------------- n-queens
interface QIn { n: number }
const QUEENS = [1, 0, 0, 2, 10, 4];
export const nQueens: AlgoDef<QIn> = {
  id: 'n-queens', name: 'N-Queens (backtracking)', category: 'backtracking', concepts: ['backtracking'],
  blurb: 'Place one queen per row; if no column in a row is safe, back up and move the previous queen.',
  time: 'O(n!)', space: 'O(n)', input: {}, modes: {},
  defaults: { n: 4 }, samples: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 5 }, { n: 6 }],
  custom: {
    help: 'Board size n from 1 to 6 (larger boards need more than 5000 steps).',
    parse: (t): Parsed<QIn> => { const r = ints(t, { min: 1, max: 6, len: [1, 1], what: 'board size' }); return r.ok ? ok({ n: r.value[0]! }) : r; },
    format: (v) => String(v.n),
    presets: [{ label: '4 × 4', text: '4' }, { label: '6 × 6', text: '6' }],
  },
  code: {
    java: `void solve(int row, int n, int[] col, List<int[]> out) {
    if (row == n) { out.add(col.clone()); return; }
    for (int c = 0; c < n; c++) {
        if (!safe(col, row, c)) continue;
        col[row] = c;
        solve(row + 1, n, col, out);
    }
}
boolean safe(int[] col, int row, int c) {
    for (int r = 0; r < row; r++)
        if (col[r] == c || Math.abs(col[r] - c) == row - r) return false;
    return true;
}`,
    cpp: `void solve(int row, int n, vector<int>& col, vector<vector<int>>& out) {
    if (row == n) { out.push_back(col); return; }
    for (int c = 0; c < n; c++) {
        if (!safe(col, row, c)) continue;
        col[row] = c;
        solve(row + 1, n, col, out);
    }
}
bool safe(const vector<int>& col, int row, int c) {
    for (int r = 0; r < row; r++)
        if (col[r] == c || abs(col[r] - c) == row - r) return false;
    return true;
}`,
  },
  lines: same({ record: 1, try: [2, 3], conflict: [9, 10], place: [4, 5], undo: 6, done: 7 }),
  run({ n }) {
    const r = new Rec();
    const col: number[] = [];
    const solutions: number[][] = [];
    const board = (tones: Record<string, Tone> = {}) => grid(Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => (col[y] === x ? '♛' : ''))), { ...Object.fromEntries(col.map((c, y) => [`${y},${c}`, 'found' as Tone])), ...tones });
    const f = (line: string, message: string, tones: Record<string, Tone>, event: string) =>
      r.add({ views: [board(tones)], aux: [aux('list', 'solutions found', [String(solutions.length)])], line, event, message, vars: { row: col.length, solutions: solutions.length } });
    const go = (row: number) => {
      r.count('calls');
      if (row === n) { solutions.push([...col]); f('record', `All ${n} queens placed: solution #${solutions.length}.`, {}, 'solution'); return; }
      for (let c = 0; c < n; c++) {
        r.count('safety checks');
        let why = '';
        for (let q = 0; q < row; q++) {
          if (col[q] === c) { why = `same column as the queen on row ${q}`; break; }
          if (Math.abs(col[q]! - c) === row - q) { why = `same diagonal as the queen on row ${q}`; break; }
        }
        if (why) { f('conflict', `(${row}, ${c}) is attacked: ${why}.`, { [`${row},${c}`]: 'error' }, 'conflict'); continue; }
        col[row] = c;
        f('place', `Place a queen at (${row}, ${c}).`, { [`${row},${c}`]: 'active' }, 'place');
        go(row + 1);
        col.length = row;
        f('undo', `Back up from row ${row}: remove that queen.`, {}, 'undo');
      }
    };
    go(0);
    r.add({ views: [board()], line: 'done', event: 'done', message: solutions.length ? `${solutions.length} solution${solutions.length === 1 ? '' : 's'}; the first has columns ${solutions[0]!.join(', ')}.` : 'No solutions exist for this board size.', vars: { result: solutions.length } });
    return r.frames;
  },
  check: ({ n }, f) => (f.at(-1)!.vars!.result === QUEENS[n - 1] ? null : 'wrong solution count'),
};

// --------------------------------------------------------- combination sum
interface CombIn { cands: number[]; target: number }
export const combinationSum: AlgoDef<CombIn> = {
  id: 'combination-sum', name: 'Combination sum (backtracking)', category: 'backtracking', concepts: ['backtracking'],
  blurb: 'Choose a number (reuse allowed), subtract it from the target, recurse; stop when the target hits 0 or the number is too big.',
  time: 'exponential', space: 'O(target)', input: {}, modes: {},
  defaults: { cands: [2, 3, 6, 7], target: 7 },
  samples: [{ cands: [2], target: 1 }, { cands: [1], target: 5 }, { cands: [2, 3, 5], target: 8 }, { cands: [1, 2, 3], target: 6 }, { cands: [9], target: 9 }],
  custom: {
    help: 'Distinct candidates (1 to 9, up to 5), then | and the target (1 to 15): 2, 3, 6, 7 | target = 7.',
    parse: (t): Parsed<CombIn> => {
      const [left = '', right = ''] = t.split('|');
      const c = ints(left, { min: 1, max: 9, len: [1, 5], what: 'candidates' });
      if (!c.ok) return c;
      if (new Set(c.value).size !== c.value.length) return fail('Candidates must be distinct.');
      const target = Number(pair(right, 'target') ?? NaN);
      return Number.isInteger(target) && target >= 1 && target <= 15 ? ok({ cands: [...c.value].sort((a, b) => a - b), target }) : fail('Add | target = N with N from 1 to 15.');
    },
    format: (v) => `${v.cands.join(', ')} | target = ${v.target}`,
  },
  code: {
    java: `void comb(int[] c, int start, int rem, List<Integer> cur, List<List<Integer>> out) {
    if (rem == 0) { out.add(new ArrayList<>(cur)); return; }
    for (int i = start; i < c.length; i++) {
        if (c[i] > rem) break;
        cur.add(c[i]);
        comb(c, i, rem - c[i], cur, out);
        cur.remove(cur.size() - 1);
    }
}`,
    cpp: `void comb(const vector<int>& c, int start, int rem, vector<int>& cur, vector<vector<int>>& out) {
    if (rem == 0) { out.push_back(cur); return; }
    for (int i = start; i < (int)c.size(); i++) {
        if (c[i] > rem) break;
        cur.push_back(c[i]);
        comb(c, i, rem - c[i], cur, out);
        cur.pop_back();
    }
}`,
  },
  lines: same({ record: 1, prune: 3, choose: [4, 5], undo: 6, done: 7 }),
  run({ cands, target }) {
    const c = [...cands].sort((x, y) => x - y);
    const r = new Rec();
    const cur: number[] = [];
    const out: string[] = [];
    const f = (line: string, message: string, rem: number, i: number, event: string) =>
      r.add({ views: [arr(c, { tones: i >= 0 ? { [i]: 'active' } : {}, pointers: i >= 0 ? [['i', i]] : [] })], aux: [aux('stack', `current sum ${target - rem}`, cur), aux('list', `found ${out.length}`, out)], line, event, message, vars: { remaining: rem } });
    const go = (start: number, rem: number) => {
      r.count('calls');
      if (rem === 0) { out.push(key(cur)); f('record', `Remaining 0: record ${key(cur)}.`, rem, -1, 'record'); return; }
      for (let i = start; i < c.length; i++) {
        r.count('checks');
        if (c[i]! > rem) { f('prune', `${c[i]} > ${rem}: too big, and so is everything after it (sorted). Prune.`, rem, i, 'prune'); break; }
        cur.push(c[i]!);
        f('choose', `Choose ${c[i]}; ${rem - c[i]!} left.`, rem - c[i]!, i, 'choose');
        go(i, rem - c[i]!);
        cur.pop();
        f('undo', `Undo ${c[i]}.`, rem, i, 'undo');
      }
    };
    go(0, target);
    r.add({ views: [arr(c)], aux: [aux('list', `${out.length} combinations`, out)], line: 'done', event: 'done', message: `${out.length} combination${out.length === 1 ? '' : 's'} sum to ${target}.`, vars: { result: out.length } });
    return r.frames;
  },
  check: ({ cands, target }, f) => {
    const ways = Array<number>(target + 1).fill(0);
    ways[0] = 1;
    for (const c of cands) for (let s = c; s <= target; s++) ways[s]! += ways[s - c]!;
    return f.at(-1)!.vars!.result === ways[target] ? null : 'wrong count';
  },
};

// --------------------------------------------------------------- hash table
type HOp = { op: 'put' | 'get' | 'remove'; k: number };
const puts = (...k: number[]): HOp[] => k.map((x) => ({ op: 'put', k: x }));
interface HashIn { ops: HOp[] }
export const hashmap: AlgoDef<HashIn> = {
  id: 'hashmap-internals', name: 'Hash table internals', category: 'hashing', concepts: ['hashing'],
  blurb: 'A key is turned into a bucket number. Keys that land in the same bucket form a chain; a crowded table doubles and rehashes.',
  time: 'O(1) average', space: 'O(n)', input: {}, modes: { predict: true },
  defaults: { ops: [...puts(5, 9, 13, 2, 1, 17), { op: 'get', k: 13 }, { op: 'get', k: 6 }, { op: 'remove', k: 9 }] },
  samples: [{ ops: [{ op: 'get', k: 1 }] }, { ops: [{ op: 'put', k: -3 }, { op: 'get', k: -3 }, { op: 'remove', k: -3 }, { op: 'get', k: -3 }] }, { ops: [{ op: 'put', k: 4 }, { op: 'put', k: 8 }, { op: 'put', k: 12 }, { op: 'put', k: 4 }] }],
  custom: {
    help: 'Operations on integer keys: put 5, get 5, remove 5. Up to 20 operations; capacity starts at 4 and doubles above load factor 0.75.',
    parse: (t): Parsed<HashIn> => {
      const ops: HOp[] = [];
      for (const tok of tokens(t)) {
        const m = /^(put|get|remove)\s*(-?\d+)$/i.exec(tok);
        if (!m) return fail(`"${tok}" is not an operation. Write put 5, get 5 or remove 5.`);
        const k = Number(m[2]);
        if (k < -99 || k > 999) return fail('Keys must be between -99 and 999.');
        ops.push({ op: m[1]!.toLowerCase() as HOp['op'], k });
      }
      return ops.length < 1 || ops.length > 20 ? fail('Enter 1 to 20 operations.') : ok({ ops });
    },
    format: (v) => v.ops.map((o) => `${o.op} ${o.k}`).join(', '),
    presets: [{ label: 'all collide', text: 'put 4, put 8, put 12, put 16, get 16, remove 8' }, { label: 'triggers a resize', text: 'put 1, put 2, put 3, put 4, put 5' }],
  },
  code: {
    java: `class MyHashSet {
    LinkedList<Integer>[] buckets = new LinkedList[4];
    int size = 0;
    int idx(int k) { return Math.floorMod(k, buckets.length); }
    boolean contains(int k) { return buckets[idx(k)].contains(k); }
    void put(int k) {
        if (contains(k)) return;
        buckets[idx(k)].add(k);
        if (++size > 0.75 * buckets.length) resize();
    }
    void remove(int k) { if (buckets[idx(k)].remove((Integer) k)) size--; }
    void resize() { /* double the array, re-insert every key */ }
}`,
    cpp: `struct MyHashSet {
    vector<list<int>> buckets = vector<list<int>>(4);
    int size = 0;
    int idx(int k) { return ((k % (int)buckets.size()) + buckets.size()) % buckets.size(); }
    bool contains(int k) { auto& b = buckets[idx(k)]; return find(b.begin(), b.end(), k) != b.end(); }
    void put(int k) {
        if (contains(k)) return;
        buckets[idx(k)].push_back(k);
        if (++size > 0.75 * buckets.size()) resize();
    }
    void remove(int k) { auto& b = buckets[idx(k)]; size -= b.remove(k); }
    void resize() { /* double the vector, re-insert every key */ }
};`,
  },
  lines: same({ hash: 3, scan: [4, 6], insert: 7, exists: 6, load: 8, resize: 11, remove: 10, answer: 4, done: 11 }),
  run({ ops }) {
    const r = new Rec();
    let cap = 4;
    let buckets: number[][] = Array.from({ length: cap }, () => []);
    let size = 0;
    const answers: string[] = [];
    const idx = (k: number) => ((k % cap) + cap) % cap;
    const view = (hiRow = -1, hiPos = -1, tone: Tone = 'active') => {
      const w = Math.max(2, ...buckets.map((b) => b.length));
      return table(buckets.map((_, i) => String(i)), Array.from({ length: w }, (_, i) => `#${i + 1}`), buckets.map((b) => Array.from({ length: w }, (_, i) => b[i] ?? '')), hiRow >= 0 ? { [`${hiRow},${hiPos < 0 ? 0 : hiPos}`]: tone, ...(hiPos < 0 ? {} : {}) } : {});
    };
    const f = (line: string, message: string, event: string, hi: [number, number, Tone?] = [-1, -1], extra: Partial<Frame> = {}) =>
      r.add({ views: [view(hi[0], hi[1], hi[2])], line, event, message, vars: { capacity: cap, size, load: Number((size / cap).toFixed(2)) }, ...extra });
    const resize = () => {
      f('load', `Load factor ${size}/${cap} = ${(size / cap).toFixed(2)} is above 0.75: grow.`, 'overload');
      const keys = buckets.flat();
      cap *= 2;
      buckets = Array.from({ length: cap }, () => []);
      for (const k of keys) { buckets[idx(k)]!.push(k); r.count('rehashes'); }
      f('resize', `Capacity doubled to ${cap}; every key was rehashed with the new size.`, 'resize');
    };
    f('hash', `Empty table: ${cap} buckets.`, 'start');
    for (const { op, k } of ops) {
      const i = idx(k);
      r.count('hashes');
      f('hash', `${op}(${k}): ${k} mod ${cap} → bucket ${i}.`, 'hash', [i, -1, 'active'], {
        predict: { question: `Which bucket does key ${k} go to (capacity ${cap})?`, kind: 'choice', choices: Array.from({ length: cap }, (_, b) => String(b)).slice(0, 8), answer: String(i), explain: `${k} mod ${cap} = ${i}.` },
      });
      let at = -1;
      for (let p = 0; p < buckets[i]!.length; p++) {
        r.count('probes');
        const hit = buckets[i]![p] === k;
        f('scan', hit ? `Found ${k} in the chain.` : `${buckets[i]![p]} ≠ ${k}: next in the chain.`, 'probe', [i, p, hit ? 'found' : 'compare']);
        if (hit) { at = p; break; }
      }
      if (op === 'put') {
        if (at >= 0) f('exists', `${k} is already present: nothing to add.`, 'exists', [i, at, 'found']);
        else { buckets[i]!.push(k); size++; r.count('writes'); f('insert', buckets[i]!.length > 1 ? `Collision: ${k} joins the chain in bucket ${i}.` : `Bucket ${i} was empty: ${k} goes first.`, buckets[i]!.length > 1 ? 'collision' : 'insert', [i, buckets[i]!.length - 1, 'found']); if (size > 0.75 * cap) resize(); }
      } else if (op === 'get') {
        answers.push(at >= 0 ? '1' : '0');
        f('answer', at >= 0 ? `get(${k}) = present.` : `get(${k}) = absent: the chain ended.`, at >= 0 ? 'found' : 'not-found', [i, Math.max(at, 0), at >= 0 ? 'found' : 'error']);
      } else if (at >= 0) { buckets[i]!.splice(at, 1); size--; r.count('writes'); f('remove', `Removed ${k} from bucket ${i}.`, 'remove', [i, -1]); }
      else f('remove', `${k} is not in the table: nothing to remove.`, 'not-found', [i, -1, 'error']);
    }
    r.add({ views: [view()], line: 'done', event: 'done', message: `Done. ${size} key${size === 1 ? '' : 's'} in ${cap} buckets.`, vars: { result: answers.join(','), size, capacity: cap } });
    return r.frames;
  },
  check: ({ ops }, f) => {
    const s = new Set<number>();
    const ans: string[] = [];
    for (const o of ops) { if (o.op === 'put') s.add(o.k); else if (o.op === 'remove') s.delete(o.k); else ans.push(s.has(o.k) ? '1' : '0'); }
    const v = f.at(-1)!.vars!;
    return v.result === ans.join(',') && v.size === s.size ? null : 'wrong table contents';
  },
};

// ---------------------------------------------------------------------- KMP
interface KmpIn { text: string; pat: string }
export const kmp: AlgoDef<KmpIn> = {
  id: 'kmp', name: 'KMP string matching', category: 'string', concepts: ['strings-advanced'],
  blurb: 'Precompute, for each prefix of the pattern, the longest border; on a mismatch fall back along it instead of restarting.',
  time: 'O(n + m)', space: 'O(m)', input: {}, modes: {},
  defaults: { text: 'abxabcabcaby', pat: 'abcaby' },
  samples: [{ text: 'a', pat: 'a' }, { text: 'aaaaa', pat: 'aa' }, { text: 'abcdef', pat: 'xyz' }, { text: 'ababcabab', pat: 'abab' }, { text: 'aabaabaaa', pat: 'aabaa' }],
  custom: {
    help: 'Text, then | and the pattern: abxabcabcaby | abcaby. Text up to 20 characters, pattern up to 8.',
    parse: (t): Parsed<KmpIn> => {
      const [text = '', pat = ''] = t.split('|').map((x) => x.trim());
      return text.length < 1 || text.length > 20 || pat.length < 1 || pat.length > 8 ? fail('Text must be 1 to 20 characters and the pattern 1 to 8, separated by |.') : ok({ text, pat });
    },
    format: (v) => `${v.text} | ${v.pat}`,
    presets: [{ label: 'overlapping matches', text: 'aaaaaa | aaa' }, { label: 'long fallbacks', text: 'aabaabaaa | aabaa' }],
  },
  code: {
    java: `int[] lps(String p) {
    int[] f = new int[p.length()];
    for (int i = 1, k = 0; i < p.length(); i++) {
        while (k > 0 && p.charAt(i) != p.charAt(k)) k = f[k - 1];
        if (p.charAt(i) == p.charAt(k)) k++;
        f[i] = k;
    }
    return f;
}
List<Integer> search(String t, String p) {
    int[] f = lps(p);
    List<Integer> hits = new ArrayList<>();
    for (int i = 0, k = 0; i < t.length(); i++) {
        while (k > 0 && t.charAt(i) != p.charAt(k)) k = f[k - 1];
        if (t.charAt(i) == p.charAt(k)) k++;
        if (k == p.length()) { hits.add(i - k + 1); k = f[k - 1]; }
    }
    return hits;
}`,
    cpp: `vector<int> lps(const string& p) {
    vector<int> f(p.size());
    for (int i = 1, k = 0; i < (int)p.size(); i++) {
        while (k > 0 && p[i] != p[k]) k = f[k - 1];
        if (p[i] == p[k]) k++;
        f[i] = k;
    }
    return f;
}
vector<int> search(const string& t, const string& p) {
    vector<int> f = lps(p);
    vector<int> hits;
    for (int i = 0, k = 0; i < (int)t.size(); i++) {
        while (k > 0 && t[i] != p[k]) k = f[k - 1];
        if (t[i] == p[k]) k++;
        if (k == (int)p.size()) { hits.push_back(i - k + 1); k = f[k - 1]; }
    }
    return hits;
}`,
  },
  lines: same({ 'build-compare': [3, 4], 'build-set': 5, 'build-fallback': 3, 'search-compare': [13, 14], 'search-fallback': 13, hit: 15, done: 17 }),
  run({ text, pat }) {
    const r = new Rec();
    const f = Array<number>(pat.length).fill(0);
    const T = text.split('');
    const P = pat.split('');
    const fView = (done: number) => arr(f.map((x, i) => (i <= done ? x : '')), { name: 'border length f[i]', labels: Object.fromEntries(P.map((c, i) => [i, c])) });
    r.add({ views: [arr(P, { name: 'pattern' }), fView(0)], line: 'build-compare', event: 'start', message: 'First build f[i]: the length of the longest proper prefix of the pattern that is also a suffix of pat[0..i].', vars: {} });
    for (let i = 1, k = 0; i < pat.length; i++) {
      while (k > 0 && P[i] !== P[k]) {
        r.count('comparisons');
        const back = f[k - 1]!;
        r.add({ views: [arr(P, { name: 'pattern', tones: { [i]: 'error', [k]: 'error' }, pointers: [['i', i], ['k', k]] }), fView(i - 1)], line: 'build-fallback', event: 'fallback', message: `'${P[i]}' ≠ '${P[k]}': fall back, k = f[${k - 1}] = ${back}.`, vars: { i, k: back } });
        k = back;
      }
      r.count('comparisons');
      const eq = P[i] === P[k];
      r.add({ views: [arr(P, { name: 'pattern', tones: { [i]: eq ? 'found' : 'compare', [k]: eq ? 'found' : 'compare' }, pointers: [['i', i], ['k', k]] }), fView(i - 1)], line: 'build-compare', event: 'compare', message: eq ? `'${P[i]}' = '${P[k]}': the border grows to ${k + 1}.` : `'${P[i]}' ≠ '${P[0]}': no border here.`, vars: { i, k } });
      if (eq) k++;
      f[i] = k;
      r.add({ views: [arr(P, { name: 'pattern', tones: { [i]: 'active' } }), fView(i)], line: 'build-set', event: 'set', message: `f[${i}] = ${k}.`, vars: { i, k } });
    }
    const hits: number[] = [];
    const view = (i: number, k: number, t: Record<number, Tone> = {}) => [
      arr(T, { name: 'text', tones: t, pointers: [['i', i]], brackets: k > 0 ? [{ from: i - k, to: i - 1, label: 'matched' }] : [] }),
      arr(P, { name: 'pattern', tones: Object.fromEntries(Array.from({ length: k }, (_, j) => [j, 'found' as Tone])), pointers: [['k', k]] }),
      fView(pat.length),
    ];
    for (let i = 0, k = 0; i < text.length; i++) {
      while (k > 0 && T[i] !== P[k]) {
        r.count('comparisons');
        r.add({ views: view(i, k, { [i]: 'error' }), line: 'search-fallback', event: 'fallback', message: `Mismatch '${T[i]}' vs '${P[k]}': slide the pattern, k = f[${k - 1}] = ${f[k - 1]}. The text pointer does not move back.`, vars: { i, k: f[k - 1]! } });
        k = f[k - 1]!;
      }
      r.count('comparisons');
      const eq = T[i] === P[k];
      r.add({ views: view(i, k, { [i]: eq ? 'found' : 'compare' }), line: 'search-compare', event: 'compare', message: eq ? `'${T[i]}' matches '${P[k]}'.` : `'${T[i]}' ≠ '${P[0]}': nothing matched yet.`, vars: { i, k } });
      if (eq) k++;
      if (k === pat.length) {
        hits.push(i - k + 1);
        r.add({ views: view(i + 1, k, Object.fromEntries(Array.from({ length: k }, (_, j) => [i - k + 1 + j, 'found' as Tone]))), line: 'hit', event: 'hit', message: `Full match starting at index ${i - k + 1}. Keep going with k = f[${k - 1}] = ${f[k - 1]}.`, vars: { start: i - k + 1 } });
        k = f[k - 1]!;
      }
    }
    r.add({ views: [arr(T, { name: 'text', tones: Object.fromEntries(hits.flatMap((h) => Array.from({ length: pat.length }, (_, j) => [h + j, 'found' as Tone]))) }), arr(P, { name: 'pattern' })], line: 'done', event: 'done', message: hits.length ? `Matches start at ${hits.join(', ')}.` : 'No match.', vars: { result: hits.join(',') } });
    return r.frames;
  },
  check: ({ text, pat }, fr) => {
    const exp: number[] = [];
    for (let i = 0; i + pat.length <= text.length; i++) if (text.startsWith(pat, i)) exp.push(i);
    return fr.at(-1)!.vars!.result === exp.join(',') ? null : 'wrong matches';
  },
};

// -------------------------------------------------------------------- sieve
interface SieveIn { n: number }
export const sieve: AlgoDef<SieveIn> = {
  id: 'sieve', name: 'Sieve of Eratosthenes', category: 'misc', concepts: ['math-basics'],
  blurb: 'Cross out the multiples of each prime, starting at p². What is never crossed out is prime.',
  time: 'O(n log log n)', space: 'O(n)', input: {}, modes: {},
  defaults: { n: 50 }, samples: [{ n: 2 }, { n: 3 }, { n: 30 }, { n: 100 }],
  custom: {
    help: 'The limit n, from 2 to 100.',
    parse: (t): Parsed<SieveIn> => { const r = ints(t, { min: 2, max: 100, len: [1, 1], what: 'limit' }); return r.ok ? ok({ n: r.value[0]! }) : r; },
    format: (v) => String(v.n),
    presets: [{ label: 'up to 30', text: '30' }, { label: 'up to 100', text: '100' }],
  },
  code: {
    java: `boolean[] sieve(int n) {
    boolean[] composite = new boolean[n + 1];
    for (int p = 2; (long) p * p <= n; p++) {
        if (composite[p]) continue;
        for (int m = p * p; m <= n; m += p)
            composite[m] = true;
    }
    return composite;
}`,
    cpp: `vector<bool> sieve(int n) {
    vector<bool> composite(n + 1);
    for (int p = 2; (long long)p * p <= n; p++) {
        if (composite[p]) continue;
        for (int m = p * p; m <= n; m += p)
            composite[m] = true;
    }
    return composite;
}`,
  },
  lines: same({ 'next-p': [2, 3], skip: 3, mark: [4, 5], done: 7 }),
  run({ n }) {
    const r = new Rec();
    const comp = Array<boolean>(n + 1).fill(false);
    const rows = Math.ceil(n / 10);
    const pos = (v: number): string => `${Math.floor((v - 1) / 10)},${(v - 1) % 10}`;
    const v = (extra: Record<string, Tone> = {}) => {
      const tones: Record<string, Tone> = { [pos(1)]: 'dim' };
      for (let m = 2; m <= n; m++) if (comp[m]) tones[pos(m)] = 'dim';
      return [grid(Array.from({ length: rows }, (_, y) => Array.from({ length: 10 }, (_, x) => (y * 10 + x + 1 <= n ? y * 10 + x + 1 : ''))), { ...tones, ...extra })];
    };
    r.add({ views: v(), line: 'next-p', event: 'start', message: `Numbers 2 to ${n}. Nothing is crossed out yet.`, vars: { n } });
    for (let p = 2; p * p <= n; p++) {
      r.count('checks');
      if (comp[p]) { r.add({ views: v({ [pos(p)]: 'compare' }), line: 'skip', event: 'skip', message: `${p} is already crossed out, so it is not prime: skip.`, vars: { p } }); continue; }
      r.add({ views: v({ [pos(p)]: 'found' }), line: 'next-p', event: 'prime', message: `${p} is still standing: it is prime. Cross out its multiples from ${p * p}.`, vars: { p } });
      for (let m = p * p; m <= n; m += p) {
        comp[m] = true;
        r.count('crossings');
        r.add({ views: v({ [pos(p)]: 'found', [pos(m)]: 'error' }), line: 'mark', event: 'mark', message: `Cross out ${m} (${p} × ${m / p}).`, vars: { p, m } });
      }
    }
    const primes = Array.from({ length: n - 1 }, (_, i) => i + 2).filter((x) => !comp[x]);
    r.add({ views: v(Object.fromEntries(primes.map((q) => [pos(q), 'found' as Tone]))), line: 'done', event: 'done', message: `${primes.length} primes up to ${n}: ${primes.join(', ')}.`, vars: { result: primes.length, primes: primes.join(',') } });
    return r.frames;
  },
  check: ({ n }, f) => {
    const exp: number[] = [];
    for (let x = 2; x <= n; x++) { let p = true; for (let d = 2; d * d <= x; d++) if (x % d === 0) p = false; if (p) exp.push(x); }
    return f.at(-1)!.vars!.primes === exp.join(',') ? null : 'wrong primes';
  },
};

// ---------------------------------------------------------------- recursion
interface RecIn { n: number; memo: boolean }
interface CallNode { id: number; n: number; left?: number; right?: number; ret?: number; hit?: boolean }
export const recursion: AlgoDef<RecIn> = {
  id: 'recursion-call-stack', name: 'Recursion call tree (Fibonacci)', category: 'misc', concepts: ['recursion-basics'],
  blurb: 'Watch the call tree grow and the call stack push and pop. Switch memoization on to see repeated work disappear.',
  time: 'O(2ⁿ) plain, O(n) memoized', space: 'O(n)', input: {}, modes: { predict: true },
  defaults: { n: 5, memo: false }, samples: [{ n: 1, memo: false }, { n: 6, memo: true }, { n: 8, memo: false }, { n: 8, memo: true }, { n: 2, memo: false }],
  custom: {
    help: 'n from 1 to 8, optionally followed by | memo: 6 | memo.',
    parse: (t): Parsed<RecIn> => {
      const [left = '', right = ''] = t.split('|');
      const r = ints(left, { min: 1, max: 8, len: [1, 1], what: 'n' });
      return r.ok ? ok({ n: r.value[0]!, memo: /memo/i.test(right) }) : r;
    },
    format: (v) => (v.memo ? `${v.n} | memo` : String(v.n)),
    presets: [{ label: 'fib(6) plain', text: '6' }, { label: 'fib(6) memoized', text: '6 | memo' }],
  },
  code: {
    java: `int fib(int n) {
    if (n < 2) return n;
    if (useMemo && memo[n] != 0) return memo[n];
    int r = fib(n - 1) + fib(n - 2);
    if (useMemo) memo[n] = r;
    return r;
}`,
    cpp: `int fib(int n) {
    if (n < 2) return n;
    if (useMemo && memo[n] != 0) return memo[n];
    int r = fib(n - 1) + fib(n - 2);
    if (useMemo) memo[n] = r;
    return r;
}`,
  },
  lines: same({ call: 0, base: 1, 'memo-hit': 2, compute: 3, store: 4, return: 5 }),
  run({ n, memo: useMemo }) {
    const r = new Rec();
    const nodes: CallNode[] = [];
    const memo = new Map<number, number>();
    const stack: number[] = [];
    const view = (cur: number): TreeView => ({
      kind: 'tree', root: nodes.length ? 'c0' : null,
      nodes: nodes.map((c) => ({ id: `c${c.id}`, value: `fib(${c.n})${c.ret !== undefined ? `=${c.ret}` : ''}`, ...(c.left !== undefined ? { left: `c${c.left}` } : {}), ...(c.right !== undefined ? { right: `c${c.right}` } : {}), tone: c.id === cur ? 'active' : c.hit ? 'dim' : c.ret !== undefined ? 'found' : 'frontier' })),
      pointers: [],
    });
    const f = (line: string, message: string, cur: number, event: string, extra: Partial<Frame> = {}) =>
      r.add({ views: [view(cur)], aux: [aux('stack', 'call stack (top on the right)', stack.map((s) => `fib(${nodes[s]!.n})`)), ...(useMemo ? [aux('map', 'memo', [...memo].map(([k, v]) => `${k}→${v}`))] : [])], line, event, message, vars: { n: nodes[cur]?.n ?? n, calls: nodes.length }, ...extra });
    const fib = (k: number, parent: number, side: 'left' | 'right' | null): number => {
      const node: CallNode = { id: nodes.length, n: k };
      nodes.push(node);
      if (parent >= 0 && side) nodes[parent]![side] = node.id;
      stack.push(node.id);
      r.count('calls');
      f('call', `Call fib(${k}).`, node.id, 'call');
      let val: number;
      if (k < 2) { val = k; f('base', `fib(${k}) is a base case: return ${k}.`, node.id, 'return'); }
      else if (useMemo && memo.has(k)) { val = memo.get(k)!; node.hit = true; r.count('memo hits'); f('memo-hit', `fib(${k}) is in the memo: return ${val} without recursing.`, node.id, 'memo-hit'); }
      else {
        const a = fib(k - 1, node.id, 'left');
        const b = fib(k - 2, node.id, 'right');
        val = a + b;
        f('compute', `fib(${k}) = ${a} + ${b} = ${val}.`, node.id, 'combine', {
          predict: { question: `fib(${k - 1}) returned ${a} and fib(${k - 2}) returned ${b}. What does fib(${k}) return?`, kind: 'choice', choices: [...new Set([val, val + 1, Math.max(0, val - 1)])].sort((x, y) => x - y).map(String), answer: String(val), explain: `${a} + ${b} = ${val}.` },
        });
        if (useMemo) { memo.set(k, val); f('store', `Store memo[${k}] = ${val}.`, node.id, 'store'); }
      }
      node.ret = val;
      stack.pop();
      f('return', `fib(${k}) returns ${val}.`, node.id, 'return');
      return val;
    };
    const result = fib(n, -1, null);
    r.add({ views: [view(-1)], line: 'return', event: 'done', message: `fib(${n}) = ${result} using ${nodes.length} calls.`, vars: { result, calls: nodes.length } });
    return r.frames;
  },
  check: ({ n, memo }, f) => {
    let [a, b] = [0, 1];
    for (let i = 0; i < n; i++) [a, b] = [b, a + b];
    const v = f.at(-1)!.vars!;
    if (v.result !== a) return 'wrong value';
    return memo && (v.calls as number) > 2 * n ? 'memo should keep calls linear' : null;
  },
};

export const MISC_ALGOS = [subsets, permutations, nQueens, combinationSum, hashmap, kmp, sieve, recursion];
