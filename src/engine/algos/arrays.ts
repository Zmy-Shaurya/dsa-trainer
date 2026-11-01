// Phase 9: more sorting, linear-scan and searching visualizers over number arrays.
import { arr, aux, Rec, same } from '../build';
import { fail, ints, ok, pair } from '../parse';
import type { AlgoDef, Tone } from '../types';

// ---------------------------------------------------------------- heap sort
export const heapSort: AlgoDef = {
  id: 'heap-sort', name: 'Heap sort', category: 'sorting', concepts: ['sorting', 'heaps'],
  blurb: 'Build a max-heap, then repeatedly swap the maximum to the end and sift the new root down.',
  time: 'O(n log n)', space: 'O(1)', input: {}, defaults: { arr: [5, 3, 8, 1, 9, 2, 7] }, modes: { race: true },
  invariants: ['a[end..n-1] holds the largest values in order', 'a[0..end-1] is a max-heap'],
  samples: [{ arr: [1] }, { arr: [2, 1] }, { arr: [3, 3, 3] }, { arr: [9, 8, 7, 6, 5, 4, 3, 2, 1] }, { arr: [4, -2, 7, 0, -9, 7] }],
  code: {
    java: `void heapSort(int[] a) {
    int n = a.length;
    for (int i = n / 2 - 1; i >= 0; i--)
        siftDown(a, n, i);
    for (int end = n - 1; end > 0; end--) {
        swap(a, 0, end);
        siftDown(a, end, 0);
    }
}
void siftDown(int[] a, int n, int i) {
    while (true) {
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < n && a[l] > a[m]) m = l;
        if (r < n && a[r] > a[m]) m = r;
        if (m == i) return;
        swap(a, i, m); i = m;
    }
}`,
    cpp: `void heapSort(vector<int>& a) {
    int n = a.size();
    for (int i = n / 2 - 1; i >= 0; i--)
        siftDown(a, n, i);
    for (int end = n - 1; end > 0; end--) {
        swap(a[0], a[end]);
        siftDown(a, end, 0);
    }
}
void siftDown(vector<int>& a, int n, int i) {
    while (true) {
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < n && a[l] > a[m]) m = l;
        if (r < n && a[r] > a[m]) m = r;
        if (m == i) return;
        swap(a[i], a[m]); i = m;
    }
}`,
  },
  lines: same({ build: 3, extract: 5, 'sift-compare': [11, 12], 'sift-swap': 14, 'sift-done': 13, done: 7 }),
  run({ arr: input }) {
    const a = [...input];
    const n = a.length;
    const r = new Rec();
    const sorted = (end: number) => Object.fromEntries(a.map((_, k) => [k, k >= end ? 'sorted' : undefined]).filter(([, t]) => t)) as Record<number, Tone>;
    const view = (heapN: number, t: Record<number, Tone> = {}, ptr: [string, number][] = []) =>
      arr(a, { style: 'bars', tones: { ...sorted(heapN), ...t }, pointers: ptr, brackets: heapN > 0 ? [{ from: 0, to: heapN - 1, label: 'heap' }] : [] });
    const siftDown = (size: number, start: number) => {
      let i = start;
      for (;;) {
        const l = 2 * i + 1;
        const rt = l + 1;
        let m = i;
        r.add({ views: [view(size, { [i]: 'active' }, [['i', i]])], line: 'sift-compare', message: `Sift down from index ${i}: compare with its children.`, vars: { i, size } });
        if (l < size) { r.count('comparisons'); if (a[l]! > a[m]!) m = l; }
        if (rt < size) { r.count('comparisons'); if (a[rt]! > a[m]!) m = rt; }
        if (m === i) {
          r.add({ views: [view(size, { [i]: 'found' }, [['i', i]])], line: 'sift-done', message: `a[${i}] = ${a[i]} is at least as large as its children: stop.`, event: 'settle', vars: { i, size } });
          return;
        }
        r.count('swaps');
        r.add({ views: [view(size, { [i]: 'swap', [m]: 'swap' }, [['i', i], ['m', m]])], line: 'sift-swap', message: `Swap ${a[i]} with the larger child ${a[m]}.`, event: 'swap', vars: { i, m, size } });
        [a[i], a[m]] = [a[m]!, a[i]!];
        i = m;
      }
    };
    r.add({ views: [view(n)], line: 'build', message: 'Start: turn the array into a max-heap, bottom up.', vars: { n } });
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(n, i);
    for (let end = n - 1; end > 0; end--) {
      r.count('swaps');
      r.add({ views: [view(end + 1, { 0: 'swap', [end]: 'swap' })], line: 'extract', message: `Swap the maximum ${a[0]} to position ${end}.`, event: 'extract', vars: { end } });
      [a[0], a[end]] = [a[end]!, a[0]!];
      siftDown(end, 0);
    }
    r.add({ views: [view(0, Object.fromEntries(a.map((_, k) => [k, 'sorted' as Tone])))], line: 'done', message: 'Sorted.', event: 'done', vars: { result: a.join(',') } });
    return r.frames;
  },
  check: (inp, f) => {
    const out = (f.at(-1)!.views[0] as { cells: { value: number }[] }).cells.map((c) => c.value);
    return JSON.stringify(out) === JSON.stringify([...inp.arr].sort((x, y) => x - y)) ? null : 'not sorted';
  },
};

// ------------------------------------------------------------ counting sort
export const countingSort: AlgoDef = {
  id: 'counting-sort', name: 'Counting sort', category: 'sorting', concepts: ['sorting'],
  blurb: 'Tally how often each small value occurs, then write the values back in order. No comparisons at all.',
  time: 'O(n + k)', space: 'O(k)', input: {}, defaults: { arr: [4, 2, 2, 8, 3, 3, 1] }, modes: { race: true },
  samples: [{ arr: [0] }, { arr: [3, 3, 3] }, { arr: [15, 0, 15] }, { arr: [5, 4, 3, 2, 1, 0] }],
  custom: {
    help: 'Whole numbers from 0 to 15 (the tally array has one slot per value), up to 20 of them.',
    parse: (t) => { const r = ints(t, { min: 0, max: 15, len: [1, 20] }); return r.ok ? ok({ arr: r.value }) : r; },
    format: (v) => v.arr.join(', '),
    presets: [{ label: 'few distinct values', text: '3, 1, 3, 2, 1, 3, 2, 1' }, { label: 'reversed', text: '9, 8, 7, 6, 5, 4, 3, 2, 1' }],
  },
  code: {
    java: `void countingSort(int[] a, int max) {
    int[] count = new int[max + 1];
    for (int x : a) count[x]++;
    int k = 0;
    for (int v = 0; v <= max; v++)
        while (count[v]-- > 0) a[k++] = v;
}`,
    cpp: `void countingSort(vector<int>& a, int mx) {
    vector<int> count(mx + 1);
    for (int x : a) count[x]++;
    int k = 0;
    for (int v = 0; v <= mx; v++)
        while (count[v]-- > 0) a[k++] = v;
}`,
  },
  lines: same({ start: 1, tally: 2, emit: 5, done: 5 }),
  run({ arr: input }) {
    const a = [...input];
    const max = Math.max(...a);
    const count = Array.from({ length: max + 1 }, () => 0);
    const r = new Rec();
    const labels = Array.from({ length: max + 1 }, (_, v) => String(v));
    const countView = (t: Record<number, Tone> = {}) => arr(count, { tones: t, name: 'count[v]', labels: {} });
    void labels;
    r.add({ views: [arr(a, { name: 'input' }), countView()], line: 'start', message: `Values go from 0 to ${max}, so make ${max + 1} counters.`, vars: { max } });
    for (let i = 0; i < a.length; i++) {
      count[a[i]!]!++;
      r.count('tallies');
      r.add({ views: [arr(a, { name: 'input', tones: { [i]: 'active' }, pointers: [['i', i]] }), countView({ [a[i]!]: 'active' })], line: 'tally', event: 'tally', message: `Read ${a[i]}: add 1 to count[${a[i]}] (now ${count[a[i]!]}).`, vars: { i, x: a[i]! } });
    }
    const out: number[] = [];
    const left = [...count];
    for (let v = 0; v <= max; v++) {
      for (let c = 0; c < count[v]!; c++) {
        out.push(v);
        left[v]!--;
        r.count('writes');
        r.add({
          views: [arr([...out, ...Array.from({ length: a.length - out.length }, () => '')], { name: 'output', tones: { [out.length - 1]: 'sorted' } }), arr(left, { tones: { [v]: 'active' }, name: 'count[v] left' })],
          line: 'emit', event: 'write', message: `Write ${v} to output position ${out.length - 1}.`, vars: { v, k: out.length },
        });
      }
    }
    r.add({ views: [arr(out, { name: 'sorted', tones: Object.fromEntries(out.map((_, k) => [k, 'sorted' as Tone])) })], line: 'done', event: 'done', message: 'Every counter is used up: the output is sorted.', vars: { result: out.join(',') } });
    return r.frames;
  },
  check: (inp, f) => {
    const out = (f.at(-1)!.views[0] as { cells: { value: number }[] }).cells.map((c) => c.value);
    return JSON.stringify(out) === JSON.stringify([...inp.arr].sort((x, y) => x - y)) ? null : 'not sorted';
  },
};

