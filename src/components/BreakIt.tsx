import { useState } from 'react';
import { saveQuizResult } from '../db/quiz';
import type { Challenge } from '../engine/breakit';
import type { Lang } from '../engine/types';
import { CodePanel } from './CodePanel';

/** Break it (PRD 14.2.5): feed the flawed code an input where it disagrees with the reference. */
export function BreakIt({ challenge, conceptId, lang }: { challenge: Challenge; conceptId?: string; lang: Lang }) {
  const [text, setText] = useState(challenge.start);
  const [error, setError] = useState('');
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<ReturnType<Challenge['run']> | null>(null);
  const [won, setWon] = useState(false);
  const [hint, setHint] = useState(false);
  const [shown, setShown] = useState(false);

  function run(raw = text, viaShowMe = false) {
    const p = challenge.parse(raw);
    if (!p.ok) { setError(p.error); return; }
    setError('');
    const r = challenge.run(p.value);
    setResult(r);
    if (viaShowMe) return;
    setTries((n) => n + 1);
    if (r.broken && !won) {
      setWon(true);
      void saveQuizResult({ kind: 'predict', itemId: `breakit:${challenge.id}`, conceptId, correct: tries === 0, answer: raw, durationMs: 0 }).catch(() => undefined);
    }
  }

  function showMe() {
    setShown(true);
    setText(challenge.show);
    run(challenge.show, true);
  }

  const solved = won || shown;
  return (
    <div className="viz-split" data-testid="break-it">
      <div className="card">
        <h2>{challenge.title}</h2>
        <p>{challenge.task}</p>
        <p className="muted">Goal: {challenge.goal === 'wrong-output' ? 'make the code return a wrong answer' : 'make the code do far more work than it should'}.</p>
        <form className="row" onSubmit={(e) => { e.preventDefault(); run(); }}>
          <label>Input <input aria-label="Break it input" value={text} onChange={(e) => setText(e.target.value)} size={34} aria-invalid={!!error} /></label>
          <button className="btn primary" type="submit">Run</button>
        </form>
        <p className="muted">{challenge.help}</p>
        <div role="alert" className="error">{error}</div>

        {result && (
          <div className="card" role="status" aria-label="Result">
            <div className="row"><strong>This code:</strong> <span className="mono">{result.flawed}</span></div>
            <div className="row"><strong>{challenge.goal === 'worst-case' ? 'The limit:' : 'Correct answer:'}</strong> <span className="mono">{result.reference}</span></div>
            <p className={result.broken ? 'ok' : 'error'}>
              {result.broken ? 'You broke it! ' : 'Still correct on this input. Try another. '}{result.why}
            </p>
          </div>
        )}

        <div className="row">
          {tries >= 1 && !solved && <button className="btn" onClick={() => setHint(true)}>Hint</button>}
          {tries >= 2 && !solved && <button className="btn" onClick={showMe}>Show me</button>}
        </div>
        {hint && !solved && <p className="strip">Hint: {challenge.hint}</p>}
        {solved && (
          <div className="card predict" data-testid="lesson">
            <strong>Why it breaks</strong>
            <p>{challenge.lesson}</p>
            {shown && !won && <p className="muted">Counterexample used: <span className="mono">{challenge.show}</span></p>}
          </div>
        )}
      </div>
      <div className="codes">
        <CodePanel code={challenge.code[lang]} lang={lang} active={undefined} />
      </div>
    </div>
  );
}
