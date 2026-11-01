// Shared by the app and by scripts/*. Keep this file free of imports.
export interface ConceptCard {
  idea: string;
  useWhen: string[];
  complexity: { time: string; space: string; note?: string };
  template: { java: string; cpp: string };
  pitfalls: string[];
  deepDive?: string;
}

export interface Concept {
  id: string;
  title: string;
  track:
    | 'foundations'
    | 'arrays-strings'
    | 'linear-ds'
    | 'trees'
    | 'graphs'
    | 'recursion-dp'
    | 'advanced';
  order: number;
  prereqs: string[];
  card: ConceptCard;
  visualizers?: string[];
  coreProblems: string[];
  quizOnly?: boolean;
  moreProblems?: string[];
}

export type ParamType =
  | 'int' | 'long' | 'double' | 'boolean' | 'string' | 'char'
  | 'int[]' | 'long[]' | 'double[]' | 'string[]' | 'char[]'
  | 'int[][]' | 'char[][]' | 'string[][]'
  | 'ListNode' | 'TreeNode' | 'ListNode[]';

export interface Signature {
  name: string;
  params: { name: string; type: ParamType }[];
  returns: ParamType | 'void';
  mutates?: string;
  compare?: 'exact' | 'unordered' | 'unordered-nested' | { float: number } | 'checker';
  kind?: 'function' | 'design';
}

export interface Approach {
  id: string;
  name: string;
  idea: string;
  unlock?: string;
  time: string;
  space: string;
  preferWhen?: string;
  visualizer?: string;
  files: { java: string; cpp: string };
  isOptimal?: boolean;
}

export type Platform =
  | 'leetcode' | 'gfg' | 'codeforces' | 'cses' | 'codingninjas' | 'hackerrank' | 'other';

export interface ProblemMeta {
  id: string;
  platform: Platform;
  lcNumber?: number;
  title: string;
  url: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tier: 1 | 2 | 3;
  equivalentTo?: string;
  topics: string[];
  patterns: string[];
  concepts: string[];
  insight: string;
  tells: string[];
  hints?: string[];
  traps?: { java?: string[]; cpp?: string[]; both?: string[] };
  followups?: string[];
  estimatedMinutes?: number;
  signature?: Signature;
  approaches?: Approach[];
  unverified?: boolean;
  // DERIVED at build time, never authored:
  sheets?: string[];
}

/** Approach with source text loaded (what `problems/<id>.json` contains). */
export interface ApproachFull extends Omit<Approach, 'files'> {
  code: { java: string; cpp: string };
}
export interface ProblemFull extends Omit<ProblemMeta, 'approaches'> {
  approaches?: ApproachFull[];
  notes?: string;
}

export interface Sheet {
  id: string;
  name: string;
  author?: string;
  sourceUrl?: string;
  asOf?: string;
  description?: string;
  sections: { title: string; problems: string[] }[];
}

/** One day of a learning path (content/paths/<id>.yaml, PRD 8.9). */
export interface PathDay {
  day: number;
  title: string;
  concepts?: string[];
  problems?: string[];
  quizzes?: ('complexity' | 'pattern')[];
  review?: boolean;
  /** problem ids that Compress drops first */
  optional?: string[];
  focus?: string;
}

export interface PathDef {
  id: string;
  name: string;
  description?: string;
  language?: 'any' | 'java' | 'cpp';
  hoursPerDay: number;
  days: PathDay[];
  /** generated paths only: title and difficulty of each problem, for ones the content bank does not have */
  info?: Record<string, { title: string; difficulty: 'easy' | 'medium' | 'hard' }>;
}

export interface PathMeta {
  id: string;
  name: string;
  description?: string;
  hoursPerDay: number;
  days: number;
  problems: number;
}

export type CompanyWindow = '30d' | '3m' | '6m' | '6m+' | 'all';
export const COMPANY_WINDOWS: CompanyWindow[] = ['30d', '3m', '6m', '6m+', 'all'];
export const WINDOW_LABEL: Record<CompanyWindow, string> = {
  '30d': '30 days', '3m': '3 months', '6m': '6 months', '6m+': 'More than 6 months', all: 'All time',
};

