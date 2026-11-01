import type { CompanyData } from '../content/types';
import { db as defaultDb, type StudioDB } from './schema';

// Imported company lists live in `meta`, not in a data table: they are a reloadable copy of someone else's
// data, so they stay out of backups and exports (and out of any licence question that comes with them).
const PREFIX = 'company:';

export const listImported = async (db: StudioDB = defaultDb) =>
  (await db.meta.where('key').startsWith(PREFIX).toArray()).map((r) => r.value as CompanyData);

/** Importing again replaces the company's list; progress is never touched. */
export const saveImported = (cs: CompanyData[], db: StudioDB = defaultDb) =>
  db.meta.bulkPut(cs.map((c) => ({ key: `${PREFIX}${c.id}`, value: c })));

export const deleteImported = (id: string, db: StudioDB = defaultDb) => db.meta.delete(`${PREFIX}${id}`);
