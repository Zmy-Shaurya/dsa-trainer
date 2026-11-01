import { describe, expect, it } from 'vitest';
import { ALGOS, getAlgo } from '../../src/engine/algos';
import { bestCoins, CHALLENGES, challengeFor, flawedBinary, greedyCoins, quickComparisons, selectionSortLabelled } from '../../src/engine/breakit';
import { parseGraph } from '../../src/engine/parse';
import { compareSummary, compareTicks, indexAtOps, laneFrame, opsOf, ranking, raceGroups, raceTicks, runLanes, sharedInput } from '../../src/engine/race';

// PRD 14.2.5: every visualizer the phase promises.
const REQUIRED = [
  'bubble-sort', 'selection-sort', 'insertion-sort', 'merge-sort', 'quick-sort', 'linear-search', 'binary-search',
  'heap-sort', 'counting-sort', 'two-pointers-sorted-pair', 'sliding-window-max-sum', 'longest-unique-substring', 'prefix-sums', 'kadane',
  'monotonic-stack-next-greater', 'reverse-linked-list', 'floyd-cycle', 'binary-search-on-answer', 'quickselect',
  'bst-insert-search-delete', 'tree-traversals', 'heap-push-pop', 'trie-insert-search',
  'bfs-graph', 'dfs-graph', 'flood-fill-grid', 'dijkstra', 'topological-sort-kahn', 'union-find', 'kruskal', 'prim', 'bellman-ford',
  'climbing-stairs-dp', 'coin-change-dp', 'knapsack-01', 'lcs', 'edit-distance', 'lis',
  'subsets', 'permutations', 'n-queens', 'combination-sum', 'hashmap-internals', 'kmp', 'sieve', 'recursion-call-stack',
];

describe('catalogue', () => {
  it('has every visualizer from the PRD with unique ids and both languages', () => {
    const ids = ALGOS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of REQUIRED) expect(ids, id).toContain(id);
    for (const a of ALGOS) {
      expect(a.code.java.length, a.id).toBeGreaterThan(20);
      expect(a.code.cpp.length, a.id).toBeGreaterThan(20);
      expect(a.concepts.length, a.id).toBeGreaterThan(0);
    }
  });

  it('Drive is offered on BFS, DFS, Dijkstra, topological sort, binary search and the merge step of merge sort', () => {
    for (const id of ['bfs-graph', 'dfs-graph', 'dijkstra', 'topological-sort-kahn', 'binary-search', 'merge-sort']) {
      const a = getAlgo(id)!;
      expect(a.modes.drive, id).toBe(true);
      expect(a.run(a.defaults).some((f) => f.pick), id).toBe(true);
    }
  });
});

describe('Drive picks', () => {
  it('explain every wrong choice and accept exactly the right node', () => {
    for (const id of ['bfs-graph', 'dfs-graph', 'dijkstra', 'topological-sort-kahn']) {
      const a = getAlgo(id)!;
      for (const f of a.run(a.defaults)) {
        if (!f.pick) continue;
        expect(f.pick.target).toBe('node');
        expect(f.pick.valid).toHaveLength(1);
        const v = String(f.pick.valid[0]);
        expect(f.pick.explainWrong?.[v]).toBeUndefined();
        const wrong = Object.keys(f.pick.explainWrong ?? {});
        expect(wrong.length).toBeGreaterThan(0);
        for (const w of wrong) expect(f.pick.explainWrong![w]!.length).toBeGreaterThan(10);
      }
    }
  });

  it('BFS asks for the queue front each time and visits in FIFO order', () => {
    const a = getAlgo('bfs-graph')!;
    const frames = a.run(a.defaults);
    const picks = frames.filter((f) => f.pick).map((f) => String(f.pick!.valid[0]));
    expect(picks.join('')).toBe(String(frames.at(-1)!.vars!.result));
    expect(picks[0]).toBe('A');
  });

  it('binary search and merge sort ask for an index inside the current range', () => {
    const b = getAlgo('binary-search')!;
    const f = b.run({ arr: [1, 2, 3, 5, 6, 8, 9], target: 6 }).find((x) => x.pick)!;
    expect(f.pick!.target).toBe('index');
    expect(f.pick!.valid).toEqual([3]);
    expect(f.pick!.explainWrong!['0']).toMatch(/Index 0/);
    const m = getAlgo('merge-sort')!.run({ arr: [4, 1] }).find((x) => x.pick)!;
    expect(m.pick!.valid).toEqual([1]);
  });
});

