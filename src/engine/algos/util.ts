import type { ArrayView, Frame, Lang, PickPrompt, PredictPrompt, Tone } from '../types';

export interface Snap {
  arr: number[];
  tones?: Record<number, Tone>;
  pointers?: [name: string, index: number][];
  brackets?: { from: number; to: number; label?: string }[];
  /** Extra views, e.g. merge sort's temp array. */
  extra?: ArrayView[];
  line: string;
  message: string;
  vars?: Frame['vars'];
  invariant?: string;
  event?: string;
  predict?: PredictPrompt;
  pick?: PickPrompt;
}

/** Collects frames and counters. Every frame is built from fresh objects (no shared references). */
export class Recorder {
  frames: Frame[] = [];
  comparisons = 0;
  swaps = 0;
  writes = 0;

  get ops() {
    return this.comparisons + this.swaps + this.writes;
  }

  add(s: Snap): void {
    const view: ArrayView = {
      kind: 'array',
      style: 'bars',
      cells: s.arr.map((value, i) => {
        const tone = s.tones?.[i];
        return tone ? { value, tone } : { value };
      }),
      pointers: (s.pointers ?? []).map(([name, index]) => ({ name, index })),
      ...(s.brackets ? { brackets: s.brackets.map((b) => ({ ...b })) } : {}),
    };
    const extra = (s.extra ?? []).map((v) => ({
      ...v,
      cells: v.cells.map((c) => ({ ...c })),
      pointers: v.pointers.map((p) => ({ ...p })),
    }));
    this.frames.push({
      views: [view, ...extra],
      line: s.line,
      message: s.message,
      counters: { comparisons: this.comparisons, swaps: this.swaps, writes: this.writes, ops: this.ops },
      ...(s.vars ? { vars: { ...s.vars } } : {}),
      ...(s.invariant ? { invariant: s.invariant } : {}),
      ...(s.event ? { event: s.event } : {}),
      ...(s.pick ? { pick: { ...s.pick, valid: [...s.pick.valid], ...(s.pick.explainWrong ? { explainWrong: { ...s.pick.explainWrong } } : {}) } } : {}),
      ...(s.predict
        ? { predict: { ...s.predict, ...(s.predict.choices ? { choices: [...s.predict.choices] } : {}) } }
        : {}),
    });
  }
}

export const yesNo = (cond: boolean) => (cond ? 'Yes' : 'No');

/** Java and C++ snippets share one line layout so a single line map serves both. */
export function sameLines(
  map: Record<string, number | number[]>,
): Record<Lang, Record<string, number | number[]>> {
  return { java: map, cpp: { ...map } };
}

/** Tone `tone` on indices [from, to). */
export function range(from: number, to: number, tone: Tone): Record<number, Tone> {
  const t: Record<number, Tone> = {};
  for (let i = from; i < to; i++) t[i] = tone;
  return t;
}
