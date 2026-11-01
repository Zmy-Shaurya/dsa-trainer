import type { AlgoDef } from '../types';
import { Recorder, range, sameLines, yesNo } from './util';

const java = `void bubbleSort(int[] a) {
    int n = a.length;
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
            }
        }
    }
}`;
const cpp = `void bubbleSort(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                swap(a[j], a[j + 1]);
            }
        }
    }
}`;

export const bubbleSort: AlgoDef = {
  id: 'bubble-sort',
  name: 'Bubble sort',
  category: 'sorting',
  concepts: ['sorting'],
  blurb: 'Repeatedly swap adjacent out-of-order pairs; the largest value bubbles to the end each pass.',
  time: 'O(n^2)',
  space: 'O(1)',
  input: {},
  defaults: { arr: [6, 3, 8, 2, 9, 1, 5] },
  code: { java, cpp },
  lines: sameLines({ start: 1, compare: 4, swap: 5, 'pass-done': 3, done: 0 }),
  modes: { predict: true, race: true },
  predictEvent: 'swap',
  invariants: ['The last i elements are the largest, in order'],
  run({ arr: input }) {
    const a = [...input];
    const n = a.length;
    const r = new Recorder();
    r.add({ arr: a, line: 'start', message: `Sort ${n} values. Compare neighbours, swap if out of order.` });
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1 - i; j++) {
        r.comparisons++;
        const need = a[j]! > a[j + 1]!;
        r.add({
          arr: a, line: 'compare', event: 'compare',
          tones: { ...range(n - i, n, 'sorted'), [j]: 'compare', [j + 1]: 'compare' },
          pointers: [['j', j], ['j+1', j + 1]],
          vars: { i, j }, invariant: `Last ${i} element(s) are in final position`,
          message: `Is ${a[j]} > ${a[j + 1]}? ${yesNo(need)}.`,
          predict: {
            question: `Will ${a[j]} and ${a[j + 1]} be swapped?`, kind: 'choice', choices: ['Yes', 'No'],
            answer: yesNo(need),
            explain: need
              ? `${a[j]} is larger than its right neighbour, so they swap.`
              : `${a[j]} <= ${a[j + 1]}, already in order.`,
          },
        });
        if (need) {
          [a[j], a[j + 1]] = [a[j + 1]!, a[j]!];
          r.swaps++;
          r.add({
            arr: a, line: 'swap', event: 'swap',
            tones: { ...range(n - i, n, 'sorted'), [j]: 'swap', [j + 1]: 'swap' },
            pointers: [['j', j], ['j+1', j + 1]], vars: { i, j },
            invariant: `Last ${i} element(s) are in final position`,
            message: `Swapped: ${a[j]} and ${a[j + 1]} trade places.`,
          });
        }
      }
      r.add({
        arr: a, line: 'pass-done', event: 'pass-done', tones: range(n - 1 - i, n, 'sorted'), vars: { i },
        invariant: `Last ${i + 1} element(s) are in final position`,
        message: `Pass ${i + 1} done: ${a[n - 1 - i]} is in its final place.`,
      });
    }
    r.add({ arr: a, line: 'done', event: 'done', tones: range(0, n, 'sorted'), message: 'Sorted.' });
    return r.frames;
  },
};
