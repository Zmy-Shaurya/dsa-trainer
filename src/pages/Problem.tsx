import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CodePanel } from '../components/CodePanel';
import { Compare } from '../components/Compare';
import { getAlgo } from '../engine/algos';
import { useContent, useProblem } from '../content/loader';
import type { ApproachFull } from '../content/types';
import { autoCards, reviewCardForProblem } from '../db/cards';
import { db } from '../db/schema';
import { useSettings } from '../db/hooks';
import { setSetting } from '../db/settings';
import { logAttempt, MISTAKE_TAGS, saveInsight, setConfidence, setStatus, toggleStar, type MistakeTag } from '../db/progress';
import type { Confidence, SolveMode, Status } from '../db/types';
import { CONF_LABEL, STATUS_LABEL } from './Practice';
import { Skeleton } from '../components/Skeleton';

const stripHidden = (code: string) => code.replace(/\/\/ @hide-start[\s\S]*?\/\/ @hide-end\n?/g, '');
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const tagLabel = (t: string) => t.replace(/_/g, ' ');

function useTimer() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [base, setBase] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    if (startedAt === null) return;
    const h = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(h);
  }, [startedAt]);
  const seconds = base + (startedAt === null ? 0 : Math.floor((Date.now() - startedAt) / 1000));
  return {
    seconds, running: startedAt !== null,
    toggle: () => { if (startedAt === null) setStartedAt(Date.now()); else { setBase(seconds); setStartedAt(null); } },
    reset: () => { setBase(0); setStartedAt(null); },
  };
}

