import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { CardsFile, Concept, ProblemMeta, Sheet } from '../src/content/types.ts';

export const ROOT = join(import.meta.dirname, '..', 'content');

/** Folder name for a problem id (Windows forbids ':' in names). */
export const folderOf = (id: string) => id.replace(':', '__');

const readYaml = <T>(p: string) => parse(readFileSync(p, 'utf8')) as T;

export function loadConcepts(): Concept[] {
  const dir = join(ROOT, 'concepts');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.yaml')).map((f) => readYaml<Concept>(join(dir, f)));
}

export interface LoadedProblem {
  meta: ProblemMeta;
  dir: string;
  folder: string;
}

export function loadProblems(): LoadedProblem[] {
  const base = join(ROOT, 'problems');
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(base, e.name, 'meta.yaml')))
    .map((e) => ({ meta: readYaml<ProblemMeta>(join(base, e.name, 'meta.yaml')), dir: join(base, e.name), folder: e.name }));
}

export function loadSheets(): Sheet[] {
  const dir = join(ROOT, 'sheets');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.yaml')).map((f) => readYaml<Sheet>(join(dir, f)));
}

export function loadCards(): CardsFile[] {
  const dir = join(ROOT, 'cards');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.yaml')).map((f) => readYaml<CardsFile>(join(dir, f)));
}

const CARD_TYPES = ['basic', 'cloze', 'code', 'complexity', 'trap'];

/** PRD §8.13 card rules plus "at least 6 authored cards per concept" (§22 Phase 4). */
export function validateCards(concepts: Concept[], files: CardsFile[]): string[] {
  const errors: string[] = [];
  const known = new Set(concepts.map((c) => c.id));
  const seen = new Set<string>();
  for (const f of files) {
    if (!known.has(f.concept)) errors.push(`cards ${f.concept}: unknown concept`);
    if (seen.has(f.concept)) errors.push(`cards ${f.concept}: duplicate file`);
    seen.add(f.concept);
    const ids = new Set<number>();
    for (const c of f.cards ?? []) {
      const w = `cards ${f.concept}#${c.id}`;
      if (!Number.isInteger(c.id) || ids.has(c.id)) errors.push(`${w}: id must be a unique integer`);
      ids.add(c.id);
      if (!CARD_TYPES.includes(c.type)) { errors.push(`${w}: bad type ${c.type}`); continue; }
      const need = (k: string, v: unknown) => { if (typeof v !== 'string' || !v.trim()) errors.push(`${w}: ${c.type} needs ${k}`); };
      if (c.type === 'basic') { need('front', c.front); need('back', c.back); }
      if (c.type === 'cloze') {
        need('text', c.text);
        const holes = (c.text ?? '').split('{{c').length - 1;
        if (holes !== 1 || !/[{][{]c1::[^}]+[}][}]/.test(c.text ?? '')) errors.push(`${w}: cloze needs exactly one {{c1::...}}`);
      }
      if (c.type === 'complexity') { need('prompt', c.prompt); need('answer', c.answer); }
      if (c.type === 'code' || c.type === 'trap') {
        need('prompt', c.prompt); need('answer', c.answer); need('code.java', c.code?.java); need('code.cpp', c.code?.cpp);
        if (c.type === 'code' && !(c.code?.java.includes('____') && c.code?.cpp.includes('____'))) errors.push(`${w}: code card needs ____ in both languages`);
      }
    }
  }
  for (const c of concepts) {
    const n = files.find((f) => f.concept === c.id)?.cards.length ?? 0;
    if (n < 6) errors.push(`concept ${c.id}: needs at least 6 authored cards (has ${n})`);
  }
  return errors;
}

export function loadAliases(): Record<string, string> {
  const p = join(ROOT, 'aliases.yaml');
  return existsSync(p) ? (readYaml<Record<string, string>>(p) ?? {}) : {};
}

