// Phase 9: graph and grid visualizers. Drive mode (pick frames) lives on BFS, DFS, Dijkstra and topological sort.
import { arr, aux, graph, grid, letter, Rec, same } from '../build';
import { adjacency, fail, formatGraph, ok, parseGraph, type GraphInput, type GraphRules, type Parsed } from '../parse';
import type { AlgoDef, CustomInput, Tone } from '../types';

const INF = Number.POSITIVE_INFINITY;
const show = (d: number) => (d === INF ? '∞' : d);
const L = letter;
const edgeName = (g: GraphInput, k: number) => `${L(g.edges[k]!.from)}–${L(g.edges[k]!.to)}`;

const input = (rules: GraphRules & { weighted: boolean }, help: string, presets: { label: string; text: string }[]): CustomInput<GraphInput> => ({
  help, parse: (t) => parseGraph(t, rules), format: (g) => formatGraph(g, rules.weighted, rules.directed), presets,
});

const G = (text: string, rules: GraphRules): GraphInput => {
  const r = parseGraph(text, rules);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

const UW: GraphRules = { directed: false, weighted: false };
const W: GraphRules = { directed: false, weighted: true };
const WC: GraphRules = { directed: false, weighted: true, connected: true };
const D: GraphRules = { directed: true, weighted: false };
const DW: GraphRules = { directed: true, weighted: true, negative: true };

interface Look { cur?: number | null; done?: Set<number>; front?: Set<number>; edge?: Record<number, Tone>; notes?: (string | undefined)[]; extra?: Record<number, Tone> }
function gv(g: GraphInput, o: { directed?: boolean; weighted?: boolean }, l: Look = {}) {
  return graph(
    g.n, g.edges.map((e) => ({ from: e.from, to: e.to, ...(o.weighted ? { weight: e.weight } : {}), ...(o.directed ? { directed: true } : {}) })),
    (i) => l.extra?.[i] ?? (i === l.cur ? 'active' : l.done?.has(i) ? 'visited' : l.front?.has(i) ? 'frontier' : undefined),
    (k) => l.edge?.[k], (i) => l.notes?.[i],
  );
}

const refDistances = (g: GraphInput, directed: boolean): number[] => {
  const d = Array<number>(g.n).fill(INF);
  d[g.start] = 0;
  for (let i = 0; i < g.n; i++) for (const e of g.edges) {
    if (d[e.from]! + e.weight < d[e.to]!) d[e.to] = d[e.from]! + e.weight;
    if (!directed && d[e.to]! + e.weight < d[e.from]!) d[e.from] = d[e.to]! + e.weight;
  }
  return d;
};

// ---------------------------------------------------------------------- BFS
export const bfs: AlgoDef<GraphInput> = {
  id: 'bfs-graph', name: 'Breadth-first search', category: 'graph', concepts: ['bfs', 'graph-basics'],
  blurb: 'Explore level by level with a queue: all nodes one step away, then two steps away, and so on.',
  time: 'O(V + E)', space: 'O(V)', input: {}, modes: { drive: true },
  defaults: G('A-B A-C B-D C-D C-E D-F E-F start=A', UW),
  samples: [G('A-B start=A', UW), G('A-B C-D start=A', UW), G('A-B B-C C-D D-E E-F F-G G-H H-I I-J J-K K-L start=A', UW), G('A-B A-C A-D A-E A-F start=C', UW)],
  custom: input(UW, 'Edges like A-B A-C B-D (letters A to L, at most 20), then start=A.', [{ label: 'tree', text: 'A-B A-C B-D B-E C-F C-G start=A' }, { label: 'two components', text: 'A-B B-C D-E start=A' }]),
  code: {
    java: `List<Integer> bfs(List<List<Integer>> adj, int start) {
    boolean[] seen = new boolean[adj.size()];
    Queue<Integer> q = new ArrayDeque<>();
    seen[start] = true; q.add(start);
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {
        int u = q.poll();
        order.add(u);
        for (int v : adj.get(u)) {
            if (!seen[v]) {
                seen[v] = true; q.add(v);
            }
        }
    }
    return order;
}`,
    cpp: `vector<int> bfs(const vector<vector<int>>& adj, int start) {
    vector<bool> seen(adj.size());
    queue<int> q;
    seen[start] = true; q.push(start);
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u]) {
            if (!seen[v]) {
                seen[v] = true; q.push(v);
            }
        }
    }
    return order;
}`,
  },
  lines: same({ start: 3, 'pick-next': 5, dequeue: [6, 7], look: [8, 9], enqueue: 10, finish: 12, done: 14 }),
  run(g) {
    const adj = adjacency(g.n, g.edges, false);
    const r = new Rec();
    const seen = new Set<number>([g.start]);
    const done = new Set<number>();
    const q = [g.start];
    const order: number[] = [];
    const qAux = () => [aux('queue', 'queue (front on the left)', q.map(L))];
    const v = (cur: number | null, edge: Record<number, Tone> = {}) => [gv(g, {}, { cur, done, front: new Set(q), edge })];
    r.count('enqueues');
    r.add({ views: v(null), aux: qAux(), line: 'start', event: 'start', message: `Mark ${L(g.start)} as seen and put it in the queue.`, vars: { start: L(g.start) } });
    while (q.length) {
      const front = q[0]!;
      const wrong: Record<string, string> = {};
      for (let w = 0; w < g.n; w++) {
        if (w === front) continue;
        wrong[L(w)] = done.has(w) ? `${L(w)} was already processed.` : q.includes(w) ? `${L(w)} is in the queue but not at the front. A queue is first in, first out: ${L(front)} has been waiting longest.` : `${L(w)} has not been discovered yet, so it is not in the queue.`;
      }
      r.add({
        views: v(null), aux: qAux(), line: 'pick-next', event: 'choose', message: `Next out of the queue: ${L(front)} (the front).`, vars: { queue: q.map(L).join(' ') },
        pick: { question: 'Which node does BFS take out of the queue next?', target: 'node', valid: [L(front)], explainWrong: wrong },
      });
      q.shift();
      order.push(front);
      r.count('dequeues');
      r.add({ views: v(front), aux: qAux(), line: 'dequeue', event: 'visit', message: `Take ${L(front)} and visit it.`, vars: { picked: L(front), order: order.map(L).join('') } });
      for (const e of adj[front]!) {
        r.count('edge checks');
        const fresh = !seen.has(e.to);
        r.add({ views: v(front, { [e.edge]: 'compare' }), aux: qAux(), line: 'look', event: 'look', message: fresh ? `${L(e.to)} is new.` : `${L(e.to)} was already seen: skip.`, vars: { u: L(front), v: L(e.to) } });
        if (fresh) {
          seen.add(e.to);
          q.push(e.to);
          r.count('enqueues');
          r.add({ views: v(front, { [e.edge]: 'found' }), aux: qAux(), line: 'enqueue', event: 'enqueue', message: `Mark ${L(e.to)} as seen and enqueue it.`, vars: { u: L(front), v: L(e.to) } });
        }
      }
      done.add(front);
      r.add({ views: v(null), aux: qAux(), line: 'finish', event: 'finish', message: `${L(front)} is done.`, vars: { order: order.map(L).join('') } });
    }
    r.add({ views: [gv(g, {}, { done })], aux: qAux(), line: 'done', event: 'done', message: `Visit order: ${order.map(L).join(' → ')}.`, vars: { result: order.map(L).join('') } });
    return r.frames;
  },
  check: (g, f) => {
    const adj = adjacency(g.n, g.edges, false);
    const dist = new Map<number, number>([[g.start, 0]]);
    const queue = [g.start];
    while (queue.length) { const u = queue.shift()!; for (const e of adj[u]!) if (!dist.has(e.to)) { dist.set(e.to, dist.get(u)! + 1); queue.push(e.to); } }
    const got = String(f.at(-1)!.vars!.result).split('').map((c) => c.charCodeAt(0) - 65);
    if (got.length !== dist.size || got[0] !== g.start) return 'wrong set of nodes';
    return got.every((n, i) => i === 0 || dist.get(got[i - 1]!)! <= dist.get(n)!) ? null : 'levels out of order';
  },
};

// ---------------------------------------------------------------------- DFS
export const dfs: AlgoDef<GraphInput> = {
  id: 'dfs-graph', name: 'Depth-first search', category: 'graph', concepts: ['dfs', 'graph-basics', 'recursion-basics'],
  blurb: 'Go as deep as possible along one path, then backtrack. The call stack remembers where you came from.',
  time: 'O(V + E)', space: 'O(V)', input: {}, modes: { drive: true },
  defaults: G('A-B A-C B-D C-D C-E D-F E-F start=A', UW),
  samples: [G('A-B start=A', UW), G('A-B C-D start=A', UW), G('A-B B-C C-D D-E E-F F-G G-H H-I I-J J-K K-L start=A', UW), G('A-B A-C A-D B-C B-D C-D start=B', UW)],
  custom: input(UW, 'Edges like A-B A-C B-D (letters A to L, at most 20), then start=A. Neighbours are tried in alphabetical order.', [{ label: 'tree', text: 'A-B A-C B-D B-E C-F C-G start=A' }, { label: 'cycle', text: 'A-B B-C C-D D-A start=A' }]),
  code: {
    java: `void dfs(List<List<Integer>> adj, int u, boolean[] seen, List<Integer> order) {
    seen[u] = true;
    order.add(u);
    for (int v : adj.get(u)) {
        if (!seen[v])
            dfs(adj, v, seen, order);
    }
}`,
    cpp: `void dfs(const vector<vector<int>>& adj, int u, vector<bool>& seen, vector<int>& order) {
    seen[u] = true;
    order.push_back(u);
    for (int v : adj[u]) {
        if (!seen[v])
            dfs(adj, v, seen, order);
    }
}`,
  },
  lines: same({ visit: [1, 2], 'pick-next': [3, 4], skip: 4, descend: 5, backtrack: 7, done: 7 }),
  run(g) {
    const adj = adjacency(g.n, g.edges, false);
    const r = new Rec();
    const seen = new Set<number>();
    const done = new Set<number>();
    const path: number[] = [];
    const order: number[] = [];
    const pAux = () => [aux('stack', 'call stack (top on the right)', path.map(L))];
    const v = (cur: number | null, edge: Record<number, Tone> = {}) => [gv(g, {}, { cur, done, front: new Set(path), edge })];
    const visit = (u: number, picked?: number) => {
      seen.add(u);
      path.push(u);
      order.push(u);
      r.count('calls');
      r.add({ views: v(u), aux: pAux(), line: 'visit', event: 'visit', message: `Visit ${L(u)}.`, vars: { ...(picked !== undefined ? { picked: L(picked) } : {}), order: order.map(L).join('') } });
      let firstFresh = true;
      for (const e of adj[u]!) {
        r.count('edge checks');
        if (seen.has(e.to)) {
          r.add({ views: v(u, { [e.edge]: 'dim' }), aux: pAux(), line: 'skip', event: 'skip', message: `${L(e.to)} was already visited: skip.`, vars: { u: L(u), v: L(e.to) } });
          continue;
        }
        const wrong: Record<string, string> = {};
        for (let w = 0; w < g.n; w++) {
          if (w === e.to) continue;
          const nb = adj[u]!.some((x) => x.to === w);
          wrong[L(w)] = seen.has(w) ? `${L(w)} was already visited.` : !nb ? `${L(w)} is not a neighbour of ${L(u)}; DFS only follows edges from where it stands.` : `${L(w)} is a neighbour too, but this DFS tries neighbours in alphabetical order, so ${L(e.to)} comes first.`;
        }
        r.add({
          views: v(u, { [e.edge]: 'compare' }), aux: pAux(), line: 'pick-next', event: 'choose', message: `${firstFresh ? 'Next' : 'Back at ' + L(u) + ', next'} unvisited neighbour: ${L(e.to)}.`, vars: { u: L(u) },
          pick: { question: `DFS is at ${L(u)}. Which node does it go to next?`, target: 'node', valid: [L(e.to)], explainWrong: wrong },
        });
        firstFresh = false;
        visit(e.to, e.to);
      }
      path.pop();
      done.add(u);
      r.add({ views: v(path.at(-1) ?? null), aux: pAux(), line: 'backtrack', event: 'backtrack', message: path.length ? `${L(u)} has no more unvisited neighbours: back up to ${L(path.at(-1)!)}.` : `${L(u)} is finished.`, vars: { order: order.map(L).join('') } });
    };
    visit(g.start);
    r.add({ views: [gv(g, {}, { done })], aux: pAux(), line: 'done', event: 'done', message: `Visit order: ${order.map(L).join(' → ')}.`, vars: { result: order.map(L).join('') } });
    return r.frames;
  },
  check: (g, f) => {
    const adj = adjacency(g.n, g.edges, false);
    const exp: number[] = [];
    const seen = new Set<number>();
    const go = (u: number) => { seen.add(u); exp.push(u); for (const e of adj[u]!) if (!seen.has(e.to)) go(e.to); };
    go(g.start);
    return f.at(-1)!.vars!.result === exp.map(L).join('') ? null : 'wrong visit order';
  },
};

// ----------------------------------------------------------------- Dijkstra
export const dijkstra: AlgoDef<GraphInput> = {
  id: 'dijkstra', name: "Dijkstra's shortest paths", category: 'graph', concepts: ['shortest-paths', 'graph-basics'],
  blurb: 'Always finalise the unfinished node with the smallest known distance, then relax its edges. Needs non-negative weights.',
  time: 'O((V + E) log V)', space: 'O(V)', input: {}, modes: { drive: true },
  defaults: G('A-B:4 A-C:1 C-B:2 B-D:1 C-D:5 D-E:3 start=A', W),
  samples: [G('A-B:1 start=A', W), G('A-B:3 C-D:1 start=A', W), G('A-B:1 B-C:1 A-C:5 start=C', W), G('A-B:2 A-C:2 B-D:1 C-D:1 start=A', W)],
  custom: input(W, 'Weighted edges like A-B:4 A-C:1 (weights 0 to 99; no negatives), then start=A.', [{ label: 'classic', text: 'A-B:7 A-C:9 A-F:14 B-C:10 B-D:15 C-D:11 C-F:2 D-E:6 E-F:9 start=A' }, { label: 'unreachable node', text: 'A-B:2 B-C:3 D-E:1 start=A' }]),
  code: {
    java: `int[] dijkstra(List<List<int[]>> adj, int src) {
    int[] dist = new int[adj.size()];
    Arrays.fill(dist, INF); dist[src] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);
    pq.add(new int[]{src, 0});
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int u = top[0];
        if (top[1] > dist[u]) continue;
        for (int[] e : adj.get(u)) {
            int nd = dist[u] + e[1];
            if (nd < dist[e[0]]) {
                dist[e[0]] = nd;
                pq.add(new int[]{e[0], nd});
            }
        }
    }
    return dist;
}`,
    cpp: `vector<int> dijkstra(const vector<vector<pair<int,int>>>& adj, int src) {
    vector<int> dist(adj.size(), INF);
    dist[src] = 0;
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            int nd = dist[u] + w;
            if (nd < dist[v]) {
                dist[v] = nd;
                pq.push({nd, v});
            }
        }
    }
    return dist;
}`,
  },
  lines: same({ start: [2, 4], 'pick-next': [5, 6], finalize: 7, relax: [9, 10, 11], update: [12, 13], done: 17 }),
  run(g) {
    const adj = adjacency(g.n, g.edges, false);
    const r = new Rec();
    const dist = Array<number>(g.n).fill(INF);
    dist[g.start] = 0;
    const done = new Set<number>();
    const v = (cur: number | null, edge: Record<number, Tone> = {}, extra: Record<number, Tone> = {}) => [
      gv(g, { weighted: true }, { cur, done, front: new Set(dist.flatMap((d, i) => (d < INF && !done.has(i) ? [i] : []))), edge, notes: dist.map((d) => (d === INF ? undefined : String(d))), extra }),
      arr(dist.map(show), { name: 'dist', labels: Object.fromEntries(dist.map((_, i) => [i, L(i)])), tones: Object.fromEntries([...done].map((i) => [i, 'sorted' as Tone])) }),
    ];
    const pq = () => [aux('heap', 'tentative distances', dist.flatMap((d, i) => (d < INF && !done.has(i) ? [`${L(i)}:${d}`] : [])))];
    r.add({ views: v(null), aux: pq(), line: 'start', event: 'start', message: `Distance to ${L(g.start)} is 0; every other node is unknown (∞).`, vars: { start: L(g.start) } });
    for (;;) {
      let best = -1;
      for (let i = 0; i < g.n; i++) if (!done.has(i) && dist[i]! < INF && (best < 0 || dist[i]! < dist[best]!)) best = i;
      if (best < 0) break;
      const wrong: Record<string, string> = {};
      for (let w = 0; w < g.n; w++) {
        if (w === best) continue;
        wrong[L(w)] = done.has(w) ? `${L(w)} is already final.` : dist[w] === INF ? `${L(w)} has not been reached yet (distance ∞).` : dist[w] === dist[best] ? `${L(w)} is tied at ${dist[w]}; this run breaks ties alphabetically, so ${L(best)} goes first.` : `${L(w)} has distance ${dist[w]}, but ${L(best)} has only ${dist[best]}. Pick the smallest.`;
      }
      r.count('extractions');
      r.add({
        views: v(null, {}, { [best]: 'compare' }), aux: pq(), line: 'pick-next', event: 'choose', message: `Smallest unfinished distance: ${L(best)} at ${dist[best]}.`, vars: {},
        pick: { question: 'Which node does Dijkstra finalise next?', target: 'node', valid: [L(best)], explainWrong: wrong },
      });
      done.add(best);
      r.add({ views: v(best), aux: pq(), line: 'finalize', event: 'finalize', message: `${L(best)} is final: shortest distance ${dist[best]}.`, vars: { picked: L(best), dist: dist[best]! } });
      for (const e of adj[best]!) {
        if (done.has(e.to)) continue;
        const nd = dist[best]! + e.weight;
        r.count('relaxations');
        const better = nd < dist[e.to]!;
        r.add({ views: v(best, { [e.edge]: 'compare' }), aux: pq(), line: 'relax', event: 'relax', message: `${L(best)}→${L(e.to)}: ${dist[best]} + ${e.weight} = ${nd} vs ${show(dist[e.to]!)}${better ? ': better.' : ': no improvement.'}`, vars: { u: L(best), v: L(e.to), candidate: nd } });
        if (better) { dist[e.to] = nd; r.add({ views: v(best, { [e.edge]: 'found' }), aux: pq(), line: 'update', event: 'update', message: `dist[${L(e.to)}] = ${nd}.`, vars: { v: L(e.to), dist: nd } }); }
      }
    }
    r.add({ views: v(null), aux: pq(), line: 'done', event: 'done', message: `Final distances from ${L(g.start)}: ${dist.map((d, i) => `${L(i)}=${show(d)}`).join(', ')}.`, vars: { result: dist.map((d) => (d === INF ? 'INF' : d)).join(',') } });
    return r.frames;
  },
  check: (g, f) => (f.at(-1)!.vars!.result === refDistances(g, false).map((d) => (d === INF ? 'INF' : d)).join(',') ? null : 'wrong distances'),
};

// ---------------------------------------------------- topological sort (Kahn)
export const topo: AlgoDef<GraphInput> = {
  id: 'topological-sort-kahn', name: "Topological sort (Kahn's)", category: 'graph', concepts: ['topological-sort', 'graph-basics'],
  blurb: 'Repeatedly remove a node with no remaining prerequisites. If some nodes never get removed, there is a cycle.',
  time: 'O(V + E)', space: 'O(V)', input: {}, modes: { drive: true },
  defaults: G('A>B A>C B>D C>D D>E start=A', D),
  samples: [G('A>B start=A', D), G('A>B B>C C>A start=A', D), G('A>C B>C C>D start=A', D), G('A>B C>D start=A', D), G('A>B A>C A>D start=A', D)],
  custom: input(D, 'Directed edges like A>B (A must come before B), letters A to L, at most 20.', [{ label: 'has a cycle', text: 'A>B B>C C>A C>D start=A' }, { label: 'course schedule', text: 'A>C B>C C>D C>E D>F E>F start=A' }]),
  code: {
    java: `List<Integer> topo(List<List<Integer>> adj) {
    int n = adj.size();
    int[] indeg = new int[n];
    for (List<Integer> out : adj) for (int v : out) indeg[v]++;
    Queue<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {
        int u = q.poll();
        order.add(u);
        for (int v : adj.get(u))
            if (--indeg[v] == 0) q.add(v);
    }
    return order.size() == n ? order : List.of();
}`,
    cpp: `vector<int> topo(const vector<vector<int>>& adj) {
    int n = adj.size();
    vector<int> indeg(n);
    for (auto& out : adj) for (int v : out) indeg[v]++;
    queue<int> q;
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.push(i);
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u])
            if (--indeg[v] == 0) q.push(v);
    }
    return (int)order.size() == n ? order : vector<int>{};
}`,
  },
  lines: same({ indegrees: 3, init: 5, 'pick-next': [7, 8], take: 9, dec: [10, 11], enqueue: 11, done: 13, cycle: 13 }),
  run(g) {
    const adj = adjacency(g.n, g.edges, true);
    const r = new Rec();
    const indeg = Array<number>(g.n).fill(0);
    for (const e of g.edges) indeg[e.to]!++;
    r.count('edge reads', g.edges.length);
    const q = indeg.flatMap((d, i) => (d === 0 ? [i] : []));
    const done = new Set<number>();
    const order: number[] = [];
    const v = (cur: number | null, edge: Record<number, Tone> = {}) => [
      gv(g, { directed: true }, { cur, done, front: new Set(q), edge, notes: indeg.map((d) => `in ${d}`) }),
      arr(indeg, { name: 'in-degree', labels: Object.fromEntries(indeg.map((_, i) => [i, L(i)])) }),
    ];
    const qAux = () => [aux('queue', 'queue (front on the left)', q.map(L)), aux('list', 'order so far', order.map(L))];
    r.add({ views: v(null), aux: qAux(), line: 'indegrees', event: 'start', message: `Count how many prerequisites each node has. Nodes with 0 start in the queue: ${q.map(L).join(', ') || 'none'}.`, vars: {} });
    while (q.length) {
      const front = q[0]!;
      const wrong: Record<string, string> = {};
      for (let w = 0; w < g.n; w++) {
        if (w === front) continue;
        wrong[L(w)] = done.has(w) ? `${L(w)} is already in the order.` : indeg[w]! > 0 ? `${L(w)} still has ${indeg[w]} unprocessed prerequisite${indeg[w]! > 1 ? 's' : ''}.` : `${L(w)} also has no prerequisites, so it would be valid in theory, but this run takes the queue front first (${L(front)}).`;
      }
      r.add({
        views: v(null), aux: qAux(), line: 'pick-next', event: 'choose', message: `Front of the queue: ${L(front)}.`, vars: {},
        pick: { question: 'Which node is placed next in the order?', target: 'node', valid: [L(front)], explainWrong: wrong },
      });
      q.shift();
      done.add(front);
      order.push(front);
      r.count('placed');
      r.add({ views: v(front), aux: qAux(), line: 'take', event: 'take', message: `Place ${L(front)}.`, vars: { picked: L(front), order: order.map(L).join('') } });
      for (const e of adj[front]!) {
        indeg[e.to]!--;
        r.count('edge reads');
        const zero = indeg[e.to] === 0;
        if (zero) q.push(e.to);
        r.add({ views: v(front, { [e.edge]: zero ? 'found' : 'compare' }), aux: qAux(), line: zero ? 'enqueue' : 'dec', event: zero ? 'enqueue' : 'dec', message: `Remove edge ${L(front)}→${L(e.to)}: in-degree of ${L(e.to)} is now ${indeg[e.to]}${zero ? ': enqueue it.' : '.'}`, vars: { v: L(e.to), indeg: indeg[e.to]! } });
      }
    }
    const cyc = order.length < g.n;
    r.add({ views: v(null), aux: qAux(), line: cyc ? 'cycle' : 'done', event: cyc ? 'cycle' : 'done', message: cyc ? `Only ${order.length} of ${g.n} nodes could be placed: the rest are on or behind a cycle.` : `Topological order: ${order.map(L).join(' → ')}.`, vars: { result: cyc ? 'cycle' : order.map(L).join('') } });
    return r.frames;
  },
  check: (g, f) => {
    const res = String(f.at(-1)!.vars!.result);
    // independent cycle test: repeatedly strip sinks
    let nodes = new Set(Array.from({ length: g.n }, (_, i) => i));
    for (;;) {
      const sinks = [...nodes].filter((u) => !g.edges.some((e) => e.from === u && nodes.has(e.to)));
      if (!sinks.length) break;
      nodes = new Set([...nodes].filter((u) => !sinks.includes(u)));
    }
    const hasCycle = nodes.size > 0;
    if (hasCycle) return res === 'cycle' ? null : 'should report a cycle';
    if (res === 'cycle') return 'reported a cycle that is not there';
    const pos = new Map(res.split('').map((c, i) => [c.charCodeAt(0) - 65, i]));
    if (pos.size !== g.n) return 'missing nodes';
    return g.edges.every((e) => pos.get(e.from)! < pos.get(e.to)!) ? null : 'an edge points backwards';
  },
};

// ----------------------------------------------------------------- flood fill
interface GridIn { grid: number[][] }
export const flood: AlgoDef<GridIn> = {
  id: 'flood-fill-grid', name: 'Flood fill: count islands', category: 'graph', concepts: ['grid-graphs', 'dfs'],
  blurb: 'Scan the grid; each time you meet unvisited land, flood-fill it so that whole island is counted once.',
  time: 'O(R × C)', space: 'O(R × C)', input: {}, modes: {},
  defaults: { grid: [[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 1]] },
  samples: [{ grid: [[0]] }, { grid: [[1]] }, { grid: [[1, 0, 1], [0, 1, 0], [1, 0, 1]] }, { grid: Array.from({ length: 10 }, () => Array<number>(10).fill(1)) }, { grid: [[1, 1, 1], [1, 0, 1], [1, 1, 1]] }],
  custom: {
    help: 'Rows of 0 (water) and 1 (land) separated by / or spaces: 11000/11000/00100/00011. Up to 10 × 10.',
    parse: (t): Parsed<GridIn> => {
      const rows = t.split(/[\s/;,]+/).filter(Boolean);
      if (!rows.length || rows.length > 10) return fail('Enter 1 to 10 rows.');
      if (rows.some((x) => !/^[01]+$/.test(x))) return fail('Rows may only contain 0 and 1.');
      if (rows.some((x) => x.length !== rows[0]!.length)) return fail('All rows must have the same length.');
      if (rows[0]!.length > 10) return fail('At most 10 columns.');
      return ok({ grid: rows.map((x) => x.split('').map(Number)) });
    },
    format: (v) => v.grid.map((r) => r.join('')).join('/'),
    presets: [{ label: 'checkerboard', text: '10101/01010/10101/01010' }, { label: 'one big island', text: '1111/1001/1111' }],
  },
  code: {
    java: `int countIslands(int[][] g) {
    int count = 0;
    for (int r = 0; r < g.length; r++)
        for (int c = 0; c < g[0].length; c++)
            if (g[r][c] == 1) {
                count++;
                fill(g, r, c);
            }
    return count;
}
void fill(int[][] g, int r, int c) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != 1) return;
    g[r][c] = 2;
    fill(g, r + 1, c); fill(g, r - 1, c);
    fill(g, r, c + 1); fill(g, r, c - 1);
}`,
    cpp: `int countIslands(vector<vector<int>>& g) {
    int count = 0;
    for (int r = 0; r < (int)g.size(); r++)
        for (int c = 0; c < (int)g[0].size(); c++)
            if (g[r][c] == 1) {
                count++;
                fill(g, r, c);
            }
    return count;
}
void fill(vector<vector<int>>& g, int r, int c) {
    if (r < 0 || c < 0 || r >= (int)g.size() || c >= (int)g[0].size() || g[r][c] != 1) return;
    g[r][c] = 2;
    fill(g, r + 1, c); fill(g, r - 1, c);
    fill(g, r, c + 1); fill(g, r, c - 1);
}`,
  },
  lines: same({ scan: [2, 3, 4], 'new-island': [5, 6], fill: [11, 12], expand: [13, 14], done: 8 }),
  run({ grid: g0 }) {
    const R = g0.length;
    const C = g0[0]!.length;
    const label: (number | null)[][] = g0.map((row) => row.map(() => null));
    const r = new Rec();
    let islands = 0;
    const v = (cur?: [number, number], filling = false) => {
      const tones: Record<string, Tone> = {};
      const cells = g0.map((row, y) => row.map((x, c) => {
        const l = label[y]![c]!;
        if (l !== null) tones[`${y},${c}`] = l === islands && filling ? 'found' : 'visited';
        else if (x === 0) tones[`${y},${c}`] = 'dim';
        return l !== null ? `#${l}` : x;
      }));
      if (cur) tones[`${cur[0]},${cur[1]}`] = 'active';
      return grid(cells, tones);
    };
    const aAux = () => [aux('list', 'islands found', [String(islands)])];
    r.add({ views: [v()], aux: aAux(), line: 'scan', event: 'start', message: 'Scan cell by cell. Water is 0, land is 1.', vars: { islands } });
    const fill = (y: number, c: number) => {
      if (y < 0 || c < 0 || y >= R || c >= C || g0[y]![c] !== 1 || label[y]![c] !== null) return;
      label[y]![c] = islands;
      r.count('cells filled');
      r.add({ views: [v([y, c], true)], aux: aAux(), line: 'fill', event: 'fill', message: `Fill (${y}, ${c}) into island #${islands}.`, vars: { r: y, c, island: islands } });
      fill(y + 1, c); fill(y - 1, c); fill(y, c + 1); fill(y, c - 1);
    };
    for (let y = 0; y < R; y++) for (let c = 0; c < C; c++) {
      r.count('cells scanned');
      if (g0[y]![c] === 1 && label[y]![c] === null) {
        islands++;
        r.add({ views: [v([y, c], true)], aux: aAux(), line: 'new-island', event: 'island', message: `Unvisited land at (${y}, ${c}): a new island, number ${islands}. Flood it.`, vars: { r: y, c, islands } });
        fill(y, c);
      } else if (g0[y]![c] === 1 || (y + c) % 3 === 0) {
        r.add({ views: [v([y, c])], aux: aAux(), line: 'scan', event: 'scan', message: g0[y]![c] === 1 ? `(${y}, ${c}) is land already counted.` : `(${y}, ${c}) is water.`, vars: { r: y, c, islands } });
      }
    }
    r.add({ views: [v()], aux: aAux(), line: 'done', event: 'done', message: `${islands} island${islands === 1 ? '' : 's'}.`, vars: { result: islands } });
    return r.frames;
  },
  check: ({ grid: g }, f) => {
    const seen = g.map((row) => row.map(() => false));
    let n = 0;
    for (let y = 0; y < g.length; y++) for (let c = 0; c < g[0]!.length; c++) {
      if (g[y]![c] !== 1 || seen[y]![c]) continue;
      n++;
      const st: [number, number][] = [[y, c]];
      while (st.length) {
        const [a, b] = st.pop()!;
        if (a < 0 || b < 0 || a >= g.length || b >= g[0]!.length || g[a]![b] !== 1 || seen[a]![b]) continue;
        seen[a]![b] = true;
        st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
      }
    }
    return f.at(-1)!.vars!.result === n ? null : 'wrong island count';
  },
};

// ---------------------------------------------------------------- union-find
export const unionFind: AlgoDef<GraphInput> = {
  id: 'union-find', name: 'Union-find (disjoint sets)', category: 'graph', concepts: ['union-find'],
  blurb: 'Each edge merges two sets. Path halving and union by rank keep every find almost constant time.',
  time: 'O(α(n)) per operation', space: 'O(n)', input: {}, modes: {},
  defaults: G('A-B C-D B-D E-F A-C start=A', UW),
  samples: [G('A-B start=A', UW), G('A-B B-C C-A start=A', UW), G('A-B C-D E-F G-H A-C E-G A-E start=A', UW), G('A-B B-C C-D D-E E-F F-G G-H start=A', UW)],
  custom: input(UW, 'Edges are applied in order as unions: A-B C-D B-D. Letters A to L, at most 20 edges.', [{ label: 'long chain', text: 'A-B B-C C-D D-E E-F F-G G-H start=A' }, { label: 'merge two groups', text: 'A-B C-D E-F A-C C-E start=A' }]),
  code: {
    java: `int find(int[] p, int x) {
    while (p[x] != x) {
        p[x] = p[p[x]];
        x = p[x];
    }
    return x;
}
boolean union(int[] p, int[] rank, int a, int b) {
    int ra = find(p, a), rb = find(p, b);
    if (ra == rb) return false;
    if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
    p[rb] = ra;
    if (rank[ra] == rank[rb]) rank[ra]++;
    return true;
}`,
    cpp: `int find(vector<int>& p, int x) {
    while (p[x] != x) {
        p[x] = p[p[x]];
        x = p[x];
    }
    return x;
}
bool unite(vector<int>& p, vector<int>& rank, int a, int b) {
    int ra = find(p, a), rb = find(p, b);
    if (ra == rb) return false;
    if (rank[ra] < rank[rb]) swap(ra, rb);
    p[rb] = ra;
    if (rank[ra] == rank[rb]) rank[ra]++;
    return true;
}`,
  },
  lines: same({ consider: 8, 'find-step': [1, 2, 3], 'find-root': 5, same: 9, link: [10, 11], 'rank-up': 12, done: 13 }),
  run(g) {
    const r = new Rec();
    const p = Array.from({ length: g.n }, (_, i) => i);
    const rank = Array<number>(g.n).fill(0);
    const et: Record<number, Tone> = {};
    const groups = () => {
      const m = new Map<number, string[]>();
      const root = (x: number) => { while (p[x] !== x) x = p[x]!; return x; };
      p.forEach((_, i) => { const rt = root(i); m.set(rt, [...(m.get(rt) ?? []), L(i)]); });
      return [...m.values()].map((s) => `{${s.join(',')}}`);
    };
    const v = (cur: number[] = [], edge: Record<number, Tone> = {}) => [
      gv(g, {}, { edge: { ...et, ...edge }, extra: Object.fromEntries(cur.map((c) => [c, 'active' as Tone])) }),
      arr(p.map(L), { name: 'parent', labels: Object.fromEntries(p.map((_, i) => [i, L(i)])), tones: Object.fromEntries(cur.map((c) => [c, 'active' as Tone])) }),
      arr(rank, { name: 'rank', labels: Object.fromEntries(p.map((_, i) => [i, L(i)])) }),
    ];
    const sets = () => [aux('set', 'sets', groups())];
    r.add({ views: v(), aux: sets(), line: 'consider', event: 'start', message: 'Every node starts as its own set (it is its own parent).', vars: { sets: g.n } });
    const find = (x0: number, k: number): number => {
      let x = x0;
      while (p[x] !== x) {
        r.count('hops');
        const gp = p[p[x]!]!;
        const moved = gp !== p[x];
        p[x] = gp;
        r.add({ views: v([x], { [k]: 'compare' }), aux: sets(), line: 'find-step', event: 'find', message: moved ? `Path halving: ${L(x)} now points at its grandparent ${L(gp)}.` : `${L(x)}'s parent is already the root side; step up.`, vars: { x: L(x), parent: L(p[x]!) } });
        x = p[x]!;
      }
      r.add({ views: v([x], { [k]: 'compare' }), aux: sets(), line: 'find-root', event: 'root', message: `${L(x0)} belongs to the set led by ${L(x)}.`, vars: { x: L(x0), root: L(x) } });
      return x;
    };
    g.edges.forEach((e, k) => {
      r.add({ views: v([e.from, e.to], { [k]: 'compare' }), aux: sets(), line: 'consider', event: 'edge', message: `Edge ${edgeName(g, k)}: are they already in the same set?`, vars: { a: L(e.from), b: L(e.to) } });
      let ra = find(e.from, k);
      let rb = find(e.to, k);
      if (ra === rb) {
        et[k] = 'error';
        r.add({ views: v([ra], {}), aux: sets(), line: 'same', event: 'cycle', message: `Same set (${L(ra)}): this edge would close a cycle. Nothing to merge.`, vars: { root: L(ra) } });
        return;
      }
      if (rank[ra]! < rank[rb]!) [ra, rb] = [rb, ra];
      p[rb] = ra;
      r.count('unions');
      et[k] = 'found';
      r.add({ views: v([ra, rb], {}), aux: sets(), line: 'link', event: 'union', message: `Link the shorter tree: ${L(rb)} now points at ${L(ra)}.`, vars: { winner: L(ra), loser: L(rb) } });
      if (rank[ra] === rank[rb]) {
        rank[ra]!++;
        r.add({ views: v([ra]), aux: sets(), line: 'rank-up', event: 'rank', message: `Equal ranks: ${L(ra)}'s rank goes up to ${rank[ra]}.`, vars: { rank: rank[ra]! } });
      }
    });
    r.add({ views: v(), aux: sets(), line: 'done', event: 'done', message: `${groups().length} set${groups().length === 1 ? '' : 's'} remain.`, vars: { result: groups().length } });
    return r.frames;
  },
  check: (g, f) => {
    const adj = adjacency(g.n, g.edges, false);
    const seen = new Set<number>();
    let comps = 0;
    for (let s = 0; s < g.n; s++) {
      if (seen.has(s)) continue;
      comps++;
      const st = [s];
      while (st.length) { const u = st.pop()!; if (seen.has(u)) continue; seen.add(u); for (const e of adj[u]!) st.push(e.to); }
    }
    return f.at(-1)!.vars!.result === comps ? null : 'wrong number of sets';
  },
};

// ------------------------------------------------------------ MST helpers
const mstWeight = (g: GraphInput): number => {
  const p = Array.from({ length: g.n }, (_, i) => i);
  const root = (x: number): number => (p[x] === x ? x : (p[x] = root(p[x]!)));
  let total = 0;
  for (const e of [...g.edges].sort((a, b) => a.weight - b.weight)) {
    const [a, b] = [root(e.from), root(e.to)];
    if (a !== b) { p[a] = b; total += e.weight; }
  }
  return total;
};

export const kruskal: AlgoDef<GraphInput> = {
  id: 'kruskal', name: "Kruskal's minimum spanning tree", category: 'graph', concepts: ['mst', 'union-find', 'greedy'],
  blurb: 'Sort edges by weight; take each edge unless it would join two nodes that are already connected.',
  time: 'O(E log E)', space: 'O(V)', input: {}, modes: {},
  defaults: G('A-B:4 A-C:3 B-C:1 B-D:2 C-D:4 D-E:2 start=A', WC),
  samples: [G('A-B:5 start=A', WC), G('A-B:1 B-C:1 A-C:1 start=A', WC), G('A-B:9 B-C:1 C-D:2 D-A:3 start=A', WC)],
  custom: input(WC, 'A connected weighted graph: A-B:4 A-C:3 B-C:1 (weights 0 to 99; every node reachable).', [{ label: 'square with diagonal', text: 'A-B:1 B-C:2 C-D:3 D-A:4 A-C:5 start=A' }]),
  code: {
    java: `int kruskal(int n, int[][] edges) {
    Arrays.sort(edges, (a, b) -> a[2] - b[2]);
    DSU d = new DSU(n);
    int total = 0;
    for (int[] e : edges) {
        if (d.union(e[0], e[1])) total += e[2];
    }
    return total;
}`,
    cpp: `int kruskal(int n, vector<array<int,3>>& edges) {
    sort(edges.begin(), edges.end(), [](auto& a, auto& b) { return a[2] < b[2]; });
    DSU d(n);
    int total = 0;
    for (auto& e : edges) {
        if (d.unite(e[0], e[1])) total += e[2];
    }
    return total;
}`,
  },
  lines: same({ sort: 1, consider: 4, accept: 5, reject: 5, done: 7 }),
  run(g) {
    const r = new Rec();
    const order = g.edges.map((_, k) => k).sort((a, b) => g.edges[a]!.weight - g.edges[b]!.weight || a - b);
    const p = Array.from({ length: g.n }, (_, i) => i);
    const root = (x: number): number => { while (p[x] !== x) x = p[x]!; return x; };
    const et: Record<number, Tone> = {};
    let total = 0;
    const v = (edge: Record<number, Tone> = {}) => [gv(g, { weighted: true }, { edge: { ...et, ...edge } })];
    const list = (from: number) => [aux('list', 'edges by weight', order.map((k, i) => (i < from ? '✓' : '') + `${edgeName(g, k)}:${g.edges[k]!.weight}`), [from])];
    r.count('sort steps', Math.max(1, Math.ceil(g.edges.length * Math.log2(Math.max(2, g.edges.length)))));
    r.add({ views: v(), aux: list(0), line: 'sort', event: 'start', message: 'Sort all edges from lightest to heaviest.', vars: { edges: g.edges.length } });
    order.forEach((k, i) => {
      const e = g.edges[k]!;
      r.count('find checks');
      const [a, b] = [root(e.from), root(e.to)];
      r.add({ views: v({ [k]: 'compare' }), aux: list(i), line: 'consider', event: 'consider', message: `Edge ${edgeName(g, k)} (weight ${e.weight}): ${a === b ? 'already connected' : 'connects two different groups'}.`, vars: { weight: e.weight, total } });
      if (a === b) { et[k] = 'error'; r.add({ views: v(), aux: list(i + 1), line: 'reject', event: 'reject', message: `Reject ${edgeName(g, k)}: it would form a cycle.`, vars: { total } }); return; }
      p[a] = b;
      total += e.weight;
      et[k] = 'found';
      r.count('unions');
      r.add({ views: v(), aux: list(i + 1), line: 'accept', event: 'accept', message: `Accept ${edgeName(g, k)}: total weight ${total}.`, vars: { total } });
    });
    r.add({ views: v(), aux: list(order.length), line: 'done', event: 'done', message: `Minimum spanning tree weight: ${total}.`, vars: { result: total } });
    return r.frames;
  },
  check: (g, f) => (f.at(-1)!.vars!.result === mstWeight(g) ? null : 'wrong MST weight'),
};

export const prim: AlgoDef<GraphInput> = {
  id: 'prim', name: "Prim's minimum spanning tree", category: 'graph', concepts: ['mst', 'greedy'],
  blurb: 'Grow one tree from the start node: always add the cheapest edge that reaches a new node.',
  time: 'O(E log V)', space: 'O(V)', input: {}, modes: {},
  defaults: G('A-B:4 A-C:3 B-C:1 B-D:2 C-D:4 D-E:2 start=A', WC),
  samples: [G('A-B:5 start=A', WC), G('A-B:1 B-C:1 A-C:1 start=B', WC), G('A-B:9 B-C:1 C-D:2 D-A:3 start=A', WC)],
  custom: input(WC, 'A connected weighted graph: A-B:4 A-C:3 B-C:1, then start=A.', [{ label: 'square with diagonal', text: 'A-B:1 B-C:2 C-D:3 D-A:4 A-C:5 start=A' }]),
  code: {
    java: `int prim(List<List<int[]>> adj, int start) {
    boolean[] in = new boolean[adj.size()];
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);
    pq.add(new int[]{start, 0});
    int total = 0;
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        if (in[top[0]]) continue;
        in[top[0]] = true; total += top[1];
        for (int[] e : adj.get(top[0]))
            if (!in[e[0]]) pq.add(e);
    }
    return total;
}`,
    cpp: `int prim(const vector<vector<pair<int,int>>>& adj, int start) {
    vector<bool> in(adj.size());
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, start});
    int total = 0;
    while (!pq.empty()) {
        auto [w, u] = pq.top(); pq.pop();
        if (in[u]) continue;
        in[u] = true; total += w;
        for (auto [v, c] : adj[u])
            if (!in[v]) pq.push({c, v});
    }
    return total;
}`,
  },
  lines: same({ start: [1, 3], frontier: [9, 10], pick: [6, 7, 8], done: 12 }),
  run(g) {
    const r = new Rec();
    const inT = new Set<number>([g.start]);
    const et: Record<number, Tone> = {};
    let total = 0;
    const v = (edge: Record<number, Tone> = {}) => [gv(g, { weighted: true }, { done: inT, edge: { ...et, ...edge } })];
    r.add({ views: v(), line: 'start', event: 'start', message: `Start the tree at ${L(g.start)}.`, vars: { total } });
    while (inT.size < g.n) {
      const cross = g.edges.map((e, k) => ({ e, k })).filter(({ e }) => inT.has(e.from) !== inT.has(e.to));
      if (!cross.length) break;
      r.count('edge checks', cross.length);
      r.add({ views: v(Object.fromEntries(cross.map(({ k }) => [k, 'frontier' as Tone]))), line: 'frontier', event: 'frontier', message: `Edges leaving the tree: ${cross.map(({ k, e }) => `${edgeName(g, k)}:${e.weight}`).join(', ')}.`, vars: { total } });
      const best = cross.reduce((a, b) => (b.e.weight < a.e.weight || (b.e.weight === a.e.weight && b.k < a.k) ? b : a));
      const added = inT.has(best.e.from) ? best.e.to : best.e.from;
      inT.add(added);
      total += best.e.weight;
      et[best.k] = 'found';
      r.count('adds');
      r.add({ views: v(), line: 'pick', event: 'accept', message: `Cheapest is ${edgeName(g, best.k)} (${best.e.weight}): add ${L(added)}. Total ${total}.`, vars: { added: L(added), total } });
    }
    r.add({ views: v(), line: 'done', event: 'done', message: `Minimum spanning tree weight: ${total}.`, vars: { result: total } });
    return r.frames;
  },
  check: (g, f) => (f.at(-1)!.vars!.result === mstWeight(g) ? null : 'wrong MST weight'),
};

// ------------------------------------------------------------- Bellman-Ford
export const bellmanFord: AlgoDef<GraphInput> = {
  id: 'bellman-ford', name: 'Bellman-Ford', category: 'graph', concepts: ['shortest-paths'],
  blurb: 'Relax every edge, V−1 times. It handles negative weights, and one more pass reveals a negative cycle.',
  time: 'O(V × E)', space: 'O(V)', input: {}, modes: {},
  defaults: G('A>B:4 A>C:5 B>C:-3 C>D:2 B>D:6 start=A', DW),
  samples: [G('A>B:1 start=A', DW), G('A>B:1 B>C:-2 C>A:-1 start=A', DW), G('A>B:2 C>D:1 start=A', DW), G('A>B:5 A>C:2 C>B:-4 B>D:1 start=A', DW)],
  custom: input(DW, 'Directed weighted edges like A>B:4 B>C:-3 (weights -99 to 99), then start=A.', [{ label: 'negative cycle', text: 'A>B:1 B>C:-3 C>B:1 start=A' }, { label: 'negative edge, no cycle', text: 'A>B:4 A>C:5 B>C:-3 start=A' }]),
  code: {
    java: `int[] bellmanFord(int n, int[][] edges, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, INF); dist[src] = 0;
    for (int round = 1; round < n; round++) {
        boolean changed = false;
        for (int[] e : edges)
            if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) {
                dist[e[1]] = dist[e[0]] + e[2];
                changed = true;
            }
        if (!changed) break;
    }
    for (int[] e : edges)
        if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]])
            return null; // negative cycle
    return dist;
}`,
    cpp: `optional<vector<int>> bellmanFord(int n, vector<array<int,3>>& edges, int src) {
    vector<int> dist(n, INF);
    dist[src] = 0;
    for (int round = 1; round < n; round++) {
        bool changed = false;
        for (auto& e : edges)
            if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) {
                dist[e[1]] = dist[e[0]] + e[2];
                changed = true;
            }
        if (!changed) break;
    }
    for (auto& e : edges)
        if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]])
            return nullopt; // negative cycle
    return dist;
}`,
  },
  lines: same({ start: [1, 2], 'edge-check': [5, 6], relax: [7, 8], 'round-end': 10, 'cycle-check': [12, 13], cycle: 14, done: 15 }),
  run(g) {
    const r = new Rec();
    const dist = Array<number>(g.n).fill(INF);
    dist[g.start] = 0;
    const v = (edge: Record<number, Tone> = {}, extra: Record<number, Tone> = {}) => [
      gv(g, { directed: true, weighted: true }, { edge, notes: dist.map((d) => (d === INF ? undefined : String(d))), extra }),
      arr(dist.map(show), { name: 'dist', labels: Object.fromEntries(dist.map((_, i) => [i, L(i)])) }),
    ];
    r.add({ views: v(), line: 'start', event: 'start', message: `dist[${L(g.start)}] = 0, everything else ∞.`, vars: {} });
    for (let round = 1; round < g.n; round++) {
      let changed = false;
      g.edges.forEach((e, k) => {
        r.count('edge checks');
        const cand = dist[e.from]! + e.weight;
        const better = dist[e.from]! !== INF && cand < dist[e.to]!;
        r.add({ views: v({ [k]: 'compare' }), line: 'edge-check', event: 'check', message: dist[e.from] === INF ? `Round ${round}: ${L(e.from)} is unreached, skip ${L(e.from)}→${L(e.to)}.` : `Round ${round}: ${L(e.from)}→${L(e.to)}: ${dist[e.from]} + ${e.weight} = ${cand} vs ${show(dist[e.to]!)}${better ? ': better.' : '.'}`, vars: { round, u: L(e.from), v: L(e.to) } });
        if (better) { dist[e.to] = cand; changed = true; r.count('updates'); r.add({ views: v({ [k]: 'found' }, { [e.to]: 'found' }), line: 'relax', event: 'relax', message: `dist[${L(e.to)}] = ${cand}.`, vars: { round, v: L(e.to), dist: cand } }); }
      });
      r.add({ views: v(), line: 'round-end', event: 'round', message: changed ? `Round ${round} changed something; go again.` : `Round ${round} changed nothing: done early.`, vars: { round, changed } });
      if (!changed) break;
    }
    let neg = false;
    for (const [k, e] of g.edges.entries()) {
      r.count('edge checks');
      if (dist[e.from] !== INF && dist[e.from]! + e.weight < dist[e.to]!) {
        neg = true;
        r.add({ views: v({ [k]: 'error' }), line: 'cycle', event: 'cycle', message: `${L(e.from)}→${L(e.to)} can still improve after V−1 rounds: a negative cycle.`, vars: { u: L(e.from), v: L(e.to) } });
        break;
      }
    }
    if (!neg) r.add({ views: v(), line: 'done', event: 'done', message: `No edge can improve: distances are final. ${dist.map((d, i) => `${L(i)}=${show(d)}`).join(', ')}.`, vars: { result: dist.map((d) => (d === INF ? 'INF' : d)).join(',') } });
    else r.frames[r.frames.length - 1]!.vars = { ...r.frames[r.frames.length - 1]!.vars, result: 'negative cycle' };
    return r.frames;
  },
  check: (g, f) => {
    const d = refDistances(g, true);
    const neg = g.edges.some((e) => d[e.from]! !== INF && d[e.from]! + e.weight < d[e.to]!);
    const got = f.at(-1)!.vars!.result;
    return neg ? (got === 'negative cycle' ? null : 'should report a negative cycle') : got === d.map((x) => (x === INF ? 'INF' : x)).join(',') ? null : 'wrong distances';
  },
};

export const GRAPH_ALGOS = [bfs, dfs, flood, dijkstra, topo, unionFind, kruskal, prim, bellmanFord];
