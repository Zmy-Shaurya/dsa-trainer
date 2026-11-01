import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BreakIt } from '../components/BreakIt';
import { CodePanel } from '../components/CodePanel';
import { AuxPanel, ViewRenderer, type PickCtx } from '../components/views';
import { markVizRun } from '../db/conceptState';
import { saveQuizResult } from '../db/quiz';
import { useSettings } from '../db/hooks';
import { setSetting } from '../db/settings';
import { getAlgo } from '../engine/algos';
import { challengeFor } from '../engine/breakit';
import { formatInput, makePreset, parseInput, PRESETS, toShareQuery, type Preset } from '../engine/input';
import { findEvent, SPEEDS, usePlayer } from '../engine/player';
import type { AnyAlgo } from '../engine/types';

type Mode = 'watch' | 'predict' | 'drive' | 'break';
interface PickState { wrong: number; done: boolean; shown: boolean; note: string }

export default function Visualizer() {
  const { id = '' } = useParams();
  const algo = getAlgo(id);
  if (!algo) {
    return (
      <div className="card">
        <h1>Unknown visualizer</h1>
        <Link to="/visualize">Back to the catalogue</Link>
      </div>
    );
  }
  return <Player key={algo.id} algo={algo} />;
}

function Player({ algo }: { algo: AnyAlgo }) {
  const settings = useSettings();
  // Opening a visualizer counts toward the linked concepts' daily plan item.
  useEffect(() => { for (const c of algo.concepts) void markVizRun(c); }, [algo]);
  const [params] = useSearchParams();
  const custom = algo.custom;
  const challenge = challengeFor(algo.id);

  const [input, setInput] = useState(() => {
    const q = params.get('input');
    if (q) {
      if (custom) {
        const r = custom.parse(q);
        if (r.ok) return r.value;
      } else {
        const t = params.get('target');
        const r = parseInput(`${q}${t ? `, target = ${t}` : ''}`, algo.input, algo.defaults.target);
        if (r.ok) return r.value;
      }
    }
    return algo.defaults;
  });
  const show = (v: typeof input) => (custom ? custom.format(v) : formatInput(v));
  const [text, setText] = useState(() => show(input));
  const [target, setTarget] = useState(String(input.target ?? algo.defaults.target ?? 0));
  const [error, setError] = useState('');
  const [seed, setSeed] = useState(1);
  const [mode, setMode] = useState<Mode>('watch');
  const [answers, setAnswers] = useState<Record<number, { answer: string; correct: boolean }>>({});
  const [picks, setPicks] = useState<Record<number, PickState>>({});
  const [copied, setCopied] = useState(false);
  const shownAt = useRef(Date.now());

  const frames = useMemo(() => algo.run(input), [algo, input]);
  useEffect(() => { setAnswers({}); setPicks({}); }, [frames]);

  const hasPredict = frames.some((f) => !!f.predict);
  const hasPick = frames.some((f) => !!f.pick);
  const modes: { id: Mode; label: string; title?: string }[] = [
    { id: 'watch', label: 'Watch' },
    ...(hasPredict ? [{ id: 'predict' as const, label: 'Predict', title: 'Shortcut: P' }] : []),
    ...(hasPick ? [{ id: 'drive' as const, label: 'Drive', title: 'Shortcut: D' }] : []),
    ...(challenge ? [{ id: 'break' as const, label: 'Break it' }] : []),
  ];

  const blocked = (i: number) =>
    (mode === 'predict' && !!frames[i]?.predict && !answers[i]) || (mode === 'drive' && !!frames[i]?.pick && !picks[i]?.done);
  const p = usePlayer(frames, { blocked, speed: settings.playerSpeed });
  const frame = frames[p.index]!;
  const lang = settings.language;
  const events = useMemo(() => [...new Set(frames.map((f) => f.event).filter((e): e is string => !!e))], [frames]);
  const [jumpEvent, setJumpEvent] = useState('');
  const jumpTo = jumpEvent || events[0] || '';

  useEffect(() => {
    shownAt.current = Date.now();
  }, [p.index]);

  // Keyboard shortcuts (PRD §12.4).
  const keys = useRef({ p, setMode, settings, hasPredict, hasPick });
  keys.current = { p, setMode, settings, hasPredict, hasPick };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const { p, setMode, settings, hasPredict, hasPick } = keys.current;
      const toggle = (m: Mode, ok: boolean) => () => { if (ok) setMode((cur) => (cur === m ? 'watch' : m)); };
      const act: Record<string, () => void> = {
        ' ': p.toggle, ArrowRight: p.next, ArrowLeft: p.prev, Home: () => p.goto(0), End: () => p.goto(p.last),
        r: p.reset, R: p.reset, p: toggle('predict', hasPredict), P: toggle('predict', hasPredict),
        d: toggle('drive', hasPick), D: toggle('drive', hasPick),
        '[': () => step(settings.playerSpeed, -1), ']': () => step(settings.playerSpeed, 1),
      };
      const fn = act[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function step(cur: number, dir: 1 | -1) {
    const i = SPEEDS.findIndex((s) => s === cur);
    const next = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, (i < 0 ? 2 : i) + dir))]!;
    void setSetting('playerSpeed', next);
  }

  function apply(raw = text, tgt = target) {
    if (custom) {
      const r = custom.parse(raw);
      if (!r.ok) return setError(r.error);
      setError('');
      setInput(r.value);
      setText(custom.format(r.value));
      return;
    }
    const r = parseInput(algo.input.target ? `${raw}, target = ${tgt}` : raw, algo.input);
    if (!r.ok) return setError(r.error);
    setError('');
    setInput(r.value);
    setText(formatInput(r.value));
  }

  function randomize(kind: Preset) {
    const n = Math.min(input.arr.length || 8, 12);
    const arr = makePreset(kind, Math.max(n, 6), seed);
    setSeed((s) => s + 1);
    apply(arr.join(', '));
  }

  function answer(choice: string) {
    const pr = frame.predict;
    if (!pr) return;
    const correct = choice === String(pr.answer);
    setAnswers((a) => ({ ...a, [p.index]: { answer: choice, correct } }));
    void saveQuizResult({
      kind: 'predict', itemId: `${algo.id}:${p.index}`, conceptId: algo.concepts[0],
      correct, answer: choice, durationMs: Date.now() - shownAt.current,
    }).catch(() => undefined);
  }

  // Drive mode: the learner clicks the next node / cell / index.
  const pk = picks[p.index];
  const driving = mode === 'drive' && !!frame.pick && !pk?.done;
  const pickCtx: PickCtx | undefined = frame.pick && mode === 'drive'
    ? {
        active: driving,
        reveal: new Set(pk?.shown ? frame.pick.valid.map(String) : []),
        onPick(v) {
          const pr = frame.pick!;
          const prev = picks[p.index] ?? { wrong: 0, done: false, shown: false, note: '' };
          if (prev.done) return;
          if (pr.valid.map(String).includes(v)) {
            setPicks((s) => ({ ...s, [p.index]: { ...prev, done: true, note: prev.wrong ? 'Got it.' : 'Correct.' } }));
            void saveQuizResult({
              kind: 'predict', itemId: `drive:${algo.id}:${p.index}`, conceptId: algo.concepts[0],
              correct: prev.wrong === 0, answer: v, durationMs: Date.now() - shownAt.current,
            }).catch(() => undefined);
          } else {
            const why = pr.explainWrong?.[v] ?? 'Not that one. Re-read the question and the highlighted code line.';
            setPicks((s) => ({ ...s, [p.index]: { ...prev, wrong: prev.wrong + 1, note: why } }));
          }
        },
      }
    : undefined;

  function showMe() {
    setPicks((s) => ({ ...s, [p.index]: { wrong: s[p.index]?.wrong ?? 0, done: true, shown: true, note: 'Here is the answer (outlined). Press play or Next to continue.' } }));
    void saveQuizResult({
      kind: 'predict', itemId: `drive:${algo.id}:${p.index}`, conceptId: algo.concepts[0],
      correct: false, answer: 'show-me', durationMs: Date.now() - shownAt.current,
    }).catch(() => undefined);
  }

  async function share() {
    const q = custom ? new URLSearchParams({ input: text }).toString() : toShareQuery(input);
    const url = `${location.origin}${location.pathname}#/visualize/${algo.id}?${q}`;
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const answered = answers[p.index];
  const langs = settings.showBothLanguages ? (['java', 'cpp'] as const) : ([lang] as const);
  const caption = mode === 'predict' && blocked(p.index) && frame.message.includes('?')
    ? `${frame.message.split('?')[0]}?`
    : driving ? frame.pick!.question : frame.message;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{algo.name}</h1>
        <div className="seg" role="group" aria-label="Mode">
          {modes.map((m) => (
            <button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)} title={m.title}>{m.label}</button>
          ))}
        </div>
      </div>
      <p className="muted">{algo.blurb} <span className="mono">{algo.time} · {algo.space}</span></p>

      {mode === 'break' && challenge ? (
        <BreakIt key={challenge.id} challenge={challenge} conceptId={algo.concepts[0]} lang={lang} />
      ) : (
        <>
          <form className="card row" onSubmit={(e) => { e.preventDefault(); apply(); }}>
            <label>Input <input aria-label={custom ? 'Input' : 'Array'} value={text} onChange={(e) => setText(e.target.value)} size={custom ? 40 : 30}
              aria-invalid={!!error} aria-describedby="input-error" /></label>
            {algo.input.target && (
              <label>{algo.input.targetLabel ?? 'Target'} <input aria-label="Target" value={target} onChange={(e) => setTarget(e.target.value)} size={4} /></label>
            )}
            <button className="btn primary" type="submit">Apply</button>
            {custom ? (
              custom.presets && (
                <select aria-label="Preset" value="" onChange={(e) => { const x = custom.presets!.find((q) => q.label === e.target.value); if (x) { setText(x.text); apply(x.text); } }}>
                  <option value="">Examples…</option>
                  {custom.presets.map((x) => <option key={x.label}>{x.label}</option>)}
                </select>
              )
            ) : (
              <select aria-label="Preset" value="" onChange={(e) => e.target.value && randomize(e.target.value as Preset)}>
                <option value="">Randomize / preset…</option>
                {PRESETS.map((x) => <option key={x}>{x}</option>)}
              </select>
            )}
            <button className="btn" type="button" onClick={() => void share()}>{copied ? 'Link copied' : 'Share link'}</button>
            {algo.input.sorted && <span className="muted">Input is sorted automatically.</span>}
            {custom && <span className="muted" style={{ flexBasis: '100%' }}>{custom.help}</span>}
            <div id="input-error" role="alert" className="error">{error}</div>
          </form>

          <div className="viz-split">
            <div className="card">
              {frame.views.map((v, i) => <ViewRenderer key={i} view={v} pick={i === 0 ? pickCtx : undefined} />)}
              {frame.aux?.map((a, i) => <AuxPanel key={i} aux={a} />)}
              <div className="strip" aria-live="polite" data-testid="caption">{caption}</div>
              {frame.invariant && <div className="strip muted">Invariant: {frame.invariant}</div>}
              <div className="row watch">
                {Object.entries(frame.vars ?? {}).map(([k, v]) => <span key={k} className="chip mono">{k} = {String(v)}</span>)}
              </div>
              <div className="row watch">
                {Object.entries(frame.counters).filter(([k]) => k !== 'writes' || frame.counters.writes).map(([k, v]) => (
                  <span key={k} className="chip">{k} <b>{v}</b></span>
                ))}
              </div>

              {mode === 'drive' && frame.pick && (
                <div className="pickbar" role="group" aria-label="Drive">
                  {!pk?.done ? <strong>Click the answer in the picture above.</strong> : <strong>{pk.note}</strong>}
                  {!pk?.done && pk?.note && <p role="status" className="error">{pk.note}</p>}
                  {!pk?.done && (pk?.wrong ?? 0) >= 2 && <button className="btn" onClick={showMe}>Show me</button>}
                </div>
              )}

              {mode === 'predict' && frame.predict && (
                <div className="card predict" role="group" aria-label="Predict">
                  <strong>{frame.predict.question}</strong>
                  {!answered ? (
                    <div className="row">
                      {frame.predict.choices?.map((c) => <button key={c} className="btn" onClick={() => answer(c)}>{c}</button>)}
                    </div>
                  ) : (
                    <p role="status" className={answered.correct ? 'ok' : 'error'}>
                      {answered.correct ? 'Correct. ' : `Not quite (you said ${answered.answer}). `}{frame.predict.explain}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="codes">
              {langs.map((l) => (
                <CodePanel key={l} code={algo.code[l as 'java' | 'cpp']} lang={l} active={algo.lines[l as 'java' | 'cpp'][frame.line]} />
              ))}
            </div>
          </div>

          <div className="card controls">
            <div className="row">
              <button className="btn" onClick={() => p.goto(0)} aria-label="First step">⏮</button>
              <button className="btn" onClick={p.prev} aria-label="Previous step">◀</button>
              <button className="btn primary" onClick={p.toggle} aria-label={p.playing ? 'Pause' : 'Play'}>{p.playing ? '⏸' : '▶'}</button>
              <button className="btn" onClick={p.next} aria-label="Next step">▶|</button>
              <button className="btn" onClick={() => p.goto(p.last)} aria-label="Last step">⏭</button>
              <button className="btn" onClick={p.reset}>Reset</button>
              <label>Speed <select aria-label="Speed" value={settings.playerSpeed} onChange={(e) => void setSetting('playerSpeed', Number(e.target.value))}>
                {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
              </select></label>
              <label><input type="checkbox" checked={p.loop} onChange={(e) => p.setLoop(e.target.checked)} /> Loop</label>
              {algo.modes.race && <Link className="btn" to={`/visualize/race?algos=${algo.id}`}>Race it</Link>}
            </div>
            <div className="row">
              <input type="range" aria-label="Step" min={0} max={p.last} value={p.index}
                onChange={(e) => p.goto(Number(e.target.value))} style={{ flex: 1 }} />
              <span>Step {p.index + 1} / {frames.length}</span>
            </div>
            <div className="row">
              <button className="btn" aria-label="Previous event" onClick={() => { const i = findEvent(frames, p.index, jumpTo, -1); if (i >= 0) p.goto(i); }}>◀ event</button>
              <select aria-label="Event" value={jumpTo} onChange={(e) => setJumpEvent(e.target.value)}>
                {events.map((e) => <option key={e}>{e}</option>)}
              </select>
              <button className="btn" aria-label="Next event" onClick={() => { const i = findEvent(frames, p.index, jumpTo, 1); if (i >= 0) p.goto(i); }}>event ▶</button>
              <span className="muted">Keys: Space, ←/→, Home/End, [ ], R{hasPredict ? ', P' : ''}{hasPick ? ', D' : ''}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