export const PATTERNS = [
  'two-pointers', 'fast-slow-pointers', 'sliding-window', 'prefix-sum', 'hashing-complement', 'frequency-map',
  'binary-search', 'binary-search-on-answer', 'monotonic-stack', 'monotonic-deque', 'merge-intervals',
  'linked-list-reversal', 'tree-dfs', 'tree-bfs', 'bst-property', 'top-k-heap', 'two-heaps', 'k-way-merge',
  'topological-sort', 'union-find', 'graph-bfs-shortest', 'graph-dfs-components', 'flood-fill', 'dijkstra',
  'backtracking-subsets', 'backtracking-permutations', 'backtracking-combinations', 'dp-1d', 'dp-grid',
  'dp-knapsack', 'dp-lcs', 'dp-lis', 'greedy', 'bit-manipulation', 'trie', 'matrix-traversal',
  'divide-and-conquer', 'design-data-structure', 'math-number-theory',
];

const LINK_ALLOW = [
  'leetcode.com', 'geeksforgeeks.org', 'codeforces.com', 'cses.fi', 'naukri.com', 'hackerrank.com',
  'youtube.com', 'cp-algorithms.com', 'github.com', 'neetcode.io',
];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ID = /^([a-z]+:)?[a-z0-9]+(-[a-z0-9]+)*$/;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const lines = (s: string) => s.split('\n').filter((l) => l.trim()).length;
const STATEMENT = /^(given |you are given|return the |write a function)/i;

export interface Report {
  errors: string[];
  warnings: string[];
}

