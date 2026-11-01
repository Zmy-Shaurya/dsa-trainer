// Big-O plotter maths (PRD 14.10). Everything is computed as log10 of the operation count, so n! and 2^n never overflow.

export interface Curve {
  id: string;
  label: string;
  /** log10 of the operation count at n */
  log10: (n: number) => number;
}

const LN10 = Math.LN10;
const log2 = (n: number) => Math.max(1, Math.log2(n));

/** Lanczos approximation of ln(Gamma(x)), x > 0. */
export function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  const y = x - 1;
  let a = c[0]!;
  const t = y + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i]! / (y + i);
  return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(a);
}

export const CURVES: Curve[] = [
  { id: 'const', label: '1', log10: () => 0 },
  { id: 'log', label: 'log n', log10: (n) => Math.log10(log2(n)) },
  { id: 'sqrt', label: '√n', log10: (n) => 0.5 * Math.log10(n) },
  { id: 'linear', label: 'n', log10: (n) => Math.log10(n) },
  { id: 'nlogn', label: 'n log n', log10: (n) => Math.log10(n) + Math.log10(log2(n)) },
  { id: 'quad', label: 'n²', log10: (n) => 2 * Math.log10(n) },
  { id: 'cubic', label: 'n³', log10: (n) => 3 * Math.log10(n) },
  { id: 'exp', label: '2ⁿ', log10: (n) => n * Math.LOG10E * Math.LN2 },
  { id: 'fact', label: 'n!', log10: (n) => lgamma(n + 1) / LN10 },
];

export const OPS_PRESETS = [1e7, 1e8, 1e9];

/** Anything above 10^300 is shown as huge instead of a number. */
export const HUGE = 300;

/** "1.2e8", "950", or "∞ (huge)". */
export function formatOps(l10: number): string {
  if (l10 > HUGE) return '∞ (huge)';
  if (l10 < 3) return String(Math.round(10 ** l10));
  const e = Math.floor(l10);
  const m = 10 ** (l10 - e);
  return `${m.toFixed(1)}e${e}`;
}

const UNITS: [limit: number, seconds: number, name: string][] = [
  [1, 1e-3, 'ms'], [60, 1, 's'], [3600, 60, 'min'], [86400, 3600, 'h'], [86400 * 365, 86400, 'days'], [Infinity, 86400 * 365, 'years'],
];
export const UNIVERSE_SECONDS = 4.3e17;

/** Human time for a duration given as log10 of seconds. */
export function formatDuration(l10Seconds: number): string {
  if (l10Seconds > Math.log10(UNIVERSE_SECONDS)) return 'longer than the age of the universe';
  const s = 10 ** l10Seconds;
  if (s < 1e-3) return '< 1 ms';
  for (const [limit, unit, name] of UNITS) {
    if (s < limit) {
      const v = s / unit;
      return `${v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 1 : 2)} ${name}`;
    }
  }
  return '';
}

export interface Row {
  curve: Curve;
  ops: string;
  time: string;
  tooSlow: boolean;
}

export function table(n: number, opsPerSecond: number, curves: readonly Curve[] = CURVES): Row[] {
  return curves.map((curve) => {
    const l = curve.log10(n);
    const secs = l - Math.log10(opsPerSecond);
    return { curve, ops: formatOps(l), time: l > HUGE ? 'longer than the age of the universe' : formatDuration(secs), tooSlow: secs > 0 };
  });
}

/** Rule of thumb at about 10^8 simple operations. */
export const FEASIBLE: { upTo: number; label: string }[] = [
  { upTo: 11, label: 'O(n!)' },
  { upTo: 25, label: 'O(2ⁿ)' },
  { upTo: 500, label: 'O(n³)' },
  { upTo: 5000, label: 'O(n²)' },
  { upTo: 1e6, label: 'O(n log n)' },
  { upTo: 1e8, label: 'O(n)' },
  { upTo: Infinity, label: 'O(log n) / O(1)' },
];

/** The slowest feasible complexity for n, and everything faster. */
export function feasibleFor(n: number): string[] {
  const i = FEASIBLE.findIndex((r) => n <= r.upTo);
  return FEASIBLE.slice(i).map((r) => r.label);
}

/** Chart points: (log10 n, log10 ops) sampled on a log grid. */
export function series(curve: Curve, maxLog10N: number, steps = 120): { x: number; y: number }[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = (maxLog10N * i) / steps;
    return { x, y: curve.log10(Math.max(1, 10 ** x)) };
  });
}
