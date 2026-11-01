import { useMemo, useState } from 'react';
import { SubNav, TOOL_LINKS } from '../components/SubNav';
import { CURVES, FEASIBLE, HUGE, OPS_PRESETS, feasibleFor, series, table } from '../domain/bigo';

const COLORS = ['--tone-neutral', '--tone-found', '--tone-range', '--tone-sorted', '--tone-active', '--tone-compare', '--tone-frontier', '--tone-swap', '--tone-error'];
const DASHES = ['0', '2 2', '6 3', '8 2 2 2', '4 4', '10 4', '1 3', '12 3 3 3', '6 2'];
const W = 640;
const H = 340;
const L = 58;
const B = 34;
const T = 12;
const R = 12;
const ops = (v: number) => (v >= 1e9 ? `${v / 1e9}e9` : `${v / 1e6}e6`);

export default function BigO() {
  const [sel, setSel] = useState<Set<string>>(new Set(CURVES.map((c) => c.id)));
  const [slider, setSlider] = useState(3);                 // log10 n
  const [n, setN] = useState(1000);
  const [speed, setSpeed] = useState(1e8);
  const [yLog, setYLog] = useState(true);
  const [zoom, setZoom] = useState(false);
  const [limit, setLimit] = useState(100000);

  const setLog = (s: number) => { setSlider(s); setN(Math.max(1, Math.round(10 ** s))); };
  const setNum = (v: number) => {
    const c = Math.min(1e6, Math.max(1, Math.round(v) || 1));
    setN(c);
    setSlider(Math.log10(c));
  };

  const xmax = zoom ? Math.max(1, Math.log10(n)) : 6;
  const curves = CURVES.filter((c) => sel.has(c.id));
  const rows = useMemo(() => table(n, speed), [n, speed]);

  const geo = useMemo(() => {
    const top = Math.max(1, ...curves.map((c) => c.log10(10 ** xmax)));
    const yLogMax = Math.min(HUGE, Math.ceil(top));
    const linMax = 3 * 10 ** (CURVES.find((c) => c.id === 'nlogn')!.log10(10 ** xmax));
    const px = (x: number) => L + (x / xmax) * (W - L - R);
    const py = (l10: number) => {
      const v = yLog ? l10 / yLogMax : 10 ** l10 / linMax;
      return H - B - Math.min(1.5, Math.max(0, v)) * (H - B - T);
    };
    return { yLogMax, linMax, px, py };
  }, [curves, xmax, yLog]);

  const toggle = (id: string) => setSel((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });
  const xTicks = Array.from({ length: Math.floor(xmax) + 1 }, (_, i) => i);
  const yTicks = yLog
    ? Array.from({ length: Math.min(7, geo.yLogMax + 1) }, (_, i) => Math.round((geo.yLogMax * i) / Math.min(6, geo.yLogMax || 1)))
    : [0, 0.25, 0.5, 0.75, 1].map((f) => f);

  return (
    <div className="stack">
      <SubNav links={TOOL_LINKS} />
      <h1>Big-O growth plotter</h1>
      <section className="card" aria-label="Controls">
        <div className="row">
          <label>n: <input type="range" min={0} max={6} step={0.01} value={slider} onChange={(e) => setLog(Number(e.target.value))} aria-label="n on a log scale" /></label>
          <input type="number" min={1} max={1000000} value={n} onChange={(e) => setNum(Number(e.target.value))} aria-label="n" style={{ width: 110 }} />
          <label>Speed{' '}
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {OPS_PRESETS.map((p) => <option key={p} value={p}>{ops(p)} ops/s</option>)}
            </select>
          </label>
          <div className="seg" role="group" aria-label="Y axis">
            <button aria-pressed={yLog} onClick={() => setYLog(true)}>Log y</button>
            <button aria-pressed={!yLog} onClick={() => setYLog(false)}>Linear y</button>
          </div>
          <label><input type="checkbox" checked={zoom} onChange={(e) => setZoom(e.target.checked)} /> Zoom to selected n</label>
        </div>
        <div className="row" role="group" aria-label="Curves">
          {CURVES.map((c, i) => (
            <label key={c.id} className="chip">
              <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} />{' '}
              <svg width="26" height="8" aria-hidden><line x1="0" y1="4" x2="26" y2="4" stroke={`var(${COLORS[i]})`} strokeWidth="2.5" strokeDasharray={DASHES[i]} /></svg>{' '}
              {c.label}
            </label>
          ))}
        </div>
      </section>

      <section className="card" aria-label="Chart">
        <svg viewBox={`0 0 ${W} ${H}`} className="bigo" role="img" aria-label={`Growth of ${curves.map((c) => c.label).join(', ')} up to n = ${n}`}>
          <clipPath id="plot"><rect x={L} y={T} width={W - L - R} height={H - B - T} /></clipPath>
          {xTicks.map((t) => (
            <g key={t}>
              <line x1={geo.px(t)} x2={geo.px(t)} y1={T} y2={H - B} className="grid" />
              <text x={geo.px(t)} y={H - 14} textAnchor="middle" className="axis">{zoom ? `10^${t}` : `10^${t}`}</text>
            </g>
          ))}
          {yTicks.map((t, i) => {
            const l10 = yLog ? t : Math.log10(Math.max(1e-9, t * geo.linMax));
            const y = yLog ? geo.py(t) : H - B - t * (H - B - T);
            return (
              <g key={i}>
                <line x1={L} x2={W - R} y1={y} y2={y} className="grid" />
                <text x={L - 6} y={y + 4} textAnchor="end" className="axis">{yLog ? `10^${t}` : t === 0 ? '0' : Math.round(10 ** l10).toExponential(0)}</text>
              </g>
            );
          })}
          <line x1={L} x2={L} y1={T} y2={H - B} className="axisline" />
          <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="axisline" />
          <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle" className="axis">n (log scale)</text>
          <g clipPath="url(#plot)">
            {CURVES.map((c, i) => sel.has(c.id) && (
              <polyline
                key={c.id} fill="none" stroke={`var(${COLORS[i]})`} strokeWidth={2.5} strokeDasharray={DASHES[i]}
                points={series(c, xmax).map((p) => `${geo.px(p.x).toFixed(1)},${geo.py(Math.min(p.y, HUGE)).toFixed(1)}`).join(' ')}
              />
            ))}
            {CURVES.map((c, i) => sel.has(c.id) && c.log10(n) <= HUGE && (
              <circle key={c.id} cx={geo.px(Math.log10(n))} cy={geo.py(c.log10(n))} r={4} fill={`var(${COLORS[i]})`} stroke="var(--bg)" strokeWidth={1.5} />
            ))}
          </g>
          <line x1={geo.px(Math.log10(n))} x2={geo.px(Math.log10(n))} y1={T} y2={H - B} className="marker" />
        </svg>
        <p className="muted">Operation counts are computed in log space, so n! and 2ⁿ never overflow. Values above 10^{HUGE} show as ∞ (huge).</p>
      </section>

      <section className="card" aria-label="Operations at n">
        <h2>At n = {n.toLocaleString()}</h2>
        <div className="tablewrap">
          <table className="matrix">
            <thead><tr><th scope="col">Complexity</th><th scope="col">Operations</th><th scope="col">Time at {ops(speed)} ops/s</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.curve.id} className={r.tooSlow ? 'slow' : ''}>
                  <th scope="row">O({r.curve.label}){r.tooSlow && <span className="sr-only"> (too slow)</span>}</th>
                  <td>{r.ops}</td>
                  <td>{r.time}{r.tooSlow && ' ⚠'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">Rows over about 1 second are tinted as too slow.</p>
      </section>

      <section className="card" aria-label="Constraint helper">
        <h2>Constraint helper</h2>
        <p>
          <label>The limit says n ≤{' '}
            <input type="number" min={1} value={limit} onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 1))} style={{ width: 130 }} />
          </label>
        </p>
        <p>Aim for <strong>{feasibleFor(limit)[0]}</strong> or faster. Feasible: {feasibleFor(limit).join(', ')}.</p>
        <div className="tablewrap">
          <table className="matrix">
            <thead><tr><th scope="col">n up to</th><th scope="col">Feasible</th></tr></thead>
            <tbody>{FEASIBLE.map((r) => <tr key={r.label}><td>{Number.isFinite(r.upTo) ? r.upTo.toLocaleString() : '10⁹+'}</td><td>{r.label}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="muted">Rule of thumb, not a benchmark.</p>
      </section>
    </div>
  );
}
