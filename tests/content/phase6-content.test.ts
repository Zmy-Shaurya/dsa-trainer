import { describe, expect, it } from 'vitest';
import { loadComplexity, loadGuide, loadPatterns, loadTemplates } from '../../scripts/tools-lib';
import {
  gradeComplexity, mulberry32, patternOptions, pickComplexity, pickPatterns, seedOf, trapOfTheDay, weight,
} from '../../src/domain/quiz';

const cq = loadComplexity();
const pq = loadPatterns();
const guide = loadGuide();

describe('quiz logic', () => {
  it('is deterministic for a seed and picks unseen first without repeats', () => {
    const a = pickComplexity(cq, [], 10, mulberry32(seedOf('x'))).map((i) => i.id);
    const b = pickComplexity(cq, [], 10, mulberry32(seedOf('x'))).map((i) => i.id);
    expect(a).toEqual(b);
    const seen = cq.slice(1).map((i) => ({ itemId: `cq:${i.id}`, correct: true, at: '' }));
    const picked = pickComplexity(cq, seen, 5, mulberry32(1));
    expect(picked[0]!.id).toBe(cq[0]!.id);
    expect(new Set(picked.map((i) => i.id)).size).toBe(5);
  });
  it('weights recent misses', () => {
    const h = (c: boolean) => ({ itemId: 'a', correct: c, at: '' });
    expect(weight([h(true)])).toBe(1);
    expect(weight([h(false), h(false), h(true), h(true)])).toBe(3);
  });
  it('grades per language and needs both time and space', () => {
    const item = cq.find((i) => typeof i.time !== 'string' || typeof i.space !== 'string') ?? cq[0]!;
    const t = (l: 'java' | 'cpp') => (typeof item.time === 'string' ? item.time : item.time[l]);
    const s = (l: 'java' | 'cpp') => (typeof item.space === 'string' ? item.space : item.space[l]);
    expect(gradeComplexity(item, 'java', t('java'), s('java')).correct).toBe(true);
    expect(gradeComplexity(item, 'cpp', t('cpp'), 'nope').correct).toBe(false);
  });
  it('pattern options include the answer and drills do not repeat', () => {
    for (const p of pq) expect(patternOptions(p, mulberry32(3))).toContain(p.answer);
    const drill = pickPatterns(pq, [], 10, mulberry32(2));
    expect(new Set(drill.map((d) => d.item.id)).size).toBe(10);
  });
  it('trap of the day is stable per date', () => {
    expect(trapOfTheDay(guide, '2026-11-01')).toBe(trapOfTheDay(guide, '2026-11-01'));
  });
});

describe('content counts', () => {
  it('meets the PRD minimums', () => {
    expect(cq.length).toBeGreaterThanOrEqual(60);
    expect(pq.length).toBeGreaterThanOrEqual(60);
    expect(guide).toHaveLength(25);
    expect(loadTemplates().flatMap((p) => p.variants)).toHaveLength(36);
  });
});
