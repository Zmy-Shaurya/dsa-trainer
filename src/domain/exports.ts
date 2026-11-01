// Human-readable exports (PRD 10.1): progress CSV, Anki TSV, Markdown notes zip. Pure, no DOM.
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { toView } from './cardView';
import type { Row } from './merge';

const csvCell = (v: unknown) => {
  const s = Array.isArray(v) ? v.join(';') : String(v ?? '');
  // a leading = + - @ would run as a formula in a spreadsheet
  const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const CSV_HEADER = ['problemId', 'title', 'status', 'confidence', 'solveMode', 'firstSolvedAt', 'lastAttemptAt', 'attempts', 'totalTimeSec', 'mistakeTags'];

export function progressCsv(progress: Row[], titleOf: (id: string) => string): string {
  const rows = progress.map((p) => [
    p.problemId, titleOf(String(p.problemId)), p.status, p.confidence, p.solveMode, p.firstSolvedAt, p.lastAttemptAt,
    p.attempts, p.totalTimeSec, p.mistakeTags,
  ].map(csvCell).join(','));
  return [CSV_HEADER.join(','), ...rows].join('\r\n') + '\r\n';
}

const tsvCell = (s: string) => s.replace(/[\t\r\n]+/g, ' ').trim();

/** Authored cards come from content (`authored`), generated and user cards carry their own text. Cloze stays in Anki's `{{c1::x}}` form. */
export function ankiTsv(cards: Row[], authored: ReadonlyMap<string, Row>): string {
  const out: string[] = [];
  for (const c of cards) {
    const src = c.source === 'authored' ? authored.get(String(c.id)) : c;
    if (!src) continue;
    const v = toView(src as never);
    if (!v) continue;
    const front = v.type === 'cloze' ? String(src.text ?? src.clozeText) : v.question;
    const back = v.type === 'cloze' ? '' : v.answer;
    const tags = [c.conceptId, c.problemId, c.source].filter(Boolean).map((t) => String(t).replace(/[\s:]+/g, '_')).join(' ');
    out.push([front, back, tags].map((s) => tsvCell(String(s))).join('\t'));
  }
  return out.join('\n') + '\n';
}

const folder = { problem: 'problems', concept: 'concepts', free: 'free' } as const;
const safe = (s: string) => s.replace(/[^\w.-]+/g, '_');
const q = (v: unknown) => JSON.stringify(v ?? '');

/** `notes/<problems|concepts|free>/<id>.md` with front matter; every value is a JSON string so it round-trips. */
export function notesFiles(notes: Row[]): Record<string, string> {
  const files: Record<string, string> = {};
  for (const n of notes) {
    const scope = String(n.scope) as keyof typeof folder;
    const dir = folder[scope] ?? 'free';
    const head = ['---', `id: ${q(n.id)}`, `scope: ${q(n.scope)}`, `refId: ${q(n.refId)}`, `createdAt: ${q(n.createdAt)}`, `updatedAt: ${q(n.updatedAt)}`, '---', ''];
    files[`notes/${dir}/${safe(String(n.id))}.md`] = head.join('\n') + String(n.body ?? '') + '\n';
  }
  return files;
}

export const notesZip = (notes: Row[]): Uint8Array =>
  zipSync(Object.fromEntries(Object.entries(notesFiles(notes)).map(([k, v]) => [k, strToU8(v)])));

/** Reads a notes zip back. Files without valid front matter are reported, not guessed at. */
export function parseNotesZip(zip: Uint8Array): { notes: Row[]; skipped: string[] } {
  const notes: Row[] = [];
  const skipped: string[] = [];
  for (const [path, bytes] of Object.entries(unzipSync(zip))) {
    if (!path.endsWith('.md') || !path.startsWith('notes/')) continue;
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(strFromU8(bytes));
    if (!m) { skipped.push(path); continue; }
    const meta: Record<string, string> = {};
    try {
      for (const line of m[1]!.split(/\r?\n/)) {
        const i = line.indexOf(': ');
        if (i > 0) meta[line.slice(0, i)] = JSON.parse(line.slice(i + 2)) as string;
      }
    } catch { skipped.push(path); continue; }
    if (!meta.id || !meta.scope || !meta.updatedAt) { skipped.push(path); continue; }
    notes.push({
      id: meta.id, scope: meta.scope, refId: meta.refId ?? '', body: m[2]!.replace(/\r?\n$/, ''),
      createdAt: meta.createdAt || meta.updatedAt, updatedAt: meta.updatedAt,
    });
  }
  return { notes, skipped };
}
