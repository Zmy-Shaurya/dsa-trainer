import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CodePanel } from '../components/CodePanel';
import { useAuthoredCards, useContent } from '../content/loader';
import type { AuthoredCard } from '../content/types';
import {
  allLogs, createUserCard, doneToday, isHidden, reviewCard, setSuspended, undoReview, updateCard, type CardRecord,
} from '../db/cards';
import { useSettings } from '../db/hooks';
import { db } from '../db/schema';
import { setSetting } from '../db/settings';
import { buildQueue } from '../domain/cardQueue';
import { countByState, forecast, retentionRate, reviewsPerDay } from '../domain/cardStats';
import { dayKey } from '../domain/dates';
import { toView, type CardView } from '../domain/cardView';
import type { Rating } from '../domain/srs';

export function viewOf(c: CardRecord, authored: Map<string, AuthoredCard> | undefined): CardView | null {
  return c.source === 'authored' ? (authored?.has(c.id) ? toView(authored.get(c.id)!) : null) : toView(c);
}

const RATINGS: [Rating, string][] = [[1, 'Again'], [2, 'Hard'], [3, 'Good'], [4, 'Easy']];

export function Face({ v, revealed }: { v: CardView; revealed: boolean }) {
  const s = useSettings();
  const langs = s.showBothLanguages ? (['java', 'cpp'] as const) : ([s.language] as const);
  return (
    <div className="card cardface" aria-live="polite">
      <p className="chip">{v.type}</p>
      <p className="big">{revealed && v.filled ? v.filled : v.question}</p>
      {v.code && (
        <>
          <div className="seg" role="group" aria-label="Language">
            {(['java', 'cpp'] as const).map((l) => (
              <button key={l} aria-pressed={!s.showBothLanguages && s.language === l}
                onClick={() => void Promise.all([setSetting('language', l), setSetting('showBothLanguages', false)])}>{l === 'java' ? 'Java' : 'C++'}</button>
            ))}
          </div>
          {langs.map((l) => <CodePanel key={l} lang={l} code={v.code![l]} />)}
        </>
      )}
      {revealed && <div className="strip"><strong>{v.type === 'cloze' ? 'Hole: ' : 'Answer: '}</strong>{v.answer}</div>}
    </div>
  );
}

export function Stats() {
  const settings = useSettings();
  const cards = useLiveQuery(async () => ((await db.cards.toArray()) as unknown as CardRecord[]).filter((c) => !isHidden(c)), [], [] as CardRecord[]);
  const logs = useLiveQuery(() => allLogs(), [], []);
  const now = new Date();
  const per = reviewsPerDay(logs, now, 14, (d) => dayKey(d, settings.dayRolloverHour));
  const max = Math.max(1, ...per.map((p) => p.count));
  const fc = forecast(cards, now, 30);
  const fmax = Math.max(1, ...fc);
  const rate = retentionRate(logs, now);
  const n = countByState(cards);
  return (
    <section className="card" aria-label="Review stats">
      <h2>Stats</h2>
      <p>
        Retention (30 days): <strong>{rate === null ? '—' : `${Math.round(rate * 100)}%`}</strong> · New {n.new} · Learning {n.learning} · Review {n.review} · Suspended {n.suspended}
      </p>
      <h3>Reviews, last 14 days</h3>
      <div className="bars" role="img" aria-label={`Reviews per day: ${per.map((p) => p.count).join(', ')}`}>
        {per.map((p) => <span key={p.date} title={`${p.date}: ${p.count}`} style={{ height: `${(p.count / max) * 100}%` }} />)}
      </div>
      <h3>Due, next 30 days</h3>
      <div className="bars" role="img" aria-label={`Due per day: ${fc.join(', ')}`}>
        {fc.map((c, i) => <span key={i} title={`Day +${i}: ${c}`} style={{ height: `${(c / fmax) * 100}%` }} />)}
      </div>
    </section>
  );
}

