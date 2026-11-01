import { describe, expect, it } from 'vitest';
import { Matcher, jaccard, levenshtein, normalize, parseBulk, slugify } from '../../src/domain/matching';
import { canonicalId, overlap, sheetProgress } from '../../src/domain/sheets';

const m = new Matcher([
  { id: 'two-sum', title: 'Two Sum', lcNumber: 1 },
  { id: '3sum', title: '3Sum', lcNumber: 15 },
  { id: 'valid-anagram', title: 'Valid Anagram', lcNumber: 242 },
  { id: 'longest-substring-without-repeating-characters', title: 'x', lcNumber: 3 },
  { id: 'merge-intervals', title: 'Merge Intervals', lcNumber: 56 },
  { id: 'container-with-most-water', title: 'x' },
  { id: 'gfg:rotate-array', title: 'Rotate Array' },
]);

const id = (s: string, n?: number) => {
  const r = m.match(s, n);
  return r.status === 'unmatched' ? null : `${r.status}:${r.id}`;
};

describe('normalize / slugify', () => {
  it.each([
    ['1. Two Sum', 'Two Sum', 1],
    ['#1 Two Sum', 'Two Sum', 1],
    ['12) Merge Intervals', 'Merge Intervals', 12],
    ['  15 - 3Sum  ', '3Sum', 15],
    ['Two Sum (Easy)', 'Two Sum', undefined],
    ['Two Sum [Medium]', 'Two Sum', undefined],
    ['Two   Sum', 'Two Sum', undefined],
    ['3Sum', '3Sum', undefined],
  ])('normalize(%s)', (raw, text, number) => {
    expect(normalize(raw)).toEqual(number === undefined ? { text } : { text, number });
  });
  it('slugifies', () => {
    expect(slugify("Pow(x, n)")).toBe('pow-x-n');
    expect(slugify('  Two   Sum!! ')).toBe('two-sum');
  });
});

describe('Matcher exact paths', () => {
  it.each([
    ['https://leetcode.com/problems/two-sum/', 'matched:two-sum'],
    ['https://leetcode.com/problems/two-sum/description/', 'matched:two-sum'],
    ['leetcode.com/problems/valid-anagram', 'matched:valid-anagram'],
    ['two-sum', 'matched:two-sum'],
    ['Two Sum', 'matched:two-sum'],
    ['two sum', 'matched:two-sum'],
    ['TWO SUM', 'matched:two-sum'],
    ['1. Two Sum', 'matched:two-sum'],
    ['#242 Valid Anagram', 'matched:valid-anagram'],
    ['3. whatever the title says', 'matched:longest-substring-without-repeating-characters'],
    ['15. 3Sum', 'matched:3sum'],
    ['3Sum', 'matched:3sum'],
    ['Merge Intervals (Medium)', 'matched:merge-intervals'],
    ['Rotate Array', 'fuzzy:gfg:rotate-array'.replace('fuzzy', 'matched')],
  ])('%s', (input, expected) => {
    // gfg ids match by slug of the part after the colon only via fuzzy; exact needs the full id
    const got = id(input);
    if (input === 'Rotate Array') expect(got).toBe('fuzzy:gfg:rotate-array');
    else expect(got).toBe(expected);
  });

  it('uses a number column hint', () => {
    expect(id('anything', 56)).toBe('matched:merge-intervals');
  });
  it('prefers the number over a wrong title', () => {
    expect(id('1. Totally Different')).toBe('matched:two-sum');
  });
});

describe('Matcher fuzzy and unmatched', () => {
  it('accepts a small typo on long slugs as fuzzy', () => {
    expect(id('Container With Most Watter')).toBe('fuzzy:container-with-most-water');
    expect(id('Valid Anagrams')).toBe('fuzzy:valid-anagram');
  });
  it('accepts a close URL slug as fuzzy', () => {
    expect(id('https://leetcode.com/problems/merge-interval/')).toBe('fuzzy:merge-intervals');
  });
  it('does not fuzzy-match short slugs', () => {
    expect(id('two-sun')).toBeNull();
  });
  it.each(['', '   ', '!!!', 'Completely Unknown Problem', '9999. Nope'])('unmatched: %j', (s) => {
    expect(id(s)).toBeNull();
  });
});

