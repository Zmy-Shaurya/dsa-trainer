import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useContent } from '../content/loader';
import type { Sheet as SheetT } from '../content/types';
import { Matcher } from '../domain/matching';
import { overlap, sheetProgress } from '../domain/sheets';
import {
  addProblems, createSheet, deleteSheet, exportSheetJson, importSheet, moveProblem, removeProblem, renameSheet, type CustomSheet,
} from '../db/customSheets';
import { db } from '../db/schema';
import { Skeleton } from '../components/Skeleton';

const bar = (solved: number, total: number) => (
  <progress value={solved} max={Math.max(total, 1)} aria-label={`${solved} of ${total} solved`} />
);

function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Sheet() {
  const sheetId = decodeURIComponent(useParams().sheetId ?? '');
  const { index, error, byId, canon } = useContent();
  const nav = useNavigate();
  const customs = useLiveQuery(() => db.customSheets.toArray(), [], []) as unknown as CustomSheet[];
  const progress = useLiveQuery(() => db.progress.toArray(), [], []);
  const [otherId, setOtherId] = useState('');
  const [addText, setAddText] = useState('');
  const [msg, setMsg] = useState('');
  const [importText, setImportText] = useState('');

  const solved = useMemo(() => new Set(progress.filter((p) => p.status === 'solved').map((p) => p.problemId)), [progress]);
  const candidates = useMemo(() => (index?.problems ?? []).map((p) => ({ id: p.id, title: p.title, lcNumber: p.lcNumber })), [index]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!index) return <Skeleton />;

  const all: (SheetT | CustomSheet)[] = [...index.sheets, ...customs];
  const custom = customs.find((c) => c.id === sheetId);
  const sheet = (index.sheets.find((s) => s.id === sheetId) ?? custom) as SheetT | CustomSheet | undefined;
  const other = all.find((s) => s.id === otherId);

  const newSheet = async () => {
    const name = prompt('Name for the new sheet?');
    if (name) nav(`/practice/sheet/${encodeURIComponent((await createSheet(name)).id)}`);
  };
  const doImport = async () => {
    try {
      const { sheet: s, unmatched } = await importSheet(importText, 'Imported sheet', candidates);
      setMsg(`Imported "${s.name}"${unmatched.length ? `; could not match: ${unmatched.join(', ')}` : ''}.`);
      setImportText('');
      nav(`/practice/sheet/${encodeURIComponent(s.id)}`);
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  };

  const picker = (
    <nav aria-label="Sheets" className="row">
      {all.map((s) => (
        <Link key={s.id} className={`btn${s.id === sheetId ? ' primary' : ''}`} to={`/practice/sheet/${encodeURIComponent(s.id)}`}>{s.name}</Link>
      ))}
      <button className="btn" onClick={() => void newSheet()}>+ New sheet</button>
    </nav>
  );

  if (!sheet) {
    return (
      <>
        <h1>Sheets</h1>
        {picker}
        <p className="muted">{sheetId ? `No sheet "${sheetId}".` : 'Pick a sheet.'}</p>
      </>
    );
  }

  const prog = sheetProgress(sheet, solved, canon);
  const ov = other ? overlap(sheet, other, solved, canon) : null;
  const titleOf = (id: string) => byId.get(id)?.title ?? id;
  const add = () => {
    const m = new Matcher(candidates).match(addText.trim());
    if (m.status === 'unmatched') return setMsg(`No problem matches "${addText}".`);
    void addProblems(sheetId, [m.id]).then((n) => setMsg(n ? `Added ${titleOf(m.id)}.` : 'Already in this sheet.'));
    setAddText('');
  };

  return (
    <>
      <h1>{sheet.name}</h1>
      {picker}
      <div className="card">
        <p><strong>{prog.overall.solved}</strong> of {prog.overall.total} solved {bar(prog.overall.solved, prog.overall.total)}</p>
        {'author' in sheet && sheet.author && (
          <p className="muted">List by {sheet.author}{sheet.asOf ? `, as of ${sheet.asOf}` : ''}. {sheet.sourceUrl && <a href={sheet.sourceUrl} target="_blank" rel="noreferrer noopener">Source</a>}</p>
        )}
        {custom && (
          <div className="row">
            <button className="btn" onClick={() => { const n = prompt('Rename sheet', custom.name); if (n) void renameSheet(custom.id, n); }}>Rename</button>
            <button className="btn" onClick={() => download(`${custom.name}.json`, exportSheetJson(custom))}>Export JSON</button>
            <button className="btn danger" onClick={() => { if (confirm(`Delete "${custom.name}"? Your progress on its problems is kept.`)) void deleteSheet(custom.id).then(() => nav('/practice/sheet/')); }}>Delete</button>
          </div>
        )}
        {custom && (
          <div className="row">
            <input aria-label="Add a problem" placeholder="Add by title, slug or URL" value={addText} onChange={(e) => setAddText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
            <button className="btn" onClick={add}>Add</button>
          </div>
        )}
        {msg && <p role="status">{msg}</p>}
      </div>

      {sheet.sections.map((sec, si) => {
        const p = prog.sections[si]!;
        return (
          <section key={sec.title} className="card" aria-label={sec.title}>
            <h2>{sec.title} <span className="muted">{p.solved}/{p.total}</span></h2>
            <ul className="plain">
              {sec.problems.map((pid) => {
                const c = canon(pid);
                return (
                  <li key={pid} className="row">
                    <span aria-label={solved.has(c) ? 'Solved' : 'Not solved'}>{solved.has(c) ? '✓' : '○'}</span>
                    <Link to={`/problem/${encodeURIComponent(c)}`}>{titleOf(c)}</Link>
                    {byId.get(c) && <span className="muted">{byId.get(c)!.difficulty}</span>}
                    {custom && (
                      <span className="row">
                        <button className="btn" aria-label={`Move ${titleOf(c)} up`} onClick={() => void moveProblem(custom.id, pid, -1)}>↑</button>
                        <button className="btn" aria-label={`Move ${titleOf(c)} down`} onClick={() => void moveProblem(custom.id, pid, 1)}>↓</button>
                        <button className="btn" aria-label={`Remove ${titleOf(c)}`} onClick={() => void removeProblem(custom.id, pid)}>✕</button>
                      </span>
                    )}
                  </li>
                );
              })}
              {sec.problems.length === 0 && <li className="muted">Empty.</li>}
            </ul>
          </section>
        );
      })}

      <section className="card" aria-label="Overlap">
        <h2>Overlap</h2>
        <label className="field"><span className="muted">Compare with</span>
          <select value={otherId} onChange={(e) => setOtherId(e.target.value)}>
            <option value="">—</option>
            {all.filter((s) => s.id !== sheetId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        {ov && other && (
          <>
            <p>Both: <strong>{ov.both.length}</strong> ({ov.solved.both} solved) · Only {sheet.name}: <strong>{ov.onlyA.length}</strong> ({ov.solved.onlyA} solved) · Only {other.name}: <strong>{ov.onlyB.length}</strong> ({ov.solved.onlyB} solved)</p>
            <p className="muted">Finishing {sheet.name} already covers {Math.round(ov.coversB * 100)}% of {other.name}.</p>
            <details><summary>Only in {other.name}</summary>
              <ul>{ov.onlyB.map((id) => <li key={id}><Link to={`/problem/${encodeURIComponent(id)}`}>{titleOf(id)}</Link></li>)}</ul></details>
          </>
        )}
      </section>

      <section className="card" aria-label="Import a sheet">
        <h2>Import a sheet</h2>
        <p className="muted">Paste Sheet JSON, or CSV lines like <code>Arrays,Two Sum</code> (section, then title, slug or URL).</p>
        <textarea rows={4} className="wide" aria-label="Sheet to import" value={importText} onChange={(e) => setImportText(e.target.value)} />
        <div className="row"><button className="btn" disabled={!importText.trim()} onClick={() => void doImport()}>Import as new sheet</button></div>
      </section>
    </>
  );
}
