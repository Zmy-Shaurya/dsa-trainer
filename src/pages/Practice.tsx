import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useContent } from '../content/loader';
import type { ProblemSummary } from '../content/types';
import { db } from '../db/schema';
import { autoCards } from '../db/cards';
import { addProblems } from '../db/customSheets';
import { bulkUpdate, setConfidence, setStatus, toggleStar } from '../db/progress';
import type { Confidence, ProgressRecord, Status } from '../db/types';

export const STATUS_LABEL: Record<Status, string> = { not_started: 'Not started', attempted: 'Attempted', solved: 'Solved' };
export const CONF_LABEL: Record<Confidence, string> = { cleared: 'Cleared', need_review: 'Need review', dont_understand: "Don't understand" };
const CONF_CYCLE: (Confidence | null)[] = [null, 'cleared', 'need_review', 'dont_understand'];
const STATUS_CYCLE: Status[] = ['not_started', 'attempted', 'solved'];
const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

const FILTERS = ['q', 'sheet', 'difficulty', 'status', 'confidence', 'tier', 'pattern', 'concept', 'approaches', 'starred', 'mistake'] as const;

type SortKey = 'title' | 'difficulty' | 'status' | 'tier';

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: [string, string][]; onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span className="muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export default function Practice() {
  const { index, error, canon } = useContent();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const progress = useLiveQuery(() => db.progress.toArray(), [], [] as ProgressRecord[]);
  const customSheets = useLiveQuery(() => db.customSheets.toArray(), [], []) as { id: string; name: string }[];
  const pmap = useMemo(() => new Map(progress.map((p) => [p.problemId, p])), [progress]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'tier', dir: 1 });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0);
  const search = useRef<HTMLInputElement>(null);

  const get = (k: (typeof FILTERS)[number]) => params.get(k) ?? '';
  const set = (k: (typeof FILTERS)[number], v: string) =>
    setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });

  const sheetIds = useMemo(() => {
    const s = get('sheet');
    if (!s || !index) return null;
    const sh = index.sheets.find((x) => x.id === s);
    if (sh) return new Set(sh.sections.flatMap((x) => x.problems.map(canon)));
    const c = customSheets.find((x) => x.id === s) as { sections?: { problems: string[] }[] } | undefined;
    return new Set((c?.sections ?? []).flatMap((x) => x.problems.map(canon)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, index, customSheets]);

  const rows = useMemo(() => {
    if (!index) return [];
    const q = get('q').trim().toLowerCase();
    const st = (p: ProblemSummary): Status => pmap.get(p.id)?.status ?? 'not_started';
    const out = index.problems.filter((p) => {
      const pr = pmap.get(p.id);
      if (q && !`${p.title} ${p.id} ${p.lcNumber ?? ''}`.toLowerCase().includes(q)) return false;
      if (sheetIds && !sheetIds.has(p.id)) return false;
      if (get('difficulty') && p.difficulty !== get('difficulty')) return false;
      if (get('status') && st(p) !== get('status')) return false;
      if (get('confidence') && (pr?.confidence ?? 'none') !== get('confidence')) return false;
      if (get('tier') && String(p.tier) !== get('tier')) return false;
      if (get('pattern') && !p.patterns.includes(get('pattern'))) return false;
      if (get('concept') && !p.concepts.includes(get('concept'))) return false;
      if (get('approaches') === 'yes' && !p.hasApproaches) return false;
      if (get('approaches') === 'no' && p.hasApproaches) return false;
      if (get('starred') && !pr?.starred) return false;
      if (get('mistake') && !pr?.mistakeTags.includes(get('mistake'))) return false;
      return true;
    });
    const cmp = (a: ProblemSummary, b: ProblemSummary) =>
      sort.key === 'title' ? a.title.localeCompare(b.title)
      : sort.key === 'difficulty' ? DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]
      : sort.key === 'status' ? STATUS_CYCLE.indexOf(st(a)) - STATUS_CYCLE.indexOf(st(b))
      : a.tier - b.tier;
    return out.map((p, i) => [p, i] as const).sort((x, y) => sort.dir * cmp(x[0], y[0]) || x[1] - y[1]).map((x) => x[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, params, pmap, sheetIds, sort]);

  const patterns = useMemo(() => [...new Set((index?.problems ?? []).flatMap((p) => p.patterns))].sort(), [index]);
  const concepts = useMemo(() => [...new Set((index?.problems ?? []).flatMap((p) => p.concepts))].sort(), [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const cur = rows[cursor];
      if (e.key === '/') { e.preventDefault(); search.current?.focus(); }
      else if (e.key === 'j') setCursor((c) => Math.min(c + 1, rows.length - 1));
      else if (e.key === 'k') setCursor((c) => Math.max(c - 1, 0));
      else if (e.key === 'o' && cur) nav(`/problem/${encodeURIComponent(cur.id)}`);
      else if (e.key === 's' && cur) void setStatus(cur.id, STATUS_CYCLE[(STATUS_CYCLE.indexOf(pmap.get(cur.id)?.status ?? 'not_started') + 1) % 3]!);
      else if (e.key === 'c' && cur) void setConfidence(cur.id, CONF_CYCLE[(CONF_CYCLE.indexOf(pmap.get(cur.id)?.confidence ?? null) + 1) % 4]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, cursor, pmap, nav]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!index) return <p className="muted">Loading…</p>;

  const th = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="linkish" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))}>{label}</button>
    </th>
  );
  const ids = [...picked];
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const active = FILTERS.some((f) => get(f));

  return (
    <>
      <h1>Practice</h1>
      <p className="row"><Link to="/practice/sheet/blind-75">Blind 75</Link><Link to="/practice/sheet/neetcode-150">NeetCode 150</Link><Link to="/practice/sheet/">All sheets</Link><Link to="/import/leetcode">Import solved problems</Link></p>
      <div className="card filters">
        <label className="field grow">
          <span className="muted">Search (press /)</span>
          <input ref={search} type="search" value={get('q')} onChange={(e) => set('q', e.target.value)} placeholder="title, id or LeetCode number" />
        </label>
        <Select label="Sheet" value={get('sheet')} onChange={(v) => set('sheet', v)}
          options={[...index.sheets.map((s) => [s.id, s.name] as [string, string]), ...customSheets.map((s) => [s.id, s.name] as [string, string])]} />
        <Select label="Difficulty" value={get('difficulty')} onChange={(v) => set('difficulty', v)} options={[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]} />
        <Select label="Status" value={get('status')} onChange={(v) => set('status', v)} options={Object.entries(STATUS_LABEL)} />
        <Select label="Confidence" value={get('confidence')} onChange={(v) => set('confidence', v)} options={[...Object.entries(CONF_LABEL), ['none', 'Not set']]} />
        <Select label="Tier" value={get('tier')} onChange={(v) => set('tier', v)} options={[['1', '1 — full'], ['2', '2 — partial'], ['3', '3 — link only']]} />
        <Select label="Pattern" value={get('pattern')} onChange={(v) => set('pattern', v)} options={patterns.map((p) => [p, p])} />
        <Select label="Concept" value={get('concept')} onChange={(v) => set('concept', v)} options={concepts.map((p) => [p, p])} />
        <Select label="Approaches" value={get('approaches')} onChange={(v) => set('approaches', v)} options={[['yes', 'Has approaches'], ['no', 'Link only']]} />
        <label className="check"><input type="checkbox" checked={!!get('starred')} onChange={(e) => set('starred', e.target.checked ? '1' : '')} /> Starred</label>
        {active && <button className="btn" onClick={() => setParams({}, { replace: true })}>Clear filters</button>}
      </div>

      <p className="muted" aria-live="polite">
        {rows.length} of {index.problems.length} problems · keys: / search, j/k move, o open, s status, c confidence
      </p>

      {ids.length > 0 && (
        <div className="card row" role="region" aria-label="Bulk actions">
          <strong>{ids.length} selected</strong>
          <button className="btn" onClick={() => void bulkUpdate(ids, { status: 'solved' })}>Mark solved</button>
          <button className="btn" onClick={() => void bulkUpdate(ids, { status: 'not_started' })}>Mark not started</button>
          <button className="btn" onClick={() => void bulkUpdate(ids, { confidence: 'need_review' })}>Need review</button>
          <button className="btn" onClick={() => void bulkUpdate(ids, { starred: true })}>Star</button>
          <select aria-label="Add to custom sheet" value="" onChange={(e) => {
            if (e.target.value) void addProblems(e.target.value, ids).then((n) => alert(`Added ${n} problem(s).`));
          }}>
            <option value="">Add to sheet…</option>
            {customSheets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th><input type="checkbox" aria-label="Select all" checked={allPicked}
                onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
              <th aria-label="Starred" />
              {th('title', 'Problem')}{th('difficulty', 'Difficulty')}{th('status', 'Status')}<th>Confidence</th>{th('tier', 'Tier')}<th>Sheets</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const pr = pmap.get(p.id);
              return (
                <tr key={p.id} className={i === cursor ? 'cursor' : undefined} onClick={() => setCursor(i)}>
                  <td><input type="checkbox" aria-label={`Select ${p.title}`} checked={picked.has(p.id)}
                    onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} /></td>
                  <td><button className="linkish" aria-label={pr?.starred ? 'Unstar' : 'Star'} aria-pressed={!!pr?.starred} onClick={() => void toggleStar(p.id)}>{pr?.starred ? '★' : '☆'}</button></td>
                  <td>
                    <Link to={`/problem/${encodeURIComponent(p.id)}`}>{p.title}</Link>
                    {p.lcNumber && <span className="muted"> #{p.lcNumber}</span>}
                  </td>
                  <td className={`diff-${p.difficulty}`}>{p.difficulty}</td>
                  <td>
                    <select aria-label={`Status of ${p.title}`} value={pr?.status ?? 'not_started'} onChange={(e) => void setStatus(p.id, e.target.value as Status)}>
                      {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td>
                    <select aria-label={`Confidence of ${p.title}`} value={pr?.confidence ?? ''} onChange={(e) => {
                      const v = (e.target.value || null) as Confidence | null;
                      void setConfidence(p.id, v).then(() => autoCards({ id: p.id, title: p.title }, { confidence: v }));
                    }}>
                      <option value="">—</option>
                      {Object.entries(CONF_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td>{p.tier}</td>
                  <td className="muted">{p.sheets.map((s) => index.sheets.find((x) => x.id === s)?.name ?? s).join(', ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">No problems match these filters.</p>}
      </div>
    </>
  );
}