// ------------------------------------------------------- two pointers (pair)
export const twoPointers: AlgoDef = {
  id: 'two-pointers-sorted-pair', name: 'Two pointers: pair with a sum', category: 'linear', concepts: ['two-pointers'],
  blurb: 'On a sorted array, move the left pointer up when the sum is too small and the right pointer down when it is too big.',
  time: 'O(n)', space: 'O(1)', input: { sorted: true, target: true, targetLabel: 'Target sum' }, defaults: { arr: [1, 3, 4, 6, 8, 11], target: 10 }, modes: { predict: true },
  samples: [{ arr: [1, 2], target: 3 }, { arr: [1, 2, 3], target: 100 }, { arr: [-5, 0, 5, 9], target: 0 }, { arr: [2, 2, 2], target: 4 }, { arr: [7], target: 7 }],
  code: {
    java: `int[] pairSum(int[] a, int target) {
    int l = 0, r = a.length - 1;
    while (l < r) {
        int s = a[l] + a[r];
        if (s == target) return new int[]{l, r};
        if (s < target) l++;
        else r--;
    }
    return new int[]{-1, -1};
}`,
    cpp: `vector<int> pairSum(const vector<int>& a, int target) {
    int l = 0, r = (int)a.size() - 1;
    while (l < r) {
        int s = a[l] + a[r];
        if (s == target) return {l, r};
        if (s < target) l++;
        else r--;
    }
    return {-1, -1};
}`,
  },
  lines: same({ start: 1, sum: 3, found: 4, 'move-left': 5, 'move-right': 6, none: 8 }),
  run({ arr: a, target = 0 }) {
    const r = new Rec();
    let l = 0;
    let hi = a.length - 1;
    const v = (t: Record<number, Tone> = {}, ptr = true) => arr(a, { tones: t, pointers: ptr && l < a.length && hi >= 0 ? [['l', l], ['r', hi]] : [], brackets: l < hi ? [{ from: l, to: hi, label: 'candidates' }] : [] });
    r.add({ views: [v()], line: 'start', message: `Look for two numbers that add up to ${target}.`, vars: { l, r: hi, target } });
    while (l < hi) {
      const s = a[l]! + a[hi]!;
      r.count('comparisons');
      const answer = s === target ? 'Found' : s < target ? 'Move l right' : 'Move r left';
      r.add({
        views: [v({ [l]: 'compare', [hi]: 'compare' })], line: 'sum', event: 'sum', message: `a[${l}] + a[${hi}] = ${a[l]} + ${a[hi]} = ${s}. Target is ${target}.`, vars: { l, r: hi, sum: s, target },
        predict: { question: `The sum is ${s} and the target is ${target}. What next?`, kind: 'choice', choices: ['Found', 'Move l right', 'Move r left'], answer,
          explain: s === target ? 'Equal: done.' : s < target ? 'Too small: only a bigger left value can help.' : 'Too big: only a smaller right value can help.' },
      });
      if (s === target) {
        r.add({ views: [v({ [l]: 'found', [hi]: 'found' })], line: 'found', event: 'found', message: `Found: indices ${l} and ${hi}.`, vars: { l, r: hi, result: `${l},${hi}` } });
        return r.frames;
      }
      if (s < target) { l++; r.add({ views: [v()], line: 'move-left', event: 'move', message: 'Sum too small: l moves right.', vars: { l, r: hi } }); }
      else { hi--; r.add({ views: [v()], line: 'move-right', event: 'move', message: 'Sum too big: r moves left.', vars: { l, r: hi } }); }
    }
    r.add({ views: [v({}, false)], line: 'none', event: 'not-found', message: 'The pointers met: no pair adds up to the target.', vars: { result: '-1,-1' } });
    return r.frames;
  },
  check: (inp, f) => {
    const res = String(f.at(-1)!.vars?.result);
    const has = inp.arr.some((x, i) => inp.arr.some((y, j) => i < j && x + y === inp.target));
    if (!has) return res === '-1,-1' ? null : 'should find nothing';
    const [i, j] = res.split(',').map(Number);
    return i! < j! && inp.arr[i!]! + inp.arr[j!]! === inp.target ? null : 'wrong pair';
  },
};

