// Weekly report as a 1080 x 1350 PNG (PRD 14.11). Drawn on a canvas, so it needs no network and no library.
export interface ReportData {
  weekLabel: string;
  solved: number;
  reviews: number;
  activeDays: number;
  minutes: number;
  streak: number;
  goal: { problems: number; reviews: number };
  solvedTitles: string[];
  topMistakes: string[];
  /** last 12 weeks of solved counts, oldest first */
  trend: number[];
}

export const REPORT_SIZE = { w: 1080, h: 1350 };

const css = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export function drawReport(canvas: HTMLCanvasElement, d: ReportData) {
  const { w, h } = REPORT_SIZE;
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (!g) return;
  const bg = css('--bg', '#fafaf9');
  const surface = css('--surface', '#ffffff');
  const text = css('--text', '#1c1917');
  const muted = css('--muted', '#6b6b66');
  const accent = css('--accent', '#4338ca');
  const ok = css('--ok', '#15803d');
  const font = css('--font', 'system-ui, sans-serif');

  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const T = (s: string, x: number, y: number, size: number, color = text, weight = 400, align: CanvasTextAlign = 'left') => {
    g.font = `${weight} ${size}px ${font}`;
    g.fillStyle = color;
    g.textAlign = align;
    g.fillText(s, x, y);
  };
  const box = (x: number, y: number, bw: number, bh: number) => {
    g.fillStyle = surface;
    g.beginPath();
    g.roundRect(x, y, bw, bh, 20);
    g.fill();
  };

  T('DSA Studio', 64, 100, 28, accent, 700);
  T('Weekly report', 64, 170, 64, text, 700);
  T(d.weekLabel, 64, 220, 30, muted);

  const stat = (i: number, label: string, value: string, sub?: string) => {
    const x = 64 + (i % 2) * 484;
    const y = 270 + Math.floor(i / 2) * 200;
    box(x, y, 468, 176);
    T(value, x + 32, y + 92, 72, text, 700);
    T(label, x + 32, y + 132, 28, muted);
    if (sub) T(sub, x + 436, y + 132, 24, muted, 400, 'right');
  };
  stat(0, 'Problems solved', String(d.solved), `goal ${d.goal.problems}`);
  stat(1, 'Cards reviewed', String(d.reviews), `goal ${d.goal.reviews}`);
  stat(2, 'Active days', `${d.activeDays}/7`);
  stat(3, 'Streak', `${d.streak} day${d.streak === 1 ? '' : 's'}`, d.minutes ? `${d.minutes} min practising` : undefined);

  // 12-week trend
  box(64, 690, 952, 220);
  T('Problems solved, last 12 weeks', 96, 738, 26, muted);
  const max = Math.max(1, ...d.trend);
  d.trend.forEach((n, i) => {
    const bh = Math.max(4, (n / max) * 110);
    g.fillStyle = i === d.trend.length - 1 ? accent : css('--heat-2', '#a5b4fc');
    g.fillRect(96 + i * 74, 880 - bh, 56, bh);
  });

  box(64, 940, 464, 300);
  T('Solved this week', 96, 988, 26, muted);
  (d.solvedTitles.length ? d.solvedTitles.slice(0, 6) : ['Nothing yet']).forEach((t, i) =>
    T(t.length > 28 ? `${t.slice(0, 27)}…` : t, 96, 1032 + i * 38, 26, d.solvedTitles.length ? text : muted));

  box(552, 940, 464, 300);
  T('Watch out for', 584, 988, 26, muted);
  (d.topMistakes.length ? d.topMistakes.slice(0, 5) : ['No mistakes logged']).forEach((t, i) =>
    T(t.replace(/_/g, ' '), 584, 1032 + i * 38, 26, d.topMistakes.length ? text : muted));

  T(d.solved >= d.goal.problems && d.reviews >= d.goal.reviews ? 'Weekly goal met' : 'Keep going', 540, 1300, 30, ok, 700, 'center');
}

export const toBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
