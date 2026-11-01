// Friend compare (PRD 10.7): read-only; friend data never merges into your own.
import type { Row } from './merge';

export interface FriendSnapshot {
  id: string;
  name: string;
  importedAt: string;
  /** problem ids the friend has solved / attempted (all that compare needs) */
  solved: string[];
  attempted: string[];
}

/** Reads a minimal snapshot or a full backup envelope; only progress is used. */
export function parseSnapshot(input: unknown, now = new Date()): FriendSnapshot | string {
  const o = input as Record<string, unknown> | null;
  if (typeof o !== 'object' || o === null || o.app !== 'dsa-studio') return 'Not a DSA Studio file.';
  const prog = (o.kind === 'progress-snapshot' ? o.progress : (o.data as Record<string, unknown> | undefined)?.progress) as Row[] | undefined;
  if (!Array.isArray(prog)) return 'No progress found in this file.';
  const name = String(o.name ?? '').trim() || 'Friend';
  const of = (s: string) => prog.filter((p) => p.status === s).map((p) => String(p.problemId));
  return {
    id: `${name}:${String(o.exportedAt ?? now.toISOString())}`, name, importedAt: now.toISOString(),
    solved: of('solved'), attempted: of('attempted'),
  };
}

export const makeSnapshot = (name: string, progress: Row[], now = new Date()) => ({
  app: 'dsa-studio', kind: 'progress-snapshot', name, exportedAt: now.toISOString(),
  progress: progress.map((p) => ({ problemId: p.problemId, status: p.status })),
});

export interface Compare {
  you: string[];
  friend: string[];
  both: string[];
}

export function compare(mine: ReadonlySet<string>, theirs: ReadonlySet<string>, scope?: readonly string[]): Compare {
  const ids = scope ? new Set(scope) : undefined;
  const inScope = (id: string) => !ids || ids.has(id);
  const you = [...mine].filter((id) => inScope(id) && !theirs.has(id)).sort();
  const friend = [...theirs].filter((id) => inScope(id) && !mine.has(id)).sort();
  const both = [...mine].filter((id) => inScope(id) && theirs.has(id)).sort();
  return { you, friend, both };
}