// --------------------------------------------------------- sliding window sum
export const slidingWindow: AlgoDef = {
  id: 'sliding-window-max-sum', name: 'Sliding window: best sum of k', category: 'linear', concepts: ['sliding-window'],
  blurb: 'Slide a fixed window one step at a time: add the new element, drop the old one, and keep the best sum.',
  time: 'O(n)', space: 'O(1)', input: { target: true, targetLabel: 'Window size k' }, defaults: { arr: [2, 1, 5, 1, 3, 2, 8], target: 3 }, modes: {},
  samples: [{ arr: [4], target: 1 }, { arr: [1, 2, 3], target: 3 }, { arr: [-1, -2, -3, -4], target: 2 }, { arr: [5, 5, 5, 5], target: 2 }],
  code: {
    java: `int maxWindowSum(int[] a, int k) {
    int sum = 0;
    for (int i = 0; i < k; i++) sum += a[i];
    int best = sum;
    for (int i = k; i < a.length; i++) {
        sum += a[i] - a[i - k];
        best = Math.max(best, sum);
    }
    return best;
}`,
    cpp: `int maxWindowSum(const vector<int>& a, int k) {
    int sum = 0;
    for (int i = 0; i < k; i++) sum += a[i];
    int best = sum;
    for (int i = k; i < (int)a.size(); i++) {
        sum += a[i] - a[i - k];
        best = max(best, sum);
    }
    return best;
}`,
  },
  lines: same({ first: 2, best: 3, slide: 5, update: 6, done: 8 }),
  run({ arr: a, target }) {
    const k = Math.max(1, Math.min(target ?? 1, a.length));
    const r = new Rec();
    let sum = a.slice(0, k).reduce((x, y) => x + y, 0);
    let best = sum;
    let bestAt = 0;
    const win = (s: number, t: Record<number, Tone> = {}) => arr(a, { style: 'bars', tones: t, brackets: [{ from: s, to: s + k - 1, label: `window of ${k}` }] });
    r.count('adds', k);
    r.add({ views: [win(0)], line: 'first', event: 'first', message: `The first window a[0..${k - 1}] adds up to ${sum}.`, vars: { k, sum, best: sum } });
    r.add({ views: [win(0, { 0: 'found' })], line: 'best', message: `Best so far: ${best}.`, vars: { k, sum, best } });
    for (let i = k; i < a.length; i++) {
      const out = a[i - k]!;
      sum += a[i]! - out;
      r.count('adds', 2);
      r.add({ views: [win(i - k + 1, { [i]: 'active', [i - k]: 'dim' })], line: 'slide', event: 'slide', message: `Add a[${i}] = ${a[i]}, drop a[${i - k}] = ${out}: sum is ${sum}.`, vars: { i, sum, best } });
      r.count('comparisons');
      if (sum > best) { best = sum; bestAt = i - k + 1; }
      r.add({ views: [win(i - k + 1, sum === best ? { [i]: 'found' } : {})], line: 'update', event: 'update', message: sum === best && bestAt === i - k + 1 ? `New best: ${best}.` : `Best stays ${best}.`, vars: { i, sum, best } });
    }
    r.add({ views: [win(bestAt, Object.fromEntries(Array.from({ length: k }, (_, j) => [bestAt + j, 'found' as Tone])))], line: 'done', event: 'done', message: `The best window starts at index ${bestAt}; its sum is ${best}.`, vars: { result: best } });
    return r.frames;
  },
  check: (inp, f) => {
    const k = Math.max(1, Math.min(inp.target ?? 1, inp.arr.length));
    let best = -Infinity;
    for (let i = 0; i + k <= inp.arr.length; i++) best = Math.max(best, inp.arr.slice(i, i + k).reduce((x, y) => x + y, 0));
    return f.at(-1)!.vars?.result === best ? null : 'wrong best sum';
  },
};

