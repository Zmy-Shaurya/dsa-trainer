import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TRACKS, TRACK_LABEL, useConceptMap, type ConceptNode } from '../content/useConceptMap';
import type { NodeState } from '../domain/mastery';

const R = 26;
const PAD = 60;
const STATE_LABEL: Record<NodeState, string> = {
  locked: 'Locked', available: 'Available', in_progress: 'In progress', mastered: 'Mastered',
};
const STATE_ICON: Record<NodeState, string> = { locked: '🔒', available: '○', in_progress: '◐', mastered: '✓' };
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

interface View { x: number; y: number; k: number }

function Ring({ n, dim, next, focus }: { n: ConceptNode; dim: boolean; next: boolean; focus: boolean }) {
  const c = 2 * Math.PI * (R - 3);
  return (
    <g className={`tnode st-${n.state}${dim ? ' dim' : ''}${next ? ' next' : ''}${focus ? ' focus' : ''}`}>
      <circle className="tfill" r={R} />
      <circle className="tring-bg" r={R - 3} />
      <circle className="tring" r={R - 3} strokeDasharray={`${c * n.mastery.total} ${c}`} transform="rotate(-90)" />
      <text className="ticon" textAnchor="middle" dy="0.35em">{STATE_ICON[n.state]}</text>
      <text className="tlabel" textAnchor="middle" y={R + 16}>{n.concept.title}</text>
      {n.concept.coreProblems.length > 0 && (
        <text className="tbadge" textAnchor="middle" y={R + 30}>{n.solved}/{n.concept.coreProblems.length}</text>
      )}
    </g>
  );
}

