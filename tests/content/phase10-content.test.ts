import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadProblems } from '../../scripts/content-lib';

const BATCH = [
  'missing-number', 'single-number', 'majority-element', 'maximum-subarray', 'product-of-array-except-self', 'plus-one',
  'happy-number', 'is-subsequence', 'longest-common-prefix', 'number-of-1-bits', 'power-of-two',
  // batch 2
  'fibonacci-number', 'min-cost-climbing-stairs', 'counting-bits', 'reverse-integer', 'count-primes',
  'two-sum-ii-input-array-is-sorted', 'jump-game', 'daily-temperatures', 'find-the-duplicate-number',
  'subarray-sum-equals-k', 'longest-consecutive-sequence', 'repeated-substring-pattern', 'evaluate-reverse-polish-notation',
];

describe('Phase 10 batch 1', () => {
  const byId = new Map(loadProblems().map((p) => [p.meta.id, p]));

  it('is authored with two approaches in both languages and one optimal', () => {
    for (const id of BATCH) {
      const p = byId.get(id);
      expect(p, id).toBeDefined();
      const ap = p!.meta.approaches ?? [];
      expect(ap.length, id).toBeGreaterThanOrEqual(2);
      expect(ap.filter((a) => a.isOptimal).length, id).toBe(1);
      for (const a of ap) expect(Object.keys(a.files ?? {}).sort(), `${id}/${a.id}`).toEqual(['cpp', 'java']);
    }
  });

  it('has at least five test cases each', () => {
    for (const id of BATCH) expect((JSON.parse(readFileSync(join(byId.get(id)!.dir, 'tests.json'), 'utf8')) as { cases: unknown[] }).cases.length, id).toBeGreaterThanOrEqual(5);
  });
});
