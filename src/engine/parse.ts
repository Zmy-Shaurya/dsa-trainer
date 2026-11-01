// Text input parsing for the visualizers that are not a plain number list.
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
export const fail = <T>(error: string): Parsed<T> => ({ ok: false, error });
export const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });

/** Integers split on commas or spaces; checks count and range. */
export function ints(text: string, o: { min: number; max: number; len: [number, number]; what?: string }): Parsed<number[]> {
  const toks = text.replace(/[[\]]/g, ' ').split(/[\s,]+/).filter(Boolean);
  const what = o.what ?? 'numbers';
  if (toks.length < o.len[0] || toks.length > o.len[1]) return fail(`Enter ${o.len[0]} to ${o.len[1]} ${what} (got ${toks.length}).`);
  const bad = toks.find((t) => !/^-?\d+$/.test(t));
  if (bad !== undefined) return fail(`"${bad}" is not an integer.`);
  const v = toks.map(Number);
  if (v.some((n) => n < o.min || n > o.max)) return fail(`${what[0]!.toUpperCase()}${what.slice(1)} must be between ${o.min} and ${o.max}.`);
  return ok(v);
}

/** `key = value` pairs anywhere in the text, e.g. `target = 9`. */
export const pair = (text: string, key: string): string | undefined =>
  new RegExp(`${key}\\s*=\\s*([^\\s,;|]+)`, 'i').exec(text)?.[1];

export interface GraphInput {
  n: number;
  edges: { from: number; to: number; weight: number }[];
  start: number;
}

export interface GraphRules {
  directed: boolean;
  weighted: boolean;
  negative?: boolean;
  connected?: boolean;
}

export const MAX_NODES = 12;
export const MAX_EDGES = 20;

/** `A-B A-C:4 B>D start=A`. Letters A to L. In an undirected graph `>` still means an undirected edge. */
export function parseGraph(text: string, r: GraphRules): Parsed<GraphInput> {
  const edges: GraphInput['edges'] = [];
  let startLetter: string | undefined;
  for (const tok of text.split(/[\s,;]+/).filter(Boolean)) {
    const st = /^start=([A-La-l])$/.exec(tok);
    if (st) { startLetter = st[1]!.toUpperCase(); continue; }
    const m = /^([A-La-l])[->]([A-La-l])(?::(-?\d+))?$/.exec(tok);
    if (!m) return fail(`"${tok}" is not an edge. Write edges like A-B or A-B:4, with letters A to L.`);
    const [from, to] = [m[1]!.toUpperCase().charCodeAt(0) - 65, m[2]!.toUpperCase().charCodeAt(0) - 65];
    if (from === to) return fail(`"${tok}" is a self-loop; not supported here.`);
    const weight = r.weighted && m[3] !== undefined ? Number(m[3]) : 1;
    if (weight < 0 && !r.negative) return fail('This algorithm needs non-negative weights. (Break it shows what goes wrong with a negative edge.)');
    if (Math.abs(weight) > 99) return fail('Weights must be between -99 and 99.');
    edges.push({ from, to, weight });
  }
  if (edges.length === 0) return fail('Enter at least one edge, for example A-B.');
  if (edges.length > MAX_EDGES) return fail(`At most ${MAX_EDGES} edges (got ${edges.length}).`);
  const start = startLetter ? startLetter.charCodeAt(0) - 65 : 0;
  const n = Math.max(start, ...edges.flatMap((e) => [e.from, e.to])) + 1;
  if (n > MAX_NODES) return fail(`At most ${MAX_NODES} nodes (letters A to ${String.fromCharCode(64 + MAX_NODES)}).`);
  const seen = new Set<string>();
  for (const e of edges) {
    const k = r.directed ? `${e.from}>${e.to}` : `${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`;
    if (seen.has(k)) return fail(`Edge ${String.fromCharCode(65 + e.from)}-${String.fromCharCode(65 + e.to)} appears twice.`);
    seen.add(k);
  }
  if (r.connected && !isConnected(n, edges)) return fail('The graph must be connected (every node reachable). Add an edge, or use letters with no gaps.');
  return ok({ n, edges, start });
}

export function isConnected(n: number, edges: GraphInput['edges']): boolean {
  const adj = adjacency(n, edges, false);
  const used = new Set<number>(edges.flatMap((e) => [e.from, e.to]));
  const first = [...used][0];
  if (first === undefined) return true;
  const seen = new Set<number>([first]);
  const stack = [first];
  while (stack.length) for (const v of adj[stack.pop()!]!) if (!seen.has(v.to)) { seen.add(v.to); stack.push(v.to); }
  return [...used].every((u) => seen.has(u));
}

/** Neighbours sorted by node index, so every algorithm visits in the same order. */
export function adjacency(n: number, edges: GraphInput['edges'], directed: boolean): { to: number; weight: number; edge: number }[][] {
  const adj: { to: number; weight: number; edge: number }[][] = Array.from({ length: n }, () => []);
  edges.forEach((e, k) => {
    adj[e.from]!.push({ to: e.to, weight: e.weight, edge: k });
    if (!directed) adj[e.to]!.push({ to: e.from, weight: e.weight, edge: k });
  });
  for (const a of adj) a.sort((x, y) => x.to - y.to);
  return adj;
}

export function formatGraph(g: GraphInput, weighted: boolean, directed: boolean): string {
  const L = (i: number) => String.fromCharCode(65 + i);
  return `${g.edges.map((e) => `${L(e.from)}${directed ? '>' : '-'}${L(e.to)}${weighted ? `:${e.weight}` : ''}`).join(' ')} start=${L(g.start)}`;
}
