import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { CodePanel } from '../components/CodePanel';
import { SubNav, TOOL_LINKS } from '../components/SubNav';
import { useJson } from '../content/loader';
import { QUIZ_TOPICS, type ComplexityItem } from '../content/types';
import { db } from '../db/schema';
import { useSettings } from '../db/hooks';
import { recordQuizAnswer } from '../db/quiz';
import { answerFor, gradeComplexity, mulberry32, pickComplexity, type Attempt } from '../domain/quiz';
import { Skeleton } from '../components/Skeleton';

const TOPIC_LABEL: Record<string, string> = {
  loops: 'Loops', recursion: 'Recursion', amortised: 'Amortised', strings: 'Strings', 'data-structures': 'Data structures', 'language-traps': 'Language traps',
};

interface Done { item: ComplexityItem; correct: boolean }

function Options({ name, label, options, value, onChange, locked, answer }: {
  name: string; label: string; options: string[]; value: string | null; onChange: (v: string) => void; locked: boolean; answer: string;
}) {
  return (
    <fieldset className="opts">
      <legend>{label}</legend>
      {options.map((o) => (
        <label key={o} className={locked ? (o === answer ? 'right' : o === value ? 'wrong' : '') : ''}>
          <input type="radio" name={name} checked={value === o} disabled={locked} onChange={() => onChange(o)} /> {o}
        </label>
      ))}
    </fieldset>
  );
}

export default function ComplexityQuiz() {
  const { data: items, error } = useJson<ComplexityItem[]>('quizzes/complexity.json');
  const { language } = useSettings();
  const [params] = useSearchParams();
  const history = useLiveQuery(async () => {
    const rows = await db.quizResults.where('kind').equals('complexity').sortBy('at');
    return rows.filter((r) => String(r.itemId).startsWith('cq:')).map((r): Attempt => ({ itemId: String(r.itemId), correct: !!r.correct, at: String(r.at) }));
  }, []);
  const [count, setCount] = useState(Number(params.get('n')) || 10);
  const [topic, setTopic] = useState('all');
  const [session, setSession] = useState<{ queue: ComplexityItem[]; i: number; done: Done[] } | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [space, setSpace] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const shownAt = useRef(0);
  const concept = params.get('concept');

  const pool = useMemo(() => (items ?? []).filter((i) => (topic === 'all' || i.topic === topic) && (!concept || i.concepts.includes(concept))), [items, topic, concept]);

  const start = () => {
    if (!history) return;
    const queue = pickComplexity(pool, history, Math.min(count, pool.length), mulberry32(Date.now()));
    setSession({ queue, i: 0, done: [] });
    setTime(null); setSpace(null); setChecked(false);
    shownAt.current = Date.now();
  };
  const auto = params.get('auto') === '1';
  const started = useRef(false);
  useEffect(() => {
    if (auto && !started.current && items && history && pool.length) { started.current = true; start(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, items, history, pool.length]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!items || !history) return <Skeleton />;

  const item = session?.queue[session.i];

  const check = async () => {
    if (!item || !session || checked) return;
    const g = gradeComplexity(item, language, time, space);
    setChecked(true);
    setSession({ ...session, done: [...session.done, { item, correct: g.correct }] });
    const t = answerFor(item.time, language);
    const s = answerFor(item.space, language);
    await recordQuizAnswer(
      { kind: 'complexity', itemId: `cq:${item.id}`, conceptId: item.concepts[0], correct: g.correct, answer: `${time ?? ''} | ${space ?? ''}`, durationMs: Date.now() - shownAt.current },
      {
        id: `cq:${item.id}`, conceptId: item.concepts[0],
        front: `Time and space of this ${language === 'java' ? 'Java' : 'C++'} code?\n\n${item.code[language]}`,
        back: `Time ${t}, space ${s}. ${item.why}`,
      },
    );
  };
  const next = () => {
    if (!session) return;
    setSession({ ...session, i: session.i + 1 });
    setTime(null); setSpace(null); setChecked(false);
    shownAt.current = Date.now();
  };

  if (session && !item) {
    const right = session.done.filter((d) => d.correct).length;
    return (
      <div className="stack">
        <SubNav links={TOOL_LINKS} />
        <section className="card" role="status">
          <h1>Session done</h1>
          <p><strong>{right}</strong> of {session.done.length} correct. Both time and space must be right to count.</p>
          {session.done.some((d) => !d.correct) && (
            <>
              <h2>To review</h2>
              <ul>{session.done.filter((d) => !d.correct).map((d) => <li key={d.item.id}>{d.item.why}</li>)}</ul>
              <p className="muted">Wrong answers became flashcards (setting: quiz-miss cards).</p>
            </>
          )}
          <div className="row">
            <button className="btn primary" onClick={start}>Another session</button>
            <button className="btn" onClick={() => setSession(null)}>Change settings</button>
          </div>
        </section>
      </div>
    );
  }

  if (session && item) {
    const grade = checked ? gradeComplexity(item, language, time, space) : null;
    const differs = typeof item.time !== 'string' || typeof item.space !== 'string';
    return (
      <div className="stack">
        <SubNav links={TOOL_LINKS} />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>Complexity quiz</h1>
          <span className="muted">{session.i + 1} / {session.queue.length}</span>
          <button className="btn" onClick={() => setSession(null)}>End session</button>
        </div>
        <section className="card">
          <p className="muted">{TOPIC_LABEL[item.topic]}{differs && ' · the answer depends on the language, shown for the current one'}</p>
          <CodePanel lang={language} code={item.code[language]} />
          <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
            <Options name="time" label="Time" options={item.options.time} value={time} onChange={setTime} locked={checked} answer={answerFor(item.time, language)} />
            <Options name="space" label="Space" options={item.options.space} value={space} onChange={setSpace} locked={checked} answer={answerFor(item.space, language)} />
          </div>
          {!checked ? (
            <button className="btn primary" disabled={!time || !space} onClick={() => void check()}>Check</button>
          ) : (
            <div role="status" aria-live="polite">
              <p><strong>{grade!.correct ? 'Correct.' : grade!.timeOk || grade!.spaceOk ? 'Partly right, recorded as incorrect.' : 'Not quite.'}</strong>{' '}
                Time {answerFor(item.time, language)}, space {answerFor(item.space, language)}.
                {item.trap && <span className="chip trap" title="A known trick question"> Trap!</span>}</p>
              <p>{item.why}</p>
              <button className="btn primary" onClick={next}>{session.i + 1 === session.queue.length ? 'Finish' : 'Next'}</button>
            </div>
          )}
        </section>
      </div>
    );
  }

  const seen = new Set(history.map((h) => h.itemId));
  return (
    <div className="stack">
      <SubNav links={TOOL_LINKS} />
      <h1>Complexity quiz</h1>
      <section className="card">
        <p>{items.length} snippets in the current language ({language === 'java' ? 'Java' : 'C++'}). Choose time and space, then check. {pool.filter((i) => !seen.has(`cq:${i.id}`)).length} unseen in this selection.</p>
        <div className="row">
          <label>Questions{' '}
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[5, 10, 20].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </label>
          <label>Topic{' '}
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="all">All topics</option>
              {QUIZ_TOPICS.map((t) => <option key={t} value={t}>{TOPIC_LABEL[t]}</option>)}
            </select>
          </label>
          {concept && <span className="chip">concept: {concept}</span>}
          <button className="btn primary" disabled={!pool.length} onClick={start}>Start</button>
        </div>
        <p className="muted">Unseen items come first, then the ones you missed recently. No repeats inside a session.</p>
      </section>
    </div>
  );
}
