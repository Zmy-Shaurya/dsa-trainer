import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Heatmap } from '../components/Heatmap';
import { Ring } from '../components/Ring';
import { drawReport, toBlob, type ReportData } from '../components/reportPng';
import { TRACKS, useConceptMap } from '../content/useConceptMap';
import { allLogs } from '../db/cards';
import { db } from '../db/schema';
import { useActivity } from '../db/useActivity';
import { Stats } from './Review';
import { earnedBadges, type BadgeState } from '../domain/badges';
import { addDays, dayKey, weekStartKey } from '../domain/dates';
import { bestWeekRun } from '../domain/goals';
import { isActive } from '../domain/streak';
import {
  correctStreak, difficultySolved, mistakeReport, patternAccuracy, solveModes, solvedPerWeek, staleConcepts, timePerPattern, weakConcepts,
  type AttemptLite, type QuizLite,
} from '../domain/stats';
import type { ProgressRecord } from '../db/types';

function Bars({ rows, fmt = (n: number) => String(n) }: { rows: { label: string; value: number; max?: number; to?: string }[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.max ?? r.value));
  return (
    <div className="stack" style={{ gap: 6 }}>
      {rows.map((r) => (
        <div className="hbar" key={r.label}>
          <span>{r.to ? <Link to={r.to}>{r.label}</Link> : r.label}</span>
          <span className="track"><span className="fill" style={{ display: 'block', width: `${(r.value / max) * 100}%` }} /></span>
          <span className="muted">{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Progress() {
  const act = useActivity();
  const { s, today } = act;
  const map = useConceptMap();
  const attempts = useLiveQuery(async () => (await db.attempts.toArray()) as unknown as AttemptLite[], [], [] as AttemptLite[]);
  const progress = useLiveQuery(() => db.progress.toArray(), [], [] as ProgressRecord[]);
  const quizzes = useLiveQuery(async () => (await db.quizResults.orderBy('at').toArray()) as unknown as (QuizLite & { at: string })[], [], []);
  const logs = useLiveQuery(() => allLogs(), [], []);
  const [year, setYear] = useState<'recent' | number>('recent');
  const [window, setWindow] = useState<30 | 90 | 0>(30);
  const [msg, setMsg] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);

  const dayOf = (iso: string) => dayKey(new Date(iso), s.dayRolloverHour);
  const years = useMemo(() => {
    const first = [...act.days.keys()].sort()[0];
    const now = Number(today.slice(0, 4));
    return Array.from({ length: now - Number((first ?? today).slice(0, 4)) + 1 }, (_, i) => now - i);
  }, [act.days, today]);

  const d = useMemo(() => {
    const byId = map.byId;
    const now = new Date();
    const solvedIds = progress.filter((p) => p.status === 'solved').map((p) => p.problemId);
    const nodes = [...map.nodes.values()];
    const lastTouch = (coreIds: string[]) => coreIds.map((id) => progress.find((p) => p.problemId === id)?.lastAttemptAt ?? '').sort().pop() || undefined;
    const conceptRows = nodes.map((n) => ({
      id: n.concept.id, mastery: n.mastery.total, lastActivity: lastTouch(n.concept.coreProblems),
    }));
    const hasActivity = (id: string) => (map.nodes.get(id)?.concept.coreProblems ?? []).some((p) => (progress.find((x) => x.problemId === p)?.attempts ?? 0) > 0);
    const mastered = nodes.filter((n) => n.mastery.total >= 0.8);
    const sheets = (map.index?.sheets ?? []).map((sh) => {
      const ids = [...new Set(sh.sections.flatMap((x) => x.problems.map(map.canon)))];
      const got = ids.filter((id) => solvedIds.includes(id)).length;
      return { id: sh.id, name: sh.name, total: ids.length, solved: got };
    });
    const patterns = patternAccuracy(quizzes);
    const state: BadgeState = {
      solvedCount: solvedIds.length, longestStreak: act.streak.longest, conceptsMastered: mastered.length,
      tracksMastered: TRACKS.filter((t) => {
        const ns = nodes.filter((n) => n.concept.track === t);
        return ns.length > 0 && ns.every((n) => n.mastery.total >= 0.8);
      }).length,
      bestSheetPct: Math.max(0, ...sheets.map((x) => (x.total ? x.solved / x.total : 0))),
      reviews: logs.length, bestQuizRun: correctStreak(quizzes),
      patternAnswers: quizzes.filter((q) => q.kind === 'pattern').length,
      patternAccuracy: (() => { const p = quizzes.filter((q) => q.kind === 'pattern'); return p.length ? p.filter((q) => q.correct).length / p.length : 0; })(),
      perfectWeeks: bestWeekRun(act.days, today, s.weeklyGoal, s.weekStart),
    };
    return {
      per: solvedPerWeek(attempts, dayOf, today, 12, s.weekStart),
      modes: solveModes(attempts),
      diff: difficultySolved(solvedIds, byId),
      time: timePerPattern(attempts, byId).slice(0, 8),
      sheets, patterns, badges: earnedBadges(state),
      weak: weakConcepts(conceptRows, hasActivity).slice(0, 6),
      stale: staleConcepts(conceptRows.filter((c) => hasActivity(c.id)), now, 30).slice(0, 6),
      mistakes: mistakeReport(attempts, byId, now, window || undefined),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, progress, attempts, quizzes, logs, act, window]);

  const title = (id: string) => map.nodes.get(id)?.concept.title ?? id;

  const report = useMemo((): ReportData => {
    const ws = weekStartKey(today, s.weekStart);
    const inWeek = attempts.filter((a) => { const k = dayOf(a.at); return k >= ws && k <= addDays(ws, 6); });
    return {
      weekLabel: `${ws} to ${addDays(ws, 6)}`,
      solved: act.week.solved, reviews: act.week.reviews, goal: s.weeklyGoal, streak: act.streak.streak,
      activeDays: Array.from({ length: 7 }, (_, i) => act.days.get(addDays(ws, i))).filter((x) => isActive(x, s.streakMinReviews)).length,
      minutes: Math.round(inWeek.reduce((a, x) => a + (x.durationSec ?? 0), 0) / 60),
      solvedTitles: inWeek.filter((a) => a.outcome === 'solved' && !a.imported).map((a) => map.byId.get(a.problemId)?.title ?? a.problemId),
      topMistakes: mistakeReport(attempts, map.byId, new Date(), 7).distribution.map((x) => x.tag),
      trend: d.per.map((r) => r.count),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, act, d.per, map.byId]);

  useEffect(() => { if (canvas.current) drawReport(canvas.current, report); }, [report, s.theme, s.palette]);

  const download = async () => {
    const b = await toBlob(canvas.current!);
    if (!b) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `dsa-studio-week-${weekStartKey(today, s.weekStart)}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copy = async () => {
    try {
      const b = await toBlob(canvas.current!);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': b! })]);
      setMsg('Copied to the clipboard.');
    } catch {
      setMsg('Copying images is not available in this browser. Use Download.');
    }
  };

  const modeTotal = d.modes.alone + d.modes.hint + d.modes.solution;
  const matrixConcepts = [...new Set([...d.mistakes.matrix.values()].flatMap((m) => [...m.keys()]))].slice(0, 8);

  return (
    <div className="stack">
      <h1>Progress</h1>

      <section className="card" aria-label="Streak and goals">
        <div className="row" style={{ gap: 32 }}>
          <div>
            <h2>Streak</h2>
            <p><strong>{act.streak.streak}</strong> day{act.streak.streak === 1 ? '' : 's'} · longest {act.streak.longest} · ❄ {act.streak.freezes} banked</p>
            <p className="muted">Active = solve or attempt something, review {s.streakMinReviews}+ cards, or answer 5 quiz questions. Every 7th day banks a freeze (max 2).</p>
          </div>
          <div className="rings">
            <Ring value={act.week.solved} goal={s.weeklyGoal.problems} label="Problems this week" />
            <Ring value={act.week.reviews} goal={s.weeklyGoal.reviews} label="Reviews this week" />
          </div>
        </div>
      </section>

      <section className="card" aria-label="Activity heatmap">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Activity</h2>
          <label>Range{' '}
            <select value={String(year)} onChange={(e) => setYear(e.target.value === 'recent' ? 'recent' : Number(e.target.value))}>
              <option value="recent">Last 12 months</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
        <Heatmap days={act.days} today={today} weekStart={s.weekStart} frozen={act.frozen} year={year === 'recent' ? undefined : year} />
      </section>

      <div className="grid">
        <section className="card" aria-label="Solved per week">
          <h2>Solved per week</h2>
          <div className="bars" role="img" aria-label={`Solved per week: ${d.per.map((r) => r.count).join(', ')}`}>
            {d.per.map((r) => <span key={r.week} title={`Week of ${r.week}: ${r.count}`} style={{ height: `${(r.count / Math.max(1, ...d.per.map((x) => x.count))) * 100}%` }} />)}
          </div>
          <p className="muted">Last 12 weeks. Imported history is not counted.</p>
        </section>
        <section className="card" aria-label="How you solve">
          <h2>How you solve</h2>
          <Bars rows={(['alone', 'hint', 'solution'] as const).map((m) => ({ label: { alone: 'On my own', hint: 'With hints', solution: 'Saw solution' }[m], value: d.modes[m], max: Math.max(1, modeTotal) }))} />
        </section>
        <section className="card" aria-label="Difficulty">
          <h2>Difficulty solved</h2>
          <Bars rows={(['easy', 'medium', 'hard'] as const).map((k) => ({ label: k, value: d.diff[k] }))} />
        </section>
        <section className="card" aria-label="Time per pattern">
          <h2>Time per pattern</h2>
          {d.time.length ? <Bars rows={d.time.map((t) => ({ label: t.pattern, value: t.minutes }))} fmt={(n) => `${n} min`} /> : <p className="muted">Log attempts with a timer to see this.</p>}
        </section>
      </div>

      <section className="card" aria-label="Sheet progress">
        <h2>Sheets</h2>
        <Bars rows={d.sheets.map((x) => ({ label: x.name, value: x.solved, max: x.total, to: `/practice/sheet/${x.id}` }))} fmt={(n) => String(n)} />
        <p className="muted">{d.sheets.map((x) => `${x.name}: ${x.solved}/${x.total}`).join(' · ')}</p>
      </section>

      <Stats />

      <section className="card" aria-label="Weak topics">
        <h2>Weak topics</h2>
        <div className="grid">
          <div>
            <h3>Struggling</h3>
            {d.weak.length ? <ul>{d.weak.map((c) => <li key={c.id}><Link to={`/concept/${c.id}`}>{title(c.id)}</Link> <span className="muted">{Math.round(c.mastery * 100)}%</span></li>)}</ul> : <p className="muted">Nothing below 50% with activity.</p>}
          </div>
          <div>
            <h3>Going stale (30+ days)</h3>
            {d.stale.length ? <ul>{d.stale.map((c) => <li key={c.id}><Link to={`/concept/${c.id}`}>{title(c.id)}</Link> <span className="muted">last {c.lastActivity?.slice(0, 10)}</span></li>)}</ul> : <p className="muted">All your active topics are fresh.</p>}
          </div>
          <div>
            <h3>Pattern quiz accuracy</h3>
            {d.patterns.length ? <ul>{d.patterns.slice(0, 6).map((p) => <li key={p.pattern}>{p.pattern} <span className="muted">{Math.round(p.accuracy * 100)}% of {p.total}</span></li>)}</ul> : <p className="muted">No pattern quiz results yet.</p>}
          </div>
        </div>
      </section>

      <section className="card" aria-label="Mistake journal">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Mistake journal</h2>
          <div className="seg" role="group" aria-label="Window">
            {([[30, '30 days'], [90, '90 days'], [0, 'All time']] as const).map(([v, l]) => <button key={v} aria-pressed={window === v} onClick={() => setWindow(v)}>{l}</button>)}
          </div>
        </div>
        {d.mistakes.distribution.length === 0 ? <p className="muted">No mistakes tagged in this window.</p> : (
          <>
            <Bars rows={d.mistakes.distribution.map((m) => ({ label: m.tag.replace(/_/g, ' '), value: m.count, to: `/practice?mistake=${m.tag}` }))} />
            <p className="muted">Click a tag to drill the problems where it happened.</p>
            {d.mistakes.recurring.length > 0 && (
              <p role="status" className="strip">Recurring: {d.mistakes.recurring.map((t) => t.replace(/_/g, ' ')).join(', ')} (in at least 3 of your last 10 attempts).</p>
            )}
            {matrixConcepts.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="matrix">
                  <thead><tr><th scope="col">Mistake</th>{matrixConcepts.map((c) => <th key={c} scope="col">{title(c)}</th>)}</tr></thead>
                  <tbody>
                    {d.mistakes.distribution.map(({ tag }) => (
                      <tr key={tag}><th scope="row">{tag.replace(/_/g, ' ')}</th>{matrixConcepts.map((c) => <td key={c}>{d.mistakes.matrix.get(tag)?.get(c) ?? ''}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <section className="card" aria-label="Badges">
        <h2>Badges <span className="muted">{d.badges.filter((b) => b.got).length}/{d.badges.length}</span></h2>
        <div className="badges">
          {d.badges.map((b) => (
            <div key={b.id} className={`badge${b.got ? '' : ' off'}`} title={b.hint}>
              <strong>{b.got ? '🏅 ' : '🔒 '}{b.title}</strong><br /><span className="muted">{b.hint}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-label="Weekly report">
        <h2>Weekly report</h2>
        <div className="row">
          <button className="btn primary" onClick={() => void download()}>Download PNG</button>
          <button className="btn" onClick={() => void copy()}>Copy to clipboard</button>
          <span role="status" className="muted">{msg}</span>
        </div>
        <canvas ref={canvas} aria-label="Weekly report preview" style={{ width: '100%', maxWidth: 360, marginTop: 8, border: '1px solid var(--border)', borderRadius: 8 }} />
      </section>
    </div>
  );
}
