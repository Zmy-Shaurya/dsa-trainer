import type { AlgoDef, Tone } from '../types';
import { Recorder, sameLines } from './util';

const java = `int binarySearch(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`;
const cpp = `int binarySearch(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`;

export const binarySearch: AlgoDef = {
  id: 'binary-search',
  name: 'Binary search',
  category: 'searching',
  concepts: ['binary-search'],
  blurb: 'On sorted data, compare with the middle and discard half the range each step.',
  time: 'O(log n)',
  space: 'O(1)',
  input: { sorted: true, target: true },
  defaults: { arr: [1, 2, 3, 5, 6, 8, 9], target: 6 },
  code: { java, cpp },
  lines: sameLines({ start: 1, mid: 3, compare: 4, found: 4, 'go-right': 5, 'go-left': 6, 'not-found': 8 }),
  modes: { predict: true, drive: true, race: true },
  invariants: ['If the target exists, it is within a[lo..hi]'],
  run({ arr: input, target = 0 }) {
    const a = [...input];
    const r = new Recorder();
    const tones = (lo: number, hi: number, extra: Record<number, Tone> = {}) => {
      const t: Record<number, Tone> = {};
      for (let k = 0; k < a.length; k++) t[k] = k < lo || k > hi ? 'dim' : 'neutral';
      return { ...t, ...extra };
    };
    let lo = 0;
    let hi = a.length - 1;
    r.add({ arr: a, line: 'start', vars: { lo, hi, target }, message: `Search sorted array for ${target}.` });
    while (lo <= hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      const br = [{ from: lo, to: hi, label: 'range' }];
      r.add({
        arr: a, line: 'mid', event: 'mid', tones: tones(lo, hi, { [mid]: 'active' }), brackets: br,
        pointers: [['lo', lo], ['mid', mid], ['hi', hi]], vars: { lo, mid, hi, target },
        invariant: `Target, if present, is in a[${lo}..${hi}]`, message: `Middle of a[${lo}..${hi}] is index ${mid} (value ${a[mid]}).`,
        pick: {
          question: `The search range is a[${lo}..${hi}]. Which index does binary search look at?`, target: 'index', valid: [mid],
          explainWrong: Object.fromEntries(a.map((_, k) => [String(k), k < lo || k > hi ? `Index ${k} was already discarded.` : `Index ${k} is still a candidate, but binary search looks at the middle: ${lo} + (${hi} - ${lo}) / 2 = ${mid}.`])),
        },
      });
      r.comparisons++;
      const v = a[mid]!;
      const answer = v === target ? 'Found' : v < target ? 'Right' : 'Left';
      r.add({
        arr: a, line: 'compare', event: 'compare', tones: tones(lo, hi, { [mid]: 'compare' }), brackets: br,
        pointers: [['lo', lo], ['mid', mid], ['hi', hi]], vars: { lo, mid, hi, target, picked: mid },
        invariant: `Target, if present, is in a[${lo}..${hi}]`,
        message: `Compare a[${mid}] = ${v} with target ${target}.`,
        predict: {
          question: `a[${mid}] = ${v}, target = ${target}. What happens next?`, kind: 'choice',
          choices: ['Found', 'Left', 'Right'], answer,
          explain:
            answer === 'Found' ? 'They are equal: return mid.'
            : answer === 'Right' ? `${v} < ${target}, so the target is to the right: lo = mid + 1.`
            : `${v} > ${target}, so the target is to the left: hi = mid - 1.`,
        },
      });
      if (answer === 'Found') {
        r.add({
          arr: a, line: 'found', event: 'found', tones: tones(lo, hi, { [mid]: 'found' }), brackets: br,
          pointers: [['mid', mid]], vars: { lo, mid, hi, target, result: mid }, message: `Found ${target} at index ${mid}.`,
        });
        return r.frames;
      }
      if (answer === 'Right') lo = mid + 1;
      else hi = mid - 1;
      r.add({
        arr: a, line: answer === 'Right' ? 'go-right' : 'go-left', event: answer === 'Right' ? 'go-right' : 'go-left',
        tones: tones(lo, hi), brackets: lo <= hi ? [{ from: lo, to: hi, label: 'range' }] : undefined,
        pointers: lo <= hi ? [['lo', lo], ['hi', hi]] : [], vars: { lo, hi, target },
        message: answer === 'Right' ? `Discard the left half: lo = ${lo}.` : `Discard the right half: hi = ${hi}.`,
      });
    }
    r.add({
      arr: a, line: 'not-found', event: 'not-found', tones: tones(1, 0), vars: { lo, hi, target, result: -1 },
      message: `Range is empty: ${target} is not present. Return -1.`,
    });
    return r.frames;
  },
};
