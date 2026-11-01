import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '../content/loader';
import { db } from '../db/schema';
import { compare, parseSnapshot, type FriendSnapshot } from '../domain/compare';

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '-');

export default function FriendCompare() {
  const { index, byId } = useContent();
  const file = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState<string>();
  const friends = useLiveQuery(async () => (await db.friendSnapshots.toArray()) as unknown as FriendSnapshot[], [], [] as FriendSnapshot[]);
  const mine = useLiveQuery(async () => new Set((await db.progress.where('status').equals('solved').toArray()).map((p) => p.problemId)), [], new Set<string>());
  const friend = friends.find((f) => f.id === pick) ?? friends[0];
  const theirs = useMemo(() => new Set(friend?.solved ?? []), [friend]);
  const title = (id: string) => byId.get(id)?.title ?? id;
  const all = useMemo(() => compare(mine, theirs), [mine, theirs]);

  async function load(f: File) {
    setErr('');
    try {
      const r = parseSnapshot(JSON.parse(await f.text()));
      if (typeof r === 'string') return setErr(r);
      await db.friendSnapshots.put(r as never);
      setPick(r.id);
    } catch {
      setErr('Could not read this file.');
    }
  }

  return (
    <div className="stack">
      <header>
        <h1>Compare with a friend</h1>
        <p className="muted">Read-only. A friend&apos;s file is never merged into your data. Ask them for a progress snapshot from their Data page. <Link to="/data">Back to Data</Link></p>
      </header>
      <section className="card row">
        <button className="btn primary" onClick={() => file.current?.click()}>Load a snapshot…</button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = ''; }} />
        {friends.length > 0 && (
          <label>Friend{' '}
            <select value={friend?.id} onChange={(e) => setPick(e.target.value)}>
              {friends.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.importedAt.slice(0, 10)})</option>)}
            </select>
          </label>
        )}
        {friend && <button className="btn" onClick={() => { void db.friendSnapshots.delete(friend.id); setPick(undefined); }}>Remove</button>}
        {err && <span role="alert" className="wrong">{err}</span>}
      </section>

      {!friend && <p className="muted">No snapshot loaded yet.</p>}
      {friend && (
        <>
          <section className="card" aria-label="Totals">
            <h2>All problems</h2>
            <div className="row">
              <span className="chip">You only: {all.you.length}</span>
              <span className="chip">Both: {all.both.length}</span>
              <span className="chip">{friend.name} only: {all.friend.length}</span>
            </div>
          </section>
          {(index?.sheets ?? []).map((sh) => {
            const ids = sh.sections.flatMap((s) => s.problems);
            const c = compare(mine, theirs, ids);
            return (
              <details key={sh.id} className="card">
                <summary><strong>{sh.name}</strong> · you {pct(c.you.length + c.both.length, ids.length)} · {friend.name} {pct(c.friend.length + c.both.length, ids.length)}</summary>
                <div className="split">
                  {([['You only', c.you], ['Both', c.both], [`${friend.name} only`, c.friend]] as const).map(([label, list]) => (
                    <div key={label}>
                      <h3>{label} ({list.length})</h3>
                      <ul>{list.map((id) => <li key={id}><Link to={`/problem/${id}`}>{title(id)}</Link></li>)}</ul>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </>
      )}
    </div>
  );
}
