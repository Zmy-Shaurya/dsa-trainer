import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ApproachFull, ContentIndex, ProblemFull, ProblemSummary } from '../src/content/types.ts';
import { countsOf } from '../src/domain/companies.ts';
import { authoredItems } from '../src/domain/paths.ts';
import { knownProblemIds, loadTools, validateTools } from './tools-lib.ts';
import { loadCompanies, loadPaths, validateCompanies, validatePaths } from './paths-lib.ts';
import { folderOf, loadAliases, loadCards, loadConcepts, loadProblems, loadSheets, validate, validateCards } from './content-lib.ts';

const concepts = loadConcepts();
const problems = loadProblems();
const sheets = loadSheets();
const aliases = loadAliases();
const cards = loadCards();
const tools = loadTools();
const paths = loadPaths();
const companies = loadCompanies();
const errors = [
  ...validate(concepts, problems, sheets, { strictConceptRefs: true }).errors, ...validateCards(concepts, cards),
  ...validateTools(tools, concepts, knownProblemIds(problems, sheets, concepts)),
  ...validatePaths(paths, concepts, knownProblemIds(problems, sheets, concepts)), ...validateCompanies(companies),
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const sheetsOf = new Map<string, string[]>();
for (const s of sheets)
  for (const sec of s.sections)
    for (const p of sec.problems) sheetsOf.set(p, [...(sheetsOf.get(p) ?? []), s.id]);

const summaries = new Map<string, ProblemSummary>();
const full: ProblemFull[] = [];
for (const { meta, dir } of problems) {
  const approaches: ApproachFull[] | undefined = meta.approaches?.map(({ files, ...a }) => ({
    ...a,
    code: {
      java: readFileSync(join(dir, files.java), 'utf8').trimEnd(),
      cpp: readFileSync(join(dir, files.cpp), 'utf8').trimEnd(),
    },
  }));
  const notesPath = join(dir, 'notes.md');
  const { approaches: _drop, ...rest } = meta;
  full.push({
    ...rest,
    sheets: sheetsOf.get(meta.id) ?? [],
    ...(approaches ? { approaches } : {}),
    ...(existsSync(notesPath) ? { notes: readFileSync(notesPath, 'utf8') } : {}),
  });
  summaries.set(meta.id, {
    id: meta.id, title: meta.title, difficulty: meta.difficulty, tier: meta.tier, topics: meta.topics,
    patterns: meta.patterns, concepts: meta.concepts, platform: meta.platform, url: meta.url,
    ...(meta.equivalentTo ? { equivalentTo: meta.equivalentTo } : {}),
    ...(meta.lcNumber ? { lcNumber: meta.lcNumber } : {}),
    ...(meta.unverified ? { unverified: true } : {}),
    sheets: sheetsOf.get(meta.id) ?? [], hasApproaches: !!approaches?.length,
  });
}

// Stubs: every sheet/concept problem without an authored folder still renders (PRD §8.8).
const titleCase = (slug: string) => slug.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
const pathProblems = paths.flatMap((p) => p.days.flatMap((d) => authoredItems(d)).filter((i) => i.kind === 'p').map((i) => i.ref));
const companyProblems = companies.flatMap((c) => Object.values(c.windows).flatMap((l) => l!.map((e) => e.problemId)));
const referenced = new Set<string>([...sheetsOf.keys(), ...pathProblems, ...companyProblems, ...concepts.flatMap((c) => [...c.coreProblems, ...(c.moreProblems ?? [])])]);
const extraOf = new Map(companies.flatMap((c) => Object.entries(c.extra ?? {})));
for (const id of referenced) {
  if (summaries.has(id)) continue;
  const slug = id.includes(':') ? id.split(':')[1]! : id;
  summaries.set(id, {
    id, title: extraOf.get(id)?.title ?? titleCase(slug), difficulty: extraOf.get(id)?.difficulty ?? 'medium', tier: 3, topics: [], patterns: [], concepts: [],
    platform: id.includes(':') ? 'other' : 'leetcode',
    url: id.includes(':') ? 'https://github.com/' : `https://leetcode.com/problems/${slug}/`,
    unverified: true, sheets: sheetsOf.get(id) ?? [], hasApproaches: false,
  });
}

const index: Omit<ContentIndex, 'contentVersion'> = {
  concepts, problems: [...summaries.values()].sort((a, b) => a.id.localeCompare(b.id)), sheets, aliases,
  paths: paths.map((p) => ({
    id: p.id, name: p.name, ...(p.description ? { description: p.description } : {}), hoursPerDay: p.hoursPerDay,
    days: p.days.length, problems: new Set(p.days.flatMap((d) => authoredItems(d)).filter((i) => i.kind === 'p').map((i) => i.ref)).size,
  })),
  cardIds: Object.fromEntries(cards.map((f) => [f.concept, f.cards.map((c) => c.id)])),
  quizzes: { complexityCount: tools.complexity.length, patternCount: tools.patterns.length },
  cheatsheets: tools.cheatsheets.map(({ id, title, printable }) => ({ id, title, printable })),
  languageGuide: tools.guide.map(({ id, title, category }) => ({ id, title, category })),
  templates: tools.templates.map((t) => ({ id: t.id, title: t.title, concept: t.concept, variants: t.variants.length })),
};
const hash = createHash('sha1').update(JSON.stringify([index, full, cards, tools, paths, companies])).digest('hex').slice(0, 6);
const contentVersion = `${new Date().toISOString().slice(0, 10)}-${hash}`;

const out = join(import.meta.dirname, '..', 'public', 'content');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'problems'), { recursive: true });
mkdirSync(join(out, 'cards'), { recursive: true });
mkdirSync(join(out, 'quizzes'), { recursive: true });
mkdirSync(join(out, 'cheatsheets'), { recursive: true });
mkdirSync(join(out, 'paths'), { recursive: true });
mkdirSync(join(out, 'companies'), { recursive: true });
for (const f of cards) writeFileSync(join(out, 'cards', `${f.concept}.json`), JSON.stringify(f));
writeFileSync(join(out, 'quizzes', 'complexity.json'), JSON.stringify(tools.complexity));
writeFileSync(join(out, 'quizzes', 'patterns.json'), JSON.stringify(tools.patterns));
writeFileSync(join(out, 'language-guide.json'), JSON.stringify(tools.guide));
writeFileSync(join(out, 'templates.json'), JSON.stringify(tools.templates));
for (const s of tools.cheatsheets) writeFileSync(join(out, 'cheatsheets', `${s.id}.json`), JSON.stringify(s));
for (const p of paths) writeFileSync(join(out, 'paths', `${p.id}.json`), JSON.stringify(p));
for (const c of companies) writeFileSync(join(out, 'companies', `${c.id}.json`), JSON.stringify(c));
writeFileSync(join(out, 'companies', 'index.json'), JSON.stringify(companies.map((c) => ({ id: c.id, name: c.name, asOf: c.asOf, counts: countsOf(c), source: c.source }))));
writeFileSync(join(out, 'index.json'), JSON.stringify({ contentVersion, ...index }));
for (const p of full) writeFileSync(join(out, 'problems', `${folderOf(p.id)}.json`), JSON.stringify(p));
// every content file, for "Download everything for offline"
const listFiles = (dir: string, prefix = ''): string[] =>
  readdirSync(join(dir, prefix), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(dir, `${prefix}${e.name}/`) : e.name === 'files.json' ? [] : [`${prefix}${e.name}`]);
writeFileSync(join(out, 'files.json'), JSON.stringify(listFiles(out).sort()));
console.log(`built index.json (${contentVersion}): ${summaries.size} problems (${full.length} authored), ${paths.length} paths, ${companies.length} companies`);
