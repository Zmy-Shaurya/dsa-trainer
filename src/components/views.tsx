import type { AuxView, GraphView, GridView, ListView, TableView, Tone, TreeView, View } from '../engine/types';
import { ArrayRenderer } from './ArrayRenderer';

/** Drive mode: which things can be clicked right now. Values are strings ("3", "A", "2,1"). */
export interface PickCtx {
  active: boolean;
  /** shown outlined after "Show me" */
  reveal: ReadonlySet<string>;
  onPick(v: string): void;
}

const GLYPH: Partial<Record<Tone, string>> = { swap: '⇄', found: '✓', error: '✕', visited: '●' };
const toneClass = (t?: Tone) => `tone-${t ?? 'neutral'}`;
const key = (e: React.KeyboardEvent, fn: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
};
const clickable = (pick: PickCtx | undefined, id: string) =>
  pick?.active ? { role: 'button', tabIndex: 0, style: { cursor: 'pointer' }, onClick: () => pick.onPick(id), onKeyDown: (e: React.KeyboardEvent) => key(e, () => pick.onPick(id)) } : {};

export function TreeRenderer({ view, pick }: { view: TreeView; pick?: PickCtx }) {
  const byId = new Map(view.nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  let order = 0;
  let depthMax = 0;
  const walk = (id: string | undefined, d: number) => {
    const n = id ? byId.get(id) : undefined;
    if (!id || !n || pos.has(id)) return;
    walk(n.left, d + 1);
    pos.set(id, { x: order++, y: d });
    depthMax = Math.max(depthMax, d);
    walk(n.right, d + 1);
  };
  walk(view.root ?? undefined, 0);
  for (const n of view.nodes) if (!pos.has(n.id)) pos.set(n.id, { x: order++, y: 0 });
  const W = 40;
  const H = 56;
  const width = Math.max(order, 1) * W + 24;
  const height = (depthMax + 1) * H + 40;
  const at = (id: string) => ({ cx: 12 + pos.get(id)!.x * W + W / 2, cy: 24 + pos.get(id)!.y * H });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={`${view.name ?? 'Tree'}: ${view.nodes.map((n) => n.value).join(', ')}`} style={{ maxWidth: '100%', height: 'auto' }}>
      {view.name && <text x={4} y={11} className="viz-name">{view.name}</text>}
      {view.nodes.flatMap((n) => [n.left, n.right].map((c) => (c && byId.has(c) ? (
        <line key={`${n.id}-${c}`} x1={at(n.id).cx} y1={at(n.id).cy} x2={at(c).cx} y2={at(c).cy} stroke="var(--tone-neutral)" strokeWidth={1.5} />
      ) : null)))}
      {view.nodes.map((n) => {
        const { cx, cy } = at(n.id);
        const tone = n.tone ?? 'neutral';
        return (
          <g key={n.id} className={toneClass(tone)} opacity={tone === 'dim' ? 0.4 : 1} aria-label={`node ${n.value}`} {...clickable(pick, n.id)}>
            <circle className="viz-fill" cx={cx} cy={cy} r={16} strokeWidth={tone === 'active' || pick?.reveal.has(n.id) ? 3.5 : 1.5} strokeDasharray={pick?.reveal.has(n.id) ? '3 2' : undefined} />
            <text x={cx} y={cy + 4} textAnchor="middle" className="viz-value">{n.value}</text>
            {GLYPH[tone] && <text x={cx + 14} y={cy - 14} className="viz-glyph">{GLYPH[tone]}</text>}
          </g>
        );
      })}
      {(view.pointers ?? []).map((p) => (byId.has(p.nodeId) ? (
        <text key={p.name} x={at(p.nodeId).cx} y={at(p.nodeId).cy + 32} textAnchor="middle" className="viz-pointer">▲ {p.name}</text>
      ) : null))}
    </svg>
  );
}