// ------------------------------------------------------------------- Kadane
export const kadane: AlgoDef = {
  id: 'kadane', name: "Kadane's maximum subarray", category: 'linear', concepts: ['greedy', 'dp-1d'],
  blurb: 'At each element decide: extend the running subarray or start fresh here. Keep the best total seen.',
  time: 'O(n)', space: 'O(1)', input: {}, defaults: { arr: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, modes: { predict: true },
  samples: [{ arr: [-3] }, { arr: [-3, -1, -2] }, { arr: [5, 4, 3] }, { arr: [1, -1, 1, -1, 1] }],
  code: {
    java: `int maxSubarray(int[] a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < a.length; i++) {
        cur = Math.max(a[i], cur + a[i]);
        best = Math.max(best, cur);
    }
    return best;
}`,
    cpp: `int maxSubarray(const vector<int>& a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < (int)a.size(); i++) {
        cur = max(a[i], cur + a[i]);
        best = max(best, cur);
    }
    return best;
}`,
  },
  lines: same({ start: 1, choose: 3, best: 4, done: 6 }),
  run({ arr: a }) {
    const r = new Rec();
    let cur = a[0]!;
    let best = a[0]!;
    let from = 0;
    let bFrom = 0;
    let bTo = 0;
    const v = (i: number, t: Record<number, Tone> = {}) => arr(a, { tones: t, pointers: [['i', i]], brackets: [{ from, to: i, label: 'running' }, ...(best !== cur || bFrom !== from ? [{ from: bFrom, to: bTo, label: 'best' }] : [])] });
    r.add({ views: [v(0, { 0: 'active' })], line: 'start', message: `Start with a[0] = ${a[0]} as both the running and the best sum.`, vars: { cur, best } });
    for (let i = 1; i < a.length; i++) {
      r.count('comparisons');
      const extend = cur + a[i]! >= a[i]!;
      const answer = extend ? 'Extend' : 'Start fresh';
      r.add({
        views: [v(i, { [i]: 'compare' })], line: 'choose', event: 'choose', message: `Running sum ${cur}, next value ${a[i]}: extend (${cur + a[i]!}) or start fresh (${a[i]})?`, vars: { i, cur, best },
        predict: { question: `Running sum is ${cur} and the next value is ${a[i]}. Extend or start fresh?`, kind: 'choice', choices: ['Extend', 'Start fresh'], answer,
          explain: extend ? `${cur} + ${a[i]} = ${cur + a[i]!} is at least ${a[i]} alone, so keep extending.` : `${cur + a[i]!} is worse than ${a[i]} alone: the old prefix only hurts, drop it.` },
      });
      if (extend) cur += a[i]!; else { cur = a[i]!; from = i; }
      r.count('comparisons');
      if (cur > best) { best = cur; bFrom = from; bTo = i; }
      r.add({ views: [v(i, { [i]: 'active' })], line: 'best', event: cur === best ? 'new-best' : 'step', message: cur === best && bTo === i ? `Running sum ${cur} is a new best.` : `Running sum ${cur}; best stays ${best}.`, vars: { i, cur, best } });
    }
    r.add({ views: [arr(a, { tones: Object.fromEntries(Array.from({ length: bTo - bFrom + 1 }, (_, j) => [bFrom + j, 'found' as Tone])) })], line: 'done', event: 'done', message: `Best subarray is a[${bFrom}..${bTo}] with sum ${best}.`, vars: { result: best } });
    return r.frames;
  },
  check: (inp, f) => {
    let best = -Infinity;
    for (let i = 0; i < inp.arr.length; i++) { let s = 0; for (let j = i; j < inp.arr.length; j++) { s += inp.arr[j]!; best = Math.max(best, s); } }
    return f.at(-1)!.vars?.result === best ? null : 'wrong best sum';
  },
};

// -------------------------------------------------------------- prefix sums
interface PrefixIn { arr: number[]; l: number; r: number }
export const prefixSums: AlgoDef<PrefixIn> = {
  id: 'prefix-sums', name: 'Prefix sums and range queries', category: 'linear', concepts: ['prefix-sums'],
  blurb: 'Build p[i] = sum of the first i elements once; then any range sum is one subtraction.',
  time: 'O(n) build, O(1) query', space: 'O(n)', input: {}, defaults: { arr: [3, 1, 4, 1, 5, 9, 2], l: 2, r: 5 }, modes: {},
  samples: [{ arr: [7], l: 0, r: 0 }, { arr: [1, 2, 3], l: 0, r: 2 }, { arr: [-4, 5, -6], l: 1, r: 2 }],
  custom: {
    help: 'Numbers, then | and the query range: 3, 1, 4, 1, 5 | l = 1, r = 3 (inclusive indices).',
    parse: (t) => {
      const [left = '', right = ''] = t.split('|');
      const a = ints(left, { min: -99, max: 99, len: [1, 15] });
      if (!a.ok) return a;
      const l = Number(pair(right, 'l') ?? 0);
      const rr = Number(pair(right, 'r') ?? a.value.length - 1);
      if (!Number.isInteger(l) || !Number.isInteger(rr) || l < 0 || rr >= a.value.length || l > rr) return fail(`Query needs 0 <= l <= r < ${a.value.length}.`);
      return ok({ arr: a.value, l, r: rr });
    },
    format: (v) => `${v.arr.join(', ')} | l = ${v.l}, r = ${v.r}`,
    presets: [{ label: 'whole array', text: '2, 4, 6, 8 | l = 0, r = 3' }],
  },
  code: {
    java: `int[] prefix(int[] a) {
    int[] p = new int[a.length + 1];
    for (int i = 0; i < a.length; i++)
        p[i + 1] = p[i] + a[i];
    return p;
}
int rangeSum(int[] p, int l, int r) {
    return p[r + 1] - p[l];
}`,
    cpp: `vector<int> prefix(const vector<int>& a) {
    vector<int> p(a.size() + 1);
    for (int i = 0; i < (int)a.size(); i++)
        p[i + 1] = p[i] + a[i];
    return p;
}
int rangeSum(const vector<int>& p, int l, int r) {
    return p[r + 1] - p[l];
}`,
  },
  lines: same({ build: 3, query: 7, done: 7 }),
  run({ arr: a, l, r: rr }) {
    const rec = new Rec();
    const p = [0];
    rec.add({ views: [arr(a, { name: 'a' }), arr(p, { name: 'p' })], line: 'build', message: 'p[0] = 0: the sum of no elements.', vars: { i: 0 } });
    for (let i = 0; i < a.length; i++) {
      p.push(p[i]! + a[i]!);
      rec.count('adds');
      rec.add({ views: [arr(a, { name: 'a', tones: { [i]: 'active' }, pointers: [['i', i]] }), arr(p, { name: 'p', tones: { [i + 1]: 'active' } })], line: 'build', event: 'fill', message: `p[${i + 1}] = p[${i}] + a[${i}] = ${p[i]} + ${a[i]} = ${p[i + 1]}.`, vars: { i } });
    }
    const hi = p[rr + 1]!;
    const lo = p[l]!;
    rec.count('lookups', 2);
    rec.add({ views: [arr(a, { name: 'a', tones: Object.fromEntries(Array.from({ length: rr - l + 1 }, (_, j) => [l + j, 'range' as Tone])) }), arr(p, { name: 'p', tones: { [rr + 1]: 'found', [l]: 'swap' } })], line: 'query', event: 'query', message: `Sum of a[${l}..${rr}] = p[${rr + 1}] - p[${l}] = ${hi} - ${lo} = ${hi - lo}.`, vars: { l, r: rr, result: hi - lo } });
    return rec.frames;
  },
  check: (inp, f) => (f.at(-1)!.vars?.result === inp.arr.slice(inp.l, inp.r + 1).reduce((x, y) => x + y, 0) ? null : 'wrong range sum'),
};

// ------------------------------------------------- monotonic stack: next greater
export const nextGreater: AlgoDef = {
  id: 'monotonic-stack-next-greater', name: 'Monotonic stack: next greater element', category: 'linear', concepts: ['monotonic-stack', 'stack'],
  blurb: 'Keep a stack of indices whose next greater value is still unknown. A bigger value resolves everything it beats.',
  time: 'O(n)', space: 'O(n)', input: {}, defaults: { arr: [4, 5, 2, 25, 7, 8] }, modes: { predict: true },
  samples: [{ arr: [1] }, { arr: [3, 3, 3] }, { arr: [5, 4, 3, 2, 1] }, { arr: [1, 2, 3, 4, 5] }, { arr: [2, 7, 3, 5, 4, 6, 8] }],
  code: {
    java: `int[] nextGreater(int[] a) {
    int[] res = new int[a.length];
    Arrays.fill(res, -1);
    Deque<Integer> st = new ArrayDeque<>();
    for (int i = 0; i < a.length; i++) {
        while (!st.isEmpty() && a[st.peek()] < a[i])
            res[st.pop()] = a[i];
        st.push(i);
    }
    return res;
}`,
    cpp: `vector<int> nextGreater(const vector<int>& a) {
    vector<int> res(a.size(), -1);
    stack<int> st;
    st.push(-1); st.pop();
    for (int i = 0; i < (int)a.size(); i++) {
        while (!st.empty() && a[st.top()] < a[i])
            { res[st.top()] = a[i]; st.pop(); }
        st.push(i);
    }
    return res;
}`,
  },
  lines: same({ start: 4, 'check-top': 5, pop: 6, push: 7, done: 9 }),
  run({ arr: a }) {
    const r = new Rec();
    const res = a.map(() => -1);
    const st: number[] = [];
    const v = (i: number, t: Record<number, Tone> = {}) => [arr(a, { name: 'values', tones: { ...Object.fromEntries(st.map((s) => [s, 'frontier' as Tone])), ...t }, pointers: i < a.length ? [['i', i]] : [] }), arr(res.map((x) => (x < 0 ? '?' : x)), { name: 'next greater' })];
    const stackAux = () => [aux('stack', 'stack of indices', st.map((s) => `${s}:${a[s]}`))];
    r.add({ views: v(0), aux: stackAux(), line: 'start', message: 'The stack holds indices still waiting for a greater value.', vars: { i: 0 } });
    for (let i = 0; i < a.length; i++) {
      for (;;) {
        const top = st[st.length - 1];
        r.count('comparisons');
        const pops = top !== undefined && a[top]! < a[i]!;
        r.add({
          views: v(i, { [i]: 'compare', ...(top !== undefined ? { [top]: 'compare' } : {}) }), aux: stackAux(), line: 'check-top', event: 'check', message: top === undefined ? 'Stack is empty: nothing to resolve.' : `Is a[${top}] = ${a[top]} < a[${i}] = ${a[i]}?`, vars: { i },
          ...(top !== undefined ? { predict: { question: `Top of the stack is ${a[top]} and the new value is ${a[i]}. Pop?`, kind: 'choice' as const, choices: ['Yes', 'No'], answer: pops ? 'Yes' : 'No', explain: pops ? `${a[i]} is greater than ${a[top]}, so ${a[i]} is its next greater element.` : `${a[top]} is not smaller than ${a[i]}: it keeps waiting.` } } : {}),
        });
        if (!pops) break;
        st.pop();
        res[top!] = a[i]!;
        r.count('pops');
        r.add({ views: v(i, { [top!]: 'found', [i]: 'active' }), aux: stackAux(), line: 'pop', event: 'pop', message: `Pop index ${top}: its next greater element is ${a[i]}.`, vars: { i, popped: top! } });
      }
      st.push(i);
      r.count('pushes');
      r.add({ views: v(i, { [i]: 'active' }), aux: stackAux(), line: 'push', event: 'push', message: `Push index ${i}.`, vars: { i } });
    }
    r.add({ views: v(a.length), aux: stackAux(), line: 'done', event: 'done', message: 'Indices left on the stack have no greater element: -1.', vars: { result: res.join(',') } });
    return r.frames;
  },
  check: (inp, f) => {
    const exp = inp.arr.map((x, i) => inp.arr.slice(i + 1).find((y) => y > x) ?? -1);
    return f.at(-1)!.vars?.result === exp.join(',') ? null : 'wrong next greater values';
  },
};

// -------------------------------------------------------- longest unique run
interface StrIn { s: string }
export const longestUnique: AlgoDef<StrIn> = {
  id: 'longest-unique-substring', name: 'Sliding window: longest substring without repeats', category: 'linear', concepts: ['sliding-window', 'hashing'],
  blurb: 'Grow the window to the right; when a character repeats inside it, jump the left edge past its previous position.',
  time: 'O(n)', space: 'O(k)', input: {}, defaults: { s: 'abcabcbb' }, modes: { predict: true },
  samples: [{ s: 'a' }, { s: 'bbbbb' }, { s: 'pwwkew' }, { s: 'abcdef' }, { s: 'abba' }],
  custom: {
    help: 'A string of up to 20 characters.',
    parse: (t) => { const s = t.trim(); return s.length < 1 || s.length > 20 ? fail('Enter 1 to 20 characters.') : ok({ s }); },
    format: (v) => v.s,
    presets: [{ label: 'repeats late', text: 'abcdeafgh' }, { label: 'all same', text: 'aaaaaa' }],
  },
  code: {
    java: `int longestUnique(String s) {
    Map<Character, Integer> last = new HashMap<>();
    int best = 0, l = 0;
    for (int r = 0; r < s.length(); r++) {
        char c = s.charAt(r);
        if (last.containsKey(c) && last.get(c) >= l) l = last.get(c) + 1;
        last.put(c, r);
        best = Math.max(best, r - l + 1);
    }
    return best;
}`,
    cpp: `int longestUnique(const string& s) {
    unordered_map<char, int> last;
    int best = 0, l = 0;
    for (int r = 0; r < (int)s.size(); r++) {
        char c = s[r];
        if (last.count(c) && last[c] >= l) l = last[c] + 1;
        last[c] = r;
        best = max(best, r - l + 1);
    }
    return best;
}`,
  },
  lines: same({ read: 4, repeat: 5, record: 6, best: 7, done: 9 }),
  run({ s }) {
    const r = new Rec();
    const chars = s.split('');
    const last = new Map<string, number>();
    let l = 0;
    let best = 0;
    let bl = 0;
    const lastAux = () => [aux('map', 'last index of each char', [...last].map(([k, i]) => `${k}→${i}`))];
    const v = (rr: number, t: Record<number, Tone> = {}) => arr(chars, { tones: t, pointers: [['l', l], ['r', rr]], brackets: rr >= l ? [{ from: l, to: rr, label: 'window' }] : [] });
    for (let rr = 0; rr < chars.length; rr++) {
      const c = chars[rr]!;
      const seen = last.has(c) && last.get(c)! >= l;
      r.count('lookups');
      r.add({
        views: [v(rr, { [rr]: 'active' })], aux: lastAux(), line: 'read', event: 'read', message: `Read '${c}' at index ${rr}.`, vars: { l, r: rr, best },
        predict: { question: `Window is "${s.slice(l, rr)}". Does '${c}' repeat inside it?`, kind: 'choice', choices: ['Yes', 'No'], answer: seen ? 'Yes' : 'No', explain: seen ? `'${c}' is already at index ${last.get(c)}, inside the window.` : `'${c}' is not in the window.` },
      });
      if (seen) {
        l = last.get(c)! + 1;
        r.add({ views: [v(rr, { [rr]: 'error', [l - 1]: 'error' })], aux: lastAux(), line: 'repeat', event: 'repeat', message: `Repeat! Move l to ${l}, just past the old '${c}'.`, vars: { l, r: rr, best } });
      }
      last.set(c, rr);
      r.add({ views: [v(rr, { [rr]: 'active' })], aux: lastAux(), line: 'record', message: `Remember '${c}' last seen at index ${rr}.`, vars: { l, r: rr, best } });
      r.count('comparisons');
      if (rr - l + 1 > best) { best = rr - l + 1; bl = l; }
      r.add({ views: [v(rr, Object.fromEntries(Array.from({ length: rr - l + 1 }, (_, j) => [l + j, (rr - l + 1 === best ? 'found' : 'range') as Tone])))], aux: lastAux(), line: 'best', event: 'best', message: `Window length ${rr - l + 1}; best is ${best}.`, vars: { l, r: rr, best } });
    }
    r.add({ views: [arr(chars, { tones: Object.fromEntries(Array.from({ length: best }, (_, j) => [bl + j, 'found' as Tone])) })], aux: lastAux(), line: 'done', event: 'done', message: `Longest substring without repeats: "${s.slice(bl, bl + best)}" (${best}).`, vars: { result: best } });
    return r.frames;
  },
  check: (inp, f) => {
    let best = 0;
    for (let i = 0; i < inp.s.length; i++) { const seen = new Set<string>(); for (let j = i; j < inp.s.length && !seen.has(inp.s[j]!); j++) { seen.add(inp.s[j]!); best = Math.max(best, j - i + 1); } }
    return f.at(-1)!.vars?.result === best ? null : 'wrong length';
  },
};

// ------------------------------------------------------------ linked lists
interface ListIn { arr: number[]; cycle: number }
export const reverseList: AlgoDef<ListIn> = {
  id: 'reverse-linked-list', name: 'Reverse a linked list', category: 'linear', concepts: ['linked-lists'],
  blurb: 'Walk the list once, pointing each node back at the one before it. Save next before you overwrite it.',
  time: 'O(n)', space: 'O(1)', input: {}, defaults: { arr: [1, 2, 3, 4, 5], cycle: -1 }, modes: {},
  samples: [{ arr: [1], cycle: -1 }, { arr: [1, 2], cycle: -1 }, { arr: [5, 4, 3, 2, 1, 0], cycle: -1 }],
  custom: {
    help: 'Up to 10 numbers, in list order.',
    parse: (t) => { const r = ints(t, { min: -99, max: 999, len: [1, 10] }); return r.ok ? ok({ arr: r.value, cycle: -1 }) : r; },
    format: (v) => v.arr.join(', '),
  },
  code: {
    java: `ListNode reverse(ListNode head) {
    ListNode prev = null, cur = head;
    while (cur != null) {
        ListNode next = cur.next;
        cur.next = prev;
        prev = cur;
        cur = next;
    }
    return prev;
}`,
    cpp: `ListNode* reverse(ListNode* head) {
    ListNode *prev = nullptr, *cur = head;
    while (cur != nullptr) {
        ListNode* next = cur->next;
        cur->next = prev;
        prev = cur;
        cur = next;
    }
    return prev;
}`,
  },
  lines: same({ start: 1, save: 3, flip: 4, advance: [5, 6], done: 8 }),
  run({ arr: values }) {
    const r = new Rec();
    const n = values.length;
    const next: (number | null)[] = values.map((_, i) => (i + 1 < n ? i + 1 : null));
    let prev: number | null = null;
    let cur: number | null = 0;
    const view = (nx: number | null, t: Record<number, Tone> = {}) => ({
      kind: 'list' as const,
      nodes: values.map((value, i) => ({ id: String(i), value, next: next[i] === null ? null : String(next[i]), ...(t[i] ? { tone: t[i] } : {}) })),
      pointers: [...(prev !== null ? [{ name: 'prev', nodeId: String(prev) }] : []), ...(cur !== null ? [{ name: 'cur', nodeId: String(cur) }] : []), ...(nx !== null ? [{ name: 'next', nodeId: String(nx) }] : [])],
    });
    r.add({ views: [view(null, { 0: 'active' })], line: 'start', message: 'prev is null and cur is the head.', vars: { prev: 'null', cur: values[0]! } });
    while (cur !== null) {
      const nx: number | null = next[cur]!;
      r.count('pointer reads');
      r.add({ views: [view(nx, { [cur]: 'active' })], line: 'save', event: 'save', message: `Save next = ${nx === null ? 'null' : values[nx]} before changing cur's pointer.`, vars: { cur: values[cur]!, next: nx === null ? 'null' : values[nx]! } });
      next[cur] = prev;
      r.count('pointer writes');
      r.add({ views: [view(nx, { [cur]: 'swap' })], line: 'flip', event: 'flip', message: `Point ${values[cur]} back at ${prev === null ? 'null' : values[prev]}.`, vars: { cur: values[cur]! } });
      prev = cur;
      cur = nx;
      r.add({ views: [view(null, { [prev]: 'sorted' })], line: 'advance', event: 'advance', message: 'Move prev and cur one step forward.', vars: { prev: values[prev]!, cur: cur === null ? 'null' : values[cur]! } });
    }
    const out: number[] = [];
    for (let p: number | null = prev; p !== null; p = next[p]!) out.push(values[p]!);
    r.add({ views: [view(null, Object.fromEntries(values.map((_, i) => [i, 'sorted' as Tone])))], line: 'done', event: 'done', message: `prev is the new head: ${out.join(' → ')}.`, vars: { result: out.join(',') } });
    return r.frames;
  },
  check: (inp, f) => (f.at(-1)!.vars?.result === [...inp.arr].reverse().join(',') ? null : 'not reversed'),
};

export const floydCycle: AlgoDef<ListIn> = {
  id: 'floyd-cycle', name: "Floyd's cycle detection", category: 'linear', concepts: ['linked-lists', 'two-pointers'],
  blurb: 'A slow pointer (1 step) and a fast pointer (2 steps) meet inside a cycle. Restart one from the head to find the entry.',
  time: 'O(n)', space: 'O(1)', input: {}, defaults: { arr: [3, 2, 0, -4, 7], cycle: 1 }, modes: {},
  samples: [{ arr: [1], cycle: -1 }, { arr: [1], cycle: 0 }, { arr: [1, 2, 3], cycle: -1 }, { arr: [1, 2, 3, 4], cycle: 0 }, { arr: [1, 2, 3, 4, 5, 6], cycle: 4 }],
  custom: {
    help: 'Numbers, then | and the index the last node links back to (or none): 3, 2, 0, -4 | cycle = 1',
    parse: (t) => {
      const [left = '', right = ''] = t.split('|');
      const a = ints(left, { min: -99, max: 999, len: [1, 10] });
      if (!a.ok) return a;
      const c = pair(right, 'cycle');
      const cycle = c === undefined || /none/i.test(c) ? -1 : Number(c);
      if (!Number.isInteger(cycle) || cycle < -1 || cycle >= a.value.length) return fail(`cycle must be none or an index from 0 to ${a.value.length - 1}.`);
      return ok({ arr: a.value, cycle });
    },
    format: (v) => `${v.arr.join(', ')} | cycle = ${v.cycle < 0 ? 'none' : v.cycle}`,
    presets: [{ label: 'no cycle', text: '1, 2, 3, 4 | cycle = none' }, { label: 'cycle at head', text: '1, 2, 3 | cycle = 0' }],
  },
  code: {
    java: `ListNode detectCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {
            slow = head;
            while (slow != fast) { slow = slow.next; fast = fast.next; }
            return slow;
        }
    }
    return null;
}`,
    cpp: `ListNode* detectCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            slow = head;
            while (slow != fast) { slow = slow->next; fast = fast->next; }
            return slow;
        }
    }
    return nullptr;
}`,
  },
  lines: same({ start: 1, step: [3, 4], meet: 5, restart: 6, entry: 7, found: 8, none: 11 }),
  run({ arr: values, cycle }) {
    const r = new Rec();
    const n = values.length;
    const nx = (i: number | null): number | null => (i === null ? null : i + 1 < n ? i + 1 : cycle >= 0 ? cycle : null);
    const view = (ptr: [string, number | null][], t: Record<number, Tone> = {}) => ({
      kind: 'list' as const,
      nodes: values.map((value, i) => ({ id: String(i), value, next: nx(i) === null ? null : String(nx(i)), ...(t[i] ? { tone: t[i] } : {}) })),
      pointers: ptr.filter((p): p is [string, number] => p[1] !== null).map(([name, i]) => ({ name, nodeId: String(i) })),
    });
    let slow: number | null = 0;
    let fast: number | null = 0;
    r.add({ views: [view([['slow/fast', 0]])], line: 'start', message: 'Both pointers start at the head.', vars: { slow: values[0]!, fast: values[0]! } });
    let guard = 0;
    while (fast !== null && nx(fast) !== null && guard++ < 200) {
      slow = nx(slow);
      fast = nx(nx(fast));
      r.count('moves', 3);
      r.add({ views: [view([['slow', slow], ['fast', fast]], (slow !== null ? { [slow]: 'active' as Tone } : {}))], line: 'step', event: 'step', message: 'slow moves 1 step, fast moves 2.', vars: { slow: slow === null ? 'null' : values[slow]!, fast: fast === null ? 'null' : values[fast]! } });
      if (slow !== null && slow === fast) {
        r.add({ views: [view([['slow=fast', slow]], { [slow]: 'found' })], line: 'meet', event: 'meet', message: 'They met: there is a cycle.', vars: { slow: values[slow]! } });
        slow = 0;
        r.add({ views: [view([['slow', 0], ['fast', fast]])], line: 'restart', event: 'restart', message: 'Restart slow from the head; now both move 1 step at a time.', vars: { slow: values[0]! } });
        while (slow !== fast) {
          slow = nx(slow)!;
          fast = nx(fast)!;
          r.count('moves', 2);
          r.add({ views: [view([['slow', slow], ['fast', fast]])], line: 'entry', event: 'step', message: 'Move both one step.', vars: { slow: values[slow]!, fast: values[fast]! } });
        }
        r.add({ views: [view([['entry', slow]], { [slow!]: 'found' })], line: 'found', event: 'found', message: `They meet at index ${slow}: that is where the cycle starts.`, vars: { result: slow! } });
        return r.frames;
      }
    }
    r.add({ views: [view([], {})], line: 'none', event: 'not-found', message: 'fast reached the end (null): no cycle.', vars: { result: -1 } });
    return r.frames;
  },
  check: (inp, f) => (f.at(-1)!.vars?.result === inp.cycle ? null : 'wrong cycle entry'),
};

// ------------------------------------------------- binary search on the answer
interface BsaIn { piles: number[]; hours: number }
export const binarySearchAnswer: AlgoDef<BsaIn> = {
  id: 'binary-search-on-answer', name: 'Binary search on the answer', category: 'searching', concepts: ['binary-search'],
  blurb: 'Smallest eating speed k that finishes all piles within h hours: feasibility is monotonic, so binary search k itself.',
  time: 'O(n log max)', space: 'O(1)', input: {}, defaults: { piles: [3, 6, 7, 11], hours: 8 }, modes: { predict: true },
  samples: [{ piles: [5], hours: 5 }, { piles: [30, 11, 23, 4, 20], hours: 5 }, { piles: [2, 2, 2], hours: 6 }, { piles: [1, 1, 1, 1], hours: 100 }],
  custom: {
    help: 'Pile sizes (1 to 30, up to 8 piles), then | and hours: 3, 6, 7, 11 | h = 8. Hours must be at least the number of piles.',
    parse: (t) => {
      const [left = '', right = ''] = t.split('|');
      const p = ints(left, { min: 1, max: 30, len: [1, 8], what: 'pile sizes' });
      if (!p.ok) return p;
      const h = Number(pair(right, 'h') ?? NaN);
      if (!Number.isInteger(h) || h < p.value.length || h > 200) return fail(`Add | h = hours, with at least ${p.value.length} hours.`);
      return ok({ piles: p.value, hours: h });
    },
    format: (v) => `${v.piles.join(', ')} | h = ${v.hours}`,
  },
  code: {
    java: `int minSpeed(int[] piles, int h) {
    int lo = 1, hi = max(piles);
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (hours(piles, mid) <= h) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
int hours(int[] piles, int k) {
    int t = 0;
    for (int p : piles) t += (p + k - 1) / k;
    return t;
}`,
    cpp: `int minSpeed(const vector<int>& piles, int h) {
    int lo = 1, hi = *max_element(piles.begin(), piles.end());
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (hours(piles, mid) <= h) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
int hours(const vector<int>& piles, int k) {
    int t = 0;
    for (int p : piles) t += (p + k - 1) / k;
    return t;
}`,
  },
  lines: same({ start: 1, mid: 3, 'feasible-yes': 4, 'feasible-no': 5, done: 7 }),
  run({ piles, hours }) {
    const r = new Rec();
    const top = Math.max(...piles);
    const speeds = Array.from({ length: top }, (_, i) => i + 1);
    const need = (k: number) => piles.reduce((t, p) => t + Math.ceil(p / k), 0);
    let lo = 1;
    let hi = top;
    const v = (t: Record<number, Tone> = {}) => [
      arr(piles, { name: 'piles' }),
      arr(speeds, { name: 'speed k', tones: { ...Object.fromEntries(speeds.map((s) => [s - 1, s < lo || s > hi ? 'dim' : 'neutral'])), ...t }, pointers: [['lo', lo - 1], ['hi', hi - 1]], brackets: [{ from: lo - 1, to: hi - 1, label: 'candidates' }] }),
    ];
    r.add({ views: v(), line: 'start', message: `Find the smallest speed that needs at most ${hours} hours. Candidates: 1..${top}.`, vars: { lo, hi, h: hours } });
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      const t = need(mid);
      r.count('feasibility checks');
      r.count('pile reads', piles.length);
      const ok2 = t <= hours;
      r.add({
        views: v({ [mid - 1]: 'compare' }), line: 'mid', event: 'mid', message: `Try k = ${mid}: piles need ${piles.map((p) => Math.ceil(p / mid)).join(' + ')} = ${t} hours (limit ${hours}).`, vars: { lo, mid, hi, hoursNeeded: t },
        predict: { question: `At speed ${mid} the piles take ${t} hours and the limit is ${hours}. Which half is kept?`, kind: 'choice', choices: ['Lower half (hi = mid)', 'Upper half (lo = mid + 1)'], answer: ok2 ? 'Lower half (hi = mid)' : 'Upper half (lo = mid + 1)',
          explain: ok2 ? `${t} ≤ ${hours}: this speed works, so a smaller one might too. Keep mid.` : `${t} > ${hours}: too slow. The answer must be bigger.` },
      });
      if (ok2) hi = mid; else lo = mid + 1;
      r.add({ views: v(), line: ok2 ? 'feasible-yes' : 'feasible-no', event: ok2 ? 'keep-low' : 'keep-high', message: ok2 ? `Works: hi = ${mid}.` : `Too slow: lo = ${mid + 1}.`, vars: { lo, hi } });
    }
    r.add({ views: v({ [lo - 1]: 'found' }), line: 'done', event: 'done', message: `Smallest working speed: ${lo}.`, vars: { result: lo } });
    return r.frames;
  },
  check: (inp, f) => {
    const need = (k: number) => inp.piles.reduce((t, p) => t + Math.ceil(p / k), 0);
    let k = 1;
    while (need(k) > inp.hours) k++;
    return f.at(-1)!.vars?.result === k ? null : 'wrong speed';
  },
};

