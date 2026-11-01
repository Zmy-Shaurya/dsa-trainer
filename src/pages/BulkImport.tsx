import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useContent } from '../content/loader';
import { Matcher, parseBulk, type MatchResult } from '../domain/matching';
import { clearUnmatched, commitImport, loadUnmatched, saveUnmatched, undoAvailable, undoLastImport } from '../db/bulkImport';
import { db } from '../db/schema';
import type { Confidence } from '../db/types';
import { Skeleton } from '../components/Skeleton';

export default function BulkImport() {
  const { index, error, byId, canon } = useContent();
  const [text, setText] = useState('');
  const [accept, setAccept] = useState<Set<number>>(new Set());
  const [credit, setCredit] = useState(false);
  const [msg, setMsg] = useState('');
  const solved = useLiveQuery(async () => new Set((await db.progress.where('status').equals('solved').toArray()).map((p) => p.problemId)), [], new Set<string>());
  const undoable = useLiveQuery(() => undoAvailable(), [msg], 0);
  const unmatchedSaved = useLiveQuery(() => loadUnmatched(), [msg], [] as string[]);

  const rows = useMemo(() => {
    if (!index) return [];
    const matcher = new Matcher(index.problems.map((p) => ({ id: p.id, title: p.title, lcNumber: p.lcNumber })));
    return parseBulk(text).map((r) => {
      const m: MatchResult = matcher.match(r.query, r.number);
      const id = m.status === 'unmatched' ? null : canon(m.id);
      return { row: r, m, id };
    });
  }, [text, index, canon]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!index) return <Skeleton />;

  const usable = rows.flatMap((r, i) => (r.id && (r.m.status === 'matched' || accept.has(i)) ? [{ ...r, i }] : []));
  const fresh = usable.filter((r) => !solved.has(r.id!));
  const unmatched = rows.filter((r) => !r.id).map((r) => r.row.raw);

  const commit = async () => {
    const out = await commitImport(
      fresh.map((r) => ({
        problemId: r.id!, ...(r.row.solvedAt ? { solvedAt: r.row.solvedAt } : {}),
        ...(r.row.confidence ? { confidence: r.row.confidence as Confidence } : {}),
      })),
      { credit },
    );
    if (unmatched.length) await saveUnmatched(unmatched);
    setMsg(`Marked ${out.imported.length} solved; ${out.skippedAlreadySolved.length} were already solved; ${unmatched.length} unmatched kept below. Undo is available for 24 hours.`);
    setText('');
    setAccept(new Set());
  };

  return (
    <>
      <h1>Import from LeetCode</h1>
      <p className="muted">
        Nothing leaves your device. Paste problem titles, slugs or URLs (one per line), or a CSV with a header row.
        Imported problems are marked solved but do not count toward your streak unless you tick the box below.
      </p>
      <div className="card">
        <textarea className="wide" rows={8} aria-label="Problems to import" value={text} onChange={(e) => setText(e.target.value)}
          placeholder={'Two Sum\nhttps://leetcode.com/problems/valid-anagram/\n15. 3Sum'} />
        <div className="row">
          <label className="btn">Upload file
            <input type="file" accept=".txt,.csv,text/plain,text/csv" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.text().then(setText); e.target.value = ''; }} />
          </label>
          <label className="check"><input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} /> Count dated rows toward my heatmap and streak</label>
        </div>
      </div>

      {rows.length > 0 && (
        <section className="card" aria-label="Preview">
          <h2>Preview</h2>
          <p>
            {rows.filter((r) => r.m.status === 'matched').length} matched · {rows.filter((r) => r.m.status === 'fuzzy').length} fuzzy ·{' '}
            {usable.length - fresh.length} already solved · {unmatched.length} unmatched
          </p>
          <table className="table">
            <thead><tr><th>Row</th><th>Result</th><th /></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.row.raw}</td>
                  <td>
                    {!r.id ? <span className="error">No match</span> : (
                      <>
                        <Link to={`/problem/${encodeURIComponent(r.id)}`}>{byId.get(r.id)?.title ?? r.id}</Link>
                        {r.m.status === 'fuzzy' && <span className="muted"> (close match)</span>}
                        {solved.has(r.id) && <span className="muted"> — already solved</span>}
                      </>
                    )}
                  </td>
                  <td>
                    {r.m.status === 'fuzzy' && (
                      <label className="check"><input type="checkbox" checked={accept.has(i)}
                        onChange={() => setAccept((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} /> Accept</label>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button className="btn primary" disabled={fresh.length === 0 && unmatched.length === 0} onClick={() => void commit()}>
              Mark {fresh.length} solved
            </button>
          </div>
        </section>
      )}

      {msg && <p role="status" className="card">{msg}</p>}
      {undoable > 0 && (
        <p><button className="btn" onClick={() => void undoLastImport().then((n) => setMsg(`Undid the last import (${n} problems).`))}>Undo last import ({undoable})</button></p>
      )}

      {unmatchedSaved.length > 0 && (
        <section className="card" aria-label="Unmatched rows">
          <h2>Unmatched rows</h2>
          <p className="muted">These did not match anything in the library. Fix the spelling and paste them again.</p>
          <ul>{unmatchedSaved.map((u) => <li key={u}>{u}</li>)}</ul>
          <button className="btn" onClick={() => void clearUnmatched().then(() => setMsg('Cleared unmatched rows.'))}>Clear list</button>
        </section>
      )}
    </>
  );
}
