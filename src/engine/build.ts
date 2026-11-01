// Helpers for algorithms beyond the Phase 1 array ones: a frame recorder with free-form counters and view builders.
import type { ArrayView, AuxView, Frame, GraphView, GridView, Lang, ListView, TableView, Tone, TreeView } from './types';

export class Rec {
  frames: Frame[] = [];
  c: Record<string, number> = { ops: 0 };

  /** Bumps a named counter and the shared `ops` total (what Compare and Race rank by). */
  count(name: string, n = 1): void {
    this.c[name] = (this.c[name] ?? 0) + n;
    this.c.ops = (this.c.ops ?? 0) + n;
  }

  /** Frames are deep-copied on the way in, so later mutation of the algorithm's state cannot leak back. */
  add(f: Omit<Frame, 'counters'>): void {
    this.frames.push({ ...structuredClone(f), counters: { ...this.c } });
  }
}

interface ArrOpts {
  tones?: Record<number, Tone>;
  pointers?: [string, number][];
  brackets?: ArrayView['brackets'];
  style?: 'bars' | 'boxes';
  name?: string;
  labels?: Record<number, string>;
}

export const arr = (values: (number | string)[], o: ArrOpts = {}): ArrayView => ({
  kind: 'array', style: o.style ?? 'boxes', ...(o.name ? { name: o.name } : {}),
  cells: values.map((value, i) => ({ value, ...(o.tones?.[i] ? { tone: o.tones[i] } : {}), ...(o.labels?.[i] ? { label: o.labels[i] } : {}) })),
  pointers: (o.pointers ?? []).map(([name, index]) => ({ name, index })),
  ...(o.brackets ? { brackets: o.brackets } : {}),
});

export const grid = (cells: (number | string)[][], tones: Record<string, Tone> = {}, pointers: GridView['pointers'] = [], name?: string): GridView => ({
  kind: 'grid', rows: cells.length, cols: cells[0]?.length ?? 0, ...(name ? { name } : {}),
  cells: cells.map((row, r) => row.map((value, c) => ({ value, ...(tones[`${r},${c}`] ? { tone: tones[`${r},${c}`] } : {}) }))),
  pointers,
});

export const table = (
  rowLabels: string[], colLabels: string[], cells: (number | string)[][], tones: Record<string, Tone> = {},
  arrows: TableView['arrows'] = [], name?: string,
): TableView => ({
  kind: 'table', rowLabels, colLabels, ...(name ? { name } : {}),
  cells: cells.map((row, r) => row.map((value, c) => ({ value, ...(tones[`${r},${c}`] ? { tone: tones[`${r},${c}`] } : {}) }))),
  arrows,
});

/** Node ids are letters A, B, C... */
export const letter = (i: number) => String.fromCharCode(65 + i);

/** Evenly spaced on a circle that fits a 320 x 280 canvas. */
export function circle(n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
    return { x: Math.round(160 + 120 * Math.cos(a)), y: Math.round(140 + 105 * Math.sin(a)) };
  });
}

export function graph(
  n: number, edges: { from: number; to: number; weight?: number; directed?: boolean }[],
  nodeTone: (i: number) => Tone | undefined = () => undefined, edgeTone: (k: number) => Tone | undefined = () => undefined,
  notes: (i: number) => string | undefined = () => undefined, name?: string,
): GraphView {
  const pos = circle(n);
  return {
    kind: 'graph', ...(name ? { name } : {}),
    nodes: pos.map((p, i) => ({ id: letter(i), label: letter(i), x: p.x, y: p.y, ...(nodeTone(i) ? { tone: nodeTone(i) } : {}), ...(notes(i) ? { note: notes(i) } : {}) })),
    edges: edges.map((e, k) => ({
      from: letter(e.from), to: letter(e.to), ...(e.weight !== undefined ? { weight: e.weight } : {}),
      ...(e.directed ? { directed: true } : {}), ...(edgeTone(k) ? { tone: edgeTone(k) } : {}),
    })),
  };
}

/** A binary tree stored as a heap-style array (index i has children 2i+1, 2i+2; null = absent). */
export function treeFromLevels(levels: (number | null)[], tone: (i: number) => Tone | undefined = () => undefined, pointers: TreeView['pointers'] = [], name?: string): TreeView {
  const nodes: TreeView['nodes'] = [];
  levels.forEach((v, i) => {
    if (v === null || v === undefined) return;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    nodes.push({
      id: String(i), value: v,
      ...(levels[l] != null ? { left: String(l) } : {}), ...(levels[r] != null ? { right: String(r) } : {}),
      ...(tone(i) ? { tone: tone(i) } : {}),
    });
  });
  return { kind: 'tree', ...(name ? { name } : {}), root: levels[0] != null ? '0' : null, nodes, pointers };
}

export const list = (values: (number | string)[], tones: Record<number, Tone> = {}, pointers: [string, number][] = [], name?: string): ListView => ({
  kind: 'list', ...(name ? { name } : {}),
  nodes: values.map((value, i) => ({ id: String(i), value, next: i + 1 < values.length ? String(i + 1) : null, ...(tones[i] ? { tone: tones[i] } : {}) })),
  pointers: pointers.map(([name, i]) => ({ name, nodeId: String(i) })),
});

export const aux = (structure: AuxView['structure'], name: string, items: (string | number)[], highlight?: number[]): AuxView => ({
  structure, name, items, ...(highlight ? { highlight } : {}),
});

/** Marks the same line numbers for Java and C++ (the two snippets share one layout). */
export const same = (map: Record<string, number | number[]>): Record<Lang, Record<string, number | number[]>> => ({ java: map, cpp: { ...map } });

export const T = (pairs: [number | string, Tone][]): Record<number | string, Tone> => Object.fromEntries(pairs);