// --------------------------------------------------------------- quickselect
export const quickselect: AlgoDef = {
  id: 'quickselect', name: 'Quickselect (k-th smallest)', category: 'searching', concepts: ['divide-conquer', 'sorting'],
  blurb: 'Partition around a pivot like quick sort, but only continue into the side that contains position k.',
  time: 'O(n) average', space: 'O(1)', input: { target: true, targetLabel: 'k (1 = smallest)' }, defaults: { arr: [7, 2, 9, 4, 1, 8, 3], target: 3 }, modes: {},
  samples: [{ arr: [5], target: 1 }, { arr: [3, 1, 2], target: 3 }, { arr: [4, 4, 4, 4], target: 2 }, { arr: [9, 8, 7, 6, 5], target: 1 }],
  code: {
    java: `int quickselect(int[] a, int k) {
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {
        int p = partition(a, lo, hi);
        if (p == k) break;
        if (p < k) lo = p + 1; else hi = p - 1;
    }
    return a[k];
}
int partition(int[] a, int lo, int hi) {
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < pivot) swap(a, i++, j);
    swap(a, i, hi);
    return i;
}`,
    cpp: `int quickselect(vector<int>& a, int k) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo < hi) {
        int p = partition(a, lo, hi);
        if (p == k) break;
        if (p < k) lo = p + 1; else hi = p - 1;
    }
    return a[k];
}
int partition(vector<int>& a, int lo, int hi) {
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < pivot) swap(a[i++], a[j]);
    swap(a[i], a[hi]);
    return i;
}`,
  },
  lines: same({ partition: 3, 'scan-compare': 12, 'scan-swap': 12, 'place-pivot': 13, hit: 4, narrow: 5, done: 7 }),
  run({ arr: input, target = 1 }) {
    const a = [...input];
    const k = Math.max(0, Math.min(target, a.length) - 1);
    const r = new Rec();
    let lo = 0;
    let hi = a.length - 1;
    const v = (t: Record<number, Tone> = {}, ptr: [string, number][] = []) => arr(a, { style: 'bars', tones: { ...Object.fromEntries(a.map((_, x) => [x, x < lo || x > hi ? 'dim' : undefined]).filter(([, tt]) => tt)), ...t }, pointers: [['k', k], ...ptr], brackets: lo <= hi ? [{ from: lo, to: hi, label: 'active range' }] : [] });
    r.add({ views: [v()], line: 'partition', message: `Looking for position ${k} (the ${k + 1}${['th', 'st', 'nd', 'rd'][(k + 1) % 10 < 4 && ![11, 12, 13].includes((k + 1) % 100) ? (k + 1) % 10 : 0]} smallest).`, vars: { k, lo, hi } });
    while (lo < hi) {
      const pivot = a[hi]!;
      let i = lo;
      for (let j = lo; j < hi; j++) {
        r.count('comparisons');
        r.add({ views: [v({ [hi]: 'active', [j]: 'compare' }, [['i', i], ['j', j]])], line: 'scan-compare', event: 'compare', message: `Is a[${j}] = ${a[j]} < pivot ${pivot}?`, vars: { pivot, i, j } });
        if (a[j]! < pivot) {
          if (i !== j) { r.count('swaps'); r.add({ views: [v({ [i]: 'swap', [j]: 'swap', [hi]: 'active' }, [['i', i], ['j', j]])], line: 'scan-swap', event: 'swap', message: `Yes: swap a[${i}] and a[${j}].`, vars: { pivot, i, j } }); [a[i], a[j]] = [a[j]!, a[i]!]; }
          i++;
        }
      }
      r.count('swaps');
      [a[i], a[hi]] = [a[hi]!, a[i]!];
      r.add({ views: [v({ [i]: 'found' }, [['p', i]])], line: 'place-pivot', event: 'pivot', message: `Pivot ${pivot} lands at index ${i}, its final sorted position.`, vars: { p: i, k } });
      if (i === k) { r.add({ views: [v({ [i]: 'found' })], line: 'hit', event: 'hit', message: `p = k = ${k}: done.`, vars: { p: i, k } }); break; }
      if (i < k) lo = i + 1; else hi = i - 1;
      r.add({ views: [v()], line: 'narrow', event: 'narrow', message: i < k ? `p < k: keep the right side, lo = ${lo}.` : `p > k: keep the left side, hi = ${hi}.`, vars: { lo, hi, k } });
    }
    r.add({ views: [v({ [k]: 'found' })], line: 'done', event: 'done', message: `a[${k}] = ${a[k]} is the answer.`, vars: { result: a[k]! } });
    return r.frames;
  },
  check: (inp, f) => {
    const k = Math.max(0, Math.min(inp.target ?? 1, inp.arr.length) - 1);
    return f.at(-1)!.vars?.result === [...inp.arr].sort((x, y) => x - y)[k] ? null : 'wrong k-th smallest';
  },
};


