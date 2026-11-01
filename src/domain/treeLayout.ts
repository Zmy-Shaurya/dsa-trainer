// Layered DAG layout for the skill tree (PRD §14.1). Pure; no layout library.

export interface LayoutNode {
  id: string;
  track: string;
  order: number;
  prereqs: string[];
}

export interface Placed {
  id: string;
  depth: number;
  row: number;
  x: number;
  y: number;
}

export const COL_W = 200;
export const ROW_H = 84;

/** depth(node) = 1 + max(depth(prereq)); roots are 0. Prereqs outside the set are ignored. */
export function depths(nodes: LayoutNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  const go = (id: string): number => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) throw new Error(`cycle at ${id}`);
    visiting.add(id);
    const ps = (byId.get(id)?.prereqs ?? []).filter((p) => byId.has(p));
    const d = ps.length ? 1 + Math.max(...ps.map(go)) : 0;
    visiting.delete(id);
    memo.set(id, d);
    return d;
  };
  nodes.forEach((n) => go(n.id));
  return memo;
}

/**
 * Within a layer: start from (track order, `order`), then sweep by barycenter of the parents'
 * rows to reduce crossings. Ties keep the starting order, so output is deterministic.
 */
export function layout(nodes: LayoutNode[], trackOrder: string[]): Placed[] {
  const d = depths(nodes);
  const layers: LayoutNode[][] = [];
  for (const n of nodes) (layers[d.get(n.id)!] ??= []).push(n);
  const tr = (t: string) => {
    const i = trackOrder.indexOf(t);
    return i < 0 ? trackOrder.length : i;
  };
  const row = new Map<string, number>();
  layers.forEach((layer, li) => {
    layers[li] = layer.sort((a, b) => tr(a.track) - tr(b.track) || a.order - b.order || a.id.localeCompare(b.id));
  });
  layers.forEach((layer, li) => {
    const start = new Map(layer.map((n, i) => [n.id, i]));
    if (li > 0) {
      const bary = (n: LayoutNode) => {
        const ps = n.prereqs.filter((p) => row.has(p));
        return ps.length ? ps.reduce((a, p) => a + row.get(p)!, 0) / ps.length : start.get(n.id)!;
      };
      layer.sort((a, b) => bary(a) - bary(b) || start.get(a.id)! - start.get(b.id)!);
    }
    layer.forEach((n, i) => row.set(n.id, i));
  });
  return layers.flatMap((layer, li) =>
    layer.map((n, i) => ({ id: n.id, depth: li, row: i, x: li * COL_W, y: i * ROW_H })),
  );
}