describe('graph parsing', () => {
  const U = { directed: false, weighted: false };
  it('reads letters, weights and start', () => {
    const r = parseGraph('A-B:4 B>C start=B', { directed: false, weighted: true });
    expect(r).toEqual({ ok: true, value: { n: 3, start: 1, edges: [{ from: 0, to: 1, weight: 4 }, { from: 1, to: 2, weight: 1 }] } });
  });
  it('rejects bad edges, duplicates, big graphs and unsafe weights', () => {
    expect(parseGraph('A-', U).ok).toBe(false);
    expect(parseGraph('', U).ok).toBe(false);
    expect(parseGraph('A-A', U).ok).toBe(false);
    expect(parseGraph('A-B B-A', U).ok).toBe(false);
    expect(parseGraph('A-M', U).ok).toBe(false);
    expect(parseGraph('A-B:-2', { directed: false, weighted: true }).ok).toBe(false);
    expect(parseGraph('A-B:-2', { directed: true, weighted: true, negative: true }).ok).toBe(true);
    expect(parseGraph('A-B C-D', { directed: false, weighted: false, connected: true }).ok).toBe(false);
    const many = Array.from({ length: 21 }, (_, i) => `${String.fromCharCode(65 + (i % 11))}-${String.fromCharCode(65 + ((i % 11) + 1))}${i}`).join(' ');
    expect(parseGraph(many, U).ok).toBe(false);
  });
});

describe('algorithm specifics', () => {
  it('Dijkstra rejects negative edges but Bellman-Ford handles and detects them', () => {
    expect(getAlgo('dijkstra')!.custom!.parse('A-B:-1').ok).toBe(false);
    const bf = getAlgo('bellman-ford')!;
    const neg = bf.custom!.parse('A>B:4 A>C:5 B>C:-3 start=A');
    expect(neg.ok && bf.run(neg.value).at(-1)!.vars!.result).toBe('0,4,1');
    const cyc = bf.custom!.parse('A>B:1 B>C:-3 C>B:1 start=A');
    expect(cyc.ok && bf.run(cyc.value).at(-1)!.vars!.result).toBe('negative cycle');
  });

  it('topological sort reports a cycle', () => {
    const t = getAlgo('topological-sort-kahn')!;
    const cyc = t.custom!.parse('A>B B>C C>A');
    expect(cyc.ok && t.run(cyc.value).at(-1)!.vars!.result).toBe('cycle');
  });

  it('N-Queens finds the known solution counts', () => {
    const q = getAlgo('n-queens')!;
    expect([1, 2, 3, 4, 5, 6].map((n) => q.run({ n }).at(-1)!.vars!.result)).toEqual([1, 0, 0, 2, 10, 4]);
  });

  it('input limits are enforced by the custom parsers', () => {
    expect(getAlgo('counting-sort')!.custom!.parse('3, 16').ok).toBe(false);
    expect(getAlgo('subsets')!.custom!.parse('1,2,3,4,5,6').ok).toBe(false);
    expect(getAlgo('n-queens')!.custom!.parse('7').ok).toBe(false);
    expect(getAlgo('flood-fill-grid')!.custom!.parse('10/01/1').ok).toBe(false);
    expect(getAlgo('longest-unique-substring')!.custom!.parse('a'.repeat(21)).ok).toBe(false);
    expect(getAlgo('tree-traversals')!.custom!.parse('1, null, 2, 3').ok).toBe(false);
    expect(getAlgo('kmp')!.custom!.parse('abc | abcdefghi').ok).toBe(false);
    expect(getAlgo('lcs')!.custom!.parse('abcdefghijk | a').ok).toBe(false);
  });

  it('every algorithm stays under the frame cap on its worst allowed input', () => {
    const worst: Record<string, unknown> = {
      'recursion-call-stack': { n: 8, memo: false }, 'n-queens': { n: 6 }, permutations: { arr: [1, 2, 3, 4, 5] }, sieve: { n: 100 },
      'coin-change-dp': { coins: [1, 2, 5, 10, 20], amount: 30 }, lis: { arr: Array.from({ length: 20 }, (_, i) => i) },
      'flood-fill-grid': { grid: Array.from({ length: 10 }, (_, r) => Array.from({ length: 10 }, (_, c) => (r + c) % 2)) },
    };
    for (const [id, input] of Object.entries(worst)) expect(getAlgo(id)!.run(input).length, id).toBeLessThanOrEqual(5000);
  });
});

