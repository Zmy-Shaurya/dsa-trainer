import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import { SubNav, TOOL_LINKS } from '../components/SubNav';
import { useContent, useJson } from '../content/loader';
import type { PatternItem } from '../content/types';
import { db } from '../db/schema';
import { recordQuizAnswer } from '../db/quiz';
import { mulberry32, pickPatterns, prettyPattern, TEMPLATE_OF, type PatternDrill } from '../domain/quiz';
import { Skeleton } from '../components/Skeleton';

type Mode = 'drill' | 'weak' | 'timed';
const MODES: Record<Mode, { label: string; count: number; blurb: string }> = {
  drill: { label: '5-question drill', count: 5, blurb: 'Unseen questions first. This is what the daily plan uses.' },
  weak: { label: 'Weak patterns only', count: 5, blurb: 'Patterns you get right less than 70% of the time.' },
  timed: { label: 'Timed (30 s each)', count: 10, blurb: 'Ten questions, 30 seconds each. A timeout counts as wrong.' },
};
const SECONDS = 30;

interface Session { mode: Mode; queue: PatternDrill[]; i: number; results: boolean[] }

export default function PatternTrainer() {
  const { data: items, error } = useJson<PatternItem[]>('quizzes/patterns.json');
  const { index, byId } = useContent();
  const [params] = useSearchParams();
  const history = useLiveQuery(async () => {
    const rows = await db.quizResults.where('kind').equals('pattern').sortBy('at');
    return rows.map((r) => ({ itemId: String(r.itemId), correct: !!r.correct }));
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const shownAt = useRef(0);

  const start = (mode: Mode) => {
    if (!items || !history) return;
    const queue = pickPatterns(items, history, MODES[mode].count, mulberry32(Date.now()), { weakOnly: mode === 'weak' });
    setSession({ mode, queue, i: 0, results: [] });
    setPicked(null); setLeft(SECONDS);
    shownAt.current = Date.now();
  };
  const auto = params.get('auto') === '1';
  const started = useRef(false);
  useEffect(() => {
    if (auto && !started.current && items && history) { started.current = true; start('drill'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, items, history]);

  const cur = session?.queue[session.i];
  const answered = picked !== null;

  const conceptOf = (p: PatternItem) => index?.concepts.find((c) => c.id === p.answer)?.id ?? byId.get(p.problem)?.concepts[0];

  const answer = (choice: string) => {
    if (!cur || !session || answered) return;
    const item = cur.item;
    const correct = choice === item.answer;
    setPicked(choice);
    setSession({ ...session, results: [...session.results, correct] });
    void recordQuizAnswer(
      { kind: 'pattern', itemId: `pq:${item.id}`, conceptId: conceptOf(item), correct, answer: choice, durationMs: Date.now() - shownAt.current },
      {
        id: `pq:${item.id}`, conceptId: conceptOf(item),
        front: `Which pattern? ${item.prompt}`,
        back: `${prettyPattern(item.answer)}. Tells: ${item.tells.join('; ')}.`,
      },
    );
  };

  // Timed mode: count down, and a timeout is a wrong answer.
  useEffect(() => {
    if (session?.mode !== 'timed' || !cur || answered) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [session?.mode, cur, answered]);
  useEffect(() => {
    if (session?.mode === 'timed' && cur && !answered && left <= 0) answer('(timed out)');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const next = () => {
    if (!session) return;
    setSession({ ...session, i: session.i + 1 });
    setPicked(null); setLeft(SECONDS);
    shownAt.current = Date.now();
  };

  const accuracy = useMemo(() => {
    const m = new Map<string, { right: number; total: number }>();
    for (const h of history ?? []) {
      const p = items?.find((i) => `pq:${i.id}` === h.itemId);
      if (!p) continue;
      const a = m.get(p.answer) ?? { right: 0, total: 0 };
      a.total++; if (h.correct) a.right++;
      m.set(p.answer, a);
    }
    return [...m].map(([pattern, v]) => ({ pattern, ...v })).sort((a, b) => a.right / a.total - b.right / b.total).slice(0, 5);
  }, [history, items]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!items || !history) return <Skeleton />;

  if (session && !cur) {
    const right = session.results.filter(Boolean).length;
    return (
      <div className="stack">
        <SubNav links={TOOL_LINKS} />
        <section className="card" role="status">
          <h1>Drill done</h1>
          <p><strong>{right}</strong> of {session.results.length} correct.</p>
          <p className="muted">Misses became flashcards. Accuracy per pattern is on the <Link to="/progress">Progress</Link> page.</p>
          <div className="row">
            <button className="btn primary" onClick={() => start(session.mode)}>Again</button>
            <button className="btn" onClick={() => setSession(null)}>Back</button>
          </div>
        </section>
      </div>
    );
  }

  if (session && cur) {
    const { item, options } = cur;
    const title = byId.get(item.problem)?.title ?? item.problem;
    const tpl = TEMPLATE_OF[item.answer];
    const concept = conceptOf(item);
    return (
      <div className="stack">
        <SubNav links={TOOL_LINKS} />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>Pattern trainer</h1>
          <span className="muted">{session.i + 1} / {session.queue.length}</span>
          {session.mode === 'timed' && !answered && <span className="chip" role="timer" aria-label={`${left} seconds left`}>{Math.max(0, left)} s</span>}
          <button className="btn" onClick={() => setSession(null)}>End</button>
        </div>
        <section className="card">
          <h2>{title}</h2>
          <p className="big">{item.prompt}</p>
          <p>Which pattern?</p>
          <div className="row" role="group" aria-label="Choices">
            {options.map((o) => (
              <button
                key={o} className={`btn${answered ? (o === item.answer ? ' right' : o === picked ? ' wrong' : '') : ''}`}
                disabled={answered} aria-pressed={picked === o} onClick={() => answer(o)}
              >{prettyPattern(o)}</button>
            ))}
          </div>
          {answered && (
            <div role="status" aria-live="polite">
              <p><strong>{picked === item.answer ? 'Correct.' : picked === '(timed out)' ? 'Time is up.' : `Not quite, it is ${prettyPattern(item.answer)}.`}</strong></p>
              <p>Tells:</p>
              <ul>{item.tells.map((t) => <li key={t}>{t}</li>)}</ul>
              <p className="row">
                <Link to={`/problem/${encodeURIComponent(item.problem)}`}>Open the problem</Link>
                {concept && <Link to={`/concept/${concept}`}>Concept page</Link>}
                {tpl && <Link to={`/learn/templates?page=${tpl}`}>Template</Link>}
              </p>
              <button className="btn primary" onClick={next}>{session.i + 1 === session.queue.length ? 'Finish' : 'Next'}</button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <SubNav links={TOOL_LINKS} />
      <h1>Pattern trainer</h1>
      <section className="card">
        <p>{items.length} problems, each with our own one-line description. Name the pattern, then see the tells that give it away.</p>
        <div className="grid">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <div key={m} className="card">
              <h3>{MODES[m].label}</h3>
              <p className="muted">{MODES[m].blurb}</p>
              <button className="btn primary" onClick={() => start(m)}>Start</button>
            </div>
          ))}
        </div>
      </section>
      {accuracy.length > 0 && (
        <section className="card">
          <h2>Your weakest patterns</h2>
          <ul>{accuracy.map((a) => <li key={a.pattern}>{prettyPattern(a.pattern)} <span className="muted">{a.right}/{a.total}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}
