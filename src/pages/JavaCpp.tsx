import { useMemo, useState } from 'react';
import { CodePanel } from '../components/CodePanel';
import { LEARN_LINKS, SubNav } from '../components/SubNav';
import { useJson } from '../content/loader';
import { GUIDE_CATEGORIES, type GuideCard, type GuideCategory } from '../content/types';
import { useSettings } from '../db/hooks';
import { recordQuizAnswer } from '../db/quiz';
import { dayKey } from '../domain/dates';
import { mulberry32, trapOfTheDay, trapQuiz } from '../domain/quiz';
import { Skeleton } from '../components/Skeleton';

const CATEGORY_LABEL: Record<GuideCategory, string> = {
  collections: 'Collections', strings: 'Strings', numbers: 'Numbers and overflow', sorting: 'Sorting and comparators',
  memory: 'Memory and references', io: 'Input and output', recursion: 'Recursion limits',
};

function Code({ card, both }: { card: GuideCard; both: boolean }) {
  const { language } = useSettings();
  return (
    <div className={both ? 'sidebyside' : ''}>
      {(both ? (['java', 'cpp'] as const) : [language]).map((l) => <CodePanel key={l} lang={l} code={card[l]} />)}
    </div>
  );
}

function MiniQuiz({ cards }: { cards: GuideCard[] }) {
  const [round, setRound] = useState(0);
  const quiz = useMemo(() => trapQuiz(cards, 4, mulberry32(Date.now() + round)), [cards, round]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const q = quiz[i];

  if (!q) {
    return (
      <section className="card" role="status">
        <h2>Trap quiz</h2>
        <p><strong>{score}</strong> of {quiz.length} right. Misses became flashcards.</p>
        <button className="btn" onClick={() => { setRound((r) => r + 1); setI(0); setPicked(null); setScore(0); }}>Another round</button>
      </section>
    );
  }
  const choose = (id: string) => {
    if (picked) return;
    const correct = id === q.card.id;
    setPicked(id);
    if (correct) setScore((s) => s + 1);
    void recordQuizAnswer(
      { kind: 'complexity', itemId: `tq:${q.card.id}`, conceptId: 'java-cpp-essentials', correct, answer: id, durationMs: 0 },
      { id: `tq:${q.card.id}`, conceptId: 'java-cpp-essentials', front: `${q.card.title}: what is the trap?`, back: q.card.trap },
    );
  };
  return (
    <section className="card" aria-label="Trap quiz">
      <h2>Trap quiz <span className="muted">{i + 1} / {quiz.length}</span></h2>
      <p className="big">{q.card.trap}</p>
      <p>Which topic is this warning about?</p>
      <div className="row" role="group" aria-label="Choices">
        {q.options.map((o) => (
          <button key={o.id} className={`btn${picked ? (o.id === q.card.id ? ' right' : o.id === picked ? ' wrong' : '') : ''}`} disabled={!!picked} onClick={() => choose(o.id)}>{o.title}</button>
        ))}
      </div>
      {picked && (
        <div role="status">
          <p><strong>{picked === q.card.id ? 'Correct.' : `It was ${q.card.title}.`}</strong></p>
          <button className="btn primary" onClick={() => { setI(i + 1); setPicked(null); }}>{i + 1 === quiz.length ? 'Finish' : 'Next'}</button>
        </div>
      )}
    </section>
  );
}

export default function JavaCpp() {
  const { data: cards, error } = useJson<GuideCard[]>('language-guide.json');
  const s = useSettings();
  const [cat, setCat] = useState<'all' | GuideCategory>('all');
  const [both, setBoth] = useState<boolean | undefined>(undefined);
  const side = both ?? s.showBothLanguages;
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!cards) return <Skeleton />;

  const today = trapOfTheDay(cards, dayKey(new Date(), s.dayRolloverHour));
  const shown = cards.filter((c) => cat === 'all' || c.category === cat);

  return (
    <div className="stack">
      <SubNav links={LEARN_LINKS} />
      <h1>Java ⇄ C++ guide</h1>
      {today && (
        <section className="card" aria-label="Trap of the day">
          <h2>Trap of the day</h2>
          <p><strong>{today.title}.</strong> {today.trap}</p>
        </section>
      )}
      <div className="row">
        <div className="row" role="group" aria-label="Category">
          <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All ({cards.length})</button>
          {GUIDE_CATEGORIES.map((c) => (
            <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]} ({cards.filter((x) => x.category === c).length})</button>
          ))}
        </div>
        <label><input type="checkbox" checked={side} onChange={(e) => setBoth(e.target.checked)} /> Show both languages</label>
      </div>
      {shown.map((c) => (
        <article key={c.id} className="card" id={c.id}>
          <h2>{c.title} <span className="chip">{CATEGORY_LABEL[c.category]}</span>{c.complexity && <span className="chip">{c.complexity}</span>}</h2>
          <Code card={c} both={side} />
          <p className="strip"><strong>Trap: </strong>{c.trap}</p>
        </article>
      ))}
      <MiniQuiz cards={cards} />
    </div>
  );
}