describe('Break it', () => {
  it('has all six challenges, each attached to a visualizer', () => {
    expect(CHALLENGES.map((c) => c.id).sort()).toEqual([
      'binary-search-lt', 'bst-validate-children', 'dijkstra-negative-edge', 'greedy-coin-change', 'quick-sort-worst-case', 'selection-sort-stable',
    ]);
    for (const c of CHALLENGES) {
      expect(getAlgo(c.algoId), c.id).toBeDefined();
      expect(challengeFor(c.algoId)).toBe(c);
      expect(c.code.java.length).toBeGreaterThan(30);
      expect(c.code.cpp.length).toBeGreaterThan(30);
    }
  });

  it('the starting input works, the Show me input breaks it', () => {
    for (const c of CHALLENGES) {
      const ok = c.parse(c.start);
      const bad = c.parse(c.show);
      expect(ok.ok, `${c.id} start parses`).toBe(true);
      expect(bad.ok, `${c.id} show parses`).toBe(true);
      expect(c.run((ok as { value: unknown }).value).broken, `${c.id} start`).toBe(false);
      const r = c.run((bad as { value: unknown }).value);
      expect(r.broken, `${c.id} show`).toBe(true);
      expect(r.flawed).not.toBe(r.reference);
    }
  });

  it('greedy coin change: [1,3,4] amount 6 gives 3 coins where 2 are enough', () => {
    expect(greedyCoins([1, 3, 4], 6)).toBe(3);
    expect(bestCoins([1, 3, 4], 6)).toBe(2);
    expect(greedyCoins([1, 5, 10], 12)).toBe(bestCoins([1, 5, 10], 12));
  });

  it('binary search with lo < hi misses single-element arrays', () => {
    expect(flawedBinary([7], 7)).toBe(-1);
    expect(flawedBinary([1, 3], 3)).toBe(-1);
    expect(flawedBinary([1, 3, 5, 7, 9], 5)).toBe(2);
  });

  it('quick sort with a first pivot is quadratic on sorted input', () => {
    expect(quickComparisons([1, 2, 3, 4, 5, 6, 7, 8])).toBe(28);
    expect(quickComparisons([8, 7, 6, 5, 4, 3, 2, 1])).toBe(28);
    expect(quickComparisons([5, 3, 8, 1, 9, 2, 7])).toBeLessThan(19);
    expect(CHALLENGES.find((c) => c.id === 'quick-sort-worst-case')!.parse('1, 2, 3').ok).toBe(false);
  });

  it('selection sort moves equal elements past each other', () => {
    const out = selectionSortLabelled([{ v: 2, tag: 'a' }, { v: 2, tag: 'b' }, { v: 1, tag: '' }]);
    expect(out.map((x) => `${x.v}${x.tag}`)).toEqual(['1', '2b', '2a']);
  });

  it('labels duplicates automatically', () => {
    const p = CHALLENGES.find((c) => c.id === 'selection-sort-stable')!.parse('3, 1, 3, 2');
    expect(p.ok && (p.value as { items: { v: number; tag: string }[] }).items.map((x) => `${x.v}${x.tag}`)).toEqual(['3a', '1', '3b', '2']);
  });

  it('Dijkstra on a negative edge disagrees with Bellman-Ford; flags a negative cycle', () => {
    const c = CHALLENGES.find((x) => x.id === 'dijkstra-negative-edge')!;
    const p = c.parse('A>B:1 A>C:4 C>B:-5 B>D:1 start=A');
    const r = p.ok && c.run(p.value);
    expect(r && r.flawed).toContain('D=2');
    expect(r && r.reference).toContain('D=0');
    const cyc = c.parse('A>B:1 B>C:-3 C>B:1 start=A');
    expect(cyc.ok && c.run(cyc.value).reference).toBe('negative cycle');
  });
});