interface Session { ids: string[]; i: number; cram: boolean; done: number }

function Run({ session, setSession, authored }: {
  session: Session; setSession: (s: Session | null) => void; authored: Map<string, AuthoredCard>;
}) {
  const card = useLiveQuery(() => db.cards.get(session.ids[session.i] ?? ''), [session.ids, session.i]) as CardRecord | undefined;
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [leech, setLeech] = useState(false);
  const [lastRated, setLastRated] = useState(false);
  const started = useRef(Date.now());
  const total = session.ids.length;
  const view = card ? viewOf(card, authored) : null;
  const editable = !!card && card.source !== 'authored';

  const go = useCallback((by: number) => {
    setRevealed(false); setEditing(false); started.current = Date.now();
    setSession({ ...session, i: Math.max(0, session.i + by), done: session.done + Math.max(by, 0) });
  }, [session, setSession]);

  const rate = useCallback(async (r: Rating) => {
    if (!card) return;
    if (!session.cram) {
      const res = await reviewCard(card.id, r, Date.now() - started.current);
      setLeech(res.leech);
      setLastRated(true);
    } else setLastRated(false);
    go(1);
  }, [card, session.cram, go]);

  const undo = useCallback(async () => {
    if (!lastRated) return;
    if (await undoReview()) { setLastRated(false); setLeech(false); go(-1); }
  }, [lastRated, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === ' ') { e.preventDefault(); setRevealed(true); }
      else if (revealed && '1234'.includes(e.key) && e.key) void rate(Number(e.key) as Rating);
      else if (e.key === 'u' || e.key === 'U') void undo();
      else if ((e.key === 's' || e.key === 'S') && card) { void setSuspended([card.id], true); go(1); }
      else if ((e.key === 'e' || e.key === 'E') && editable) setEditing(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, rate, undo, card, editable, go]);

  if (session.i >= total) {
    return (
      <div className="card">
        <h2>{session.cram ? 'Cram finished' : 'Session finished'}</h2>
        <p>{total} card(s) reviewed.{session.cram && ' Cram mode does not change your schedule.'}</p>
        <button className="btn primary" onClick={() => setSession(null)}>Done</button>
      </div>
    );
  }
  if (!card || !view) return <p className="muted">Loading card…</p>;

  return (
    <>
      <div className="row">
        <progress value={session.i} max={total} aria-label="Session progress" />
        <span className="muted">{session.i + 1} / {total}{session.cram && ' · cram'}</span>
        <button className="btn" onClick={() => setSession(null)}>End session</button>
      </div>
      {leech && <p className="strip" role="alert">Leech: rewrite it or drop it. The last card hit 8 lapses and was suspended.</p>}
      {editing && editable ? (
        <EditForm card={card} onDone={() => setEditing(false)} />
      ) : (
        <Face v={view} revealed={revealed} />
      )}
      {!revealed ? (
        <button className="btn primary" onClick={() => setRevealed(true)}>Show answer (Space)</button>
      ) : (
        <div className="row" role="group" aria-label="Rate this card">
          {RATINGS.map(([r, l]) => <button key={r} className="btn" onClick={() => void rate(r)}>{r} · {l}</button>)}
        </div>
      )}
      <p className="row">
        <button className="btn" disabled={!lastRated} onClick={() => void undo()}>Undo (U)</button>
        <button className="btn" onClick={() => { void setSuspended([card.id], true); go(1); }}>Suspend (S)</button>
        {editable && <button className="btn" onClick={() => setEditing(true)}>Edit (E)</button>}
        {!editable && <button className="btn" onClick={() => void createUserCard(
          view.type === 'cloze' ? { type: 'cloze', clozeText: authored.get(card.id)?.text ?? '' } : { type: 'basic', front: view.question, back: view.answer },
        )}>Copy to my cards</button>}
      </p>
    </>
  );
}

