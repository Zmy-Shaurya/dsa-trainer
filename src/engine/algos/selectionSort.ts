import type { AlgoDef } from '../types';
import { Recorder, range, sameLines, yesNo } from './util';

const java = `void selectionSort(int[] a) {
    int n = a.length;
    for (int i = 0; i < n - 1; i++) {
        int min = i;
        for (int j = i + 1; j < n; j++) {
            if (a[j] < a[min]) min = j;
        }
        swap(a, i, min);
    }
}`;
const cpp = `void selectionSort(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; i++) {
        int min = i;
        for (int j = i + 1; j < n; j++) {
            if (a[j] < a[min]) min = j;
        }
        swap(a[i], a[min]);
    }
}`;

export const selectionSort: AlgoDef = {
  id: 'selection-sort',
  name: 'Selection sort',
  category: 'sorting',
  concepts: ['sorting'],
  blurb: 'Find the minimum of the unsorted part and swap it to the front. At most n-1 swaps.',
  time: 'O(n^2)',
  space: 'O(1)',
  input: {},
  defaults: { arr: [6, 3, 8, 2, 9, 1, 5] },
  code: { java, cpp },
  lines: sameLines({ start: 1, compare: 5, 'new-min': 5, swap: 7, done: 0 }),
  modes: { predict: true, race: true },
  predictEvent: 'new-min',
  invariants: ['Everything left of i is sorted and final'],
  run({ arr: input }) {
    const a = [...input];
    const n = a.length;
    const r = new Recorder();
    r.add({ arr: a, line: 'start', message: `Sort ${n} values by repeatedly selecting the minimum.` });
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      for (let j = i + 1; j < n; j++) {
        r.comparisons++;
        const isMin = a[j]! < a[min]!;
        r.add({
          arr: a, line: 'compare', event: 'compare',
          tones: { ...range(0, i, 'sorted'), [min]: 'active', [j]: 'compare' },
          pointers: [['i', i], ['min', min], ['j', j]], vars: { i, j, min },
          invariant: `a[0..${i - 1}] is sorted and final`,
          message: `Is ${a[j]} < current minimum ${a[min]}? ${yesNo(isMin)}.`,
          predict: {
            question: `Is ${a[j]} a new minimum (smaller than ${a[min]})?`, kind: 'choice', choices: ['Yes', 'No'],
            answer: yesNo(isMin),
            explain: isMin ? `${a[j]} < ${a[min]}, so min moves to index ${j}.` : `${a[j]} >= ${a[min]}, min stays.`,
          },
        });
        if (isMin) {
          min = j;
          r.add({
            arr: a, line: 'new-min', event: 'new-min',
            tones: { ...range(0, i, 'sorted'), [min]: 'active' },
            pointers: [['i', i], ['min', min], ['j', j]], vars: { i, j, min },
            invariant: `a[0..${i - 1}] is sorted and final`,
            message: `New minimum: ${a[min]} at index ${min}.`,
          });
        }
      }
      if (min !== i) {
        [a[i], a[min]] = [a[min]!, a[i]!];
        r.swaps++;
      }
      r.add({
        arr: a, line: 'swap', event: 'swap',
        tones: { ...range(0, i + 1, 'sorted'), ...(min !== i ? { [min]: 'swap' as const } : {}) },
        pointers: [['i', i], ['min', min]], vars: { i, min },
        invariant: `a[0..${i}] is sorted and final`,
        message: min !== i ? `Swap ${a[i]} into position ${i}.` : `${a[i]} is already in place.`,
      });
    }
    r.add({ arr: a, line: 'done', event: 'done', tones: range(0, n, 'sorted'), message: 'Sorted.' });
    return r.frames;
  },
};
