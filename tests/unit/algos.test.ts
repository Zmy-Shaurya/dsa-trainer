import { describe, expect, it } from 'vitest';
import { ALGOS } from '../../src/engine/algos';
import { makePreset, parseInput } from '../../src/engine/input';
import { findEvent } from '../../src/engine/player';
import { MAX_FRAMES, type AnyAlgo, type ArrayView } from '../../src/engine/types';

const sortedCopy = (a: number[]) => [...a].sort((x, y) => x - y);

function inputsFor(algo: AnyAlgo): { arr: number[]; target?: number }[] {
  if (algo.samples) return [algo.defaults, ...algo.samples];
  const arrays = [
    [5], [2, 1], [3, 3, 3], [-5, 10, 0, -5, 7], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1],
    makePreset('random', 20, 7), makePreset('reversed', 20, 3), makePreset('few unique', 20, 5),
    ...algo.defaults.arr.length ? [algo.defaults.arr] : [],
  ];
  return arrays.flatMap((raw) => {
    const arr = algo.input.sorted ? sortedCopy(raw) : raw;
    if (!algo.input.target) return [{ arr }];
    return [{ arr, target: arr[0]! }, { arr, target: arr[arr.length - 1]! }, { arr, target: 1000 }, { arr, target: arr[Math.floor(arr.length / 2)]! }];
  });
}

/** True if any object/array appears in more than one place across the frames. */
function sharesReferences(frames: unknown[]): boolean {
  const seen = new Set<object>();
  const walk = (v: unknown): boolean => {
    if (typeof v !== 'object' || v === null) return false;
    if (seen.has(v)) return true;
    seen.add(v);
    return Object.values(v).some(walk);
  };
  return frames.some(walk);
}

describe.each(ALGOS)('contract: $id', (algo) => {
  const cases = inputsFor(algo);

  it('final frame meets the postcondition', () => {
    for (const input of cases) {
      const frames = algo.run(input);
      if (algo.check) {
        expect(algo.check(input, frames), JSON.stringify(input)).toBeNull();
        continue;
      }
      const last = frames.at(-1)!;
      const out = (last.views[0] as ArrayView).cells.map((c) => Number(c.value));
      if (algo.category === 'sorting') {
        expect(out).toEqual(sortedCopy(input.arr));
      } else {
        const idx = last.vars?.result as number;
        const expected = algo.id === 'linear-search' ? input.arr.indexOf(input.target!) : input.arr.indexOf(input.target!) < 0 ? -1 : idx;
        expect(idx).toBe(expected);
        if (idx >= 0) expect(input.arr[idx]).toBe(input.target);
      }
    }
  });

  it('every frame.line exists in both line maps and points inside the code', () => {
    for (const input of cases) {
      for (const f of algo.run(input)) {
        for (const lang of ['java', 'cpp'] as const) {
          const ln = algo.lines[lang][f.line];
          expect(ln, `${lang}:${f.line}`).toBeDefined();
          const total = algo.code[lang].split('\n').length;
          for (const n of Array.isArray(ln) ? ln : [ln!]) expect(n).toBeLessThan(total);
        }
      }
    }
  });

  it('frames are deep copies (no shared references)', () => {
    for (const input of cases) expect(sharesReferences(algo.run(input))).toBe(false);
  });

  it('is deterministic and does not mutate its input', () => {
    for (const input of cases) {
      const before = JSON.stringify(input);
      expect(algo.run(input)).toEqual(algo.run(input));
      expect(JSON.stringify(input)).toBe(before);
    }
  });

  it(`stays within ${MAX_FRAMES} frames for the largest input`, () => {
    for (const input of cases) expect(algo.run(input).length).toBeLessThanOrEqual(MAX_FRAMES);
  });

  it('predict prompts agree with the next frame', () => {
    let checked = 0;
    for (const input of cases) {
      const frames = algo.run(input);
      frames.forEach((f, i) => {
        if (!f.predict) return;
        const next = frames[i + 1]!;
        const ans = String(f.predict.answer);
        expect(f.predict.choices).toContain(ans);
        if (algo.check) { checked++; return; }
        if (algo.id === 'merge-sort') expect(next.event).toBe(`take-${ans.toLowerCase()}`);
        else if (algo.id === 'binary-search') expect(next.event).toBe(ans === 'Found' ? 'found' : `go-${ans.toLowerCase()}`);
        else expect(ans === 'Yes').toBe(next.event === algo.predictEvent);
        checked++;
      });
    }
    if (algo.modes.predict) expect(checked).toBeGreaterThan(0);
  });

  it('pick prompts accept only nodes, cells or indices that exist, and the next frame records the pick', () => {
    for (const input of cases) {
      const frames = algo.run(input);
      frames.forEach((f, i) => {
        if (!f.pick) return;
        expect(f.pick.valid.length).toBeGreaterThan(0);
        const next = frames[i + 1];
        if (next) expect(f.pick.valid.map(String)).toContain(String(next.vars?.picked));
      });
    }
  });

  it('counters include ops and never decrease', () => {
    for (const input of cases) {
      let prev = 0;
      for (const f of algo.run(input)) {
        expect(f.counters.ops).toBeGreaterThanOrEqual(prev);
        prev = f.counters.ops!;
      }
    }
  });
});

describe('input parsing', () => {
  const spec = { target: true };
  it('parses plain, bracketed and named forms', () => {
    expect(parseInput('5,3,1', {})).toEqual({ ok: true, value: { arr: [5, 3, 1] } });
    expect(parseInput('[2, 7, 11, 15]', {})).toEqual({ ok: true, value: { arr: [2, 7, 11, 15] } });
    expect(parseInput('nums = [2,7,11,15], target = 9', spec)).toEqual({ ok: true, value: { arr: [2, 7, 11, 15], target: 9 } });
  });
  it('sorts for sorted-only algorithms', () => {
    expect(parseInput('3 1 2', { sorted: true })).toEqual({ ok: true, value: { arr: [1, 2, 3] } });
  });
  it('rejects bad input with a message', () => {
    expect(parseInput('', {}).ok).toBe(false);
    expect(parseInput('1,x', {}).ok).toBe(false);
    expect(parseInput('1000', {}).ok).toBe(false);
    expect(parseInput(Array(21).fill(1).join(','), {}).ok).toBe(false);
    expect(parseInput('1,2', spec).ok).toBe(false);
  });
});

describe('findEvent', () => {
  it('finds next and previous events', () => {
    const frames = ALGOS[0]!.run({ arr: [3, 2, 1] });
    const i = findEvent(frames, 0, 'swap', 1);
    expect(frames[i]!.event).toBe('swap');
    expect(findEvent(frames, i, 'swap', -1)).toBe(-1);
  });
});