export function validate(
  concepts: Concept[],
  problems: LoadedProblem[],
  sheets: Sheet[],
  { strictConceptRefs = false }: { strictConceptRefs?: boolean } = {},
): Report {
  const errors: string[] = [];
  const warnings: string[] = [];
  const max = (where: string, s: string | undefined, n: number) => {
    if (s !== undefined && s.length > n) errors.push(`${where}: ${s.length} chars > ${n}`);
  };

  const conceptIds = new Set<string>();
  for (const c of concepts) {
    const w = `concept ${c.id}`;
    if (!KEBAB.test(c.id)) errors.push(`${w}: id must be kebab-case`);
    if (conceptIds.has(c.id)) errors.push(`${w}: duplicate id`);
    conceptIds.add(c.id);
    max(`${w}.card.idea`, c.card.idea, 140);
    if (c.card.useWhen.length < 3 || c.card.useWhen.length > 5) errors.push(`${w}: useWhen needs 3-5 items`);
    c.card.useWhen.forEach((u) => max(`${w}.useWhen`, u, 80));
    if (c.card.pitfalls.length !== 3) errors.push(`${w}: pitfalls must have exactly 3 items`);
    c.card.pitfalls.forEach((p) => max(`${w}.pitfalls`, p, 100));
    for (const l of ['java', 'cpp'] as const)
      if (lines(c.card.template[l]) > 15) errors.push(`${w}: ${l} template > 15 lines`);
    if (c.card.deepDive && words(c.card.deepDive) > 400) errors.push(`${w}: deepDive > 400 words`);
  }
  for (const c of concepts)
    for (const p of c.prereqs) if (!conceptIds.has(p)) errors.push(`concept ${c.id}: unknown prereq ${p}`);

  const ids = new Set<string>();
  for (const { meta: p, dir, folder } of problems) {
    const w = `problem ${p.id}`;
    if (!ID.test(p.id)) errors.push(`${w}: bad id`);
    if (folder !== folderOf(p.id)) errors.push(`${w}: folder "${folder}" must match id`);
    if (ids.has(p.id)) errors.push(`${w}: duplicate id`);
    ids.add(p.id);
    max(`${w}.insight`, p.insight, 160);
    if (STATEMENT.test(p.insight)) warnings.push(`${w}: insight looks like a problem statement`);
    if (p.tells.length < 2 || p.tells.length > 4) errors.push(`${w}: tells needs 2-4 items`);
    p.tells.forEach((t) => max(`${w}.tells`, t, 70));
    if (p.hints) {
      if (p.hints.length > 3) errors.push(`${w}: > 3 hints`);
      p.hints.forEach((h) => max(`${w}.hints`, h, 120));
    }
    for (const g of ['java', 'cpp', 'both'] as const) {
      const t = p.traps?.[g] ?? [];
      if (t.length > 3) errors.push(`${w}: traps.${g} has > 3 items`);
      t.forEach((x) => max(`${w}.traps.${g}`, x, 100));
    }
    try {
      const u = new URL(p.url);
      if (u.protocol !== 'https:') errors.push(`${w}: url must be https`);
      else if (!LINK_ALLOW.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`)))
        errors.push(`${w}: domain ${u.hostname} not on the allowlist`);
    } catch {
      errors.push(`${w}: invalid url`);
    }
    for (const x of p.patterns) if (!PATTERNS.includes(x)) errors.push(`${w}: unknown pattern ${x}`);
    for (const c of p.concepts)
      if (!conceptIds.has(c)) (strictConceptRefs ? errors : warnings).push(`${w}: unknown concept ${c}`);
    if (p.concepts.length === 0) errors.push(`${w}: needs at least one concept`);

    const notes = join(dir, 'notes.md');
    if (existsSync(notes) && words(readFileSync(notes, 'utf8')) > 300) errors.push(`${w}: notes.md > 300 words`);

    if (p.tier <= 2) {
      if (!p.signature) errors.push(`${w}: tier ${p.tier} needs a signature`);
      const ap = p.approaches ?? [];
      const need = p.tier === 1 ? [2, 4] : [2, 3];
      if (ap.length < need[0]! || ap.length > need[1]!) errors.push(`${w}: needs ${need[0]}-${need[1]} approaches (has ${ap.length})`);
      if (ap.filter((a) => a.isOptimal).length !== 1) errors.push(`${w}: exactly one approach must be isOptimal`);
      if (p.tier === 1 && (!p.hints || p.hints.length === 0)) errors.push(`${w}: tier 1 needs hints`);
      for (const a of ap) {
        const aw = `${w} approach ${a.id}`;
        max(`${aw}.idea`, a.idea, 200);
        max(`${aw}.unlock`, a.unlock, 140);
        max(`${aw}.preferWhen`, a.preferWhen, 120);
        for (const l of ['java', 'cpp'] as const) {
          const f = a.files?.[l];
          if (!f || !existsSync(join(dir, f))) errors.push(`${aw}: missing ${l} file ${f ?? ''}`);
        }
      }
      const tests = join(dir, 'tests.json');
      if (!existsSync(tests)) errors.push(`${w}: missing tests.json`);
      else {
        const cases = (JSON.parse(readFileSync(tests, 'utf8')) as { cases: unknown[] }).cases ?? [];
        if (cases.length < 5) errors.push(`${w}: tests.json needs >= 5 cases (has ${cases.length})`);
      }
    }
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === 'string' && v.length > 400) errors.push(`${w}.${k}: prose over 400 chars`);
    }
  }

  for (const c of concepts)
    for (const p of c.coreProblems) if (!ids.has(p)) warnings.push(`concept ${c.id}: core problem ${p} has no authored folder (stub)`);

  const sheetIds = new Set<string>();
  for (const s of sheets) {
    if (!KEBAB.test(s.id)) errors.push(`sheet ${s.id}: id must be kebab-case`);
    if (sheetIds.has(s.id)) errors.push(`sheet ${s.id}: duplicate id`);
    sheetIds.add(s.id);
    const seen = new Set<string>();
    for (const sec of s.sections)
      for (const p of sec.problems) {
        if (seen.has(p)) errors.push(`sheet ${s.id}: duplicate problem ${p}`);
        seen.add(p);
      }
  }

  const byId = new Map(concepts.map((c) => [c.id, c]));
  const state = new Map<string, 1 | 2>();
  const visit = (id: string): boolean => {
    if (state.get(id) === 2) return false;
    if (state.get(id) === 1) return true;
    state.set(id, 1);
    const cyc = (byId.get(id)?.prereqs ?? []).some(visit);
    state.set(id, 2);
    return cyc;
  };
  if (concepts.some((c) => visit(c.id))) errors.push('concept prereq graph has a cycle');
  return { errors, warnings };
}
