import { MAX_ARRAY, MAX_VALUE, MIN_VALUE, type AlgoDef, type AlgoInput } from './types';

export type ParseResult = { ok: true; value: AlgoInput } | { ok: false; error: string };

/**
 * Accepts `5,3,1`, `[5, 3, 1]` and `nums = [2,7,11,15], target = 9`.
 * Sorted-only algorithms get a sorted copy so the user never has to think about it.
 */
export function parseInput(text: string, spec: AlgoDef['input'], fallbackTarget?: number): ParseResult {
  const bracket = /\[([^\]]*)\]/.exec(text);
  const listText = bracket ? bracket[1]! : text.replace(/target\s*=.*$/i, '');
  const tokens = listText.split(/[\s,]+/).filter(Boolean);
  const arr = tokens.map(Number);
  if (arr.length < 1) return { ok: false, error: 'Enter at least 1 number.' };
  if (arr.length > MAX_ARRAY) return { ok: false, error: `At most ${MAX_ARRAY} numbers (got ${arr.length}).` };
  if (arr.some((n) => !Number.isInteger(n)))
    return { ok: false, error: `"${tokens[arr.findIndex((n) => !Number.isInteger(n))]}" is not an integer.` };
  if (arr.some((n) => n < MIN_VALUE || n > MAX_VALUE))
    return { ok: false, error: `Values must be between ${MIN_VALUE} and ${MAX_VALUE}.` };
  const value: AlgoInput = { arr: spec.sorted ? [...arr].sort((a, b) => a - b) : arr };
  if (spec.target) {
    const m = /target\s*=\s*(-?\d+)/i.exec(text);
    const t = m ? Number(m[1]) : fallbackTarget;
    if (t === undefined || !Number.isInteger(t)) return { ok: false, error: 'Enter an integer target.' };
    value.target = t;
  }
  return { ok: true, value };
}

export function formatInput(input: AlgoInput): string {
  return input.arr.join(', ');
}

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PRESETS = ['random', 'sorted', 'reversed', 'nearly sorted', 'few unique'] as const;
export type Preset = (typeof PRESETS)[number];

export function makePreset(kind: Preset, n: number, seed: number): number[] {
  const rand = rng(seed);
  const pick = (max: number) => Math.floor(rand() * max) + 1;
  const base = Array.from({ length: n }, () => pick(99));
  switch (kind) {
    case 'random':
      return base;
    case 'sorted':
      return base.sort((a, b) => a - b);
    case 'reversed':
      return base.sort((a, b) => b - a);
    case 'nearly sorted': {
      const a = base.sort((x, y) => x - y);
      for (let k = 0; k < Math.max(1, Math.floor(n / 6)); k++) {
        const i = Math.floor(rand() * (n - 1));
        [a[i], a[i + 1]] = [a[i + 1]!, a[i]!];
      }
      return a;
    }
    case 'few unique':
      return Array.from({ length: n }, () => pick(3) * 10);
  }
}

/** Query-string form used for URL sharing: `?input=5,3,1&target=3`. */
export function toShareQuery(input: AlgoInput): string {
  const p = new URLSearchParams({ input: input.arr.join(',') });
  if (input.target !== undefined) p.set('target', String(input.target));
  return p.toString();
}
