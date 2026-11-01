// Service worker registration, the update prompt, persistence and "download for offline" (PRD 11, 10.6).
import { useEffect, useState } from 'react';

let waiting: ServiceWorker | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Production only: the dev server must never be cached. Updates wait for the user's click, never reload silently. */
export function registerSW(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.register('./sw.js').then((reg) => {
    const check = () => { if (reg.waiting && navigator.serviceWorker.controller) { waiting = reg.waiting; notify(); } };
    check();
    reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', check));
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; location.reload(); }
  });
}

export const applyUpdate = () => waiting?.postMessage('SKIP_WAITING');

export function useUpdateReady(): boolean {
  const [ready, setReady] = useState(!!waiting);
  useEffect(() => {
    const l = () => setReady(!!waiting);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return ready;
}

/** Asked once, on the first click (a meaningful action), so the browser is less likely to evict our data. */
export function persistOnFirstAction(): void {
  if (!navigator.storage?.persist) return;
  const go = () => void navigator.storage.persist().catch(() => undefined);
  window.addEventListener('pointerdown', go, { once: true });
}

export async function storageInfo() {
  const persisted = (await navigator.storage?.persisted?.()) ?? false;
  const est = await navigator.storage?.estimate?.();
  return { persisted, usage: est?.usage, quota: est?.quota };
}

/** Fetches every content file so the service worker caches it. */
export async function downloadForOffline(onProgress: (done: number, total: number) => void): Promise<number> {
  const files = (await (await fetch('./content/files.json')).json()) as string[];
  let done = 0;
  let failed = 0;
  for (let i = 0; i < files.length; i += 8) {
    await Promise.all(files.slice(i, i + 8).map(async (f) => {
      try { if (!(await fetch(`./content/${f}`)).ok) failed++; } catch { failed++; }
      onProgress(++done, files.length);
    }));
  }
  return failed;
}
