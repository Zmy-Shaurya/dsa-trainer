import type { AlgoDef } from '../types';
import { Recorder, range, sameLines, yesNo } from './util';

const java = `int linearSearch(int[] a, int target) {
    for (int i = 0; i < a.length; i++) {
        if (a[i] == target) return i;
    }
    return -1;
}`;
const cpp = `int linearSearch(const vector<int>& a, int target) {
    for (int i = 0; i < (int)a.size(); i++) {
        if (a[i] == target) return i;
    }
    return -1;
}`;

export const linearSearch: AlgoDef = {
  id: 'linear-search',
  name: 'Linear search',
  category: 'searching',
  concepts: ['arrays-strings'],
  blurb: 'Check each element in order until the target is found. Works on unsorted data.',
  time: 'O(n)',
  space: 'O(1)',
  input: { target: true },
  defaults: { arr: [6, 3, 8, 2, 9, 1, 5], target: 2 },
  code: { java, cpp },
  lines: sameLines({ start: 0, compare: 2, found: 2, 'not-found': 4 }),
  modes: { predict: true, race: true },
  predictEvent: 'found',
  invariants: ['a[0..i-1] does not contain the target'],
  run({ arr: input, target = 0 }) {
    const a = [...input];
    const r = new Recorder();
    r.add({ arr: a, line: 'start', vars: { target }, message: `Look for ${target}, left to right.` });
    for (let i = 0; i < a.length; i++) {
      r.comparisons++;
      const hit = a[i] === target;
      r.add({
        arr: a, line: 'compare', event: 'compare',
        tones: { ...range(0, i, 'dim'), [i]: 'compare' }, pointers: [['i', i]], vars: { i, target },
        invariant: `a[0..${i - 1}] has no ${target}`, message: `Is a[${i}] = ${a[i]} equal to ${target}? ${yesNo(hit)}.`,
        predict: {
          question: `Is a[${i}] = ${a[i]} equal to the target ${target}?`, kind: 'choice', choices: ['Yes', 'No'],
          answer: yesNo(hit), explain: hit ? 'They match, so the search stops here.' : 'Not equal; move to the next index.',
        },
      });
      if (hit) {
        r.add({
          arr: a, line: 'found', event: 'found', tones: { ...range(0, i, 'dim'), [i]: 'found' },
          pointers: [['i', i]], vars: { i, target, result: i }, message: `Found ${target} at index ${i}.`,
        });
        return r.frames;
      }
    }
    r.add({
      arr: a, line: 'not-found', event: 'not-found', tones: range(0, a.length, 'dim'),
      vars: { target, result: -1 }, message: `${target} is not in the array. Return -1.`,
    });
    return r.frames;
  },
};
