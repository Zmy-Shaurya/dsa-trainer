import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCompanies } from '../../src/domain/companies';
import { authoredItems } from '../../src/domain/paths';
import { loadConcepts, loadProblems, loadSheets } from '../../scripts/content-lib';
import { loadPaths, validatePaths } from '../../scripts/paths-lib';
import { knownProblemIds } from '../../scripts/tools-lib';

const concepts = loadConcepts();
const known = knownProblemIds(loadProblems(), loadSheets(), concepts);
const paths = loadPaths();
const by = (id: string) => paths.find((p) => p.id === id)!;

describe('bundled paths', () => {
  it('are the four from the PRD and pass validation', () => {
    expect(paths.map((p) => p.id).sort()).toEqual(['beginner-to-intermediate', 'cp-basics-30', 'interview-60', 'placement-30']);
    expect(validatePaths(paths, concepts, known)).toEqual([]);
  });
  it('have the promised length and review rhythm', () => {
    expect(by('placement-30').days).toHaveLength(30);
    expect(by('interview-60').days).toHaveLength(60);
    expect(by('beginner-to-intermediate').days).toHaveLength(45);
    expect(by('cp-basics-30').days).toHaveLength(30);
    const reviews = (id: string) => by(id).days.filter((d) => d.review).map((d) => d.day);
    expect(reviews('placement-30')).toEqual([7, 14, 21, 30]);
    expect(reviews('interview-60').slice(0, 8)).toEqual([7, 14, 21, 28, 35, 42, 49, 56]);
    expect(reviews('interview-60').slice(8)).toEqual([57, 58, 59, 60]);
  });
  it('placement-30 follows the outline: optional marks, quizzes and the first days', () => {
    const p = by('placement-30');
    expect(p.days[0]).toMatchObject({ concepts: ['complexity-basics', 'arrays-strings'], problems: ['contains-duplicate', 'best-time-to-buy-and-sell-stock'], quizzes: ['complexity'] });
    const opt = p.days.flatMap((d) => authoredItems(d)).filter((i) => i.optional).map((i) => i.ref);
    expect(opt).toEqual(['minimum-window-substring', 'find-median-from-data-stream']);
    expect(p.days.filter((d) => d.quizzes?.includes('pattern')).map((d) => d.day)).toEqual([6, 9, 28]);
  });
  it('plan about an hour or two of problems a day', () => {
    for (const p of paths)
      for (const d of p.days) expect(authoredItems(d).filter((i) => i.kind === 'p').length, `${p.id} day ${d.day}`).toBeLessThanOrEqual(3);
  });
});

describe('company import on the sample fixture', () => {
  const dir = join(import.meta.dirname, '..', 'fixtures', 'company-sample', 'ExampleCo');
  const files = ['1. Thirty Days.csv', '3. Six Months.csv', '5. All.csv'].map((f) => ({ path: `ExampleCo/${f}`, text: readFileSync(join(dir, f), 'utf8') }));
  it('reads windows, percent frequencies and quoted titles; unknown problems stay unverified', () => {
    const r = buildCompanies(files, { isKnown: (id) => known.has(id), asOf: '2026-11-01', source: { repo: 'fixture', license: 'test data' } });
    expect(r).toMatchObject({ skippedRows: 0, ignored: [] });
    const c = r.companies[0]!;
    expect(c.id).toBe('exampleco');
    expect(c.windows['30d']).toEqual([{ problemId: 'two-sum', freq: 90.5 }, { problemId: 'lru-cache', freq: 70 }]);
    expect(c.windows['6m']!.map((e) => e.problemId)).toEqual(['two-sum', 'longest-substring-without-repeating-characters', 'made-up-sample-problem']);
    expect(c.extra).toEqual({ 'made-up-sample-problem': { title: 'Made Up Sample Problem', difficulty: 'hard' } });
  });
});
