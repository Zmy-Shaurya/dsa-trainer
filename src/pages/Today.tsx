import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { Heatmap } from '../components/Heatmap';
import { Ring } from '../components/Ring';
import { useConceptMap } from '../content/useConceptMap';
import { isHidden, type CardRecord } from '../db/cards';
import { doneToday } from '../db/cards';
import { ensurePlan, getPlan, syncPlan } from '../db/dailyPlan';
import { hasChangesSince } from '../db/export';
import { db } from '../db/schema';
import { useActivity } from '../db/useActivity';
import { useActivePath } from '../db/usePaths';
import { lastDay, overdueItems, pathPlanItems, todayIndex } from '../domain/paths';
import { buildQueue } from '../domain/cardQueue';
import { buildDailyPlan, type PlanInput, type PlanItem } from '../domain/plan';
import { TEMPLATE_OF } from '../domain/quiz';
import { resurfaceDue } from '../domain/resurface';
import { isActive } from '../domain/streak';
import type { ProgressRecord } from '../db/types';

const linkOf = (it: PlanItem) =>
  it.kind === 'review' ? '/review'
    : it.kind === 'concept' ? `/concept/${it.refId}`
      : it.kind === 'quiz' ? `/tools/${it.refId === 'pattern' ? 'pattern-trainer' : 'complexity-quiz'}?n=5&auto=1`
        : `/problem/${it.refId}`;

const meta = async (key: string) => (await db.meta.get(key))?.value as string | undefined;

