import Dexie, { type Table } from 'dexie';
import type { DataTable, KeyedRecord, MetaRow, ProgressRecord, SettingRow } from './types';

export const SCHEMA_VERSION = 1;

export class StudioDB extends Dexie {
  meta!: Table<MetaRow, string>;
  settings!: Table<SettingRow, string>;
  progress!: Table<ProgressRecord, string>;
  attempts!: Table<KeyedRecord, string>;
  notes!: Table<KeyedRecord, string>;
  cards!: Table<KeyedRecord, string>;
  reviewLogs!: Table<KeyedRecord, string>;
  activityDays!: Table<KeyedRecord, string>;
  quizResults!: Table<KeyedRecord, string>;
  customSheets!: Table<KeyedRecord, string>;
  pathState!: Table<KeyedRecord, string>;
  conceptState!: Table<KeyedRecord, string>;
  dailyPlans!: Table<KeyedRecord, string>;
  bookmarks!: Table<KeyedRecord, string>;
  friendSnapshots!: Table<KeyedRecord, string>;

  constructor(name = 'dsa-studio') {
    super(name);
    this.version(1).stores({
      meta: 'key',
      settings: 'key',
      progress: 'problemId, status, confidence, nextResurfaceAt, updatedAt',
      attempts: 'id, problemId, at',
      notes: 'id, [scope+refId], updatedAt',
      cards: 'id, conceptId, problemId, due, state, suspended',
      reviewLogs: 'id, cardId, at',
      activityDays: 'date',
      quizResults: 'id, kind, conceptId, at',
      customSheets: 'id, updatedAt',
      pathState: 'pathId',
      conceptState: 'conceptId',
      dailyPlans: 'date',
      bookmarks: 'id, kind, refId',
      friendSnapshots: 'id',
    });
  }

  table_(name: DataTable): Table<Record<string, unknown>, string> {
    return this.table(name) as Table<Record<string, unknown>, string>;
  }
}

export const db = new StudioDB();
