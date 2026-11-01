import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuthoredCards, useContent } from '../content/loader';
import { createUserCard, deleteCards, isHidden, setSuspended, type CardRecord } from '../db/cards';
import { db } from '../db/schema';
import { viewOf } from './Review';

const STATE = ['New', 'Learning', 'Review', 'Relearning'];

export default function Browse() {
  const { index, error } = useContent();
  const { cards: authored, error: cardErr } = useAuthoredCards();
  const cards = useLiveQuery(async () => ((await db.cards.toArray()) as unknown as CardRecord[]).filter((c) => !isHidden(c)), [], [] as CardRecord[]);
  const [params, setParams] = useSearchParams();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<'basic' | 'cloze'>('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [cloze, setCloze] = useState('');
  const [msg, setMsg] = useState('');

  const get = (k: string) => params.get(k) ?? '';
  const set = (k: string, v: string) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });

  const rows = useMemo(() => {
    const q = get('q').toLowerCase();
    return cards
      .map((c) => ({ c, v: viewOf(c, authored) }))
      .filter(({ c, v }) => {
        if (q && !`${v?.question ?? ''} ${v?.answer ?? ''}`.toLowerCase().includes(q)) return false;
        if (get('concept') && c.conceptId !== get('concept')) return false;
        if (get('type') && (v?.type ?? c.type) !== get('type')) return false;
        if (get('state') && String(c.state) !== get('state')) return false;
        if (get('suspended') === 'yes' && !c.suspended) return false;
        if (get('suspended') === 'no' && c.suspended) return false;
        if (get('source') && c.source !== get('source')) return false;
        return true;
      })
      .sort((a, b) => a.c.id.localeCompare(b.c.id, undefined, { numeric: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, authored, params]);

  if (error || cardErr) return <p className="error" role="alert">{error ?? cardErr}</p>;
  if (!index || !authored) return <p className="muted">Loading…</p>;

  const ids = [...picked];
  const removable = ids.filter((id) => cards.find((c) => c.id === id)?.source !== 'authored');
  const valid = kind === 'basic' ? front.trim() && back.trim() : /\{\{c1::[^}]+\}\}/.test(cloze);

  return (
    <>
      <h1>Card browser</h1>
      <p><Link to="/review">← Review</Link></p>
      <div className="card filters">
        <label className="field grow"><span className="muted">Search</span><input type="search" value={get('q')} onChange={(e) => set('q', e.target.value)} /></label>
        <label className="field"><span className="muted">Concept</span>
          <select value={get('concept')} onChange={(e) => set('concept', e.target.value)}>
            <option value="">All</option>{index.concepts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select></label>
        <label className="field"><span className="muted">Type</span>
          <select value={get('type')} onChange={(e) => set('type', e.target.value)}>
            <option value="">All</option>{['basic', 'cloze', 'code', 'complexity', 'trap'].map((t) => <option key={t}>{t}</option>)}
          </select></label>
        <label className="field"><span className="muted">State</span>
          <select value={get('state')} onChange={(e) => set('state', e.target.value)}>
            <option value="">All</option>{STATE.map((s, i) => <option key={s} value={i}>{s}</option>)}
          </select></label>
        <label className="field"><span className="muted">Suspended</span>
          <select value={get('suspended')} onChange={(e) => set('suspended', e.target.value)}>
            <option value="">All</option><option value="yes">Suspended</option><option value="no">Active</option>
          </select></label>
        <label className="field"><span className="muted">Source</span>
          <select value={get('source')} onChange={(e) => set('source', e.target.value)}>
            <option value="">All</option><option value="authored">Authored</option><option value="generated">Generated</option><option value="user">Mine</option>
          </select></label>
      </div>
      <p className="muted" aria-live="polite">{rows.length} of {cards.length} cards</p>

      {ids.length > 0 && (
        <div className="card row" role="region" aria-label="Bulk actions">
          <strong>{ids.length} selected</strong>
          <button className="btn" onClick={() => void setSuspended(ids, true)}>Suspend</button>
          <button className="btn" onClick={() => void setSuspended(ids, false)}>Unsuspend</button>
          <button className="btn danger" disabled={removable.length === 0}
            onClick={() => { if (confirm(`Delete ${removable.length} card(s)? Authored cards cannot be deleted.`)) void deleteCards(removable).then(() => setPicked(new Set())); }}>
            Delete ({removable.length})
          </button>
          <button className="btn" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th><input type="checkbox" aria-label="Select all" checked={rows.length > 0 && rows.every(({ c }) => picked.has(c.id))}
            onChange={(e) => setPicked(e.target.checked ? new Set(rows.map(({ c }) => c.id)) : new Set())} /></th>
            <th>Card</th><th>Type</th><th>Concept</th><th>State</th><th>Due</th></tr></thead>
          <tbody>
            {rows.map(({ c, v }) => (
              <tr key={c.id} className={c.suspended ? 'muted' : undefined}>
                <td><input type="checkbox" aria-label={`Select ${c.id}`} checked={picked.has(c.id)}
                  onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} /></td>
                <td>{v?.question ?? <em>(content missing)</em>}{c.suspended && ' · suspended'}</td>
                <td>{v?.type ?? c.type}</td>
                <td>{index.concepts.find((x) => x.id === c.conceptId)?.title ?? '—'}</td>
                <td>{STATE[c.state]}</td>
                <td>{c.state === 0 ? '—' : new Date(c.due).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">No cards match.</p>}
      </div>

      <section className="card" aria-label="Create a card">
        <h2>Create a card</h2>
        <div className="seg" role="group" aria-label="Card type">
          <button aria-pressed={kind === 'basic'} onClick={() => setKind('basic')}>Basic</button>
          <button aria-pressed={kind === 'cloze'} onClick={() => setKind('cloze')}>Cloze</button>
        </div>
        {kind === 'basic' ? (
          <>
            <label className="field"><span className="muted">Front</span><textarea className="wide" rows={2} value={front} onChange={(e) => setFront(e.target.value)} /></label>
            <label className="field"><span className="muted">Back</span><textarea className="wide" rows={2} value={back} onChange={(e) => setBack(e.target.value)} /></label>
          </>
        ) : (
          <label className="field"><span className="muted">Text with one {'{{c1::hole}}'}</span><textarea className="wide" rows={2} value={cloze} onChange={(e) => setCloze(e.target.value)} /></label>
        )}
        <button className="btn primary" disabled={!valid} onClick={() => {
          void createUserCard(kind === 'basic' ? { type: 'basic', front, back } : { type: 'cloze', clozeText: cloze })
            .then(() => { setMsg('Card added to your deck.'); setFront(''); setBack(''); setCloze(''); });
        }}>Add card</button>
        {msg && <p role="status">{msg}</p>}
      </section>
    </>
  );
}