export default function Today() {
  const act = useActivity();
  const { s, today } = act;
  const map = useConceptMap();
  const nav = useNavigate();
  const progress = useLiveQuery(() => db.progress.toArray(), [], [] as ProgressRecord[]);
  const cards = useLiveQuery(async () => (await db.cards.toArray()) as unknown as CardRecord[], [], [] as CardRecord[]);
  const done = useLiveQuery(() => doneToday(), [cards], { reviews: 0, fresh: 0 });
  const plan = useLiveQuery(() => getPlan(today), [today]);
  const path = useActivePath();
  const [budget, setBudget] = useState<number>();
  // a zero budget marks a plan a path change asked to rebuild
  const chosen = budget ?? (plan?.budgetMin || s.defaultBudgetMin);

  const queue = useMemo(() => buildQueue({
    cards: cards.map((c) => ({ id: c.id, due: c.fsrs.due, state: c.fsrs.state as 0 | 1 | 2 | 3, suspended: !!c.suspended, hidden: isHidden(c) })),
    now: new Date(), newLimit: s.newCardsPerDay, newDoneToday: done.fresh, maxReviews: s.maxReviewsPerDay, reviewsDoneToday: done.reviews,
  }), [cards, s.newCardsPerDay, s.maxReviewsPerDay, done]);

  const dueNow = queue.filter((id) => (cards.find((c) => c.id === id)?.fsrs.state ?? 0) !== 0).length;

  const input = useMemo((): PlanInput | undefined => {
    if (!map.ready || !map.loaded) return undefined;
    const nodes = [...map.nodes.values()];
    const pmap = new Map(progress.map((p) => [p.problemId, p]));
    return {
      now: new Date(), budgetMin: chosen, dueCardCount: queue.length,
      resurfaceDue: resurfaceDue(progress, new Date()).map((r) => ({ problemId: r.problemId, overdueDays: r.overdueDays })),
      concepts: nodes.map((n) => ({
        id: n.concept.id, title: n.concept.title, order: n.concept.order, depth: n.placed.depth, prereqs: n.concept.prereqs, coreProblems: n.concept.coreProblems,
      })),
      mastery: new Map(nodes.map((n) => [n.concept.id, n.mastery.total])),
      conceptState: new Map(nodes.map((n) => [n.concept.id, { unlockOverride: n.state0?.unlockOverride, viewedAt: n.state0?.viewedAt }])),
      problems: new Map([...map.byId].map(([id, p]) => [id, { title: p.title, difficulty: p.difficulty }])),
      solved: new Set(progress.filter((p) => p.status === 'solved').map((p) => p.problemId)),
      conceptAttempts: new Map(nodes.map((n) => [n.concept.id, n.concept.coreProblems.reduce((a, id) => a + (pmap.get(id)?.attempts ?? 0), 0)])),
      quizAvailable: true,
      patternConcepts: new Set(Object.keys(TEMPLATE_OF)),
      ...(path.state && path.def ? {
        pathItems: pathPlanItems(path.def, path.state, today, path.auto, {
          problem: (id) => ({ title: map.byId.get(id)?.title ?? path.def?.info?.[id]?.title ?? id, difficulty: map.byId.get(id)?.difficulty ?? path.def?.info?.[id]?.difficulty ?? 'medium' }),
          concept: (id) => map.nodes.get(id)?.concept.title ?? id,
        }),
      } : {}),
    };
  }, [map, progress, queue, chosen, path.state, path.def, path.auto, today]);

  // The plan is frozen on first generation; only a budget change rebuilds it.
  const latest = useRef(input);
  latest.current = input;
  const ready = !!input && cards !== undefined;
  useEffect(() => {
    if (!ready) return;
    void ensurePlan(chosen, () => buildDailyPlan(latest.current!)).then(() => syncPlan());
  }, [ready, chosen]);

  // Tick items as the day's activity comes in.
  const sig = [act.days.get(today)?.reviews, act.days.get(today)?.attempted, act.days.get(today)?.quizzes, plan?.items.length].join();
  useEffect(() => { void syncPlan(); }, [sig]);

  const items = plan?.items ?? [];
  const finished = items.filter((i) => i.done).length;
  const allDone = items.length > 0 && finished === items.length;
  const minutesLeft = Math.round(items.filter((i) => !i.done).reduce((a, i) => a + i.estMinutes, 0));

  const banners = useLiveQuery(async () => {
    const [last, created, version, seen] = await Promise.all([meta('lastExportAt'), meta('createdAt'), meta('contentVersion'), meta('contentNoticeSeen')]);
    const since = last ?? created;
    const age = since ? Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000) : 0;
    const due = s.backupReminderDays > 0 && age >= s.backupReminderDays && (await hasChangesSince(last));
    return { backup: due ? age : null, version, seen };
  }, [s.backupReminderDays, plan], { backup: null, version: undefined as string | undefined, seen: undefined as string | undefined });
  useEffect(() => {
    if (banners.version && !banners.seen) void db.meta.put({ key: 'contentNoticeSeen', value: banners.version });
  }, [banners.version, banners.seen]);
  const newContent = banners.version && banners.seen && banners.version !== banners.seen;

  const surprise = () => {
    const weak = [...map.nodes.values()].filter((n) => n.mastery.total < 0.5 && n.concept.coreProblems.some((id) => progress.some((p) => p.problemId === id)));
    const pool = (weak.length ? weak : [...map.nodes.values()]).flatMap((n) => n.concept.coreProblems)
      .filter((id) => progress.find((p) => p.problemId === id)?.status !== 'solved' && map.byId.has(id));
    if (pool.length) nav(`/problem/${pool[Math.floor(Math.random() * pool.length)]}`);
  };

  return (
    <div className="stack">
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Today</h1>
          <p className="muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <p aria-label={`Streak: ${act.streak.streak} days`}>
          <strong>🔥 {act.streak.streak}</strong> day{act.streak.streak === 1 ? '' : 's'}
          {act.streak.freezes > 0 && <span className="chip" title="A banked freeze covers one missed day"> ❄ {act.streak.freezes}</span>}
        </p>
      </header>

      {banners.backup !== null && (
        <div className="banner" role="status">
          <span>It has been {banners.backup} days since your last backup.</span>
          <Link className="btn" to="/data">Export now</Link>
        </div>
      )}
      {newContent && (
        <div className="banner" role="status">
          <span>New content version {banners.version}. Your cards were synced.</span>
          <button className="btn" onClick={() => void db.meta.put({ key: 'contentNoticeSeen', value: banners.version })}>Dismiss</button>
        </div>
      )}

      {path.state && path.def && (() => {
        const late = overdueItems(path.def, path.state, today, path.auto).length;
        const day = Math.min(todayIndex(path.state, today), lastDay(path.def));
        return (
          <>
            {late > 0 && (
              <div className="banner" role="status">
                <span>{path.def.name} is behind schedule by {late} item{late === 1 ? '' : 's'}.</span>
                <Link className="btn" to={`/paths/${encodeURIComponent(path.state.pathId)}`}>Catch up</Link>
              </div>
            )}
            <section className="card" aria-label="Active path">
              <h2>Path</h2>
              <p><Link to={`/paths/${encodeURIComponent(path.state.pathId)}`}>{path.def.name}</Link> · <strong>Day {day} of {lastDay(path.def)}</strong></p>
            </section>
          </>
        );
      })()}

      <section className="card" aria-label="Weekly goals">
        <h2>This week</h2>
        <div className="rings">
          <Ring value={act.week.solved} goal={s.weeklyGoal.problems} label="Problems solved" />
          <Ring value={act.week.reviews} goal={s.weeklyGoal.reviews} label="Cards reviewed" />
        </div>
        {act.weekRun > 0 && <p className="muted">{act.weekRun} week{act.weekRun === 1 ? '' : 's'} in a row meeting your goal.</p>}
      </section>

      <section className="card" aria-label="Today's plan">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Plan</h2>
          <div className="seg" role="group" aria-label="Time budget">
            {[30, 60, 90].map((m) => (
              <button key={m} aria-pressed={chosen === m} onClick={() => setBudget(m)}>{m} min</button>
            ))}
          </div>
        </div>
        {!plan && <p className="muted">Building your plan…</p>}
        {plan && items.length === 0 && (
          <p>Nothing queued. Open the <Link to="/tree">skill tree</Link> or pick something from <Link to="/practice">Practice</Link>.</p>
        )}
        {allDone ? (
          <p className="celebrate" role="status"><strong>Plan complete.</strong> Nice work. Anything more today is a bonus.</p>
        ) : (
          items.length > 0 && <p className="muted">{finished} of {items.length} done · about {minutesLeft} min left</p>
        )}
        <ul className="plan">
          {items.map((it) => (
            <li key={it.id} className={it.done ? 'done' : ''}>
              <span className="tick" aria-hidden>{it.done ? '✓' : ''}</span>
              <span className="title">
                <Link to={linkOf(it)}>{it.title}</Link>
                <br /><span className="muted">{it.reason}</span>
              </span>
              <span className="chip">{it.estMinutes} min</span>
              <span className="sr-only">{it.done ? 'Done' : 'To do'}</span>
            </li>
          ))}
        </ul>
        <p className="muted">Your plan is fixed for the day. Changing the budget rebuilds it and keeps finished items.</p>
      </section>

      <section className="card" aria-label="Cards due">
        <h2>Cards</h2>
        <p><strong>{dueNow}</strong> due · <strong>{queue.length - dueNow}</strong> new · <strong>{done.reviews}</strong> reviewed today</p>
        <Link className="btn primary" to="/review">Start review</Link>
      </section>

      <section className="card" aria-label="Quick actions">
        <h2>Quick actions</h2>
        <div className="row">
          <button className="btn" onClick={surprise}>Random problem from a weak spot</button>
          <Link className="btn" to="/tools/pattern-trainer?auto=1">5-question pattern drill</Link>
          <Link className="btn" to="/tools/complexity-quiz">Complexity quiz</Link>
          <Link className="btn" to="/tree">Open skill tree</Link>
          <Link className="btn" to="/progress">See progress</Link>
        </div>
      </section>

      <section className="card" aria-label="Activity">
        <h2>Activity</h2>
        <Heatmap days={act.days} today={today} weekStart={s.weekStart} frozen={act.frozen} />
        {act.streak.streak > 0 && !isActive(act.days.get(today), s.streakMinReviews) && <p className="muted">Do one thing today to keep the streak going.</p>}
      </section>
    </div>
  );
}
