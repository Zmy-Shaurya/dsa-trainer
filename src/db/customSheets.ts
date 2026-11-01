import { Matcher, type Candidate } from '../domain/matching';
import { db as defaultDb, type StudioDB } from './schema';

export interface CustomSheet {
  id: string;
  name: string;
  sections: { title: string; problems: string[] }[];
  createdAt: string;
  updatedAt: string;
}

const get = (db: StudioDB, id: string) => db.customSheets.get(id) as Promise<CustomSheet | undefined>;

export async function createSheet(name: string, db: StudioDB = defaultDb, now = new Date()): Promise<CustomSheet> {
  const sheet: CustomSheet = {
    id: `u:${crypto.randomUUID()}`, name: name.trim() || 'Untitled', sections: [{ title: 'Problems', problems: [] }],
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
  await db.customSheets.put(sheet as never);
  return sheet;
}

export async function renameSheet(id: string, name: string, db: StudioDB = defaultDb, now = new Date()) {
  const s = await get(db, id);
  if (s) await db.customSheets.put({ ...s, name: name.trim() || s.name, updatedAt: now.toISOString() } as never);
}

export const deleteSheet = (id: string, db: StudioDB = defaultDb) => db.customSheets.delete(id);

/** Adds problem ids to a section (created if missing); ids already in the sheet are skipped. */
export async function addProblems(
  id: string, problemIds: string[], section = 'Problems', db: StudioDB = defaultDb, now = new Date(),
): Promise<number> {
  const s = await get(db, id);
  if (!s) return 0;
  const have = new Set(s.sections.flatMap((x) => x.problems));
  const fresh = [...new Set(problemIds)].filter((p) => !have.has(p));
  if (fresh.length === 0) return 0;
  const sections = s.sections.map((x) => ({ ...x, problems: [...x.problems] }));
  let sec = sections.find((x) => x.title === section);
  if (!sec) sections.push((sec = { title: section, problems: [] }));
  sec.problems.push(...fresh);
  await db.customSheets.put({ ...s, sections, updatedAt: now.toISOString() } as never);
  return fresh.length;
}

export async function removeProblem(id: string, problemId: string, db: StudioDB = defaultDb, now = new Date()) {
  const s = await get(db, id);
  if (!s) return;
  const sections = s.sections.map((x) => ({ ...x, problems: x.problems.filter((p) => p !== problemId) }));
  await db.customSheets.put({ ...s, sections, updatedAt: now.toISOString() } as never);
}

/** Moves a problem one place up or down inside its section. */
export async function moveProblem(id: string, problemId: string, dir: -1 | 1, db: StudioDB = defaultDb, now = new Date()) {
  const s = await get(db, id);
  if (!s) return;
  const sections = s.sections.map((x) => {
    const i = x.problems.indexOf(problemId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= x.problems.length) return x;
    const problems = [...x.problems];
    [problems[i], problems[j]] = [problems[j]!, problems[i]!];
    return { ...x, problems };
  });
  await db.customSheets.put({ ...s, sections, updatedAt: now.toISOString() } as never);
}

export const exportSheetJson = (s: CustomSheet) => JSON.stringify(s, null, 2);

/** Accepts Sheet JSON or CSV `section,problem` (problem = slug, URL or title, resolved with the matcher). */
export function parseSheetImport(
  text: string, name: string, candidates: Candidate[],
): { sheet: Omit<CustomSheet, 'id' | 'createdAt' | 'updatedAt'>; unmatched: string[] } {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    const j = JSON.parse(trimmed) as { name?: string; sections?: { title: string; problems: string[] }[] };
    if (!Array.isArray(j.sections)) throw new Error('Sheet JSON needs a "sections" list.');
    return { sheet: { name: j.name || name, sections: j.sections }, unmatched: [] };
  }
  const matcher = new Matcher(candidates);
  const sections = new Map<string, string[]>();
  const unmatched: string[] = [];
  for (const raw of trimmed.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^section\s*,\s*problem/i.test(line)) continue;
    const comma = line.indexOf(',');
    const section = comma > 0 ? line.slice(0, comma).trim() : 'Problems';
    const query = (comma > 0 ? line.slice(comma + 1) : line).trim().replace(/^"|"$/g, '');
    const r = matcher.match(query);
    if (r.status === 'unmatched') {
      unmatched.push(query);
      continue;
    }
    sections.set(section, [...(sections.get(section) ?? []), r.id]);
  }
  return { sheet: { name, sections: [...sections].map(([title, problems]) => ({ title, problems })) }, unmatched };
}

export async function importSheet(
  text: string, name: string, candidates: Candidate[], db: StudioDB = defaultDb, now = new Date(),
): Promise<{ sheet: CustomSheet; unmatched: string[] }> {
  const { sheet, unmatched } = parseSheetImport(text, name, candidates);
  const full: CustomSheet = {
    ...sheet, id: `u:${crypto.randomUUID()}`, createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
  await db.customSheets.put(full as never);
  return { sheet: full, unmatched };
}
