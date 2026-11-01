import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import type { ConceptState } from '../db/conceptState';
import { isHidden, type CardRecord } from '../db/cards';
import { useSettings } from '../db/hooks';
import { retrievability } from '../domain/srs';
import type { ProgressRecord } from '../db/types';
import { computeMastery, nextUp, nodeState, type Mastery, type NodeState } from '../domain/mastery';
import { layout, type Placed } from '../domain/treeLayout';
import { useContent } from './loader';
import type { Concept } from './types';

export const TRACKS = ['foundations', 'arrays-strings', 'linear-ds', 'trees', 'graphs', 'recursion-dp', 'advanced'] as const;
export const TRACK_LABEL: Record<string, string> = {
  foundations: 'Foundations', 'arrays-strings': 'Arrays & strings', 'linear-ds': 'Linear structures',
  trees: 'Trees', graphs: 'Graphs', 'recursion-dp': 'Recursion & DP', advanced: 'Advanced',
};

export interface ConceptNode {
  concept: Concept;
  placed: Placed;
  mastery: Mastery;
  state: NodeState;
  solved: number;
  missingPrereqs: Concept[];
  state0?: ConceptState;
}

/** Everything the tree and hub need: layout, mastery and state per concept, plus the next-up node. */
export function useConceptMap() {
  const content = useContent();
  const progress0 = useLiveQuery(() => db.progress.toArray(), []);
  const states0 = useLiveQuery(() => db.conceptState.toArray(), []) as unknown as ConceptState[] | undefined;
  const cards0 = useLiveQuery(() => db.cards.toArray(), []) as unknown as CardRecord[] | undefined;
  const { desiredRetention } = useSettings();
  const quizzes0 = useLiveQuery(() => db.quizResults.orderBy('at').toArray(), []);
  // Consumers that persist things (the daily plan) wait for `loaded` so empty first renders never get frozen.
  const loaded = !!(progress0 && states0 && cards0 && quizzes0);
  const progress: ProgressRecord[] = progress0 ?? [];
  const states = states0 ?? [];
  const cards = cards0 ?? [];
  const quizzes = quizzes0 ?? [];

  return useMemo(() => {
    const concepts = content.index?.concepts ?? [];
    const pmap = new Map(progress.map((p) => [p.problemId, p]));
    const smap = new Map(states.map((s) => [s.conceptId, s]));
    const cmap = new Map(concepts.map((c) => [c.id, c]));
    const placed = new Map(layout(concepts, [...TRACKS]).map((p) => [p.id, p]));
    const nodes = new Map<string, ConceptNode>();

    const now = new Date();
    const retOf = (id: string) => cards
      .filter((c) => c.conceptId === id && !c.suspended && !isHidden(c) && c.fsrs.reps > 0)
      .map((c) => retrievability(c.fsrs, now, { retention: desiredRetention }));
    const quizOf = (id: string) => quizzes.filter((q) => q.conceptId === id).map((q) => q.correct === true);
    const masteryOf = (c: Concept): Mastery => {
      const weightOf = (pid: string) => (content.byId.get(pid)?.concepts[0] === c.id ? 1 : 0.5);
      return computeMastery({
        coreProblems: c.coreProblems, progress: pmap, weightOf, quizOnly: c.quizOnly,
        retrievabilities: retOf(c.id), quizzes: quizOf(c.id), learned: smap.get(c.id)?.learned,
      });
    };
    const masteries = new Map(concepts.map((c) => [c.id, masteryOf(c)]));
    for (const c of concepts) {
      const m = masteries.get(c.id)!;
      const s = smap.get(c.id);
      const pre = c.prereqs.map((p) => cmap.get(p)).filter((x): x is Concept => !!x);
      const preM = pre.map((p) => masteries.get(p.id)!.total);
      nodes.set(c.id, {
        concept: c, placed: placed.get(c.id)!, mastery: m, state0: s,
        state: nodeState({ mastery: m.total, prereqMastery: preM, unlockOverride: s?.unlockOverride, viewed: !!s?.viewedAt }),
        solved: c.coreProblems.filter((id) => pmap.get(id)?.status === 'solved').length,
        missingPrereqs: pre.filter((p) => masteries.get(p.id)!.total < 0.5),
      });
    }
    const next = nextUp([...nodes.values()].map((n) => ({
      id: n.concept.id, depth: n.placed.depth, order: n.concept.order, state: n.state, mastery: n.mastery.total,
    })));
    return { ...content, nodes, next, ready: !!content.index, loaded };
  }, [content, progress, states, quizzes, cards, desiredRetention]);
}