function EditForm({ card, onDone }: { card: CardRecord; onDone: () => void }) {
  const [front, setFront] = useState(card.front ?? '');
  const [back, setBack] = useState(card.back ?? '');
  const [cloze, setCloze] = useState(card.clozeText ?? '');
  const isCloze = card.type === 'cloze';
  return (
    <form className="card" onSubmit={(e) => {
      e.preventDefault();
      void updateCard(card.id, isCloze ? { clozeText: cloze } : { front, back }).then(onDone);
    }}>
      {isCloze ? (
        <label className="field"><span className="muted">Text with one {'{{c1::hole}}'}</span><textarea className="wide" value={cloze} onChange={(e) => setCloze(e.target.value)} /></label>
      ) : (
        <>
          <label className="field"><span className="muted">Front</span><textarea className="wide" value={front} onChange={(e) => setFront(e.target.value)} /></label>
          <label className="field"><span className="muted">Back</span><textarea className="wide" value={back} onChange={(e) => setBack(e.target.value)} /></label>
        </>
      )}
      <div className="row"><button className="btn primary" type="submit">Save</button><button className="btn" type="button" onClick={onDone}>Cancel</button></div>
    </form>
  );
}

export default function Review() {
  const { index, error } = useContent();
  const { cards: authored, error: cardErr } = useAuthoredCards();
  const settings = useSettings();
  const [params] = useSearchParams();
  const cards = useLiveQuery(async () => ((await db.cards.toArray()) as unknown as CardRecord[]).filter((c) => !isHidden(c)), [], [] as CardRecord[]);
  const [session, setSession] = useState<Session | null>(null);
  const [concept, setConcept] = useState(params.get('cram') ?? '');

  const today = useLiveQuery(() => doneToday(), [cards], { reviews: 0, fresh: 0 });
  const queue = useMemo(() => buildQueue({
    cards, now: new Date(), newLimit: settings.newCardsPerDay, newDoneToday: today.fresh,
    maxReviews: settings.maxReviewsPerDay, reviewsDoneToday: today.reviews,
  }), [cards, settings.newCardsPerDay, settings.maxReviewsPerDay, today]);
  const dueCount = queue.filter((id) => (cards.find((c) => c.id === id)?.state ?? 0) !== 0).length;

  if (error || cardErr) return <p className="error" role="alert">{error ?? cardErr}</p>;
  if (!index || !authored) return <p className="muted">Loading…</p>;
  if (session) return <><h1>Review</h1><Run session={session} setSession={setSession} authored={authored} /></>;

  const cram = cards.filter((c) => c.conceptId === concept && !c.suspended).map((c) => c.id);
  const inDeck = cards.filter((c) => !c.suspended).length;
  return (
    <>
      <h1>Review</h1>
      <div className="card">
        <p><strong>{dueCount}</strong> due · <strong>{queue.length - dueCount}</strong> new today · {inDeck} cards in your deck</p>
        {queue.length > 0 ? (
          <button className="btn primary" onClick={() => setSession({ ids: queue, i: 0, cram: false, done: 0 })}>Start session</button>
        ) : (
          <p className="muted">
            {inDeck === 0 ? 'Your deck is empty. Open a concept and press "Add this concept\'s cards to my deck".' : 'Nothing is due. Come back later.'}{' '}
            <Link to="/tree">Skill tree</Link>
          </p>
        )}
        <p className="muted">Keys in a session: Space reveals, 1-4 rate, U undo, S suspend, E edit.</p>
      </div>
      <div className="card row">
        <label className="field"><span className="muted">Cram a concept (no schedule changes)</span>
          <select value={concept} onChange={(e) => setConcept(e.target.value)}>
            <option value="">Choose…</option>
            {index.concepts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select></label>
        <button className="btn" disabled={cram.length === 0} onClick={() => setSession({ ids: cram, i: 0, cram: true, done: 0 })}>Cram {cram.length || ''}</button>
      </div>
      <p><Link to="/review/browse">Card browser</Link></p>
      <Stats />
    </>
  );
}