export function GraphRenderer({ view, pick }: { view: GraphView; pick?: PickCtx }) {
  const byId = new Map(view.nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox="0 0 320 290" width={320} height={290} role="img" aria-label={`${view.name ?? 'Graph'} with ${view.nodes.length} nodes`} style={{ maxWidth: '100%', height: 'auto' }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
        </marker>
      </defs>
      {view.name && <text x={4} y={11} className="viz-name">{view.name}</text>}
      {view.edges.map((e, k) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const x1 = a.x + (dx / len) * 17;
        const y1 = a.y + (dy / len) * 17;
        const x2 = b.x - (dx / len) * (e.directed ? 20 : 17);
        const y2 = b.y - (dy / len) * (e.directed ? 20 : 17);
        const color = `var(--tone-${e.tone ?? 'neutral'})`;
        return (
          <g key={k}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={e.tone && e.tone !== 'neutral' ? 3.5 : 1.5}
              strokeDasharray={e.tone === 'dim' ? '3 3' : undefined} opacity={e.tone === 'dim' ? 0.5 : 1} markerEnd={e.directed ? 'url(#arrow)' : undefined} />
            {e.weight !== undefined && <text x={(a.x + b.x) / 2 + 6} y={(a.y + b.y) / 2 - 4} className="viz-index">{e.weight}</text>}
          </g>
        );
      })}
      {view.nodes.map((n) => {
        const tone = n.tone ?? 'neutral';
        return (
          <g key={n.id} className={toneClass(tone)} opacity={tone === 'dim' ? 0.4 : 1} aria-label={`node ${n.label}`} {...clickable(pick, n.id)}>
            <circle className="viz-fill" cx={n.x} cy={n.y} r={16} strokeWidth={tone === 'active' || pick?.reveal.has(n.id) ? 3.5 : 1.5} strokeDasharray={pick?.reveal.has(n.id) ? '3 2' : undefined} />
            <text x={n.x} y={n.y + 4} textAnchor="middle" className="viz-value">{n.label}</text>
            {GLYPH[tone] && <text x={n.x + 14} y={n.y - 14} className="viz-glyph">{GLYPH[tone]}</text>}
            {n.note !== undefined && <text x={n.x} y={n.y + 31} textAnchor="middle" className="viz-index">{n.note}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function GridRenderer({ view, pick }: { view: GridView; pick?: PickCtx }) {
  const ptr = new Map<string, string[]>();
  for (const p of view.pointers ?? []) ptr.set(`${p.r},${p.c}`, [...(ptr.get(`${p.r},${p.c}`) ?? []), p.name]);
  return (
    <div className="gwrap">
      {view.name && <div className="viz-name-html">{view.name}</div>}
      <div className="vgrid" role="grid" aria-label={view.name ?? 'Grid'} style={{ gridTemplateColumns: `repeat(${view.cols}, 40px)` }}>
        {view.cells.flatMap((row, r) => row.map((c, col) => {
          const id = `${r},${col}`;
          const t = c.tone ?? 'neutral';
          return (
            <div key={id} role="gridcell" aria-label={`row ${r} column ${col}: ${c.value}`} className={`gcell ${toneClass(t)}${pick?.reveal.has(id) ? ' reveal' : ''}`} {...clickable(pick, id)}>
              {c.label ?? c.value}{GLYPH[t] && <sup>{GLYPH[t]}</sup>}
              {ptr.has(id) && <span className="gptr">▲{ptr.get(id)!.join(',')}</span>}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

export function TableRenderer({ view }: { view: TableView }) {
  const deps = new Set((view.arrows ?? []).map((a) => `${a.from[0]},${a.from[1]}`));
  const target = (view.arrows ?? [])[0]?.to;
  return (
    <div className="gwrap">
      {view.name && <div className="viz-name-html">{view.name}</div>}
      <table className="vtable" aria-label={view.name ?? 'Table'}>
        <thead><tr><th />{view.colLabels.map((l, i) => <th key={i} scope="col">{l}</th>)}</tr></thead>
        <tbody>
          {view.cells.map((row, r) => (
            <tr key={r}>
              <th scope="row">{view.rowLabels[r]}</th>
              {row.map((c, col) => (
                <td key={col} className={`gcell ${toneClass(c.tone)}${deps.has(`${r},${col}`) ? ' dep' : ''}${target && target[0] === r && target[1] === col ? ' cur' : ''}`}>{c.value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {deps.size > 0 && <p className="muted">Dashed cells are the ones the current cell is computed from.</p>}
    </div>
  );
}

export function ListRenderer({ view }: { view: ListView }) {
  const W = 78;
  const width = view.nodes.length * W + 24;
  const ptrs = new Map<string, string[]>();
  for (const p of view.pointers) ptrs.set(p.nodeId, [...(ptrs.get(p.nodeId) ?? []), p.name]);
  const idx = new Map(view.nodes.map((n, i) => [n.id, i]));
  return (
    <svg viewBox={`0 0 ${width} 96`} width={width} height={96} role="img" aria-label={`${view.name ?? 'Linked list'}: ${view.nodes.map((n) => n.value).join(' to ')}`} style={{ maxWidth: '100%', height: 'auto' }}>
      {view.name && <text x={4} y={11} className="viz-name">{view.name}</text>}
      {view.nodes.map((n, i) => {
        const x = 12 + i * W;
        const t = n.tone ?? 'neutral';
        const to = n.next === null ? undefined : idx.get(n.next);
        return (
          <g key={n.id} className={toneClass(t)} opacity={t === 'dim' ? 0.4 : 1}>
            <rect className="viz-fill" x={x} y={26} width={46} height={30} rx={5} strokeWidth={t === 'active' ? 3 : 1.5} />
            <text x={x + 23} y={46} textAnchor="middle" className="viz-value">{n.value}</text>
            {n.next === null && <text x={x + 52} y={46} className="viz-index">∅</text>}
            {to !== undefined && to > i && <path d={`M${x + 46},41 H${12 + to * W - 2}`} stroke="var(--tone-neutral)" strokeWidth={1.5} markerEnd="url(#larrow)" fill="none" />}
            {to !== undefined && to < i && <path d={`M${x + 23},56 q0,22 ${12 + to * W + 23 - x - 23},22 t0,-22`} stroke="var(--tone-swap)" strokeWidth={1.5} fill="none" markerEnd="url(#larrow)" />}
            {ptrs.has(n.id) && <text x={x + 23} y={82} textAnchor="middle" className="viz-pointer">▲ {ptrs.get(n.id)!.join(',')}</text>}
          </g>
        );
      })}
      <defs><marker id="larrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--tone-neutral)" /></marker></defs>
    </svg>
  );
}

export function AuxPanel({ aux }: { aux: AuxView }) {
  const vertical = aux.structure === 'stack';
  return (
    <div className="auxp" role="group" aria-label={`${aux.structure} ${aux.name}`}>
      <span className="muted">{aux.name} <small>({aux.structure}{aux.structure === 'stack' ? ', top at the right' : aux.structure === 'queue' ? ', front at the left' : ''})</small></span>
      <div className={`auxitems${vertical ? ' stack' : ''}`}>
        {aux.items.length === 0 && <span className="muted">empty</span>}
        {aux.items.map((it, i) => <span key={i} className={`chip mono${aux.highlight?.includes(i) ? ' hl' : ''}`}>{String(it)}</span>)}
      </div>
    </div>
  );
}

export function ViewRenderer({ view, pick }: { view: View; pick?: PickCtx }) {
  switch (view.kind) {
    case 'array': return <ArrayRenderer view={view} pick={pick} />;
    case 'tree': return <TreeRenderer view={view} pick={pick} />;
    case 'graph': return <GraphRenderer view={view} pick={pick} />;
    case 'grid': return <GridRenderer view={view} pick={pick} />;
    case 'table': return <TableRenderer view={view} />;
    case 'list': return <ListRenderer view={view} />;
  }
}