describe('string metrics', () => {
  it('levenshtein', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
  });
  it('jaccard', () => {
    expect(jaccard('a-b-c', 'a-b-c')).toBe(1);
    expect(jaccard('a-b', 'c-d')).toBe(0);
    expect(jaccard('a-b-c-d', 'a-b-c')).toBeCloseTo(0.75);
  });
});

describe('parseBulk', () => {
  it('one row per line for plain text', () => {
    const rows = parseBulk('Two Sum\n\n  3Sum  \nhttps://leetcode.com/problems/valid-anagram/');
    expect(rows.map((r) => r.query)).toEqual(['Two Sum', '3Sum', 'https://leetcode.com/problems/valid-anagram/']);
  });
  it('reads a CSV with a header, keeping only solved rows', () => {
    const csv = 'Title,Status,Date,Difficulty\nTwo Sum,Accepted,2026-01-05,Easy\n"Merge Intervals, ok",Attempted,,Medium\n3Sum,solved,2026-02-01,Medium';
    const rows = parseBulk(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ query: 'Two Sum', solvedAt: '2026-01-05' });
    expect(rows[1]).toMatchObject({ query: '3Sum' });
  });
  it('prefers slug/url over title and reads number and confidence', () => {
    const rows = parseBulk('number,slug,title,confidence\n1,two-sum,Two Sum,cleared');
    expect(rows[0]).toMatchObject({ query: 'two-sum', number: 1, confidence: 'cleared' });
  });
  it('accepts alternative header names', () => {
    const rows = parseBulk('name,#,solved_at\nTwo Sum,1,2026-03-03');
    expect(rows[0]).toMatchObject({ query: 'Two Sum', number: 1, solvedAt: '2026-03-03' });
  });
  it('does not mistake a title list with commas for CSV', () => {
    expect(parseBulk('Pow(x, n)\nTwo Sum')).toHaveLength(2);
  });
  it('returns nothing for empty input', () => {
    expect(parseBulk('  \n ')).toEqual([]);
  });
});

describe('sheets', () => {
  const a = { sections: [{ title: 'X', problems: ['two-sum', '3sum'] }, { title: 'Y', problems: ['valid-anagram'] }] };
  const b = { sections: [{ title: 'Z', problems: ['two-sum', 'merge-intervals'] }] };
  it('computes progress overall and per section', () => {
    const p = sheetProgress(a, new Set(['two-sum', 'valid-anagram']));
    expect(p.overall).toEqual({ solved: 2, total: 3 });
    expect(p.sections.map((s) => s.solved)).toEqual([1, 1]);
  });
  it('dedupes by canonical id (D5)', () => {
    const canon = (x: string) => (x === 'gfg:two-sum' ? 'two-sum' : x);
    const s = { sections: [{ title: 'S', problems: ['two-sum', 'gfg:two-sum'] }] };
    expect(sheetProgress(s, new Set(['two-sum']), canon).overall).toEqual({ solved: 1, total: 1 });
  });
  it('computes overlap', () => {
    const o = overlap(a, b, new Set(['two-sum', 'merge-intervals']));
    expect(o.both).toEqual(['two-sum']);
    expect(o.onlyA).toEqual(['3sum', 'valid-anagram']);
    expect(o.onlyB).toEqual(['merge-intervals']);
    expect(o.coversB).toBe(0.5);
    expect(o.solved).toEqual({ both: 1, onlyA: 0, onlyB: 1 });
  });
  it('resolves canonical ids through aliases and equivalentTo', () => {
    const byId = new Map([['gfg:rotate', { equivalentTo: 'rotate-array' }], ['rotate-array', {}]]);
    expect(canonicalId('gfg:rotate', {}, byId)).toBe('rotate-array');
    expect(canonicalId('old-id', { 'old-id': 'rotate-array' }, byId)).toBe('rotate-array');
    expect(canonicalId('rotate-array', {}, byId)).toBe('rotate-array');
  });
});