export default function Tree() {
  const map = useConceptMap();
  const nav = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [tracks, setTracks] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState<string>();
  const [focus, setFocus] = useState<string>();
  const drag = useRef<{ px: number; py: number; vx: number; vy: number; moved: boolean } | undefined>(undefined);

  const nodes = [...map.nodes.values()];
  const maxX = Math.max(0, ...nodes.map((n) => n.placed.x));
  const maxY = Math.max(0, ...nodes.map((n) => n.placed.y));

  /** minK keeps labels readable on first load; the Fit button passes 0 to show everything. */
  const fit = useCallback((minK = 0) => {
    const w = box.current?.clientWidth || 900;
    const h = box.current?.clientHeight || 560;
    const all = Math.min(1, (w - PAD) / (maxX + 2 * PAD), (h - PAD) / (maxY + 2 * PAD));
    const k = Math.max(all, minK);
    setView({ k, x: Math.max(8, (w - (maxX + 2 * PAD) * k) / 2), y: Math.max(8, (h - (maxY + 2 * PAD) * k) / 2) });
  }, [maxX, maxY]);
  useEffect(() => {
    if (!map.ready) return;
    const h = requestAnimationFrame(() => fit(0.6));
    return () => cancelAnimationFrame(h);
  }, [map.ready, fit]);

  const zoom = useCallback((f: number, cx?: number, cy?: number) => setView((v) => {
    const w = box.current?.clientWidth ?? 0, h = box.current?.clientHeight ?? 0;
    const px = cx ?? w / 2, py = cy ?? h / 2;
    const k = Math.min(2.5, Math.max(0.25, v.k * f));
    return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
  }), []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, map.ready]);

  const find = (q: string) => {
    const s = q.trim().toLowerCase();
    const hit = s ? nodes.find((n) => n.concept.title.toLowerCase().includes(s) || n.concept.id.includes(s)) : undefined;
    setFocus(hit?.concept.id);
    if (hit) {
      const w = box.current?.clientWidth ?? 0, h = box.current?.clientHeight ?? 0;
      setView((v) => ({ ...v, x: w / 2 - hit.placed.x * v.k - PAD * v.k, y: h / 2 - hit.placed.y * v.k - PAD * v.k }));
    }
  };

  if (map.error) return <p className="error" role="alert">{map.error}</p>;
  if (!map.ready) return <p className="muted">Loading…</p>;

  const dimmed = (n: ConceptNode) => tracks.size > 0 && !tracks.has(n.concept.track);
  const info = map.nodes.get(hover ?? focus ?? map.next ?? '');

  return (
    <>
      <h1>Skill tree</h1>
      <div className="row" role="group" aria-label="Tracks">
        {TRACKS.filter((t) => nodes.some((n) => n.concept.track === t)).map((t) => (
          <button key={t} className="chip" aria-pressed={tracks.has(t)}
            onClick={() => setTracks((s) => { const x = new Set(s); if (x.has(t)) x.delete(t); else x.add(t); return x; })}>{TRACK_LABEL[t]}</button>
        ))}
        <input type="search" aria-label="Find a concept" placeholder="Find a concept" value={query}
          onChange={(e) => { setQuery(e.target.value); find(e.target.value); }} />
        {map.next && <Link className="btn primary" to={`/concept/${map.next}`}>Next up: {map.nodes.get(map.next)!.concept.title}</Link>}
      </div>

      <div className="tree-box" ref={box}
        onPointerDown={(e) => { drag.current = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y, moved: false }; }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || e.buttons === 0) return;
          const dx = e.clientX - d.px, dy = e.clientY - d.py;
          if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
          if (d.moved) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
        }}
        onPointerUp={() => setTimeout(() => { drag.current = undefined; }, 0)}>
        <svg width="100%" height="100%" role="group" aria-label="Concept map">
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <g transform={`translate(${PAD} ${PAD})`}>
              {nodes.flatMap((n) => n.concept.prereqs.map((p) => {
                const a = map.nodes.get(p);
                if (!a) return null;
                const x1 = a.placed.x + R, y1 = a.placed.y, x2 = n.placed.x - R, y2 = n.placed.y, mx = (x1 + x2) / 2;
                return <path key={`${p}>${n.concept.id}`} className={`tedge${dimmed(n) && dimmed(a) ? ' dim' : ''}`} d={`M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} />;
              }))}
              {nodes.map((n) => (
                <g key={n.concept.id} transform={`translate(${n.placed.x} ${n.placed.y})`} tabIndex={0} role="link"
                  aria-label={`${n.concept.title}, ${STATE_LABEL[n.state]}, mastery ${pct(n.mastery.total)}`}
                  onPointerEnter={() => setHover(n.concept.id)} onPointerLeave={() => setHover(undefined)}
                  onFocus={() => setHover(n.concept.id)} onBlur={() => setHover(undefined)}
                  onClick={() => { if (!drag.current?.moved) nav(`/concept/${n.concept.id}`); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') nav(`/concept/${n.concept.id}`); }}>
                  <Ring n={n} dim={dimmed(n)} next={map.next === n.concept.id} focus={focus === n.concept.id} />
                </g>
              ))}
            </g>
          </g>
        </svg>
        <div className="tree-ctl">
          <button className="btn" aria-label="Zoom in" onClick={() => zoom(1.25)}>+</button>
          <button className="btn" aria-label="Zoom out" onClick={() => zoom(0.8)}>−</button>
          <button className="btn" onClick={() => fit()}>Fit</button>
        </div>
      </div>

      <div className="card" aria-live="polite">
        {info ? (
          <>
            <strong>{info.concept.title}</strong> <span className="chip">{STATE_ICON[info.state]} {STATE_LABEL[info.state]}</span>
            <p>{info.concept.card.idea}</p>
            <p className="muted">
              Mastery {pct(info.mastery.total)} · problems {pct(info.mastery.problems)} · retention {pct(info.mastery.retention)} · quizzes {pct(info.mastery.quiz)}
              {info.missingPrereqs.length > 0 && ` · missing: ${info.missingPrereqs.map((p) => p.title).join(', ')}`}
            </p>
          </>
        ) : <p className="muted">Hover or focus a concept.</p>}
      </div>

      <ul className="legend plain row" aria-label="Legend">
        {(Object.keys(STATE_LABEL) as NodeState[]).map((s) => <li key={s}><span className={`swatch st-${s}`} /> {STATE_ICON[s]} {STATE_LABEL[s]}</li>)}
        <li className="muted">Ring = mastery · badge = solved/core problems · locked nodes still open</li>
      </ul>
    </>
  );
}
