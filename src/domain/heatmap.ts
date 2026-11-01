// Heatmap units, levels and the 53 x 7 grid (PRD 14.11).
import { addDays, weekStartKey } from './dates';

export interface HeatCounts {
  solved: number;
  attempted: number;
  reviews: number;
  quizzes: number;
}

export const units = (d: HeatCounts) => 3 * d.solved + d.attempted + Math.floor(d.reviews / 10) + Math.floor(d.quizzes / 5);

export const level = (u: number): 0 | 1 | 2 | 3 | 4 => (u <= 0 ? 0 : u <= 2 ? 1 : u <= 5 ? 2 : u <= 9 ? 3 : 4);

export interface Cell {
  date: string;
  col: number;
  row: number;
  level: 0 | 1 | 2 | 3 | 4;
  /** outside the requested range (leading or trailing padding) */
  pad: boolean;
}

const cellsFrom = (
  first: string, weeks: number, days: ReadonlyMap<string, HeatCounts>, outside: (date: string) => boolean,
): Cell[] => {
  const cells: Cell[] = [];
  for (let col = 0; col < weeks; col++)
    for (let row = 0; row < 7; row++) {
      const date = addDays(first, col * 7 + row);
      const d = days.get(date);
      cells.push({ date, col, row, level: d ? level(units(d)) : 0, pad: outside(date) });
    }
  return cells;
};

/** Columns are weeks, rows are weekdays. Range = the 53 weeks ending with the week of `end`. */
export function grid(
  end: string, days: ReadonlyMap<string, HeatCounts>, weekStart: 'monday' | 'sunday' = 'monday', weeks = 53,
): Cell[] {
  const first = addDays(weekStartKey(end, weekStart), -7 * (weeks - 1));
  return cellsFrom(first, weeks, days, (d) => d > end);
}

/** A calendar year (Jan 1 to Dec 31) in the same grid shape. */
export function yearGrid(year: number, days: ReadonlyMap<string, HeatCounts>, weekStart: 'monday' | 'sunday' = 'monday'): Cell[] {
  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const first = weekStartKey(jan1, weekStart);
  const weeks = Math.round((Date.parse(weekStartKey(dec31, weekStart)) - Date.parse(first)) / (7 * 86_400_000)) + 1;
  return cellsFrom(first, weeks, days, (d) => d < jan1 || d > dec31);
}
