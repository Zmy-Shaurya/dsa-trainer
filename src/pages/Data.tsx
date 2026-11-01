import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadAuthoredCards, loadIndex } from '../content/loader';
import { exportAll } from '../db/export';
import { folderState, folderSyncSupported, forgetFolder, pickFolder, syncNow } from '../db/folderSync';
import { useSettings } from '../db/hooks';
import { db } from '../db/schema';
import { setSetting } from '../db/settings';
import { encryptBackup } from '../domain/backupCrypto';
import { makeSnapshot } from '../domain/compare';
import { ankiTsv, notesZip, progressCsv } from '../domain/exports';
import type { Row } from '../domain/merge';
import { downloadForOffline, storageInfo } from '../pwa';
import { ImportPanel } from './data/ImportPanel';
import { saveFile, today } from './data/download';

const mb = (n?: number) => (n === undefined ? '?' : `${(n / 1048576).toFixed(1)} MB`);

function Backup() {
  const [msg, setMsg] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [name, setName] = useState('');

  const full = async () => {
    const env = await exportAll(undefined, new Date(), (await loadIndex().catch(() => undefined))?.contentVersion);
    return JSON.stringify(env, null, 2);
  };
  const run = (label: string, f: () => Promise<void>) => async () => {
    try { await f(); setMsg(`${label} saved.`); } catch (e) { setMsg((e as Error).message); }
  };

  return (
    <section className="card stack" aria-label="Export">
      <h2>Export</h2>
      <div className="row">
        <button className="btn primary" onClick={run('Backup', async () => saveFile(`dsa-studio-backup-${today()}.json`, await full()))}>Full backup (JSON)</button>
        <button className="btn" onClick={run('Notes', async () => saveFile(`dsa-studio-notes-${today()}.zip`, notesZip((await db.notes.toArray()) as Row[]) as BlobPart, 'application/zip'))}>Notes (Markdown zip)</button>
        <button className="btn" onClick={run('CSV', async () => {
          const idx = await loadIndex();
          const titles = new Map(idx.problems.map((p) => [p.id, p.title]));
          saveFile(`dsa-studio-progress-${today()}.csv`, progressCsv((await db.progress.toArray()) as unknown as Row[], (id) => titles.get(id) ?? id), 'text/csv');
        })}>Progress (CSV)</button>
        <button className="btn" onClick={run('Anki file', async () => {
          const authored = await loadAuthoredCards();
          saveFile(`dsa-studio-cards-${today()}.tsv`, ankiTsv((await db.cards.toArray()) as Row[], authored as unknown as Map<string, Row>), 'text/tab-separated-values');
        })}>Cards (Anki TSV)</button>
      </div>

      <form className="row" onSubmit={(e) => { e.preventDefault(); void run('Encrypted backup', async () => {
        if (pass !== pass2) throw new Error('The passphrases differ.');
        const enc = await encryptBackup(await full(), pass);
        saveFile(`dsa-studio-backup-${today()}.dsabackup`, JSON.stringify(enc));
        setPass(''); setPass2('');
      })(); }}>
        <label>Passphrase <input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} /></label>
        <label>Again <input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} /></label>
        <button className="btn" disabled={pass.length < 8}>Encrypted backup</button>
      </form>
      <p className="muted">AES-256 with a key derived from your passphrase (at least 8 characters). The passphrase is never stored: lose it and the file cannot be opened.</p>

      <form className="row" onSubmit={(e) => { e.preventDefault(); void run('Snapshot', async () =>
        saveFile(`dsa-studio-snapshot-${today()}.json`, JSON.stringify(makeSnapshot(name.trim() || 'Me', (await db.progress.toArray()) as unknown as Row[]), null, 2)))(); }}>
        <label>Your name <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="shown to your friend" /></label>
        <button className="btn">Progress snapshot for a friend</button>
      </form>
      {msg && <p role="status">{msg}</p>}
    </section>
  );
}

