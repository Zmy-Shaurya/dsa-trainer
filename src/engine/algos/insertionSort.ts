import type { AlgoDef } from '../types';
import { Recorder, range, sameLines, yesNo } from './util';

const java = `void insertionSort(int[] a) {
    for (int i = 1; i < a.length; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}`;
const cpp = `void insertionSort(vector<int>& a) {
    for (int i = 1; i < (int)a.size(); i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}`;

export const insertionSort: AlgoDef = {
  id: 'insertion-sort',
  name: 'Insertion sort',
  category: 'sorting',
  concepts: ['sorting'],
  blurb: 'Grow a sorted prefix: take the next value and shift larger values right to make room.',
  time: 'O(n^2), O(n) if nearly sorted',
  space: 'O(1)',
  input: {},
  defaults: { arr: [6, 3, 8, 2, 9, 1, 5] },
  code: { java, cpp },
  lines: sameLines({ start: 0, 'pick-key': 2, compare: 4, shift: 5, insert: 8, done: 0 }),
  modes: { predict: true, race: true },
  predictEvent: 'shift',
  invariants: ['a[0..i-1] is sorted'],
  run({ arr: input }) {
    const a = [...input];
    const n = a.length;
    const r = new Recorder();
    r.add({ arr: a, line: 'start', message: `Sort ${n} values. The first value is a sorted prefix of length 1.` });
    for (let i = 1; i < n; i++) {
      const key = a[i]!;
      let j = i - 1;
      r.add({
        arr: a, line: 'pick-key', event: 'pick-key',
        tones: { ...range(0, i, 'sorted'), [i]: 'active' }, pointers: [['i', i]], vars: { i, key },
        invariant: `a[0..${i - 1}] is sorted`, message: `Take key = ${key}; insert it into the sorted prefix.`,
      });
      while (j >= 0) {
        r.comparisons++;
        const move = a[j]! > key;
        r.add({
          arr: a, line: 'compare', event: 'compare',
          tones: { ...range(0, i, 'sorted'), [j]: 'compare', [i]: 'active' },
          pointers: [['i', i], ['j', j]], vars: { i, j, key },
          invariant: `a[0..${i - 1}] is sorted`,
          message: `Is ${a[j]} > key ${key}? ${yesNo(move)}.`,
          predict: {
            question: `Will ${a[j]} shift right to make room for ${key}?`, kind: 'choice', choices: ['Yes', 'No'],
            answer: yesNo(move),
            explain: move ? `${a[j]} > ${key}, so it moves one step right.` : `${a[j]} <= ${key}: key belongs right after it.`,
          },
        });
        if (!move) break;
        a[j + 1] = a[j]!;
        r.writes++;
        r.add({
          arr: a, line: 'shift', event: 'shift',
          tones: { [j + 1]: 'swap', [j]: 'compare' }, pointers: [['i', i], ['j', j]], vars: { i, j, key },
          message: `Shift ${a[j]} right to index ${j + 1}.`,
        });
        j--;
      }
      a[j + 1] = key;
      r.writes++;
      r.add({
        arr: a, line: 'insert', event: 'insert',
        tones: range(0, i + 1, 'sorted'), pointers: [['j+1', j + 1]], vars: { i, j, key },
        invariant: `a[0..${i}] is sorted`, message: `Insert ${key} at index ${j + 1}.`,
      });
    }
    r.add({ arr: a, line: 'done', event: 'done', tones: range(0, n, 'sorted'), message: 'Sorted.' });
    return r.frames;
  },
};
