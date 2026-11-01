import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useContent } from '../content/loader';
import { useCompany } from '../content/useCompanies';
import { useConceptMap } from '../content/useConceptMap';
import { COMPANY_WINDOWS, WINDOW_LABEL, type CompanyWindow } from '../content/types';
import { addProblems, createSheet, type CustomSheet } from '../db/customSheets';
import { startPath } from '../db/paths';
import { setStatus } from '../db/progress';
import { db } from '../db/schema';
import { defaultWindow } from '../domain/companies';
import { GEN_MAX_PROBLEMS, generateCompanyPath } from '../domain/paths';
import { Skeleton } from '../components/Skeleton';

export default function Company() {
  const id = useParams().id ?? '';
  const nav = useNavigate();
  const { index, byId, canon } = useContent();
  const { data, loading } = useCompany(id);
  const map = useConceptMap();
  const progress = useLiveQuery(() => db.progress.toArray(), [], []);
  const customs = useLiveQuery(() => db.customSheets.toArray(), [], []) as unknown as CustomSheet[];
  const [pick, setPick] = useState<CompanyWindow>();
  const [text, setText] = useState('');
  const [diffF, setDiffF] = useState('');
  const [statusF, setStatusF] = useState('');
  const [target, setTarget] = useState('new');
  const [count, setCount] = useState(60);
  const [hours, setHours] = useState(1.5);
  const [msg, setMsg] = useState('');

  const have = COMPANY_WINDOWS.filter((w) => data?.windows[w]);
  const win = pick && have.includes(pick) ? pick : defaultWindow(have);
  const solved = useMemo(() => new Set(progress.filter((p) => p.status === 'solved').map((p) => p.problemId)), [progress]);

  const rows = useMemo(() => {
    if (!data || !win) return [];
    const by = new Map<string, { id: string; raw: string; freq: number | null }>();
    for (const e of data.windows[win] ?? []) {
      const c = canon(e.problemId);
      const prev = by.get(c);
      if (!prev || (e.freq ?? -1) > (prev.freq ?? -1)) by.set(c, { id: c, raw: e.problemId, freq: e.freq });
    }
    return [...by.values()].map((r) => {
      const known = byId.get(r.id);
      const extra = data.extra?.[r.raw];
      return {
        ...r, known: !!known, title: known?.title ?? extra?.title ?? r.raw,
        difficulty: known?.difficulty ?? extra?.difficulty ?? 'medium', concepts: known?.concepts ?? [], unverified: !known,
      };
    }).sort((a, b) => (b.freq ?? -1) - (a.freq ?? -1) || a.id.localeCompare(b.id));
  }, [data, win, byId, canon]);

  if (loading || !index) return <Skeleton />;
  if (!data || !win) return <p>No company "{id}" on this device. <Link to="/companies">Back to Companies</Link></p>;

  const done = rows.filter((r) => solved.has(r.id)).length;
  const shown = rows.filter((r) =>
    (!text || r.title.toLowerCase().includes(text.toLowerCase())) && (!diffF || r.difficulty === diffF)
    && (!statusF || (statusF === 'solved') === solved.has(r.id)));

  const addAll = async () => {
    const sheetId = target === 'new' ? (await createSheet(`${data.name} (${WINDOW_LABEL[win]})`)).id : target;
    const n = await addProblems(sheetId, rows.map((r) => r.id));
    setMsg(`Added ${n} problem${n === 1 ? '' : 's'}.`);
    setTarget(sheetId);
  };
  const makePath = async () => {
    const depth = new Map([...map.nodes].map(([cid, n]) => [cid, n.placed.depth]));
    const def = generateCompanyPath({
      id: `gen:${data.id}-${win.replace('+', 'plus')}`, name: `Prepare for ${data.name} (${WINDOW_LABEL[win]})`,
      problems: rows.map((r) => ({ id: r.id, freq: r.freq, title: r.title, difficulty: r.difficulty, concepts: r.concepts })),
      count, hoursPerDay: hours, depth, conceptTitle: (c) => index.concepts.find((x) => x.id === c)?.title ?? c,
    });
    await startPath(def, true);
    nav(`/paths/${encodeURIComponent(def.id)}`);
  };

  return (
    <div className="stack">
      <header>
        <p className="muted"><Link to="/companies">All companies</Link></p>
        <h1>{data.name}</h1>
        <p><strong>{data.name}: {done}/{rows.length}</strong> solved <progress value={done} max={Math.max(rows.length, 1)} aria-label={`${done} of ${rows.length} solved`} /></p>
        <p className="muted">Snapshot as of {data.asOf}. Community-sourced; frequency is approximate. Source: {data.source.repo} ({data.source.license}).</p>
      </header>

      <div className="seg" role="group" aria-label="Time window">
        {have.map((w) => <button key={w} aria-pressed={w === win} onClick={() => setPick(w)}>{WINDOW_LABEL[w]} ({data.windows[w]!.length})</button>)}
      </div>

      <section className="card" aria-label="Actions">
        <div className="row">
          <select aria-label="Sheet to add to" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="new">New sheet</option>
            {customs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn" onClick={() => void addAll()}>Add all to a custom sheet</button>
          {msg && <span role="status">{msg} {target !== 'new' && <Link to={`/practice/sheet/${encodeURIComponent(target)}`}>Open sheet</Link>}</span>}
        </div>
        <div className="row">
          <label className="row">Problems <input type="number" min={1} max={GEN_MAX_PROBLEMS} value={count} style={{ width: 80 }} onChange={(e) => setCount(Math.max(1, Math.min(GEN_MAX_PROBLEMS, Number(e.target.value) || 1)))} /></label>
          <label className="row">Hours a day <input type="number" min={0.5} max={8} step={0.5} value={hours} style={{ width: 80 }} onChange={(e) => setHours(Math.max(0.5, Math.min(8, Number(e.target.value) || 1.5)))} /></label>
          <button className="btn primary" onClick={() => void makePath()}>Make a path from this list</button>
        </div>
        <p className="muted">The path takes the most frequent problems, orders them from easier ideas to harder ones and adds a review day every six days. It starts today and pauses any other active path.</p>
      </section>

      <div className="row">
        <input type="search" aria-label="Search problems" placeholder="Search" value={text} onChange={(e) => setText(e.target.value)} />
        <select aria-label="Difficulty" value={diffF} onChange={(e) => setDiffF(e.target.value)}>
          <option value="">Any difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
        <select aria-label="Status" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="">Any status</option><option value="solved">Solved</option><option value="todo">Not solved</option>
        </select>
      </div>

      <table className="table">
        <thead><tr><th scope="col">Solved</th><th scope="col">Problem</th><th scope="col">Difficulty</th><th scope="col">Frequency</th></tr></thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id}>
              <td><input type="checkbox" checked={solved.has(r.id)} aria-label={`Solved: ${r.title}`} onChange={(e) => void setStatus(r.id, e.target.checked ? 'solved' : 'not_started')} /></td>
              <td>
                {r.known ? <Link to={`/problem/${encodeURIComponent(r.id)}`}>{r.title}</Link>
                  : <a href={`https://leetcode.com/problems/${r.raw}/`} target="_blank" rel="noreferrer noopener">{r.title}</a>}
                {r.unverified && <span className="chip" title="Title and difficulty come from the imported file"> unverified</span>}
              </td>
              <td>{r.difficulty}</td>
              <td>{r.freq ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {shown.length === 0 && <p className="muted">Nothing matches those filters.</p>}
    </div>
  );
}
