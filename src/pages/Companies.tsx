import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadJson, useContent } from '../content/loader';
import { useCompanyList } from '../content/useCompanies';
import { WINDOW_LABEL, type CompanyData, type CompanyWindow } from '../content/types';
import { deleteImported, saveImported } from '../db/companies';
import { db } from '../db/schema';
import { buildCompanies, defaultWindow, validateCompany, type BuildReport } from '../domain/companies';
import { sheetProblemIds } from '../domain/sheets';
import { readSources } from './companies/readSources';
import { Skeleton } from '../components/Skeleton';

interface Pending extends BuildReport {
  jsonCompanies: CompanyData[];
  jsonErrors: string[];
}

function ImportPanel() {
  const { index, canon } = useContent();
  const [pending, setPending] = useState<Pending>();
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState('');

  const pick = async (files: File[]) => {
    if (!index || files.length === 0) return;
    setMsg('');
    try {
      const sources = await readSources(files);
      const known = new Set(index.problems.map((p) => p.id));
      const titleToId = new Map(index.problems.map((p) => [p.title.toLowerCase(), p.id]));
      const jsonFiles = sources.filter((s) => /\.json$/i.test(s.path));
      const jsonCompanies: CompanyData[] = [];
      const jsonErrors: string[] = [];
      for (const j of jsonFiles) {
        try {
          const d = JSON.parse(j.text) as CompanyData;
          const errs = validateCompany(d);
          if (errs.length) jsonErrors.push(`${j.path}: ${errs[0]}`);
          else jsonCompanies.push(d);
        } catch {
          jsonErrors.push(`${j.path}: not valid JSON`);
        }
      }
      const built = buildCompanies(sources.filter((s) => /\.csv$/i.test(s.path)), {
        isKnown: (id) => known.has(canon(id)), titleToId, asOf,
        source: { repo: 'imported on this device', license: 'your own copy; its licence stays with its authors' },
      });
      setPending({ ...built, jsonCompanies, jsonErrors });
      if (built.companies.length + jsonCompanies.length === 0) setMsg('No company lists found. Expected CSV files named by time window (for example "3 months.csv") inside a folder per company.');
    } catch (e) {
      setMsg(`Could not read those files: ${(e as Error).message}`);
    }
  };

  const save = async () => {
    if (!pending) return;
    const all = [...pending.companies, ...pending.jsonCompanies];
    await saveImported(all);
    setMsg(`Saved ${all.length} compan${all.length === 1 ? 'y' : 'ies'} on this device. Your progress was not touched.`);
    setPending(undefined);
  };

  const all = pending ? [...pending.companies, ...pending.jsonCompanies] : [];
  return (
    <details className="card">
      <summary><strong>Import company lists</strong></summary>
      <p className="muted">Load your own copy of a company-wise list: CSV files (columns such as Title, URL, Difficulty, Frequency) in one folder per company, with the time window in each file name. A zip or a folder works. Files stay on this device; the app only keeps the problem-to-company mapping.</p>
      <div className="row">
        <label className="btn">Choose files or a zip
          <input type="file" multiple accept=".csv,.json,.zip" className="sr-only" onChange={(e) => void pick([...(e.target.files ?? [])])} /></label>
        <label className="btn">Choose a folder
          <input type="file" multiple className="sr-only" {...{ webkitdirectory: '' }} onChange={(e) => void pick([...(e.target.files ?? [])])} /></label>
        <label className="row">Data date <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></label>
      </div>
      {msg && <p role="status">{msg}</p>}
      {pending && all.length > 0 && (
        <>
          <ul>
            {all.map((c) => (
              <li key={c.id}>{c.name}: {Object.entries(c.windows).map(([w, l]) => `${WINDOW_LABEL[w as CompanyWindow]} ${l!.length}`).join(', ')}</li>
            ))}
          </ul>
          {(pending.skippedRows > 0 || pending.ignored.length > 0 || pending.jsonErrors.length > 0) && (
            <p className="muted">
              {pending.skippedRows > 0 && `${pending.skippedRows} rows had no problem link and were skipped. `}
              {pending.ignored.length > 0 && `${pending.ignored.length} files had no time window in the name and were ignored. `}
              {pending.jsonErrors.join('; ')}
            </p>
          )}
          <div className="row">
            <button className="btn primary" onClick={() => void save()}>Save {all.length} to this device</button>
            <button className="btn" onClick={() => setPending(undefined)}>Cancel</button>
          </div>
        </>
      )}
    </details>
  );
}

export default function Companies() {
  const { index, canon } = useContent();
  const { entries, imported } = useCompanyList();
  const progress = useLiveQuery(() => db.progress.toArray(), [], []);
  const [q, setQ] = useState('');
  const [bundled, setBundled] = useState<Map<string, CompanyData>>(new Map());

  useEffect(() => {
    const ids = (entries ?? []).filter((e) => !e.imported).map((e) => e.id);
    void Promise.all(ids.map((id) => loadJson<CompanyData>(`companies/${id}.json`).catch(() => undefined)))
      .then((list) => setBundled(new Map(list.filter((c): c is CompanyData => !!c).map((c) => [c.id, c]))));
  }, [entries]);

  const solved = useMemo(() => new Set(progress.filter((p) => p.status === 'solved').map((p) => p.problemId)), [progress]);
  if (!index || !entries) return <Skeleton />;
  const data = new Map<string, CompanyData>([...bundled, ...(imported ?? []).map((c) => [c.id, c] as const)]);
  const shown = entries.filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="stack">
      <header>
        <h1>Companies</h1>
        <p className="muted">Problems that candidates report being asked, by company. Community-sourced; frequencies are approximate. Not affiliated with any company.</p>
      </header>
      <ImportPanel />
      {entries.length === 0 ? (
        <section className="card">
          <h2>No company data on this device</h2>
          <p>This app ships no company lists. Import your own copy above and each company gets a page with its problems, your progress and a path built from them. Everything else works without it.</p>
        </section>
      ) : (
        <>
          <input type="search" aria-label="Search companies" placeholder="Search companies" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="grid">
            {shown.map((e) => {
              const w = defaultWindow(Object.keys(e.counts) as CompanyWindow[]);
              const list = w ? data.get(e.id)?.windows[w] : undefined;
              const ids = list ? sheetProblemIds({ sections: [{ title: '', problems: list.map((x) => x.problemId) }] }, canon) : [];
              const done = ids.filter((i) => solved.has(i)).length;
              return (
                <Link key={e.id} to={`/companies/${e.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  <h2>{e.name}</h2>
                  {w ? <p>{done}/{e.counts[w] ?? 0} <span className="muted">· {WINDOW_LABEL[w]}</span></p> : <p className="muted">No problems</p>}
                  {w && <progress value={done} max={Math.max(e.counts[w] ?? 0, 1)} aria-label={`${done} of ${e.counts[w] ?? 0} solved`} />}
                  {e.imported && <p><span className="chip">imported</span></p>}
                </Link>
              );
            })}
          </div>
        </>
      )}
      {(imported ?? []).length > 0 && (
        <section className="card" aria-label="Imported lists">
          <h2>Imported on this device</h2>
          <ul className="plain">
            {(imported ?? []).map((c) => (
              <li key={c.id} className="row">
                {c.name} <span className="muted">as of {c.asOf}</span>
                <button className="btn" onClick={() => { if (confirm(`Remove ${c.name}? Your progress is kept.`)) void deleteImported(c.id); }}>Remove</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
