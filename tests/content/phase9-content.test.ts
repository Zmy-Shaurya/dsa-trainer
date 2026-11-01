import { describe, expect, it } from 'vitest';
import { ALGOS } from '../../src/engine/algos';
import { loadConcepts, loadProblems } from '../../scripts/content-lib';

const ids = new Set(ALGOS.map((a) => a.id));
const concepts = loadConcepts();
const conceptIds = new Set(concepts.map((c) => c.id));

describe('visualizer links in content', () => {
  it('every concept visualizer id is a real visualizer', () => {
    for (const c of concepts) for (const v of c.visualizers ?? []) expect(ids.has(v), `${c.id} -> ${v}`).toBe(true);
  });

  it('every visualizer is listed by at least one concept hub', () => {
    const listed = new Set(concepts.flatMap((c) => c.visualizers ?? []));
    for (const a of ALGOS) expect(listed.has(a.id), a.id).toBe(true);
  });

  it('every concept a visualizer claims exists', () => {
    for (const a of ALGOS) for (const c of a.concepts) expect(conceptIds.has(c), `${a.id} -> ${c}`).toBe(true);
  });

  it('every problem approach visualizer is a real visualizer, and Compare has at least two problems', () => {
    let withCompare = 0;
    for (const p of loadProblems()) {
      const vs = (p.meta.approaches ?? []).flatMap((a) => (a.visualizer ? [a.visualizer] : []));
      for (const v of vs) expect(ids.has(v), `${p.meta.id} -> ${v}`).toBe(true);
      if (new Set(vs).size >= 2) withCompare++;
    }
    expect(withCompare).toBeGreaterThanOrEqual(2);
  });
});
