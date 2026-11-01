// Race and Compare (PRD 14.2.5). Both run the real algorithms and rank them by the shared `ops` counter:
// steps of work, never wall-clock time.
import { ALGOS } from './algos';
import { parseInput } from './input';
import { fail, ok, type Parsed } from './parse';
import type { AlgoInput, AnyAlgo, Category, Frame } from './types';

export const MIN_LANES = 2;
export const MAX_LANES = 4;
export const STEPS_NOT_TIME = 'Ranked by steps of work (comparisons, swaps, writes), not wall-clock time.';

export const opsOf = (frames: Frame[]): number => frames[frames.length - 1]?.counters.ops ?? 0;

export interface RaceGroup { category: Category; algos: AnyAlgo[] }

/** Categories with at least two algorithms that opted into Race. */
export function raceGroups(): RaceGroup[] {
  const by = new Map<Category, AnyAlgo[]>();
  for (const a of ALGOS) if (a.modes.race) by.set(a.category, [...(by.get(a.category) ?? []), a]);
  return [...by].filter(([, l]) => l.length >= MIN_LANES).map(([category, algos]) => ({ category, algos }));
}

/** One text box feeds every algorithm: each one's own limits (sorted, value range) must accept it. */
export function sharedInput(text: string, target: string, algos: AnyAlgo[]): Parsed<AlgoInput> {
  const spec = { sorted: algos.some((a) => a.input.sorted), target: algos.some((a) => a.input.target) };
  const r = parseInput(spec.target ? `${text}, target = ${target}` : text, spec);
  if (!r.ok) return r;
  for (const a of algos) {
    if (!a.custom) continue;
    const p = a.custom.parse(r.value.arr.join(', '));
    if (!p.ok) return fail(`${a.name}: ${p.error}`);
  }
  return ok(r.value);
}

export interface Lane { algo: AnyAlgo; frames: Frame[]; ops: number }

export const runLanes = (algos: AnyAlgo[], input: AlgoInput): Lane[] =>
  algos.map((algo) => {
    const p = algo.custom?.parse(input.arr.join(', '));
    const frames = algo.run(p?.ok ? p.value : input);
    return { algo, frames, ops: opsOf(frames) };
  });

/** One frame per tick; a lane that has finished stays on its last frame. */
export const laneFrame = (lane: Lane, tick: number): Frame => lane.frames[Math.min(tick, lane.frames.length - 1)]!;
export const raceTicks = (lanes: Lane[]): number => Math.max(0, ...lanes.map((l) => l.frames.length - 1));

/** Standard competition ranking by ops (ties share a place). */
export function ranking(lanes: Lane[]): { id: string; rank: number; ops: number }[] {
  const sorted = [...lanes].sort((a, b) => a.ops - b.ops);
  return sorted.map((l) => ({ id: l.algo.id, ops: l.ops, rank: 1 + sorted.filter((o) => o.ops < l.ops).length }));
}

/** Compare syncs two runs by work done: at tick T each side shows its last frame with ops <= T. */
export function indexAtOps(frames: Frame[], t: number): number {
  let k = 0;
  for (let i = 0; i < frames.length; i++) {
    if ((frames[i]?.counters.ops ?? 0) <= t) k = i;
    else break;
  }
  return k;
}
export const compareTicks = (a: Frame[], b: Frame[]) => Math.max(opsOf(a), opsOf(b));
export const compareSummary = (a: { label: string; frames: Frame[] }, b: { label: string; frames: Frame[] }, n: number) =>
  `${a.label}: ${opsOf(a.frames)} ops · ${b.label}: ${opsOf(b.frames)} ops (n = ${n})`;
