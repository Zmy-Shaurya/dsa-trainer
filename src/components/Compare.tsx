import { useEffect, useMemo, useState } from 'react';
import { LaneView } from './LaneView';
import { useSettings } from '../db/hooks';
import { getAlgo } from '../engine/algos';
import { formatInput } from '../engine/input';
import { compareSummary, compareTicks, indexAtOps, runLanes, sharedInput } from '../engine/race';

export interface CompareSide { label: string; algoId: string }

/** Two approaches of a problem side by side, synchronised by operations so the cheaper one visibly finishes first. */
export function Compare({ sides }: { sides: CompareSide[] }) {
  const [ai, setAi] = useState(0);
  const [bi, setBi] = useState(Math.min(1, sides.length - 1));
  const A = sides[ai]!;
  const B = sides[bi]!;
  const algoA = getAlgo(A.algoId)!;
  const algoB = getAlgo(B.algoId)!;
  const [text, setText] = useState(() => formatInput(algoA.defaults));
  const [target, setTarget] = useState(String(algoA.defaults.target ?? algoB.defaults.target ?? 0));
  const [error, setError] = useState('');
  const [input, setInput] = useState(() => sharedInput(formatInput(algoA.defaults), String(algoA.defaults.target ?? algoB.defaults.target ?? 0), [algoA, algoB]));
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { playerSpeed } = useSettings();

  const lanes = useMemo(() => (input.ok && algoA !== algoB ? runLanes([algoA, algoB], input.value) : []), [input, algoA, algoB]);
  const total = lanes.length ? compareTicks(lanes[0]!.frames, lanes[1]!.frames) : 0;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((x) => (x >= total ? x : x + 1)), 500 / playerSpeed);
    return () => clearInterval(id);
  }, [playing, playerSpeed, total]);
  useEffect(() => { if (t >= total) setPlaying(false); }, [t, total]);

  function apply(raw = text) {
    const r = sharedInput(raw, target, [algoA, algoB]);
    if (!r.ok) return setError(r.error);
    setError('');
    setInput(r);
    setT(0);
    setPlaying(false);
  }

  // Changing a side re-runs on the current input.
  useEffect(() => { apply(); }, [ai, bi]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="card" aria-label="Compare approaches" data-testid="compare">
      <h2>Compare</h2>
      <p className="muted">Both approaches run on the same input and advance by work done (operations), not by time.</p>
      <div className="row">
        <label>Left <select aria-label="Left approach" value={ai} onChange={(e) => setAi(Number(e.target.value))}>{sides.map((s, i) => <option key={s.algoId} value={i}>{s.label}</option>)}</select></label>
        <label>Right <select aria-label="Right approach" value={bi} onChange={(e) => setBi(Number(e.target.value))}>{sides.map((s, i) => <option key={s.algoId} value={i}>{s.label}</option>)}</select></label>
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <label>Input <input aria-label="Compare input" value={text} onChange={(e) => setText(e.target.value)} size={30} /></label>
        {(algoA.input.target || algoB.input.target) && (
          <label>Target <input aria-label="Compare target" value={target} onChange={(e) => setTarget(e.target.value)} size={4} /></label>
        )}
        <button className="btn" type="submit">Apply</button>
        <div role="alert" className="error">{error}</div>
      </form>
      {algoA === algoB && <p className="muted">Pick two different approaches.</p>}
      {lanes.length === 2 && input.ok && (
        <>
          <div className="row">
            <button className="btn primary" onClick={() => { if (t >= total) setT(0); setPlaying((p) => !p); }}>
              {playing ? 'Pause' : t >= total ? 'Run both again' : 'Run both'}
            </button>
            <input type="range" aria-label="Compare position" min={0} max={total} value={t} onChange={(e) => setT(Number(e.target.value))} style={{ flex: 1 }} />
            <span>{t} / {total} ops</span>
          </div>
          <div className="grid">
            <LaneView title={A.label} frame={lanes[0]!.frames[indexAtOps(lanes[0]!.frames, t)]!} />
            <LaneView title={B.label} frame={lanes[1]!.frames[indexAtOps(lanes[1]!.frames, t)]!} />
          </div>
          <p role="status" data-testid="compare-summary">
            <strong>{compareSummary({ label: A.label, frames: lanes[0]!.frames }, { label: B.label, frames: lanes[1]!.frames }, input.value.arr.length)}</strong>
          </p>
        </>
      )}
    </section>
  );
}
