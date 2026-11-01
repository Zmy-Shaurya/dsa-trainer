// Phase 6 content: quizzes, language guide, templates and cheat sheets (PRD 8.11, 8.12, 16).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import {
  GUIDE_CATEGORIES, QUIZ_TOPICS,
  type Cheatsheet, type ComplexityItem, type Concept, type GuideCard, type LangAnswer, type PatternItem, type Sheet, type TemplatePage,
} from '../src/content/types.ts';
import { PATTERNS, ROOT, type LoadedProblem } from './content-lib.ts';

const yamlFiles = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort() : []);
const readYaml = <T>(p: string) => parse(readFileSync(p, 'utf8')) as T;

export const loadComplexity = (): ComplexityItem[] =>
  yamlFiles(join(ROOT, 'quizzes', 'complexity')).flatMap((f) => readYaml<{ items: ComplexityItem[] }>(join(ROOT, 'quizzes', 'complexity', f)).items ?? []);

export const loadPatterns = (): PatternItem[] => {
  const p = join(ROOT, 'quizzes', 'patterns.yaml');
  return existsSync(p) ? (readYaml<{ items: PatternItem[] }>(p).items ?? []) : [];
};

export const loadGuide = (): GuideCard[] => {
  const dir = join(ROOT, 'language-guide');
  return yamlFiles(dir).flatMap((f) => readYaml<{ cards: GuideCard[] }>(join(dir, f)).cards ?? []);
};

export const loadTemplates = (): TemplatePage[] => {
  const dir = join(ROOT, 'templates');
  return yamlFiles(dir).flatMap((f) => readYaml<{ pages: TemplatePage[] }>(join(dir, f)).pages ?? []);
};

/** Markdown with a small front matter (`title`, `printable`). */
export function loadCheatsheets(): Cheatsheet[] {
  const dir = join(ROOT, 'cheatsheets');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => {
    const raw = readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n');
    const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
    const meta = m ? (parse(m[1]!) as { title?: string; printable?: boolean }) : {};
    return { id: f.replace(/\.md$/, ''), title: meta.title ?? f, printable: !!meta.printable, body: (m ? m[2]! : raw).trim() };
  });
}

/** Every problem id that resolves to a page: authored folders plus sheet and concept stubs. */
export const knownProblemIds = (problems: LoadedProblem[], sheets: Sheet[], concepts: Concept[]) =>
  new Set<string>([
    ...problems.map((p) => p.meta.id),
    ...sheets.flatMap((s) => s.sections.flatMap((x) => x.problems)),
    ...concepts.flatMap((c) => [...c.coreProblems, ...(c.moreProblems ?? [])]),
  ]);

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const STATEMENT = /^(given |you are given|return the |write a function)/i;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const lines = (s: string) => s.split('\n').filter((l) => l.trim()).length;

export const MIN_COMPLEXITY = 60;
export const MIN_PATTERNS = 60;

/** The 25 cards PRD 16.1 asks for. */
export const GUIDE_SEED = [
  'arraylist-vs-vector', 'hashmap-vs-unordered-map', 'hashset-vs-unordered-set', 'treemap-vs-map', 'priority-queue',
  'deque-and-stack', 'strings-immutability', 'substring-cost', 'sorting-and-comparators', 'stability', 'integer-overflow',
  'integer-division-and-modulo', 'abs-int-min', 'integer-cache', 'list-remove-ambiguity', 'char-arithmetic', 'arrays-2d',
  'vector-bool', 'pass-by-value-vs-reference', 'null-vs-nullptr', 'bit-operations', 'recursion-depth', 'fast-io',
  'unordered-map-anti-hash', 'swap-and-min-max',
];

