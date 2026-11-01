import { useRef, useState } from 'react';
import { exportAll, countsOf, importMerge, importNotes, importReplace, prepareEnvelope, type Envelope, type MergeReport } from '../../db/export';
import { decryptBackup, isEncrypted, type EncryptedBackup } from '../../domain/backupCrypto';
import { parseNotesZip } from '../../domain/exports';
import type { MergeNote, Row } from '../../domain/merge';
import { saveFile, today } from './download';

type Pending =
  | { kind: 'envelope'; env: Envelope }
  | { kind: 'encrypted'; file: EncryptedBackup }
  | { kind: 'notes'; notes: Row[]; skipped: string[] };

type Outcome = { text: string; notes: MergeNote[] };

export function ImportPanel() {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending>();
  const [errors, setErrors] = useState<string[]>([]);
  const [pass, setPass] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [snapshot, setSnapshot] = useState(true);
  const [withSettings, setWithSettings] = useState(false);
  const [typed, setTyped] = useState('');
  const [outcome, setOutcome] = useState<Outcome>();
  const [busy, setBusy] = useState(false);

  const reset = () => { setPending(undefined); setErrors([]); setPass(''); setTyped(''); };

  function accept(parsed: unknown) {
    const r = prepareEnvelope(parsed);
    if ('errors' in r) return setErrors(r.errors);
    setErrors([]);
    setPending({ kind: 'envelope', env: r.envelope });
  }

  async function pick(f: File) {
    reset();
    setOutcome(undefined);
    try {
      if (f.name.toLowerCase().endsWith('.zip')) {
        const { notes, skipped } = parseNotesZip(new Uint8Array(await f.arrayBuffer()));
        if (!notes.length) return setErrors(['No notes found. Expected notes/**/*.md files with front matter.']);
        return setPending({ kind: 'notes', notes, skipped });
      }
      const parsed: unknown = JSON.parse(await f.text());
      if (isEncrypted(parsed)) return setPending({ kind: 'encrypted', file: parsed });
      accept(parsed);
    } catch {
      setErrors(['Could not read this file. Use a DSA Studio .json, .dsabackup or notes .zip.']);
    }
  }

  async function unlock(file: EncryptedBackup) {
    setBusy(true);
    try {
      accept(JSON.parse(await decryptBackup(file, pass)));
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (pending?.kind === 'notes') {
      const notes = await importNotes(pending.notes);
      setOutcome({ text: `Notes merged: ${notes.filter((n) => n.action !== 'kept-local').length} added or updated, ${notes.filter((n) => n.action === 'kept-local').length} kept as yours.`, notes });
      return reset();
    }
    if (pending?.kind !== 'envelope') return;
    setBusy(true);
    try {
      if (snapshot) {
        const env = await exportAll(undefined, new Date(), undefined, false);
        saveFile(`dsa-studio-before-import-${today()}.json`, JSON.stringify(env, null, 2));
      }
      if (mode === 'replace') {
        await importReplace(pending.env);
        setOutcome({ text: 'Imported. All data replaced.', notes: [] });
      } else {
        const r: MergeReport = await importMerge(pending.env, { settings: withSettings });
        const added = Object.values(r.added).reduce((a, b) => a + (b ?? 0), 0);
        setOutcome({ text: `Merged ${added} records. ${r.notes.filter((n) => n.action === 'kept-local').length} conflicts kept your version.`, notes: r.notes });
      }
      reset();
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  }

  const env = pending?.kind === 'envelope' ? pending.env : undefined;
  const canApply = !!pending && pending.kind !== 'encrypted' && !busy && (mode === 'merge' || pending.kind === 'notes' || typed === 'REPLACE');

  return (
    <section className="card stack" aria-label="Import">
      <h2>Import</h2>
      <p className="muted">Backups (.json, .dsabackup) and notes (.zip). Nothing is written until you confirm.</p>
      <div className="row">
        <button className="btn" onClick={() => input.current?.click()}>Choose a file…</button>
        <input ref={input} type="file" accept=".json,.dsabackup,.zip,application/json,application/zip" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ''; }} />
      </div>

      {errors.length > 0 && <ul role="alert" className="wrong">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}

      {pending?.kind === 'encrypted' && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); void unlock(pending.file); }}>
          <label>Passphrase <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" /></label>
          <button className="btn primary" disabled={!pass || busy}>{busy ? 'Decrypting…' : 'Decrypt'}</button>
        </form>
      )}

      {env && (
        <div className="stack">
          <p><strong>Preview.</strong> Exported {new Date(env.exportedAt).toLocaleString()}, content {env.contentVersion}.</p>
          <p className="muted">
            {Object.entries(countsOf(env)).filter(([, n]) => n > 0).map(([t, n]) => `${t} ${n}`).join(' · ') || 'No records.'}
          </p>
        </div>
      )}
      {pending?.kind === 'notes' && (
        <p><strong>Preview.</strong> {pending.notes.length} notes{pending.skipped.length ? `, ${pending.skipped.length} files skipped (no front matter): ${pending.skipped.slice(0, 3).join(', ')}` : ''}. Newer notes win.</p>
      )}

      {env && (
        <div className="stack">
          <div className="seg" role="group" aria-label="Import mode">
            <button aria-pressed={mode === 'merge'} onClick={() => setMode('merge')}>Merge</button>
            <button aria-pressed={mode === 'replace'} onClick={() => setMode('replace')}>Replace all</button>
          </div>
          <label><input type="checkbox" checked={snapshot} onChange={(e) => setSnapshot(e.target.checked)} /> Download a safety backup of my current data first</label>
          {mode === 'merge' && <label><input type="checkbox" checked={withSettings} onChange={(e) => setWithSettings(e.target.checked)} /> Also import settings</label>}
          {mode === 'replace' && (
            <label>This wipes everything here. Type <code>REPLACE</code> to confirm: <input value={typed} onChange={(e) => setTyped(e.target.value)} /></label>
          )}
        </div>
      )}
      {pending && pending.kind !== 'encrypted' && (
        <div className="row">
          <button className="btn primary" disabled={!canApply} onClick={() => void apply()}>{mode === 'replace' && env ? 'Replace all data' : 'Import'}</button>
          <button className="btn" onClick={reset}>Cancel</button>
        </div>
      )}

      {outcome && (
        <div role="status">
          <p>{outcome.text}</p>
          {outcome.notes.length > 0 && (
            <button className="btn" onClick={() => saveFile(`dsa-studio-merge-report-${today()}.json`, JSON.stringify(outcome.notes, null, 2))}>Download merge report</button>
          )}
        </div>
      )}
    </section>
  );
}