// ---------------------------------------------------------------- two sum
const twoSumCheck: AlgoDef['check'] = (inp, f) => {
  const res = String(f.at(-1)!.vars?.result);
  const has = inp.arr.some((x, i) => inp.arr.some((y, j) => i < j && x + y === inp.target));
  if (!has) return res === '-1,-1' ? null : 'should find nothing';
  const [i, j] = res.split(',').map(Number);
  return i! !== j! && inp.arr[i!]! + inp.arr[j!]! === inp.target ? null : 'wrong pair';
};
const twoSumSamples = [{ arr: [3], target: 3 }, { arr: [3, 3], target: 6 }, { arr: [2, 7, 11, 15], target: 9 }, { arr: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], target: 100 }, { arr: [-3, 4, 3, 90], target: 0 }];

export const twoSumBrute: AlgoDef = {
  id: 'two-sum-brute', name: 'Two Sum: brute force', category: 'linear', concepts: ['arrays-strings'],
  blurb: 'Try every pair (i, j) until one adds up to the target.',
  time: 'O(n²)', space: 'O(1)', input: { target: true }, defaults: { arr: [2, 7, 11, 15, 3, 6], target: 9 }, samples: twoSumSamples, modes: {},
  code: {
    java: `int[] twoSum(int[] a, int target) {
    for (int i = 0; i < a.length; i++)
        for (int j = i + 1; j < a.length; j++)
            if (a[i] + a[j] == target)
                return new int[]{i, j};
    return new int[]{-1, -1};
}`,
    cpp: `vector<int> twoSum(const vector<int>& a, int target) {
    for (int i = 0; i < (int)a.size(); i++)
        for (int j = i + 1; j < (int)a.size(); j++)
            if (a[i] + a[j] == target)
                return {i, j};
    return {-1, -1};
}`,
  },
  lines: same({ pair: [1, 2, 3], found: 4, none: 5 }),
  run({ arr: a, target = 0 }) {
    const r = new Rec();
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
      r.count('pair checks');
      const hit = a[i]! + a[j]! === target;
      r.add({ views: [arr(a, { tones: { [i]: hit ? 'found' : 'compare', [j]: hit ? 'found' : 'compare' }, pointers: [['i', i], ['j', j]] })], line: hit ? 'found' : 'pair', event: hit ? 'found' : 'pair', message: `${a[i]} + ${a[j]} = ${a[i]! + a[j]!}${hit ? `: equals ${target}!` : `, not ${target}.`}`, vars: { i, j, ...(hit ? { result: `${i},${j}` } : {}) } });
      if (hit) return r.frames;
    }
    r.add({ views: [arr(a)], line: 'none', event: 'not-found', message: 'Every pair was checked: no answer.', vars: { result: '-1,-1' } });
    return r.frames;
  },
  check: twoSumCheck,
};

