import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useContent } from '../content/loader';
import { useConceptMap } from '../content/useConceptMap';
import { applyCompress, deletePathState, setItem, setPathStatus, shiftPath, startPath } from '../db/paths';
import { useActivity } from '../db/useActivity';
import { useActivePath, useAuto, usePathDef, usePathStates } from '../db/usePaths';
import {
  compress, isComplete, itemMinutes, itemsOf, lastDay, overdueItems, pathProgress, todayIndex, type CompressResult, type PathItem,
} from '../domain/paths';

export default function PathPage() {
  const id = useParams().id ?? '';
  const nav = useNavigate();
  const { index, byId, canon } = useContent();
  const map = useConceptMap();
  const { today } = useActivity();
  const state = usePathStates().find((s) => s.pathId === id);
  const { def, error } = usePathDef(id, state);
  const auto = useAuto();
  useActivePath(); // marks the active path done when its last required item is
  const [ignored, setIgnored] = useState(false);
  const [shiftBy, setShiftBy] = useState(1);
  const [preview, setPreview] = useState<CompressResult>();

  const diff = (pid: string) => byId.get(pid)?.difficulty ?? def?.info?.[pid]?.difficulty ?? 'medium';
  const titleOf = (pid: string) => byId.get(pid)?.title ?? def?.info?.[pid]?.title ?? pid;
  const items = useMemo(() => (def ? itemsOf(def, state) : []), [def, state]);
  if (error) return <p className="error" role="alert">No learning path "{id}" on this device. <Link to="/paths">Back to Paths</Link></p>;
  if (!def || !index) return <p className="muted">Loading…</p>;

  const idx = state ? todayIndex(state, today) : 0;
  const total = lastDay(def);
  const prog = state ? pathProgress(def, state, auto) : undefined;
  const late = state ? overdueItems(def, state, today, auto) : [];
  const conceptTitle = (c: string) => index.concepts.find((x) => x.id === c)?.title ?? c;
  const label = (i: PathItem) => {
    if (i.kind === 'c') return <Link to={`/concept/${i.ref}`}>Learn {conceptTitle(i.ref)}</Link>;
    if (i.kind === 'q') return <Link to={`/tools/${i.ref === 'pattern' ? 'pattern-trainer' : 'complexity-quiz'}?n=5&auto=1`}>5-question {i.ref} {i.ref === 'pattern' ? 'drill' : 'quiz'}</Link>;
    return byId.has(canon(i.ref)) ? <Link to={`/problem/${encodeURIComponent(canon(i.ref))}`}>{titleOf(i.ref)}</Link>
      : <a href={`https://leetcode.com/problems/${i.ref}/`} target="_blank" rel="noreferrer noopener">{titleOf(i.ref)}</a>;
  };
  const plain = (i: PathItem) => (i.kind === 'p' ? titleOf(i.ref) : i.kind === 'c' ? `Learn ${conceptTitle(i.ref)}` : `5-question ${i.ref} quiz`);

  const start = async () => {
    if (state && !confirm('Start again from today? Ticks on this path are cleared.')) return;
    await startPath(def, id.startsWith('gen:'));
  };
  const showCompress = () => state && setPreview(compress(def, state, today, auto, diff));

  const byDay = new Map<number, PathItem[]>();
  for (const i of items) byDay.set(i.day, [...(byDay.get(i.day) ?? []), i]);
  const dayNums = [...new Set([...def.days.map((d) => d.day), ...byDay.keys()])].sort((a, b) => a - b);
  const minutes = (list: PathItem[]) => Math.round(list.filter((i) => !i.dropped).reduce((a, i) => a + itemMinutes(i, diff), 0));

  return (
    <div className="stack">
      <header>
        <p className="muted"><Link to="/paths">All paths</Link></p>
        <h1>{def.name}</h1>
        {def.description && <p className="muted">{def.description}</p>}
        <p>{total} days · about {def.hoursPerDay} h a day</p>
      </header>

      {!state && (
        <section className="card" aria-label="Start">
          <p>Starting sets day 1 to today. Your plan on Today will use this path's items.</p>
          <button className="btn primary" onClick={() => void start()}>Start this path</button>
        </section>
      )}

      {state && prog && (
        <section className="card" aria-label="Progress">
          <p>
            {state.status === 'done' ? <strong>Finished.</strong> : <strong>Day {Math.min(idx, total)} of {total}</strong>}
            {idx > total && state.status !== 'done' && ' (past the planned end)'}
            {state.status === 'paused' && <span className="chip"> Paused</span>}
            {state.shiftDays > 0 && <span className="muted"> · shifted {state.shiftDays} day{state.shiftDays === 1 ? '' : 's'}</span>}
          </p>
          <p>{prog.done} of {prog.total} required items done <progress value={prog.done} max={Math.max(prog.total, 1)} aria-label="Path progress" /></p>
          <div className="row">
            {state.status === 'active' && <button className="btn" onClick={() => void setPathStatus(id, 'paused')}>Pause</button>}
            {state.status === 'paused' && <button className="btn primary" onClick={() => void setPathStatus(id, 'active')}>Resume</button>}
            <button className="btn" onClick={() => void start()}>Start again</button>
            <button className="btn danger" onClick={() => { if (confirm('Remove this path and its ticks? Your problem progress is kept.')) void deletePathState(id).then(() => nav('/paths')); }}>Remove</button>
          </div>
        </section>
      )}

      {state?.status === 'done' && (
        <section className="card" aria-label="Summary">
          <h2>Summary</h2>
          <p>{prog!.done} of {prog!.total} required items done.</p>
          <ul>
            {[...new Set(def.days.flatMap((d) => d.concepts ?? []))].map((c) => (
              <li key={c}>{conceptTitle(c)}: mastery {Math.round((map.nodes.get(c)?.mastery.total ?? 0) * 100)}%</li>
            ))}
          </ul>
          <p className="muted">Mastery is as it stands now. The app does not record it at the start of a path.</p>
        </section>
      )}

      {state?.status === 'active' && late.length > 0 && !ignored && (
        <section className="banner" role="status" aria-label="Behind schedule" style={{ display: 'block' }}>
          <p><strong>Behind by {late.length} item{late.length === 1 ? '' : 's'}.</strong> Pick how to catch up.</p>
          <div className="row">
            <button className="btn" onClick={() => void shiftPath(id, 1)}>Shift schedule by 1 day</button>
            <label className="row">Shift by <input type="number" min={1} max={60} value={shiftBy} style={{ width: 70 }} onChange={(e) => setShiftBy(Math.max(1, Number(e.target.value) || 1))} /> days
              <button className="btn" onClick={() => void shiftPath(id, shiftBy)}>Shift</button></label>
            <button className="btn" onClick={showCompress}>Compress…</button>
            <button className="btn" onClick={() => setIgnored(true)}>Ignore</button>
          </div>
        </section>
      )}

      {preview && (
        <section className="card" aria-label="Compress preview">
          <h2>Compress preview</h2>
          {preview.diff.length === 0 ? <p>Nothing needs to move.</p> : (
            <ul>
              {preview.diff.map((m) => (
                <li key={m.key}>{plain({ ...m, day: m.from, optional: false, dropped: false })}: day {m.from} → {m.to === null ? <strong>dropped</strong> : `day ${m.to}`}</li>
              ))}
            </ul>
          )}
          <p className="muted">Optional items and review days ahead are dropped first. Nothing changes until you apply.</p>
          <div className="row">
            <button className="btn primary" onClick={() => { void applyCompress(id, preview); setPreview(undefined); }}>Apply</button>
            <button className="btn" onClick={() => setPreview(undefined)}>Cancel</button>
          </div>
        </section>
      )}

      {state && late.length > 0 && (ignored || state.status !== 'active') && (
        <section className="card" aria-label="Overdue">
          <h2>Overdue</h2>
          <ul className="plain">{late.map((i) => <li key={i.key}>{label(i)} <span className="muted">(day {i.day})</span></li>)}</ul>
        </section>
      )}

      {dayNums.map((n) => {
        const d = def.days.find((x) => x.day === n);
        const list = byDay.get(n) ?? [];
        return (
          <section key={n} className="card" aria-label={`Day ${n}`} style={state && n === idx ? { outline: '2px solid var(--accent)' } : undefined}>
            <h2>Day {n}: {d?.title ?? 'Added by Compress'} {state && n === idx && <span className="chip">Today</span>}{d?.review && <span className="chip">Review</span>}</h2>
            {d?.focus && <p className="muted">{d.focus}</p>}
            {list.length === 0 && d?.review && <p className="muted">No new items. Use the review queue and your weak spots.</p>}
            <ul className="plain">
              {list.map((i) => {
                const done = !!state && isComplete(i, state, auto);
                const manual = !!state?.completed[i.key];
                return (
                  <li key={i.key} className="row" style={i.dropped ? { opacity: 0.55 } : undefined}>
                    {state ? (
                      <input type="checkbox" checked={done} disabled={(done && !manual) || state.status === 'done' || i.dropped}
                        aria-label={`Done: ${plain(i)}`} onChange={(e) => void setItem(id, i.key, e.target.checked)} />
                    ) : <span aria-hidden>○</span>}
                    <span style={i.dropped ? { textDecoration: 'line-through' } : undefined}>{label(i)}</span>
                    <span className="muted">{itemMinutes(i, diff)} min</span>
                    {i.optional && <span className="chip">optional</span>}
                    {i.dropped && <span className="chip">dropped</span>}
                    {done && !manual && <span className="chip">{i.kind === 'p' ? 'solved' : 'learned'}</span>}
                    {state?.moved?.[i.key] === n && !i.dropped && <span className="chip">moved here</span>}
                  </li>
                );
              })}
            </ul>
            {list.length > 0 && <p className="muted">About {minutes(list)} min</p>}
          </section>
        );
      })}
    </div>
  );
}
