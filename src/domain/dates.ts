/** Local-date key `YYYY-MM-DD`, shifted back by `rolloverHour` so late-night study counts for the previous day. */
export function dayKey(now: Date, rolloverHour = 4): string {
  const d = new Date(now.getTime() - rolloverHour * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
};
const fmtKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Day-key arithmetic in UTC, so daylight saving never shifts a day. */
export const addDays = (key: string, n: number) => fmtKey(parseKey(key) + n * 86_400_000);
export const daysBetween = (from: string, to: string) => Math.round((parseKey(to) - parseKey(from)) / 86_400_000);
/** 0 = Monday ... 6 = Sunday. */
export const weekday = (key: string) => (new Date(parseKey(key)).getUTCDay() + 6) % 7;
/** First day key of the week containing `key`. */
export const weekStartKey = (key: string, weekStart: 'monday' | 'sunday' = 'monday') =>
  addDays(key, -(weekStart === 'monday' ? weekday(key) : (weekday(key) + 1) % 7));
