// Company lists (PRD 19): tolerant CSV parsing and the company -> window -> [{problemId, freq}] mapping.
// Shared by `npm run company:import` and the in-app import, so no DOM types here.
import { COMPANY_WINDOWS, type CompanyData, type CompanyWindow } from '../content/types';

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Maps phrases such as "3 months", "Thirty Days" or "More than six months" to a window. */
export function windowOf(name: string): CompanyWindow | undefined {
  const n = name.toLowerCase().replace(/\.[a-z0-9]{1,4}$/, '').replace(/[_.-]+/g, ' ');
  if (/more than|\bover\b|\b6 ?m ?\+|\b6 ?\+|older/.test(n)) return '6m+';
  if (/\b(30|thirty) ?days?\b|\b30 ?d\b|\b(1|one) ?months?\b/.test(n)) return '30d';
  if (/\b(3|three) ?months?\b|\b3 ?m\b/.test(n)) return '3m';
  if (/\b(6|six) ?months?\b|\b6 ?m\b/.test(n)) return '6m';
  if (/\ball\b/.test(n)) return 'all';
  return undefined;
}

/** RFC 4180-ish: quoted cells, doubled quotes, CRLF, a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

type Diff = 'easy' | 'medium' | 'hard';
export interface CsvRow {
  problemId: string;
  title: string;
  difficulty?: Diff;
  freq: number | null;
}

const HEAD: Record<string, 'id' | 'title' | 'url' | 'difficulty' | 'freq'> = {
  id: 'id', '#': 'id', title: 'title', name: 'title', problem: 'title', url: 'url', link: 'url',
  difficulty: 'difficulty', frequency: 'freq', occurrence: 'freq', occurrences: 'freq', freq: 'freq',
};

/** One CSV file. Rows with no slug in the URL and no known title are counted in `skipped`, never guessed. */
export function parseCompanyCsv(text: string, titleToId: ReadonlyMap<string, string> = new Map()): { rows: CsvRow[]; skipped: number } {
  const [head, ...body] = parseCsv(text);
  if (!head) return { rows: [], skipped: 0 };
  const col: Partial<Record<'id' | 'title' | 'url' | 'difficulty' | 'freq', number>> = {};
  head.forEach((h, i) => {
    const k = HEAD[h.toLowerCase().replace(/[%()]/g, '').trim()];
    if (k && col[k] === undefined) col[k] = i;
  });
  if (col.title === undefined && col.url === undefined) return { rows: [], skipped: body.length };
  const rows: CsvRow[] = [];
  let skipped = 0;
  for (const r of body) {
    const title = (col.title !== undefined ? r[col.title] : '')?.trim() ?? '';
    const url = (col.url !== undefined ? r[col.url] : '') ?? '';
    const problemId = /problems\/([a-z0-9-]+)/i.exec(url)?.[1]?.toLowerCase() ?? titleToId.get(title.toLowerCase());
    if (!problemId) { skipped++; continue; }
    const d = (col.difficulty !== undefined ? r[col.difficulty] : '')?.trim().toLowerCase();
    const f = col.freq !== undefined ? Number.parseFloat((r[col.freq] ?? '').replace('%', '')) : Number.NaN;
    rows.push({
      problemId, title: title || problemId,
      ...(d === 'easy' || d === 'medium' || d === 'hard' ? { difficulty: d } : {}),
      freq: Number.isFinite(f) ? f : null,
    });
  }
  return { rows, skipped };
}

export interface SourceFile {
  /** folder/File.csv style path, forward slashes */
  path: string;
  text: string;
}

/** Company folder and window for a path. The company is the nearest folder that is not itself a window name. */
export function locate(path: string): { company: string; window?: CompanyWindow } {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
  const file = parts.pop() ?? '';
  const window = windowOf(file) ?? parts.map(windowOf).reverse().find(Boolean);
  const dir = [...parts].reverse().find((p) => !windowOf(p));
  if (dir) return { company: dir, ...(window ? { window } : {}) };
  const stem = file.replace(/\.[a-z0-9]{1,4}$/i, '').replace(/[\s_.-]*(?:(?:more than |30 |thirty |3 |three |6 |six |1 |one )?(?:days?|months?)|all|\d+ ?[md]\+?)(?![a-z]).*$/i, '').replace(/[\s_.-]*\d+$/, '').trim();
  return { company: stem || 'imported', ...(window ? { window } : {}) };
}

