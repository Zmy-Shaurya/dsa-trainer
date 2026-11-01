// Step engine types (PRD §14.2.1).
export type Lang = 'java' | 'cpp';
export type Tone =
  | 'neutral' | 'compare' | 'swap' | 'active' | 'sorted' | 'found'
  | 'range' | 'dim' | 'error' | 'visited' | 'frontier' | 'path';

export interface Cell { value: number | string; tone?: Tone; label?: string }
export interface Pointer { name: string; index: number }

export interface ArrayView {
  kind: 'array';
  name?: string;
  cells: Cell[];
  pointers: Pointer[];
  style: 'bars' | 'boxes';
  brackets?: { from: number; to: number; label?: string }[];
}
export interface TreeView {
  kind: 'tree';
  name?: string;
  root: string | null;
  nodes: { id: string; value: number | string; left?: string; right?: string; tone?: Tone }[];
  pointers?: { name: string; nodeId: string }[];
}
export interface GraphView {
  kind: 'graph';
  name?: string;
  nodes: { id: string; label: string; x: number; y: number; tone?: Tone; note?: string }[];
  edges: { from: string; to: string; weight?: number; directed?: boolean; tone?: Tone }[];
}
export interface GridView {
  kind: 'grid';
  name?: string;
  rows: number;
  cols: number;
  cells: Cell[][];
  pointers?: { name: string; r: number; c: number }[];
}
export interface TableView {
  kind: 'table';
  name?: string;
  rowLabels: string[];
  colLabels: string[];
  cells: Cell[][];
  /** DP dependencies: the `from` cells are outlined while `to` is being filled */
  arrows?: { from: [number, number]; to: [number, number] }[];
}
export interface ListView {
  kind: 'list';
  name?: string;
  nodes: { id: string; value: number | string; next: string | null; tone?: Tone }[];
  pointers: { name: string; nodeId: string }[];
}
export type View = ArrayView | TreeView | GraphView | GridView | TableView | ListView;

export interface AuxView {
  structure: 'stack' | 'queue' | 'deque' | 'heap' | 'set' | 'map' | 'list';
  name: string;
  items: (string | number)[];
  highlight?: number[];
}

/** Drive mode: the user clicks the next node / cell / index. Cells are "r,c". */
export interface PickPrompt {
  question: string;
  target: 'node' | 'cell' | 'index';
  valid: (string | number)[];
  explainWrong?: Record<string, string>;
}

export interface PredictPrompt {
  question: string;
  kind: 'choice' | 'index';
  choices?: string[];
  answer: string | number;
  explain: string;
}

export interface Frame {
  views: View[];
  line: string;
  message: string;
  vars?: Record<string, string | number | boolean | null>;
  counters: Record<string, number>;
  invariant?: string;
  event?: string;
  predict?: PredictPrompt;
  aux?: AuxView[];
  pick?: PickPrompt;
}

export interface AlgoInput { arr: number[]; target?: number }
export interface InputSpec { sorted?: boolean; target?: boolean; targetLabel?: string }

export type Category = 'sorting' | 'searching' | 'linear' | 'tree' | 'graph' | 'dp' | 'backtracking' | 'hashing' | 'string' | 'misc';

/** Text-based input for algorithms whose input is not a plain number list. */
export interface CustomInput<I> {
  help: string;
  parse(text: string): { ok: true; value: I } | { ok: false; error: string };
  format(value: I): string;
  presets?: { label: string; text: string }[];
}

export interface AlgoDef<I = AlgoInput> {
  id: string;
  name: string;
  category: Category;
  concepts: string[];
  blurb: string;
  time: string;
  space: string;
  input: InputSpec;
  defaults: I;
  custom?: CustomInput<I>;
  /** extra inputs the contract tests run besides `defaults` (edge cases) */
  samples?: I[];
  code: Record<Lang, string>;
  lines: Record<Lang, Record<string, number | number[]>>;
  run(input: I): Frame[];
  /** Contract test 1: returns a problem description, or null when the last frame is right. */
  check?(input: I, frames: Frame[]): string | null;
  invariants?: string[];
  modes: { predict?: boolean; drive?: boolean; race?: boolean };
  /** Event on the frame AFTER a predict frame that means "Yes" (used by contract tests). */
  predictEvent?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyAlgo = AlgoDef<any>;

export const MAX_FRAMES = 5000;
export const MAX_ARRAY = 20;
export const MIN_VALUE = -99;
export const MAX_VALUE = 999;
