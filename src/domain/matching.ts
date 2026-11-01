// Pure matcher for manual LeetCode sync (PRD §14.7). No React, no Dexie.

export interface Candidate {
  id: string;
  title: string;
  lcNumber?: number;
}

export type MatchResult =
  | { status: 'matched'; id: string }
  | { status: 'fuzzy'; id: string; score: number }
  | { status: 'unmatched' };

export interface BulkRow {
  raw: string;
  /** What the matcher should look at (url, slug, "12. Title" or plain title). */
  query: string;
  number?: number;
  solvedAt?: string;
  confidence?: string;
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Strips list numbering and trailing difficulty tags; returns the title text and any leading number. */
export function normalize(raw: string): { text: string; number?: number } {
  let text = raw.trim();
  let number: number | undefined;
  const lead = /^#?(\d+)(?:\s*[.):-]\s*|\s+)(?=\S)/.exec(text);
  if (lead) {
    number = Number(lead[1]);
    text = text.slice(lead[0].length);
  }
  text = text.replace(/\s*[([]\s*(easy|medium|hard)\s*[)\]]\s*$/i, '');
  text = text.replace(/\s+/g, ' ').trim();
  return number === undefined ? { text } : { text, number };
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

export function jaccard(a: string, b: string): number {
  const A = new Set(a.split('-').filter(Boolean));
  const B = new Set(b.split('-').filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export class Matcher {
  private byId = new Map<string, Candidate>();
  private byNumber = new Map<number, Candidate>();
  private ids: string[];

  constructor(candidates: Candidate[]) {
    for (const c of candidates) {
      this.byId.set(c.id, c);
      if (c.lcNumber) this.byNumber.set(c.lcNumber, c);
    }
    this.ids = [...this.byId.keys()];
  }

  match(raw: string, hintNumber?: number): MatchResult {
    const query = raw.trim();
    // 1-2. URL -> slug, exact id.
    const url = /problems\/([a-z0-9-]+)/i.exec(query);
    if (url) {
      const id = url[1]!.toLowerCase();
      return this.byId.has(id) ? { status: 'matched', id } : this.fuzzy(id);
    }
    const { text, number: leading } = normalize(query);
    // 3. leading number (or a number column) -> lcNumber.
    const num = leading ?? hintNumber;
    if (num !== undefined) {
      const hit = this.byNumber.get(num);
      if (hit) return { status: 'matched', id: hit.id };
    }
    // 4. slugified title -> exact id.
    const slug = slugify(text);
    if (!slug) return { status: 'unmatched' };
    if (this.byId.has(slug)) return { status: 'matched', id: slug };
    return this.fuzzy(slug);
  }

  /** 5. Fuzzy: token-set Jaccard >= 0.85, or Levenshtein <= 2 on slugs of length >= 8. */
  private fuzzy(slug: string): MatchResult {
    let best: { id: string; score: number } | undefined;
    for (const id of this.ids) {
      const s = id.includes(':') ? id.split(':')[1]! : id;
      let score = 0;
      const j = jaccard(slug, s);
      if (j >= 0.85) score = j;
      else if (slug.length >= 8 && s.length >= 8) {
        const d = levenshtein(slug, s);
        if (d <= 2) score = 1 - d / Math.max(slug.length, s.length);
      }
      if (score > 0 && (!best || score > best.score)) best = { id, score };
    }
    return best ? { status: 'fuzzy', ...best } : { status: 'unmatched' };
  }
}

// ---------- parsing pasted text / CSV ----------
const SOLVED = /^(solved|accepted|ac|done|✓|yes|true|1)$/i;

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const COLS = {
  title: /^(title|name|problem)$/i,
  slug: /^(slug|url|link)$/i,
  number: /^(number|id|#)$/i,
  status: /^status$/i,
  date: /^(date|solved_at)$/i,
  confidence: /^confidence$/i,
};

/** One row per non-empty line; a CSV header (any recognised column) switches to column mode. */
export function parseBulk(text: string): BulkRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = splitCsv(lines[0]!);
  const idx = Object.fromEntries(
    Object.entries(COLS).map(([k, re]) => [k, header.findIndex((h) => re.test(h))]),
  ) as Record<keyof typeof COLS, number>;
  const isCsv = header.length > 1 && Object.values(idx).some((i) => i >= 0);
  if (!isCsv) return lines.map((l) => ({ raw: l, query: l }));

  const rows: BulkRow[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCsv(line);
    const at = (k: keyof typeof COLS) => (idx[k] >= 0 ? (c[idx[k]] ?? '') : '');
    if (idx.status >= 0 && !SOLVED.test(at('status'))) continue;   // only solved-like rows import
    const num = Number(at('number'));
    const query = at('slug') || at('title');
    if (!query && !num) continue;
    rows.push({
      raw: line,
      query: query || String(num),
      ...(Number.isInteger(num) && num > 0 ? { number: num } : {}),
      ...(at('date') ? { solvedAt: at('date') } : {}),
      ...(at('confidence') ? { confidence: at('confidence') } : {}),
    });
  }
  return rows;
}