export interface BuildReport {
  companies: CompanyData[];
  /** rows dropped because the file gave no problem slug */
  skippedRows: number;
  /** files that were not a recognised CSV or had no time window in their name */
  ignored: string[];
}

export function buildCompanies(
  files: SourceFile[],
  o: { isKnown: (id: string) => boolean; titleToId?: ReadonlyMap<string, string>; asOf: string; source: CompanyData['source'] },
): BuildReport {
  type Acc = { name: string; windows: Map<CompanyWindow, Map<string, number | null>>; extra: NonNullable<CompanyData['extra']> };
  const by = new Map<string, Acc>();
  const ignored: string[] = [];
  let skippedRows = 0;
  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const { company, window } = locate(f.path);
    if (!/\.csv$/i.test(f.path) || !window) { ignored.push(f.path); continue; }
    const id = slugify(company);
    if (!id) { ignored.push(f.path); continue; }
    const c: Acc = by.get(id) ?? { name: company.replace(/[_]+/g, ' ').trim(), windows: new Map(), extra: {} };
    by.set(id, c);
    const { rows, skipped } = parseCompanyCsv(f.text, o.titleToId);
    skippedRows += skipped;
    const w = c.windows.get(window) ?? new Map<string, number | null>();
    c.windows.set(window, w);
    for (const r of rows) {
      const prev = w.get(r.problemId);
      if (prev === undefined || (r.freq ?? -1) > (prev ?? -1)) w.set(r.problemId, r.freq);
      if (!o.isKnown(r.problemId)) c.extra[r.problemId] ??= { title: r.title, difficulty: r.difficulty ?? 'medium' };
    }
  }
  const companies = [...by].map(([id, c]): CompanyData => {
    const windows: CompanyData['windows'] = {};
    for (const win of COMPANY_WINDOWS) {
      const m = c.windows.get(win);
      if (m) windows[win] = [...m].map(([problemId, freq]) => ({ problemId, freq })).sort((a, b) => (b.freq ?? -1) - (a.freq ?? -1) || a.problemId.localeCompare(b.problemId));
    }
    const used = new Set(Object.values(windows).flatMap((l) => l!.map((e) => e.problemId)));
    const extra: NonNullable<CompanyData['extra']> = Object.fromEntries(Object.entries(c.extra).filter(([k]) => used.has(k)));
    return { id, name: c.name, asOf: o.asOf, source: o.source, windows, ...(Object.keys(extra).length ? { extra } : {}) };
  }).filter((c) => Object.keys(c.windows).length > 0).sort((a, b) => a.id.localeCompare(b.id));
  return { companies, skippedRows, ignored };
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Shape check for CompanyData read from a file; returns readable problems, empty when fine. */
export function validateCompany(c: unknown): string[] {
  const d = c as Partial<CompanyData> | null;
  if (!d || typeof d !== 'object') return ['not an object'];
  const e: string[] = [];
  if (typeof d.id !== 'string' || !KEBAB.test(d.id)) e.push('id must be kebab-case');
  if (typeof d.name !== 'string' || !d.name.trim()) e.push('name is missing');
  if (typeof d.asOf !== 'string') e.push('asOf is missing');
  if (!d.source || typeof d.source.repo !== 'string' || typeof d.source.license !== 'string') e.push('source needs repo and license');
  if (!d.windows || typeof d.windows !== 'object') return [...e, 'windows is missing'];
  for (const [w, list] of Object.entries(d.windows)) {
    if (!COMPANY_WINDOWS.includes(w as CompanyWindow)) { e.push(`unknown window ${w}`); continue; }
    if (!Array.isArray(list)) { e.push(`window ${w} is not a list`); continue; }
    for (const x of list as { problemId?: unknown; freq?: unknown }[])
      if (typeof x?.problemId !== 'string' || !(x.freq === null || typeof x.freq === 'number')) { e.push(`window ${w} has a bad entry`); break; }
  }
  if (Object.keys(d.windows).length === 0) e.push('no windows');
  return e;
}

/** Counts per window for the index file and the grid. */
export const countsOf = (c: CompanyData): Partial<Record<CompanyWindow, number>> =>
  Object.fromEntries(COMPANY_WINDOWS.filter((w) => c.windows[w]).map((w) => [w, c.windows[w]!.length]));

/** The 6-month window when a company has it, otherwise its first one. */
export const defaultWindow = (have: readonly CompanyWindow[]): CompanyWindow | undefined =>
  have.includes('6m') ? '6m' : COMPANY_WINDOWS.find((w) => have.includes(w));