function Ladder({ approaches }: { approaches: ApproachFull[] }) {
  const settings = useSettings();
  const [ideas, setIdeas] = useState(0);        // how many approach ideas are revealed
  const [codes, setCodes] = useState<Set<string>>(new Set());
  const [boiler, setBoiler] = useState(false);
  const langs = settings.showBothLanguages ? (['java', 'cpp'] as const) : ([settings.language] as const);
  return (
    <section aria-label="Approach ladder">
      <h2>Approach ladder</h2>
      <p className="muted">Work up from the brute force. Each rung stays hidden until you decide you have tried the one before it.</p>
      <div className="row">
        <div className="seg" role="group" aria-label="Language">
          {(['java', 'cpp'] as const).map((l) => (
            <button key={l} aria-pressed={!settings.showBothLanguages && settings.language === l}
              onClick={() => void Promise.all([setSetting('language', l), setSetting('showBothLanguages', false)])}>{l === 'java' ? 'Java' : 'C++'}</button>
          ))}
          <button aria-pressed={settings.showBothLanguages} onClick={() => void setSetting('showBothLanguages', !settings.showBothLanguages)}>Both</button>
        </div>
        <label className="check"><input type="checkbox" checked={boiler} onChange={(e) => setBoiler(e.target.checked)} /> Show boilerplate</label>
      </div>
      {approaches.map((a, i) => {
        const open = i < ideas;
        return (
          <div className="card" key={a.id}>
            <h3>{i + 1}. {a.name} {a.isOptimal && <span className="chip">optimal</span>}</h3>
            <p className="muted mono">Time {a.time} · Space {a.space}</p>
            {open ? (
              <>
                <p>{a.idea}</p>
                {a.preferWhen && <p className="muted">Prefer when: {a.preferWhen}</p>}
                {codes.has(a.id) ? (
                  langs.map((l) => <CodePanel key={l} lang={l} code={boiler ? a.code[l] : stripHidden(a.code[l])} />)
                ) : (
                  <button className="btn" onClick={() => setCodes((s) => new Set(s).add(a.id))}>Show code</button>
                )}
                {a.unlock && i + 1 < approaches.length && <p className="strip">What unlocks the next idea: {a.unlock}</p>}
              </>
            ) : (
              <button className="btn" disabled={i > ideas} onClick={() => setIdeas(i + 1)}>
                {i === 0 ? 'Reveal this approach' : i > ideas ? 'Locked — reveal the previous one first' : 'I tried it — reveal this approach'}
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

function LogForm({ problemId, seconds, onDone, onLogged }: {
  problemId: string; seconds: number; onDone: () => void; onLogged: (e: { solved: boolean; confidence: string }) => void;
}) {
  const [outcome, setOutcome] = useState<'solved' | 'failed' | 'abandoned'>('solved');
  const [mode, setMode] = useState<SolveMode | ''>('alone');
  const [conf, setConf] = useState<Confidence | ''>('');
  const [tags, setTags] = useState<MistakeTag[]>([]);
  const [note, setNote] = useState('');
  return (
    <form className="card" aria-label="Log attempt" onSubmit={(e) => {
      e.preventDefault();
      void logAttempt({
        problemId, outcome, mode: outcome === 'solved' ? mode || null : null, durationSec: seconds || null,
        mistakeTags: tags, note, ...(outcome === 'solved' && conf ? { confidence: conf } : {}),
      }).then(() => { onLogged({ solved: outcome === 'solved', confidence: conf }); onDone(); });
    }}>
      <h3>Log attempt</h3>
      <div className="row">
        <label className="field"><span className="muted">Outcome</span>
          <select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
            <option value="solved">Solved</option><option value="failed">Failed</option><option value="abandoned">Abandoned</option>
          </select></label>
        {outcome === 'solved' && (
          <>
            <label className="field"><span className="muted">How</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as SolveMode)}>
                <option value="alone">On my own</option><option value="hint">With hints</option><option value="solution">After the solution</option>
              </select></label>
            <label className="field"><span className="muted">Confidence</span>
              <select value={conf} onChange={(e) => setConf(e.target.value as Confidence | '')}>
                <option value="">Keep as is</option>
                {Object.entries(CONF_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
          </>
        )}
        <span className="muted">Time {fmt(seconds)}</span>
      </div>
      <fieldset>
        <legend className="muted">Mistakes</legend>
        <div className="row">
          {MISTAKE_TAGS.map((t) => (
            <label key={t} className="check"><input type="checkbox" checked={tags.includes(t)}
              onChange={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} /> {tagLabel(t)}</label>
          ))}
        </div>
      </fieldset>
      <label className="field"><span className="muted">Note ({note.length}/280)</span>
        <textarea rows={2} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="row"><button className="btn primary" type="submit">Save attempt</button><button className="btn" type="button" onClick={onDone}>Cancel</button></div>
    </form>
  );
}

export default function Problem() {
  const id = decodeURIComponent(useParams().id ?? '');
  const { index, error, byId } = useContent();
  const summary = byId.get(id);
  const full = useProblem(summary?.hasApproaches ? id : undefined);
  const progress = useLiveQuery(() => db.progress.get(id), [id]);
  const attempts = useLiveQuery(() => db.attempts.where('problemId').equals(id).reverse().sortBy('at'), [id], []);
  const insight = useLiveQuery(() => db.notes.get(`n:problem:${id}`), [id]);
  const settings = useSettings();
  const timer = useTimer();
  const [logging, setLogging] = useState(false);
  const [hints, setHints] = useState(0);
  const [draft, setDraft] = useState<string>();
  const [cardMsg, setCardMsg] = useState('');

  const problem = full?.problem;
  const sides = useMemo(() => {
    const seen = new Set<string>();
    return (problem?.approaches ?? []).flatMap((a) => (a.visualizer && getAlgo(a.visualizer) && !seen.has(a.visualizer) ? (seen.add(a.visualizer), [{ label: a.name, algoId: a.visualizer }]) : []));
  }, [problem]);
  const traps = useMemo(() => {
    const t = problem?.traps;
    return t ? [...(t.both ?? []), ...(settings.language === 'java' || settings.showBothLanguages ? (t.java ?? []).map((x) => `Java: ${x}`) : []),
      ...(settings.language === 'cpp' || settings.showBothLanguages ? (t.cpp ?? []).map((x) => `C++: ${x}`) : [])] : [];
  }, [problem, settings.language, settings.showBothLanguages]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!index) return <Skeleton />;
  if (!summary) return <div className="card"><h1>Unknown problem</h1><p className="muted">"{id}" is not in the content index.</p></div>;
  if (summary.hasApproaches && !full) return <Skeleton />;
  if (full?.error) return <p className="error" role="alert">{full.error}</p>;

  const status = progress?.status ?? 'not_started';
  return (
    <>
      <h1>{summary.title} <button className="linkish" aria-pressed={!!progress?.starred} aria-label={progress?.starred ? 'Unstar' : 'Star'} onClick={() => void toggleStar(id)}>{progress?.starred ? '★' : '☆'}</button></h1>
      <p className="row">
        <span className={`chip diff-${summary.difficulty}`}>{summary.difficulty}</span>
        <span className="chip">tier {summary.tier}</span>
        {summary.lcNumber && <span className="muted">#{summary.lcNumber}</span>}
        <a href={summary.url} target="_blank" rel="noreferrer noopener">Open on {summary.platform}</a>
        <button className="btn" disabled={!problem} title={problem ? undefined : 'Needs an authored key idea'}
          onClick={() => problem && void reviewCardForProblem({ id, title: summary.title, insight: problem.insight }).then((made) => setCardMsg(made ? 'Review card added to your deck.' : 'You already have a review card for this problem.'))}>Make review card</button>
        {cardMsg && <span role="status" className="muted">{cardMsg}</span>}
        {summary.unverified && <span className="muted" title="Listed from a public sheet; details not reviewed">unverified</span>}
      </p>

      <div className="card tracker">
        <div className="row">
          <label className="field"><span className="muted">Status</span>
            <select value={status} onChange={(e) => void setStatus(id, e.target.value as Status)}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></label>
          <label className="field"><span className="muted">Confidence</span>
            <select value={progress?.confidence ?? ''} onChange={(e) => {
              const v = (e.target.value || null) as Confidence | null;
              void setConfidence(id, v).then(() => autoCards({ id, title: summary.title, insight: problem?.insight }, { confidence: v }));
            }}>
              <option value="">—</option>
              {Object.entries(CONF_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></label>
          <span className="mono" role="timer" aria-label="Solve timer">{fmt(timer.seconds)}</span>
          <button className="btn" onClick={timer.toggle}>{timer.running ? 'Pause' : timer.seconds ? 'Resume' : 'Start timer'}</button>
          {timer.seconds > 0 && !timer.running && <button className="btn" onClick={timer.reset}>Reset</button>}
          <button className="btn primary" onClick={() => { if (timer.running) timer.toggle(); setLogging(true); }}>Log attempt</button>
        </div>
        {progress && progress.attempts > 0 && (
          <p className="muted">
            {progress.attempts} attempt(s) · total {fmt(progress.totalTimeSec)}
            {progress.bestTimeSec ? ` · best ${fmt(progress.bestTimeSec)}` : ''}
            {progress.solveMode ? ` · last solved ${progress.solveMode === 'alone' ? 'on my own' : progress.solveMode === 'hint' ? 'with hints' : 'after the solution'}` : ''}
          </p>
        )}
      </div>
      {logging && <LogForm problemId={id} seconds={timer.seconds} onDone={() => { setLogging(false); timer.reset(); }}
        onLogged={(e) => void autoCards({ id, title: summary.title, insight: problem?.insight }, e)} />}

      {!problem ? (
        <div className="card">
          <p>This problem is listed on {summary.sheets.map((s) => index.sheets.find((x) => x.id === s)?.name ?? s).join(', ') || 'a sheet'} but has no authored walkthrough yet.</p>
          <p className="muted">Solve it on the original site, then log your attempt here.</p>
        </div>
      ) : (
        <>
          <section className="card" aria-label="30-second view">
            <h2>30-second view</h2>
            <p>{problem.insight}</p>
            {problem.tells.length > 0 && (
              <>
                <h3>Spot it when…</h3>
                <ul>{problem.tells.map((t) => <li key={t}>{t}</li>)}</ul>
              </>
            )}
            <p className="muted">Patterns: {problem.patterns.join(', ') || '—'} · Topics: {problem.topics.join(', ') || '—'}</p>
          </section>

          {(problem.hints?.length ?? 0) > 0 && (
            <section className="card" aria-label="Hints">
              <h2>Hints</h2>
              <ol>{problem.hints!.slice(0, hints).map((h) => <li key={h}>{h}</li>)}</ol>
              {hints < problem.hints!.length ? (
                <button className="btn" onClick={() => setHints((n) => n + 1)}>{hints === 0 ? 'Show a hint' : 'Next hint'} ({hints}/{problem.hints!.length})</button>
              ) : <p className="muted">That is every hint.</p>}
            </section>
          )}

          {problem.approaches && <Ladder approaches={problem.approaches} />}

          {sides.length >= 2 && (
            <details className="card">
              <summary>Compare approaches (shows every approach, so try the ladder first)</summary>
              <Compare sides={sides} />
            </details>
          )}

          {traps.length > 0 && (
            <section className="card" aria-label="Language traps">
              <h2>Traps</h2>
              <ul>{traps.map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          )}

          {(problem.followups?.length ?? 0) > 0 && (
            <section className="card" aria-label="Follow-ups">
              <h2>Follow-ups</h2>
              <ul>{problem.followups!.map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          )}
          {problem.notes && <section className="card"><h2>Notes</h2><p style={{ whiteSpace: 'pre-wrap' }}>{problem.notes}</p></section>}
        </>
      )}

      <section className="card" aria-label="My insight">
        <h2>My insight</h2>
        <label className="field"><span className="muted">One thing future-me should remember ({(draft ?? insight?.body as string ?? '').length}/280)</span>
          <textarea rows={2} maxLength={280} value={draft ?? (insight?.body as string | undefined) ?? ''}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (draft !== undefined) void saveInsight(id, draft).then(() => setDraft(undefined)); }} /></label>
      </section>

      <section className="card" aria-label="Attempt history">
        <h2>Attempts</h2>
        {attempts.length === 0 ? <p className="muted">No attempts logged yet.</p> : (
          <ul>
            {attempts.map((a) => (
              <li key={a.id as string}>
                {new Date(a.at as string).toLocaleDateString()} — {a.outcome as string}{a.imported ? ' (imported)' : ''}
                {a.durationSec ? ` · ${fmt(a.durationSec as number)}` : ''}
                {(a.mistakeTags as string[]).length > 0 && ` · ${(a.mistakeTags as string[]).map(tagLabel).join(', ')}`}
                {a.note ? <span className="muted"> — {a.note as string}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