/** company -> window -> [{problemId, freq}] (PRD 19). Only the mapping is kept, never statements. */
export interface CompanyData {
  id: string;
  name: string;
  asOf: string;
  source: { repo: string; commit?: string; license: string };
  windows: Partial<Record<CompanyWindow, { problemId: string; freq: number | null }[]>>;
  /** Title and difficulty (unverified, from the source file) for problems the content bank does not have. */
  extra?: Record<string, { title: string; difficulty: 'easy' | 'medium' | 'hard' }>;
}

export interface CompanyIndexEntry {
  id: string;
  name: string;
  asOf: string;
  counts: Partial<Record<CompanyWindow, number>>;
  source: CompanyData['source'];
}

export type ProblemSummary = Pick<
  ProblemMeta,
  'id' | 'title' | 'difficulty' | 'tier' | 'topics' | 'patterns' | 'concepts' | 'platform' | 'url' | 'equivalentTo' | 'lcNumber' | 'unverified'
> & { sheets: string[]; hasApproaches: boolean };

export type CardType = 'basic' | 'cloze' | 'code' | 'complexity' | 'trap';

/** One authored card (content/cards/<concept>.yaml). Fields used depend on `type`. */
export interface AuthoredCard {
  id: number;
  type: CardType;
  front?: string;
  back?: string;
  /** cloze: contains exactly one {{c1::...}} */
  text?: string;
  prompt?: string;
  code?: { java: string; cpp: string };
  answer?: string;
}

export interface CardsFile {
  concept: string;
  cards: AuthoredCard[];
}

export interface ContentIndex {
  contentVersion: string;
  concepts: Concept[];
  problems: ProblemSummary[];
  sheets: Sheet[];
  paths: PathMeta[];
  /** old id -> new id (content/aliases.yaml) */
  aliases: Record<string, string>;
  /** authored card ids per concept (text lives in cards/<concept>.json) */
  cardIds: Record<string, number[]>;
  quizzes: { complexityCount: number; patternCount: number };
  cheatsheets: CheatsheetMeta[];
  languageGuide: { id: string; title: string; category: GuideCategory }[];
  templates: { id: string; title: string; concept: string; variants: number }[];
}

export const QUIZ_TOPICS = ['loops', 'recursion', 'amortised', 'strings', 'data-structures', 'language-traps'] as const;
export type QuizTopic = (typeof QUIZ_TOPICS)[number];

/** A complexity answer; an object when Java and C++ differ. */
export type LangAnswer = string | { java: string; cpp: string };

export interface ComplexityItem {
  id: number;
  topic: QuizTopic;
  code: { java: string; cpp: string };
  time: LangAnswer;
  space: LangAnswer;
  options: { time: string[]; space: string[] };
  why: string;
  trap: boolean;
  concepts: string[];
}

export interface PatternItem {
  id: number;
  problem: string;
  /** our own paraphrase, never the official statement */
  prompt: string;
  answer: string;
  distractors: string[];
  tells: string[];
}

export const GUIDE_CATEGORIES = ['collections', 'strings', 'numbers', 'sorting', 'memory', 'io', 'recursion'] as const;
export type GuideCategory = (typeof GUIDE_CATEGORIES)[number];

export interface GuideCard {
  id: string;
  title: string;
  category: GuideCategory;
  java: string;
  cpp: string;
  trap: string;
  complexity?: string;
}

export interface TemplateVariant {
  id: string;
  title: string;
  java: string;
  cpp: string;
}

export interface TemplatePage {
  id: string;
  title: string;
  concept: string;
  when: string;
  pitfalls: string[];
  problems: string[];
  variants: TemplateVariant[];
}

export interface CheatsheetMeta {
  id: string;
  title: string;
  printable: boolean;
}

export interface Cheatsheet extends CheatsheetMeta {
  body: string;
}