/** The seed templates PRD 16.2 lists, as page/variant. */
export const TEMPLATE_SEED = [
  'binary-search/exact', 'binary-search/lower-bound', 'binary-search/upper-bound', 'binary-search/on-answer',
  'sliding-window/fixed', 'sliding-window/variable', 'two-pointers/opposite-ends', 'two-pointers/same-direction',
  'prefix-sum/one-d', 'prefix-sum/two-d', 'monotonic-stack/next-greater', 'bfs/graph', 'bfs/grid', 'bfs/multi-source',
  'dfs/recursive', 'dfs/iterative', 'topological-sort/kahn', 'union-find/dsu', 'dijkstra/priority-queue', 'trie/basic',
  'heap-top-k/top-k', 'backtracking/subsets', 'backtracking/permutations', 'backtracking/combinations',
  'dp/one-d', 'dp/grid', 'dp/knapsack', 'dp/lis', 'dp/lcs', 'range-queries/fenwick', 'range-queries/segment-tree',
  'string-matching/kmp', 'string-matching/z-function', 'modular-exponentiation/modpow', 'fast-io/header', 'comparator/two-keys',
];

const answers = (a: LangAnswer) => (typeof a === 'string' ? [a] : [a.java, a.cpp]);

export interface ToolsContent {
  complexity: ComplexityItem[];
  patterns: PatternItem[];
  guide: GuideCard[];
  templates: TemplatePage[];
  cheatsheets: Cheatsheet[];
}

