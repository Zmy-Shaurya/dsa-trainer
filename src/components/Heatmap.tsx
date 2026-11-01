import { useEffect, useMemo, useRef } from 'react';
import { grid, yearGrid, type HeatCounts } from '../domain/heatmap';

const SIZE = 12;
const PITCH = 15;
const LEFT = 26;
const TOP = 16;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  days: ReadonlyMap<string, HeatCounts>;
  today: string;
  weekStart: 'monday' | 'sunday';
  frozen?: ReadonlySet<string>;
  /** a calendar year instead of the last 53 weeks */
  year?: number;
}

/** 53 x 7 activity grid (PRD 14.11). Level colours come from --heat-0..4; frozen days show a snowflake. */
export function Heatmap({ days, today, weekStart, frozen, year }: Props) {
  const cells = useMemo(() => (year ? yearGrid(year, days, weekStart) : grid(today, days, weekStart)), [days, today, weekStart, year]);
  const weeks = cells.length / 7;
  const wrap = useRef<HTMLDivElement>(null);
  // Start scrolled to the newest week.
  useEffect(() => { if (wrap.current) wrap.current.scrollLeft = year ? 0 : wrap.current.scrollWidth; }, [year, weeks]);
  const labels = ['Mon', 'Wed', 'Fri'].map((l, i) => ({ l, row: weekStart === 'monday' ? i * 2 : i * 2 + 1 }));
  const total = cells.filter((c) => !c.pad && c.level > 0).length;
  return (
    <div className="heatwrap" ref={wrap}>
      <svg
        className="heatmap" role="img" aria-label={`Activity heatmap, ${total} active days`}
        viewBox={`0 0 ${LEFT + weeks * PITCH} ${TOP + 7 * PITCH}`} width={LEFT + weeks * PITCH} height={TOP + 7 * PITCH}
      >
        {labels.map(({ l, row }) => <text key={l} x={0} y={TOP + row * PITCH + 10} className="hm-label">{l}</text>)}
        {cells.map((c) => {
          if (c.pad) return null;
          const x = LEFT + c.col * PITCH;
          const y = TOP + c.row * PITCH;
          const d = days.get(c.date);
          const snow = frozen?.has(c.date);
          return (
            <g key={c.date}>
              <rect x={x} y={y} width={SIZE} height={SIZE} rx={2} className={`hm l${c.level}${c.date === today ? ' today' : ''}`}>
                <title>
                  {d
                    ? `${c.date}: ${d.solved} solved, ${d.attempted} attempted, ${d.reviews} reviews, ${d.quizzes} quiz answers`
                    : `${c.date}: no activity`}{snow ? ' (streak freeze used)' : ''}
                </title>
              </rect>
              {snow && <text x={x + SIZE / 2} y={y + 10} textAnchor="middle" className="hm-snow" aria-hidden>❄</text>}
              {c.row === 0 && Number(c.date.slice(8)) <= 7 && (
                <text x={x} y={10} className="hm-label">{MONTHS[Number(c.date.slice(5, 7)) - 1]}</text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="muted hm-legend" aria-hidden>
        Less {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`hm l${l}`} />)} More
      </p>
    </div>
  );
}

