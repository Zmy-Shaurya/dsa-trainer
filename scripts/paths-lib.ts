// Learning paths and company data on disk (PRD 8.9, 15, 19).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { CompanyData, Concept, PathDef } from '../src/content/types.ts';
import { validateCompany } from '../src/domain/companies.ts';
import { authoredItems } from '../src/domain/paths.ts';
import { ROOT } from './content-lib.ts';

export function loadPaths(): PathDef[] {
  const dir = join(ROOT, 'paths');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort().map((f) => parse(readFileSync(join(dir, f), 'utf8')) as PathDef);
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validatePaths(paths: PathDef[], concepts: Concept[], knownProblems: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const conceptIds = new Set(concepts.map((c) => c.id));
  const ids = new Set<string>();
  for (const p of paths) {
    const w = `path ${p.id}`;
    if (!KEBAB.test(p.id)) errors.push(`${w}: id must be kebab-case`);
    if (ids.has(p.id)) errors.push(`${w}: duplicate id`);
    ids.add(p.id);
    if (!p.name) errors.push(`${w}: needs a name`);
    if (!(p.hoursPerDay > 0 && p.hoursPerDay <= 8)) errors.push(`${w}: hoursPerDay must be between 0 and 8`);
    p.days.forEach((d, i) => {
      const dw = `${w} day ${d.day}`;
      if (d.day !== i + 1) errors.push(`${dw}: days must be numbered 1, 2, 3... in order (expected ${i + 1})`);
      if (!d.title) errors.push(`${dw}: needs a title`);
      if (d.review && (d.concepts?.length || d.problems?.length || d.quizzes?.length)) errors.push(`${dw}: a review day lists no items`);
      for (const c of d.concepts ?? []) if (!conceptIds.has(c)) errors.push(`${dw}: unknown concept ${c}`);
      for (const q of d.quizzes ?? []) if (q !== 'complexity' && q !== 'pattern') errors.push(`${dw}: bad quiz ${q}`);
      for (const pr of [...(d.problems ?? []), ...(d.optional ?? [])]) if (!knownProblems.has(pr)) errors.push(`${dw}: unknown problem ${pr}`);
      const keys = authoredItems(d).map((x) => x.key);
      if (new Set(keys).size !== keys.length) errors.push(`${dw}: repeats an item`);
    });
    const all = p.days.flatMap((d) => authoredItems(d)).filter((x) => x.kind === 'p').map((x) => x.ref);
    const dup = all.filter((x, i) => all.indexOf(x) !== i);
    if (dup.length) errors.push(`${w}: problem listed on two days: ${[...new Set(dup)].join(', ')}`);
  }
  return errors;
}

/** Company files written by `company:import`: content/companies/<id>.json (git-ignored unless the licence allows). */
export function loadCompanies(): CompanyData[] {
  const dir = join(ROOT, 'companies');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as CompanyData);
}

export function validateCompanies(cs: CompanyData[]): string[] {
  const ids = new Set<string>();
  return cs.flatMap((c) => {
    const e = validateCompany(c).map((m) => `company ${c.id}: ${m}`);
    if (ids.has(c.id)) e.push(`company ${c.id}: duplicate id`);
    ids.add(c.id);
    return e;
  });
}