function Storage() {
  const s = useSettings();
  const [info, setInfo] = useState<Awaited<ReturnType<typeof storageInfo>>>();
  const [last, setLast] = useState<string>();
  const refresh = () => {
    void storageInfo().then(setInfo);
    void db.meta.get('lastExportAt').then((r) => setLast(r?.value as string | undefined));
  };
  useEffect(refresh, []);
  return (
    <section className="card stack" aria-label="Storage and reminders">
      <h2>Storage</h2>
      <p>
        {info?.persisted ? 'Protected: the browser will not clear this data automatically.' : 'Not protected: the browser may clear this data if the device runs low on space.'}{' '}
        Using {mb(info?.usage)} of {mb(info?.quota)}.
      </p>
      {!info?.persisted && (
        <button className="btn" onClick={() => void navigator.storage?.persist?.().then(refresh)}>Request protection</button>
      )}
      <p>Last backup: {last ? new Date(last).toLocaleString() : 'never'}.</p>
      <label>Remind me after <input type="number" min={0} max={90} value={s.backupReminderDays} style={{ width: '5em' }}
        onChange={(e) => void setSetting('backupReminderDays', Math.max(0, Number(e.target.value) || 0))} /> days without a backup (0 = never)</label>
    </section>
  );
}

function Folder() {
  const [state, setState] = useState<Awaited<ReturnType<typeof folderState>>>();
  const [msg, setMsg] = useState('');
  const refresh = () => void folderState().then(setState);
  useEffect(refresh, []);
  if (!folderSyncSupported()) return null;
  return (
    <section className="card stack" aria-label="Folder sync">
      <h2>Folder sync</h2>
      <p className="muted">Keeps <code>dsa-studio-backup.json</code> and your notes as Markdown in a folder you choose, 30 seconds after changes and when you leave the tab. Files are not encrypted.</p>
      {state ? (
        <>
          <p>Folder: <strong>{state.name}</strong>{state.lastSyncAt && <> · last sync {new Date(state.lastSyncAt).toLocaleString()}</>}</p>
          {!state.ok && <p role="alert">Permission lapsed. Re-authorize to continue syncing.</p>}
          <div className="row">
            <button className="btn primary" onClick={() => void syncNow(true).then((r) => { setMsg(r === 'ok' ? 'Synced.' : 'Permission needed.'); refresh(); })}>{state.ok ? 'Sync now' : 'Re-authorize'}</button>
            <button className="btn" onClick={() => void forgetFolder().then(refresh)}>Stop syncing</button>
          </div>
        </>
      ) : (
        <button className="btn" onClick={() => void pickFolder().then(refresh).catch(() => undefined)}>Choose a folder…</button>
      )}
      {msg && <p role="status">{msg}</p>}
    </section>
  );
}

function Offline() {
  const [p, setP] = useState<[number, number]>();
  const [msg, setMsg] = useState('');
  const go = async () => {
    setMsg('');
    try {
      const failed = await downloadForOffline((d, t) => setP([d, t]));
      setMsg(failed ? `${failed} files failed; try again when online.` : 'Everything is saved for offline use.');
    } catch {
      setMsg('Could not read the file list. This works in the built app, not the dev server.');
    }
  };
  return (
    <section className="card stack" aria-label="Offline">
      <h2>Offline</h2>
      <p className="muted">After the first visit the app opens without a connection. This button saves all problems, cards and tools too.</p>
      <div className="row">
        <button className="btn" onClick={() => void go()}>Download everything for offline</button>
        {p && <progress value={p[0]} max={p[1]} aria-label="Download progress" />}
      </div>
      {msg && <p role="status">{msg}</p>}
    </section>
  );
}

export default function Data() {
  return (
    <div className="stack">
      <header>
        <h1>Data</h1>
        <p className="muted">Everything lives on this device, and nothing here uses the network. Export a backup regularly.</p>
      </header>
      <Backup />
      <ImportPanel />
      <Storage />
      <Folder />
      <Offline />
      <section className="card row" aria-label="More">
        <Link className="btn" to="/data/compare">Compare with a friend</Link>
        <Link className="btn" to="/credits">Credits</Link>
      </section>
    </div>
  );
}