describe('Race', () => {
  it('offers sorting and searching with at least two algorithms each', () => {
    const g = raceGroups();
    expect(g.map((x) => x.category)).toEqual(expect.arrayContaining(['sorting', 'searching']));
    for (const x of g) expect(x.algos.length).toBeGreaterThanOrEqual(2);
  });

  it('runs the same input through every lane, ranks by ops and shares places on ties', () => {
    const sorting = raceGroups().find((g) => g.category === 'sorting')!;
    const algos = sorting.algos.filter((a) => ['bubble-sort', 'merge-sort', 'insertion-sort'].includes(a.id));
    const input = sharedInput('9, 7, 5, 3, 1, 2, 4, 6', '0', algos);
    expect(input.ok).toBe(true);
    if (!input.ok) return;
    const lanes = runLanes(algos, input.value);
    expect(lanes).toHaveLength(3);
    const rank = ranking(lanes);
    expect(rank.map((r) => r.ops)).toEqual(rank.map((r) => r.ops).sort((a, b) => a - b));
    expect(rank[0]!.rank).toBe(1);
    const tie = ranking([{ ...lanes[0]!, ops: 5 }, { ...lanes[1]!, ops: 5 }, { ...lanes[2]!, ops: 9 }]);
    expect(tie.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(raceTicks(lanes)).toBe(Math.max(...lanes.map((l) => l.frames.length)) - 1);
    expect(laneFrame(lanes[0]!, 10 ** 6)).toBe(lanes[0]!.frames.at(-1));
  });

  it('refuses an input one contestant cannot take (counting sort needs 0..15)', () => {
    const algos = raceGroups().find((g) => g.category === 'sorting')!.algos.filter((a) => ['counting-sort', 'merge-sort'].includes(a.id));
    const r = sharedInput('3, 100, 2', '0', algos);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/Counting sort/);
  });

  it('sorts the input for search races and gives every lane the target', () => {
    const algos = raceGroups().find((g) => g.category === 'searching')!.algos;
    const r = sharedInput('9, 1, 5, 3', '5', algos);
    expect(r.ok && r.value).toEqual({ arr: [1, 3, 5, 9], target: 5 });
  });

  it('binary search beats linear search on a big sorted input', () => {
    const algos = ['linear-search', 'binary-search'].map((id) => getAlgo(id)!);
    const lanes = runLanes(algos, { arr: Array.from({ length: 20 }, (_, i) => i), target: 19 });
    expect(lanes[1]!.ops).toBeLessThan(lanes[0]!.ops);
  });
});

describe('Compare', () => {
  it('Two Sum on 10 numbers with no answer: brute force does 45 pair checks, the hash map far fewer', () => {
    const a = getAlgo('two-sum-brute')!;
    const b = getAlgo('two-sum-hash')!;
    const input = { arr: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], target: 100 };
    const fa = a.run(input);
    const fb = b.run(input);
    expect(opsOf(fa)).toBe(45);
    expect(opsOf(fb)).toBeLessThan(25);
    expect(compareSummary({ label: 'Brute', frames: fa }, { label: 'Hash map', frames: fb }, 10)).toBe(`Brute: 45 ops · Hash map: ${opsOf(fb)} ops (n = 10)`);
    expect(compareTicks(fa, fb)).toBe(45);
  });

  it('syncs both runs by operations: the cheaper side is finished before the other', () => {
    const a = getAlgo('two-sum-brute')!.run({ arr: [1, 2, 3, 4, 5, 6], target: 100 });
    const b = getAlgo('two-sum-hash')!.run({ arr: [1, 2, 3, 4, 5, 6], target: 100 });
    expect(indexAtOps(a, 0)).toBe(0);
    expect(indexAtOps(b, 10 ** 6)).toBe(b.length - 1);
    expect(indexAtOps(b, opsOf(b))).toBe(b.length - 1);
    expect(indexAtOps(a, opsOf(b))).toBeLessThan(a.length - 1);
    let prev = 0;
    for (let t = 0; t <= opsOf(a); t++) { const i = indexAtOps(a, t); expect(i).toBeGreaterThanOrEqual(prev); prev = i; }
  });

  it('both Two Sum variants agree with each other', () => {
    const a = getAlgo('two-sum-brute')!;
    const b = getAlgo('two-sum-hash')!;
    for (const input of [{ arr: [2, 7, 11, 15], target: 9 }, { arr: [3, 3], target: 6 }, { arr: [1, 2], target: 9 }]) {
      const ra = String(a.run(input).at(-1)!.vars!.result);
      const rb = String(b.run(input).at(-1)!.vars!.result);
      expect(ra === '-1,-1').toBe(rb === '-1,-1');
    }
  });
});