export const twoSumHash: AlgoDef = {
  id: 'two-sum-hash', name: 'Two Sum: hash map', category: 'linear', concepts: ['hashing', 'arrays-strings'],
  blurb: 'One pass: look up target − x among the values already seen, then remember x.',
  time: 'O(n)', space: 'O(n)', input: { target: true }, defaults: { arr: [2, 7, 11, 15, 3, 6], target: 9 }, samples: twoSumSamples, modes: {},
  code: {
    java: `int[] twoSum(int[] a, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < a.length; i++) {
        Integer j = seen.get(target - a[i]);
        if (j != null) return new int[]{j, i};
        seen.put(a[i], i);
    }
    return new int[]{-1, -1};
}`,
    cpp: `vector<int> twoSum(const vector<int>& a, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < (int)a.size(); i++) {
        auto it = seen.find(target - a[i]);
        if (it != seen.end()) return {it->second, i};
        seen[a[i]] = i;
    }
    return {-1, -1};
}`,
  },
  lines: same({ lookup: [3, 4], found: 4, remember: 5, none: 7 }),
  run({ arr: a, target = 0 }) {
    const r = new Rec();
    const seen = new Map<number, number>();
    const mapAux = () => [aux('map', 'seen: value → index', [...seen].map(([v, i]) => `${v}→${i}`))];
    for (let i = 0; i < a.length; i++) {
      r.count('lookups');
      const j = seen.get(target - a[i]!);
      r.add({ views: [arr(a, { tones: { [i]: j !== undefined ? 'found' : 'active', ...(j !== undefined ? { [j]: 'found' } : {}) }, pointers: [['i', i]] })], aux: mapAux(), line: j !== undefined ? 'found' : 'lookup', event: j !== undefined ? 'found' : 'lookup', message: j !== undefined ? `${target} − ${a[i]} = ${target - a[i]!} is in the map at index ${j}: done.` : `${target} − ${a[i]} = ${target - a[i]!}: not in the map yet.`, vars: { i, ...(j !== undefined ? { result: `${j},${i}` } : {}) } });
      if (j !== undefined) return r.frames;
      seen.set(a[i]!, i);
      r.count('inserts');
      r.add({ views: [arr(a, { tones: { [i]: 'visited' }, pointers: [['i', i]] })], aux: mapAux(), line: 'remember', event: 'insert', message: `Remember ${a[i]} at index ${i}.`, vars: { i } });
    }
    r.add({ views: [arr(a)], aux: mapAux(), line: 'none', event: 'not-found', message: 'The scan ended: no answer.', vars: { result: '-1,-1' } });
    return r.frames;
  },
  check: twoSumCheck,
};

export const ARRAY_ALGOS = [heapSort, countingSort, twoPointers, slidingWindow, kadane, prefixSums, nextGreater, longestUnique, reverseList, floydCycle, binarySearchAnswer, quickselect, twoSumBrute, twoSumHash];
