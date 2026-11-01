// Optional folder auto-sync (PRD 10.6), Chrome/Edge only. Writes dsa-studio-backup.json and notes/**/*.md.
import Dexie from 'dexie';
import { notesFiles } from '../domain/exports';
import { exportAll } from './export';
import { db } from './schema';

// File System Access API: not in the DOM lib yet.
interface FsHandle {
  queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  name: string;
  getDirectoryHandle(n: string, o: { create: boolean }): Promise<FsHandle>;
  getFileHandle(n: string, o: { create: boolean }): Promise<{ createWritable(): Promise<{ write(d: string): Promise<void>; close(): Promise<void> }> }>;
}

export const folderSyncSupported = () => typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';

const get = async () => (await db.meta.get('syncFolder'))?.value as FsHandle | undefined;

export async function pickFolder(): Promise<string> {
  const h = await (window as unknown as { showDirectoryPicker(o: { mode: 'readwrite' }): Promise<FsHandle> }).showDirectoryPicker({ mode: 'readwrite' });
  await db.meta.put({ key: 'syncFolder', value: h });
  return h.name;
}

export async function folderState(): Promise<{ name: string; ok: boolean; lastSyncAt?: string } | undefined> {
  const h = await get();
  if (!h) return undefined;
  const last = (await db.meta.get('lastSyncAt'))?.value as string | undefined;
  return { name: h.name, ok: (await h.queryPermission({ mode: 'readwrite' })) === 'granted', lastSyncAt: last };
}

export const forgetFolder = () => db.meta.delete('syncFolder');

async function write(dir: FsHandle, name: string, text: string) {
  const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
  await w.write(text);
  await w.close();
}

/** `interactive` (a button click) may prompt to re-authorize; the automatic path only writes when permission is already granted. */
export async function syncNow(interactive = false): Promise<'ok' | 'no-folder' | 'needs-permission'> {
  const h = await get();
  if (!h) return 'no-folder';
  let perm = await h.queryPermission({ mode: 'readwrite' });
  if (perm !== 'granted' && interactive) perm = await h.requestPermission({ mode: 'readwrite' });
  if (perm !== 'granted') return 'needs-permission';
  const env = await exportAll(db, new Date(), undefined, false);
  await write(h, 'dsa-studio-backup.json', JSON.stringify(env, null, 2));
  let dir = await h.getDirectoryHandle('notes', { create: true });
  const made = new Map<string, FsHandle>([['notes', dir]]);
  for (const [path, text] of Object.entries(notesFiles(env.data.notes))) {
    const [, sub, file] = path.split('/') as [string, string, string];
    dir = made.get(sub) ?? (await made.get('notes')!.getDirectoryHandle(sub, { create: true }));
    made.set(sub, dir);
    await write(dir, file, text);
  }
  await db.meta.put({ key: 'lastSyncAt', value: new Date().toISOString() });
  return 'ok';
}

/** 30 s after the last change, and when the tab is hidden. Returns a stop function. */
export function startAutoSync(delayMs = 30_000): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  const run = () => void syncNow().catch(() => undefined);
  const schedule = () => {
    clearTimeout(t);
    t = setTimeout(run, delayMs);
  };
  const hidden = () => { if (document.visibilityState === 'hidden') { clearTimeout(t); run(); } };
  Dexie.on('storagemutated', schedule);
  document.addEventListener('visibilitychange', hidden);
  return () => {
    Dexie.on('storagemutated').unsubscribe(schedule);
    document.removeEventListener('visibilitychange', hidden);
    clearTimeout(t);
  };
}
