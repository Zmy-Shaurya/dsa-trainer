import { useEffect, useMemo, useState } from 'react';
import { canonicalId } from '../domain/sheets';
import { authoredId } from '../db/cards';
import type { AuthoredCard, CardsFile, ContentIndex, ProblemFull } from './types';

let cached: Promise<ContentIndex> | undefined;

/** Loads the generated content index once (relative URL so any static host works). */
export function loadIndex(): Promise<ContentIndex> {
  cached ??= fetch('./content/index.json').then((r) => {
    if (!r.ok) throw new Error(`Content index failed to load (${r.status}).`);
    return r.json() as Promise<ContentIndex>;
  });
  return cached;
}

/** Same `:` -> `__` mapping as scripts/content-lib.ts (Windows-safe folder names). */
const folderOf = (id: string) => id.replace(/:/g, '__');

export async function loadProblem(id: string): Promise<ProblemFull> {
  const r = await fetch(`./content/problems/${folderOf(id)}.json`);
  if (!r.ok) throw new Error(`Problem "${id}" failed to load (${r.status}).`);
  return r.json() as Promise<ProblemFull>;
}

/** Index plus lookups. `index` is undefined while loading. */
export function useContent() {
  const [index, setIndex] = useState<ContentIndex>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    loadIndex().then(setIndex, (e: Error) => setError(e.message));
  }, []);
  return useMemo(() => {
    const byId = new Map((index?.problems ?? []).map((p) => [p.id, p]));
    const canon = (id: string) => canonicalId(id, index?.aliases ?? {}, byId);
    return { index, error, byId, canon };
  }, [index, error]);
}

/** A problem with its approach code, loaded on demand. */
export function useProblem(id: string | undefined) {
  const [state, setState] = useState<{ id: string; problem?: ProblemFull; error?: string }>();
  useEffect(() => {
    if (!id) return;
    loadProblem(id).then(
      (problem) => setState({ id, problem }),
      (e: Error) => setState({ id, error: e.message }),
    );
  }, [id]);
  return state?.id === id ? state : undefined;
}

let cardsCache: Promise<Map<string, AuthoredCard>> | undefined;

/** All authored card text, keyed by the app card id (c:<concept>:<n>). */
export function loadAuthoredCards(): Promise<Map<string, AuthoredCard>> {
  cardsCache ??= loadIndex().then(async (i) => {
    const files = await Promise.all(Object.keys(i.cardIds).map(async (c) => {
      const r = await fetch(`./content/cards/${c}.json`);
      if (!r.ok) throw new Error(`Cards for "${c}" failed to load (${r.status}).`);
      return (await r.json()) as CardsFile;
    }));
    return new Map(files.flatMap((f) => f.cards.map((c) => [authoredId(f.concept, c.id), c] as const)));
  });
  return cardsCache;
}

export function useAuthoredCards() {
  const [cards, setCards] = useState<Map<string, AuthoredCard>>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    loadAuthoredCards().then(setCards, (e: Error) => setError(e.message));
  }, []);
  return { cards, error };
}

const jsonCache = new Map<string, Promise<unknown>>();

/** Loads a generated JSON file under /content once per session. */
export function loadJson<T>(path: string): Promise<T> {
  let p = jsonCache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = fetch(`./content/${path}`).then((r) => {
      if (!r.ok) throw new Error(`${path} failed to load (${r.status}).`);
      return r.json() as Promise<T>;
    });
    jsonCache.set(path, p);
  }
  return p;
}

/** `data` is undefined while loading; `error` is set when the file is missing. */
export function useJson<T>(path: string | undefined) {
  const [state, setState] = useState<{ path: string; data?: T; error?: string }>();
  useEffect(() => {
    if (!path) return;
    loadJson<T>(path).then(
      (data) => setState({ path, data }),
      (e: Error) => setState({ path, error: e.message }),
    );
  }, [path]);
  const s = state?.path === path ? state : undefined;
  return { data: s?.data, error: s?.error };
}
