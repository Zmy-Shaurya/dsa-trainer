import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listImported } from '../db/companies';
import { loadJson } from './loader';
import type { CompanyData, CompanyIndexEntry } from './types';
import { countsOf } from '../domain/companies';

export interface CompanyEntry extends CompanyIndexEntry {
  imported: boolean;
}

/** Bundled companies (none unless the owner built some in) plus the ones imported on this device. Imported wins on a clash. */
export function useCompanyList() {
  const imported = useLiveQuery(() => listImported(), []);
  const [bundled, setBundled] = useState<CompanyIndexEntry[]>();
  useEffect(() => {
    loadJson<CompanyIndexEntry[]>('companies/index.json').then(setBundled, () => setBundled([]));
  }, []);
  const entries = useMemo((): CompanyEntry[] | undefined => {
    if (!imported || !bundled) return undefined;
    const mine = new Map(imported.map((c) => [c.id, { id: c.id, name: c.name, asOf: c.asOf, counts: countsOf(c), source: c.source, imported: true }]));
    return [...bundled.filter((b) => !mine.has(b.id)).map((b) => ({ ...b, imported: false })), ...mine.values()]
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [imported, bundled]);
  return { entries, imported };
}

export function useCompany(id: string | undefined) {
  const imported = useLiveQuery(() => listImported(), []);
  const [bundled, setBundled] = useState<{ id: string; data?: CompanyData; error?: string }>();
  useEffect(() => {
    if (!id) return;
    loadJson<CompanyData>(`companies/${id}.json`).then(
      (data) => setBundled({ id, data }),
      (e: Error) => setBundled({ id, error: e.message }),
    );
  }, [id]);
  const mine = imported?.find((c) => c.id === id);
  if (mine) return { data: mine, loading: false };
  if (!imported || !bundled || bundled.id !== id) return { data: undefined, loading: true };
  return { data: bundled.data, loading: false };
}
