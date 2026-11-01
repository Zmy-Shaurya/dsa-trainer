import type { ArrayView, Tone } from '../engine/types';
import type { PickCtx } from './views';

const CELL = 48;
const PAD = 12;
const GLYPH: Partial<Record<Tone, string>> = { swap: '⇄', found: '✓', error: '✕', visited: '●' };

export function ArrayRenderer({ view, pick }: { view: ArrayView; pick?: PickCtx }) {
  const n = view.cells.length;
  const bars = view.style === 'bars';
  const width = PAD * 2 + Math.max(n, 1) * CELL;
  const nums = view.cells.map((c) => Number(c.value));
  const vmin = Math.min(0, ...nums);
  const vmax = Math.max(1, ...nums);
  const barMax = 130;
  const top = bars ? 28 : 28;
  const base = bars ? top + barMax : top + 44; // baseline y
  const idxY = base + 16;
  const ptrY = idxY + 20;
  const brY = ptrY + 14;
  const height = brY + 34;
  const x = (i: number) => PAD + i * CELL;

  const byIndex = new Map<number, string[]>();
  for (const p of view.pointers) {
    if (p.index < 0 || p.index >= n) continue;
    byIndex.set(p.index, [...(byIndex.get(p.index) ?? []), p.name]);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img"
      aria-label={`${view.name ?? 'Array'}: ${view.cells.map((c) => c.value).join(', ')}`}
      style={{ maxWidth: '100%', height: 'auto' }}>
      {view.name && <text x={PAD} y={12} className="viz-name">{view.name}</text>}
      {view.cells.map((c, i) => {
        const tone = c.tone ?? 'neutral';
        const h = bars ? ((Number(c.value) - vmin) / (vmax - vmin)) * (barMax - 6) + 6 : 44;
        const y = base - h;
        const w = bars ? CELL - 12 : CELL - 4;
        const cx = x(i) + (CELL - w) / 2;
        return (
          <g key={i} className={`tone-${tone}`} opacity={tone === 'dim' ? 0.4 : 1}
            {...(pick?.active ? { role: 'button', tabIndex: 0, 'aria-label': `index ${i}`, style: { cursor: 'pointer' }, onClick: () => pick.onPick(String(i)), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick.onPick(String(i)); } } } : {})}>
            {tone === 'compare' && (
              <rect className="viz-rect" x={cx - 4} y={y - 4} width={w + 8} height={h + 8} rx={5} fill="none" stroke="var(--tone-compare)" strokeWidth={1.5} />
            )}
            <rect className="viz-rect viz-fill" x={cx} y={y} width={w} height={h} rx={4}
              strokeWidth={tone === 'active' || pick?.reveal.has(String(i)) ? 3.5 : 1.5} strokeDasharray={pick?.reveal.has(String(i)) ? '3 2' : undefined} />
            {GLYPH[tone] && <text x={cx + w / 2} y={y - 8} textAnchor="middle" className="viz-glyph">{GLYPH[tone]}</text>}
            {tone === 'sorted' && <line x1={cx} x2={cx + w} y1={base + 3} y2={base + 3} className="viz-underline" />}
            <text x={cx + w / 2} y={bars ? y - (GLYPH[tone] ? 22 : 6) : y + h / 2 + 5} textAnchor="middle" className="viz-value">
              {c.label ?? c.value}
            </text>
            <text x={cx + w / 2} y={idxY} textAnchor="middle" className="viz-index">{i}</text>
          </g>
        );
      })}
      {[...byIndex].map(([i, names]) => (
        <text key={`p${i}`} x={x(i) + CELL / 2} y={ptrY} textAnchor="middle" className="viz-pointer">
          ▲ {names.join(',')}
        </text>
      ))}
      {(view.brackets ?? []).map((b, k) => {
        const from = Math.max(0, b.from);
        const to = Math.min(n - 1, b.to);
        if (to < from) return null;
        const x1 = x(from) + 4;
        const x2 = x(to) + CELL - 4;
        const y = brY + k * 16;
        return (
          <g key={`b${k}`} className="viz-bracket">
            <path d={`M${x1},${y - 5} V${y} H${x2} V${y - 5}`} fill="none" />
            {b.label && <text x={(x1 + x2) / 2} y={y + 13} textAnchor="middle">{b.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}
