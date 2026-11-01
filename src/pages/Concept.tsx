import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CodePanel } from '../components/CodePanel';
import { useConceptMap, TRACK_LABEL } from '../content/useConceptMap';
import { addConceptToDeck, isHidden, type CardRecord } from '../db/cards';
import { markViewed, saveConceptInsight, setLearned, setUnlockOverride } from '../db/conceptState';
import { useSettings } from '../db/hooks';
import { db } from '../db/schema';
import { setSetting } from '../db/settings';
import { getAlgo } from '../engine/algos';
import { STATUS_LABEL } from './Practice';
import { Skeleton } from '../components/Skeleton';

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
const tagLabel = (t: string) => t.replace(/_/g, ' ');

export default function Concept() {
  const id = decodeURIComponent(useParams().id ?? '');
  const map = useConceptMap();
  const settings = useSettings();
  const progress = useLiveQuery(() => db.progress.toArray(), [], []);
  const insight = useLiveQuery(() => db.notes.get(`n:concept:${id}`), [id]);
  const cards = useLiveQuery(() => db.cards.where('conceptId').equals(id).toArray(), [id], []) as unknown as CardRecord[];
  const [draft, setDraft] = useState<string>();
  const [deep, setDeep] = useState(false);

  useEffect(() => { if (map.ready && map.nodes.has(id)) void markViewed(id); }, [map.ready, id, map.nodes]);

  if (map.error) return <p className="error" role="alert">{map.error}</p>;
  if (!map.ready) return <Skeleton />;
  const node = map.nodes.get(id);
  if (!node) return <div className="card"><h1>Unknown concept</h1><p className="muted">"{id}" is not in the skill tree. <Link to="/tree">Back to the tree</Link></p></div>;

  const { concept: c, mastery, state } = node;
  const pmap = new Map(progress.map((p) => [p.problemId, p]));
  const title = (pid: string) => map.byId.get(pid)?.title ?? pid;
  const statusOf = (pid: string) => pmap.get(pid)?.status ?? 'not_started';
  const nextProblem = c.coreProblems.find((p) => statusOf(p) !== 'solved');
  const mistakes = new Map<string, number>();
  for (const pid of [...c.coreProblems, ...(c.moreProblems ?? [])])
    for (const t of pmap.get(pid)?.mistakeTags ?? []) mistakes.set(t, (mistakes.get(t) ?? 0) + 1);
  const langs = settings.showBothLanguages ? (['java', 'cpp'] as const) : ([settings.language] as const);
  const viz = (c.visualizers ?? []).map((v) => getAlgo(v)).filter((a) => !!a);
  const learned = !!node.state0?.learned;
  const missingFirst = node.missingPrereqs[0];

  return (
    <>
      <p><Link to="/tree">← Skill tree</Link></p>
      <h1>{c.title}</h1>
      <div className="card">
        <div className="row">
          <span className="chip">{TRACK_LABEL[c.track] ?? c.track}</span>
          <span className="chip">{state.replace('_', ' ')}</span>
          <strong>Mastery {pct(mastery.total)}</strong>
          <progress value={mastery.total} max={1} aria-label="Mastery" />
        </div>
        <p className="muted">
          Problems {pct(mastery.problems)} · retention {pct(mastery.retention)} · quizzes {pct(mastery.quiz)}
          {learned && ' · "I get it" +5%'}
        </p>
        {c.prereqs.length > 0 && (
          <p className="row">Prerequisites:{' '}
            {c.prereqs.map((p) => {
              const m = map.nodes.get(p);
              return <Link key={p} className="chip" to={`/concept/${p}`}>{m?.concept.title ?? p} {m ? pct(m.mastery.total) : ''}</Link>;
            })}
          </p>
        )}
        {state === 'locked' && missingFirst && (
          <p className="strip" role="status">
            Recommended first: <Link to={`/concept/${missingFirst.id}`}>{missingFirst.title}</Link>.{' '}
            <button className="btn" onClick={() => void setUnlockOverride(id, true)}>Unlock anyway</button>
          </p>
        )}
        {node.state0?.unlockOverride && state !== 'mastered' && (
          <p className="muted">Unlocked manually. <button className="linkish" onClick={() => void setUnlockOverride(id, false)}>Undo</button></p>
        )}
        <label className="check"><input type="checkbox" checked={learned} onChange={(e) => void setLearned(id, e.target.checked)} /> I get it</label>
      </div>

      <section className="card" aria-label="30-second card">
        <h2>30-second card</h2>
        <p>{c.card.idea}</p>
        <h3>Use it when</h3>
        <ul>{c.card.useWhen.map((u) => <li key={u}>{u}</li>)}</ul>
        <p className="mono">Time {c.card.complexity.time} · Space {c.card.complexity.space}</p>
        <div className="row">
          <div className="seg" role="group" aria-label="Language">
            {(['java', 'cpp'] as const).map((l) => (
              <button key={l} aria-pressed={!settings.showBothLanguages && settings.language === l}
                onClick={() => void Promise.all([setSetting('language', l), setSetting('showBothLanguages', false)])}>{l === 'java' ? 'Java' : 'C++'}</button>
            ))}
            <button aria-pressed={settings.showBothLanguages} onClick={() => void setSetting('showBothLanguages', !settings.showBothLanguages)}>Both</button>
          </div>
        </div>
        {langs.map((l) => <CodePanel key={l} lang={l} code={c.card.template[l].trimEnd()} />)}
        <h3>Pitfalls</h3>
        <ul>{c.card.pitfalls.map((p) => <li key={p}>{p}</li>)}</ul>
        {c.card.deepDive && (
          <>
            <button className="btn" aria-expanded={deep} onClick={() => setDeep(!deep)}>{deep ? 'Hide' : 'Show'} deep dive</button>
            {deep && <p style={{ whiteSpace: 'pre-wrap' }}>{c.card.deepDive}</p>}
          </>
        )}
      </section>

      {viz.length > 0 && (
        <section className="card" aria-label="Visualizers">
          <h2>Visualizers</h2>
          <div className="row">{viz.map((a) => <Link key={a!.id} className="btn" to={`/visualize/${a!.id}`}>{a!.name}</Link>)}</div>
        </section>
      )}

      <section className="card" aria-label="Core problems">
        <h2>Core problems <span className="muted">{node.solved}/{c.coreProblems.length}</span></h2>
        {c.coreProblems.length === 0 ? <p className="muted">This concept is learned through cards and quizzes, not problems.</p> : (
          <>
            <ul className="plain">
              {c.coreProblems.map((p) => (
                <li key={p} className="row">
                  <span className="chip">{STATUS_LABEL[statusOf(p)]}</span>
                  <Link to={`/problem/${encodeURIComponent(p)}`}>{title(p)}</Link>
                  <span className="muted">{map.byId.get(p)?.difficulty}</span>
                </li>
              ))}
            </ul>
            {nextProblem && <Link className="btn primary" to={`/problem/${encodeURIComponent(nextProblem)}`}>Start next: {title(nextProblem)}</Link>}
          </>
        )}
        {(c.moreProblems?.length ?? 0) > 0 && (
          <>
            <h3>More problems</h3>
            <ul>{c.moreProblems!.map((p) => <li key={p}><Link to={`/problem/${encodeURIComponent(p)}`}>{title(p)}</Link></li>)}</ul>
          </>
        )}
      </section>

      <section className="card" aria-label="Flashcards">
        <h2>Flashcards</h2>
        {(() => {
          const mine = cards.filter((x) => !isHidden(x));
          const active = mine.filter((x) => !x.suspended);
          const due = active.filter((x) => x.state !== 0 && new Date(x.due) <= new Date()).length;
          const fresh = active.filter((x) => x.state === 0).length;
          const parked = mine.filter((x) => x.suspended && x.source === 'authored').length;
          return (
            <>
              <p>{due} due · {active.length} in deck · {fresh} new{parked > 0 && ` · ${parked} not added yet`}</p>
              <div className="row">
                {parked > 0 && <button className="btn primary" onClick={() => void addConceptToDeck(id)}>Add this concept's cards to my deck</button>}
                {active.length > 0 && <Link className="btn" to={`/review?cram=${id}`}>Cram this concept</Link>}
                <Link className="btn" to={`/review/browse?concept=${id}`}>Browse cards</Link>
              </div>
              {mine.length === 0 && <p className="muted">No cards yet. They are created the first time the app loads.</p>}
            </>
          );
        })()}
      </section>

      <section className="card" aria-label="Your common mistakes here">
        <h2>Your common mistakes here</h2>
        {mistakes.size === 0 ? <p className="muted">None logged yet.</p> : (
          <p className="row">{[...mistakes].sort((a, b) => b[1] - a[1]).map(([t, n]) => <span key={t} className="chip">{tagLabel(t)} ×{n}</span>)}</p>
        )}
      </section>

      <section className="card" aria-label="My insight">
        <h2>My insight</h2>
        <label className="field"><span className="muted">({(draft ?? (insight?.body as string | undefined) ?? '').length}/1000)</span>
          <textarea rows={3} maxLength={1000} value={draft ?? (insight?.body as string | undefined) ?? ''}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (draft !== undefined) void saveConceptInsight(id, draft).then(() => setDraft(undefined)); }} /></label>
      </section>
    </>
  );
}
