import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LaneView } from '../components/LaneView';
import { useSettings } from '../db/hooks';
import { getAlgo } from '../engine/algos';
import { formatInput, makePreset, PRESETS, type Preset } from '../engine/input';
import { laneFrame, MAX_LANES, MIN_LANES, ranking, raceGroups, raceTicks, runLanes, sharedInput, STEPS_NOT_TIME } from '../engine/race';
import type { AlgoInput } from '../engine/types';

const BASE_MS = 500;
const TITLES: Record<string, string> = { sorting: 'Sorting', searching: 'Searching' };

export default function Race() {
  const groups = useMemo(raceGroups, []);
  const [params] = useSearchParams();
  const first = getAlgo(params.get('algos')?.split(',')[0] ?? '');
  const [category, setCategory] = useState(groups.find((g) => g.category === first?.category)?.category ?? groups[0]!.category);
  const group = groups.find((g) => g.category === category)!;
  const [chosen, setChosen] = useState<string[]>(() => {
    const want = (params.get('algos') ?? '').split(',').filter((id) => group.algos.some((a) => a.id === id));
    const base = want.length ? want : [];
    return base.length >= MIN_LANES ? base : [...new Set([...base, ...group.algos.map((a) => a.id)])].slice(0, 3);
  });
  const [text, setText] = useState('7, 3, 9, 1, 8, 2, 6, 4');
  const [target, setTarget] = useState('6');
  const [error, setError] = useState('');
  const [input, setInput] = useState<AlgoInput | null>(null);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [seed, setSeed] = useState(1);
  const { playerSpeed } = useSettings();

  const algos = group.algos.filter((a) => chosen.includes(a.id));
  const lanes = useMemo(() => (input ? runLanes(algos, input) : []), [input, chosen, category]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = raceTicks(lanes);
  const finished = lanes.length > 0 && tick >= total;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTick((t) => (t >= total ? t : t + 1)), BASE_MS / playerSpeed);
    return () => clearInterval(id);
  }, [playing, playerSpeed, total]);
  useEffect(() => { if (finished) setPlaying(false); }, [finished]);

  function start() {
    if (chosen.length < MIN_LANES || chosen.length > MAX_LANES) return setError(`Pick ${MIN_LANES} to ${MAX_LANES} algorithms.`);
    const r = sharedInput(text, target, algos);
    if (!r.ok) return setError(r.error);
    setError('');
    setInput(r.value);
    setTick(0);
    setPlaying(true);
  }
  function randomize(kind: Preset) {
    setText(formatInput({ arr: makePreset(kind, 10, seed) }));
    setSeed((s) => s + 1);
    setInput(null);
  }
  function toggle(id: string) {
    setInput(null);
    setPlaying(false);
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= MAX_LANES ? c : [...c, id]));
  }

  const rank = finished ? ranking(lanes) : [];
  return (
    <div>
      <h1>Race</h1>
      <p className="muted">Pick {MIN_LANES} to {MAX_LANES} algorithms of one kind and run them on the same input, one step per tick. {STEPS_NOT_TIME}</p>
      <div className="seg" role="group" aria-label="Category">
        {groups.map((g) => (
          <button key={g.category} aria-pressed={category === g.category}
            onClick={() => { setCategory(g.category); setChosen(g.algos.slice(0, 3).map((a) => a.id)); setInput(null); setPlaying(false); }}>
            {TITLES[g.category] ?? g.category}
          </button>
        ))}
      </div>
      <fieldset className="card" style={{ marginTop: 12 }}>
        <legend>Contestants</legend>
        <div className="row">
          {group.algos.map((a) => (
            <label key={a.id}><input type="checkbox" checked={chosen.includes(a.id)} onChange={() => toggle(a.id)} /> {a.name}</label>
          ))}
        </div>
      </fieldset>
      <form className="card row" onSubmit={(e) => { e.preventDefault(); start(); }}>
        <label>Input <input aria-label="Race input" value={text} onChange={(e) => { setText(e.target.value); setInput(null); }} size={34} /></label>
        {algos.some((a) => a.input.target) && (
          <label>Target <input aria-label="Race target" value={target} onChange={(e) => setTarget(e.target.value)} size={4} /></label>
        )}
        <select aria-label="Preset" value="" onChange={(e) => e.target.value && randomize(e.target.value as Preset)}>
          <option value="">Randomize / preset…</option>
          {PRESETS.map((x) => <option key={x}>{x}</option>)}
        </select>
        <button className="btn primary" type="submit">{input ? 'Restart' : 'Start race'}</button>
        {input && <button className="btn" type="button" onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Resume'}</button>}
        {algos.some((a) => a.input.sorted) && <span className="muted">Sorted automatically because a contestant needs it.</span>}
        <div role="alert" className="error">{error}</div>
      </form>

      {lanes.length > 0 && (
        <>
          <div className="row">
            <span>Tick {Math.min(tick, total)} / {total}</span>
            <input type="range" aria-label="Race position" min={0} max={total} value={Math.min(tick, total)} onChange={(e) => setTick(Number(e.target.value))} style={{ flex: 1 }} />
          </div>
          <div className="grid">
            {lanes.map((l) => {
              const done = tick >= l.frames.length - 1;
              const place = rank.find((r) => r.id === l.algo.id)?.rank;
              return <LaneView key={l.algo.id} title={l.algo.name} frame={laneFrame(l, tick)} extra={done ? `Finished${place ? ` · place ${place}` : ''}` : 'Running'} />;
            })}
          </div>
        </>
      )}

      {finished && (
        <div className="card" data-testid="ranking">
          <h2>Result</h2>
          <table>
            <thead><tr><th>Place</th><th>Algorithm</th><th>Total ops</th><th>Comparisons</th><th>Swaps</th><th>Writes</th></tr></thead>
            <tbody>
              {rank.map((r) => {
                const l = lanes.find((x) => x.algo.id === r.id)!;
                const c = l.frames.at(-1)!.counters;
                return (
                  <tr key={r.id}>
                    <td>{r.rank}</td><td><Link to={`/visualize/${r.id}`}>{l.algo.name}</Link></td>
                    <td>{r.ops}</td><td>{c.comparisons ?? 0}</td><td>{c.swaps ?? 0}</td><td>{c.writes ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted">{STEPS_NOT_TIME} A different input can change the order: try sorted, reversed and few-unique inputs.</p>
        </div>
      )}
    </div>
  );
}
