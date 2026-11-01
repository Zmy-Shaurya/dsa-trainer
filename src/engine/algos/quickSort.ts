import type { AlgoDef, Tone } from '../types';
import { Recorder, range, sameLines, yesNo } from './util';

const java = `void quickSort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quickSort(a, lo, p - 1);
    quickSort(a, p + 1, hi);
}
int partition(int[] a, int lo, int hi) {
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) {
            swap(a, i++, j);
        }
    }
    swap(a, i, hi);
    return i;
}`;
const cpp = `void quickSort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quickSort(a, lo, p - 1);
    quickSort(a, p + 1, hi);
}
int partition(vector<int>& a, int lo, int hi) {
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) {
            swap(a[i++], a[j]);
        }
    }
    swap(a[i], a[hi]);
    return i;
}`;

export const quickSort: AlgoDef = {
  id: 'quick-sort',
  name: 'Quick sort',
  category: 'sorting',
  concepts: ['sorting', 'recursion-basics'],
  blurb: 'Pick a pivot, partition smaller values to its left, then sort each side. Last element is the pivot here.',
  time: 'O(n log n) average, O(n^2) worst',
  space: 'O(log n) stack',
  input: {},
  defaults: { arr: [6, 3, 8, 2, 9, 1, 5] },
  code: { java, cpp },
  lines: sameLines({ start: 0, base: 1, pivot: 7, compare: 9, swap: 10, place: 13, done: 0 }),
  modes: { predict: true, race: true },
  predictEvent: 'swap',
  invariants: ['a[lo..i-1] < pivot, a[i..j-1] >= pivot'],
  run({ arr: input }) {
    const a = [...input];
    const n = a.length;
    const r = new Recorder();
    const final = new Set<number>();

    const tones = (lo: number, hi: number, extra: Record<number, Tone> = {}) => {
      const t: Record<number, Tone> = {};
      for (let k = 0; k < n; k++) t[k] = final.has(k) ? 'sorted' : k < lo || k > hi ? 'dim' : 'neutral';
      return { ...t, ...extra };
    };

    function sort(lo: number, hi: number) {
      if (lo > hi) return;
      if (lo === hi) {
        final.add(lo);
        r.add({
          arr: a, line: 'base', event: 'base', tones: tones(lo, hi), vars: { lo, hi },
          message: `One element (${a[lo]}) is already in place.`,
        });
        return;
      }
      const pivot = a[hi]!;
      let i = lo;
      r.add({
        arr: a, line: 'pivot', event: 'pivot', tones: tones(lo, hi, { [hi]: 'active' }),
        brackets: [{ from: lo, to: hi, label: 'partition' }], pointers: [['i', i], ['pivot', hi]],
        vars: { lo, hi, pivot }, message: `Pivot = ${pivot} (last element of a[${lo}..${hi}]).`,
      });
      for (let j = lo; j < hi; j++) {
        r.comparisons++;
        const less = a[j]! < pivot;
        r.add({
          arr: a, line: 'compare', event: 'compare', tones: tones(lo, hi, { [hi]: 'active', [j]: 'compare' }),
          brackets: [{ from: lo, to: hi }], pointers: [['i', i], ['j', j], ['pivot', hi]], vars: { lo, hi, i, j, pivot },
          invariant: 'Values left of i are smaller than the pivot',
          message: `Is ${a[j]} < pivot ${pivot}? ${yesNo(less)}.`,
          predict: {
            question: `Does ${a[j]} move to the left part (is it smaller than pivot ${pivot})?`,
            kind: 'choice', choices: ['Yes', 'No'], answer: yesNo(less),
            explain: less ? `${a[j]} < ${pivot}, so it is swapped into the left part at i.` : `${a[j]} >= ${pivot}, it stays in the right part.`,
          },
        });
        if (less) {
          [a[i], a[j]] = [a[j]!, a[i]!];
          r.swaps++;
          r.add({
            arr: a, line: 'swap', event: 'swap', tones: tones(lo, hi, { [hi]: 'active', [i]: 'swap', [j]: 'swap' }),
            brackets: [{ from: lo, to: hi }], pointers: [['i', i], ['j', j], ['pivot', hi]], vars: { lo, hi, i, j, pivot },
            message: i === j ? `${a[i]} is already at i; i moves on.` : `Swap a[${i}] and a[${j}].`,
          });
          i++;
        }
      }
      [a[i], a[hi]] = [a[hi]!, a[i]!];
      r.swaps++;
      final.add(i);
      r.add({
        arr: a, line: 'place', event: 'place', tones: tones(lo, hi), brackets: [{ from: lo, to: hi }],
        pointers: [['p', i]], vars: { lo, hi, p: i },
        message: `Place the pivot ${pivot} at index ${i}: it is now in its final position.`,
      });
      sort(lo, i - 1);
      sort(i + 1, hi);
    }

    r.add({ arr: a, line: 'start', message: `Sort ${n} values by partitioning around a pivot.` });
    sort(0, n - 1);
    r.add({ arr: a, line: 'done', event: 'done', tones: range(0, n, 'sorted'), message: 'Sorted.' });
    return r.frames;
  },
};
