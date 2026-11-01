export type Language = 'java' | 'cpp';
export type Status = 'not_started' | 'attempted' | 'solved';
export type Confidence = 'cleared' | 'need_review' | 'dont_understand';
export type SolveMode = 'alone' | 'hint' | 'solution';

export interface ProgressRecord {
  problemId: string;
  status: Status;
  confidence: Confidence | null;
  solveMode: SolveMode | null;
  firstSolvedAt: string | null;
  lastAttemptAt: string | null;
  attempts: number;
  totalTimeSec: number;
  bestTimeSec: number | null;
  mistakeTags: string[];
  resurface: { stage: number; nextAt: string | null };
  starred: boolean;
  source: 'manual' | 'bulk_import';
  updatedAt: string;
}

// Remaining tables are stored as plain keyed records until their phases land (§9.2).
export interface KeyedRecord {
  [field: string]: unknown;
}

export interface SettingRow {
  key: string;
  value: unknown;
}
export interface MetaRow {
  key: string;
  value: unknown;
}

export const DATA_TABLES = [
  'settings',
  'progress',
  'attempts',
  'notes',
  'cards',
  'reviewLogs',
  'activityDays',
  'quizResults',
  'customSheets',
  'pathState',
  'conceptState',
  'dailyPlans',
  'bookmarks',
  'friendSnapshots',
] as const;
export type DataTable = (typeof DATA_TABLES)[number];

/** Primary key field per exported table. */
export const PRIMARY_KEYS: Record<DataTable, string> = {
  settings: 'key',
  progress: 'problemId',
  attempts: 'id',
  notes: 'id',
  cards: 'id',
  reviewLogs: 'id',
  activityDays: 'date',
  quizResults: 'id',
  customSheets: 'id',
  pathState: 'pathId',
  conceptState: 'conceptId',
  dailyPlans: 'date',
  bookmarks: 'id',
  friendSnapshots: 'id',
};
