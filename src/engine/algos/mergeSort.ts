import type { AlgoDef, ArrayView } from '../types';
import { Recorder, range, sameLines } from './util';

const java = `void mergeSort(int[] a, int lo, int hi) {
    if (hi - lo < 1) return;
    int mid = (lo + hi) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);
    merge(a, lo, mid, hi);
}
void merge(int[] a, int lo, int mid, int hi) {
    int[] tmp = new int[hi - lo + 1];
    int i = lo, j = mid + 1, k = 0;
    while (i <= mid && j <= hi) {
        if (a[i] <= a[j]) tmp[k++] = a[i++];
        else tmp[k++] = a[j++];
    }
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    for (k = 0; k < tmp.length; k++) a[lo + k] = tmp[k];
}`;
const cpp = `void mergeSort(vector<int>& a, int lo, int hi) {
    if (hi - lo < 1) return;
    int mid = (lo + hi) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);
    merge(a, lo, mid, hi);
}
void merge(vector<int>& a, int lo, int mid, int hi) {
    vector<int> tmp(hi - lo + 1);
    int i = lo, j = mid + 1, k = 0;
    while (i <= mid && j <= hi) {
        if (a[i] <= a[j]) tmp[k++] = a[i++];
        else tmp[k++] = a[j++];
    }
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    for (k = 0; k < (int)tmp.size(); k++) a[lo + k] = tmp[k];
}`;

export const mergeSort: AlgoDef = {
  id: 'merge-sort',
  name: 'Merge sort',
  category: 'sorting',
  concepts: ['sorting', 'recursion-basics'],
  blurb: 'Split in half, sort each half, merge the two sorted halves. Always O(n log n).',
  time: 'O(n log n)',
  space: 'O(n)',
  input: {},
  defaults: { arr: [6, 3, 8, 2, 9, 1, 5] },
  code: { java, cpp },
  lines: sameLines({
    start: 0, split: 2, compare: 11, 'take-left': 11, 'take-right': 12,
    'copy-left': 13, 'copy-right': 14, 'write-back': 15, done: 0,
  }),
  modes: { predict: true, drive: true, race: true },
  invariants: ['Each half is sorted before it is merged'],
  run({ arr: input }) {
    const a = [...input];
    const n = a.length;
    const r = new Recorder();

    const tmpView = (tmp: number[]): ArrayView => ({
      kind: 'array', style: 'boxes', name: 'tmp',
      cells: tmp.map((value) => ({ value })), pointers: [],
    });
    const base = (lo: number, hi: number) => ({
      tones: range(lo, hi + 1, 'range'),
      brackets: [{ from: lo, to: hi, label: 'merging' }],
    });

    function merge(lo: number, mid: number, hi: number) {
      const tmp: number[] = [];
      let i = lo, j = mid + 1;
      while (i <= mid && j <= hi) {
        r.comparisons++;
        const left = a[i]! <= a[j]!;
        r.add({
          arr: a, line: 'compare', event: 'compare', ...base(lo, hi),
          tones: { ...range(lo, hi + 1, 'range'), [i]: 'compare', [j]: 'compare' },
          pointers: [['i', i], ['j', j]], vars: { lo, mid, hi }, extra: [tmpView(tmp)],
          message: `Compare ${a[i]} (left) with ${a[j]} (right).`,
          predict: {
            question: `Which value is copied next into the merged output: ${a[i]} (left) or ${a[j]} (right)?`,
            kind: 'choice', choices: ['Left', 'Right'], answer: left ? 'Left' : 'Right',
            explain: left ? `${a[i]} <= ${a[j]}; ties take the left, which keeps the sort stable.` : `${a[j]} < ${a[i]}, so the right value is smaller.`,
          },
          pick: {
            question: `Merging a[${lo}..${mid}] with a[${mid + 1}..${hi}]. Click the value that is copied next.`, target: 'index', valid: [left ? i : j],
            explainWrong: Object.fromEntries(Array.from({ length: hi - lo + 1 }, (_, o) => lo + o).map((k) => [String(k), k === i || k === j ? `${a[k]} is at the front of its half, but ${left ? a[i] : a[j]} is smaller${left && a[i] === a[j] ? ' or equal (ties take the left)' : ''}. Merge copies the smaller front value.` : `Merge only ever compares the FRONT value of each half (indices ${i} and ${j}); ${a[k]} is not at the front.`])),
          },
        });
        const v = left ? a[i++]! : a[j++]!;
        tmp.push(v);
        r.writes++;
        r.add({
          arr: a, line: left ? 'take-left' : 'take-right', event: left ? 'take-left' : 'take-right', ...base(lo, hi),
          pointers: [['i', i], ['j', j]], vars: { lo, mid, hi, picked: left ? i - 1 : j - 1 }, extra: [tmpView(tmp)],
          message: `Copy ${v} into the merged output.`,
        });
      }
      while (i <= mid || j <= hi) {
        const fromLeft = i <= mid;
        const v = fromLeft ? a[i++]! : a[j++]!;
        tmp.push(v);
        r.writes++;
        r.add({
          arr: a, line: fromLeft ? 'copy-left' : 'copy-right', event: 'copy', ...base(lo, hi),
          pointers: [['i', i], ['j', j]], vars: { lo, mid, hi }, extra: [tmpView(tmp)],
          message: `${fromLeft ? 'Right' : 'Left'} side is empty; copy the leftover ${v}.`,
        });
      }
      for (let k = 0; k < tmp.length; k++) a[lo + k] = tmp[k]!;
      r.writes += tmp.length;
      r.add({
        arr: a, line: 'write-back', event: 'merged', ...base(lo, hi), vars: { lo, mid, hi },
        extra: [tmpView(tmp)], message: `Write the merged result back into a[${lo}..${hi}].`,
      });
    }

    function sort(lo: number, hi: number) {
      if (hi - lo < 1) return;
      const mid = Math.floor((lo + hi) / 2);
      r.add({
        arr: a, line: 'split', event: 'split', tones: range(lo, hi + 1, 'range'),
        brackets: [{ from: lo, to: hi, label: 'split' }], pointers: [['mid', mid]], vars: { lo, mid, hi },
        message: `Split a[${lo}..${hi}] at index ${mid}.`,
      });
      sort(lo, mid);
      sort(mid + 1, hi);
      merge(lo, mid, hi);
    }

    r.add({ arr: a, line: 'start', message: `Sort ${n} values by splitting and merging.` });
    sort(0, n - 1);
    r.add({ arr: a, line: 'done', event: 'done', tones: range(0, n, 'sorted'), message: 'Sorted.' });
    return r.frames;
  },
};