export function validateTools(c: ToolsContent, concepts: Concept[], known: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const conceptIds = new Set(concepts.map((x) => x.id));

  // complexity quiz
  const ids = new Set<number>();
  for (const q of c.complexity) {
    const w = `complexity #${q.id}`;
    if (!Number.isInteger(q.id) || ids.has(q.id)) errors.push(`${w}: id must be a unique integer`);
    ids.add(q.id);
    if (!(QUIZ_TOPICS as readonly string[]).includes(q.topic)) errors.push(`${w}: unknown topic ${q.topic}`);
    for (const l of ['java', 'cpp'] as const) if (!q.code?.[l]?.trim()) errors.push(`${w}: missing ${l} code`);
    for (const k of ['time', 'space'] as const) {
      const opts = q.options?.[k] ?? [];
      if (opts.length < 3 || opts.length > 5) errors.push(`${w}: ${k} needs 3-5 options`);
      if (new Set(opts).size !== opts.length) errors.push(`${w}: duplicate ${k} options`);
      for (const a of answers(q[k])) if (!opts.includes(a)) errors.push(`${w}: ${k} answer "${a}" is not among the options`);
    }
    if (!q.why || q.why.length > 260) errors.push(`${w}: why must be 1-260 chars`);
    if (typeof q.trap !== 'boolean') errors.push(`${w}: trap must be true or false`);
    for (const x of q.concepts ?? []) if (!conceptIds.has(x)) errors.push(`${w}: unknown concept ${x}`);
    if (!q.concepts?.length) errors.push(`${w}: needs at least one concept`);
  }
  if (c.complexity.length < MIN_COMPLEXITY) errors.push(`complexity quiz needs at least ${MIN_COMPLEXITY} items (has ${c.complexity.length})`);
  const traps = c.complexity.filter((q) => q.topic === 'language-traps' && typeof q.time !== 'string').length;
  if (traps < 8) errors.push(`complexity quiz needs at least 8 language-trap items whose answer differs by language (has ${traps})`);

  // pattern trainer
  const pids = new Set<number>();
  for (const p of c.patterns) {
    const w = `pattern #${p.id}`;
    if (!Number.isInteger(p.id) || pids.has(p.id)) errors.push(`${w}: id must be a unique integer`);
    pids.add(p.id);
    if (!known.has(p.problem)) errors.push(`${w}: unknown problem ${p.problem}`);
    if (!PATTERNS.includes(p.answer)) errors.push(`${w}: unknown pattern ${p.answer}`);
    if ((p.distractors ?? []).length < 3) errors.push(`${w}: needs at least 3 distractors`);
    if (new Set(p.distractors).size !== p.distractors?.length || p.distractors?.includes(p.answer)) errors.push(`${w}: distractors must be distinct and not the answer`);
    for (const d of p.distractors ?? []) if (!PATTERNS.includes(d)) errors.push(`${w}: unknown distractor ${d}`);
    if (!p.prompt || p.prompt.length > 160) errors.push(`${w}: prompt must be 1-160 chars`);
    if (STATEMENT.test(p.prompt ?? '')) errors.push(`${w}: prompt looks like a problem statement, paraphrase it`);
    if (!p.tells || p.tells.length < 2 || p.tells.length > 4) errors.push(`${w}: tells needs 2-4 items`);
    for (const t of p.tells ?? []) if (t.length > 70) errors.push(`${w}: tell over 70 chars`);
  }
  if (c.patterns.length < MIN_PATTERNS) errors.push(`pattern trainer needs at least ${MIN_PATTERNS} items (has ${c.patterns.length})`);

  // language guide
  const gids = new Set<string>();
  for (const g of c.guide) {
    const w = `guide ${g.id}`;
    if (!KEBAB.test(g.id)) errors.push(`${w}: id must be kebab-case`);
    if (gids.has(g.id)) errors.push(`${w}: duplicate id`);
    gids.add(g.id);
    if (!(GUIDE_CATEGORIES as readonly string[]).includes(g.category)) errors.push(`${w}: unknown category ${g.category}`);
    if (!g.title || !g.java?.trim() || !g.cpp?.trim() || !g.trap) errors.push(`${w}: needs title, java, cpp and trap`);
    if (words(`${g.java} ${g.cpp} ${g.trap}`) > 120) errors.push(`${w}: over 120 words including code`);
  }
  for (const id of GUIDE_SEED) if (!gids.has(id)) errors.push(`guide: missing seed card ${id}`);

  // templates
  const tids = new Set<string>();
  const have = new Set<string>();
  for (const t of c.templates) {
    const w = `template page ${t.id}`;
    if (!KEBAB.test(t.id)) errors.push(`${w}: id must be kebab-case`);
    if (tids.has(t.id)) errors.push(`${w}: duplicate id`);
    tids.add(t.id);
    if (!conceptIds.has(t.concept)) errors.push(`${w}: unknown concept ${t.concept}`);
    if (!t.when || !t.pitfalls?.length) errors.push(`${w}: needs when and pitfalls`);
    for (const p of t.problems ?? []) if (!known.has(p)) errors.push(`${w}: unknown problem ${p}`);
    const vs = new Set<string>();
    for (const v of t.variants ?? []) {
      if (vs.has(v.id)) errors.push(`${w}: duplicate variant ${v.id}`);
      vs.add(v.id);
      have.add(`${t.id}/${v.id}`);
      for (const l of ['java', 'cpp'] as const) {
        if (!v[l]?.trim()) errors.push(`${w}/${v.id}: missing ${l}`);
        else if (lines(v[l]) > 25) errors.push(`${w}/${v.id}: ${l} template over 25 lines (${lines(v[l])})`);
      }
    }
  }
  for (const s of TEMPLATE_SEED) if (!have.has(s)) errors.push(`templates: missing seed template ${s}`);

  // cheat sheets
  const sids = new Set<string>();
  for (const s of c.cheatsheets) {
    if (sids.has(s.id)) errors.push(`cheatsheet ${s.id}: duplicate id`);
    sids.add(s.id);
    if (!s.title || s.title === `${s.id}.md`) errors.push(`cheatsheet ${s.id}: missing front-matter title`);
    if (!s.body) errors.push(`cheatsheet ${s.id}: empty`);
  }
  for (const id of ['big-o-complexities', 'collections-complexity', 'patterns-at-a-glance', 'bit-tricks', 'cp-header-cpp'])
    if (!sids.has(id)) errors.push(`cheatsheets: missing ${id}`);
  return errors;
}

export const loadTools = (): ToolsContent => ({
  complexity: loadComplexity(), patterns: loadPatterns(), guide: loadGuide(), templates: loadTemplates(), cheatsheets: loadCheatsheets(),
});
