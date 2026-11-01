import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CodePanel } from '../components/CodePanel';
import { LEARN_LINKS, SubNav } from '../components/SubNav';
import { useContent, useJson } from '../content/loader';
import type { TemplatePage } from '../content/types';
import { useSettings } from '../db/hooks';

export default function Templates() {
  const { data: pages, error } = useJson<TemplatePage[]>('templates.json');
  const { byId } = useContent();
  const { language, showBothLanguages } = useSettings();
  const [params, setParams] = useSearchParams();
  const [both, setBoth] = useState<boolean>();
  const side = both ?? showBothLanguages;

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!pages) return <p className="muted">Loading…</p>;
  const page = pages.find((p) => p.id === params.get('page')) ?? pages[0]!;

  return (
    <div className="stack">
      <SubNav links={LEARN_LINKS} />
      <h1>Templates</h1>
      <div className="split">
        <nav className="card toc" aria-label="Patterns">
          {pages.map((p) => (
            <button key={p.id} className="linkish" aria-current={p.id === page.id ? 'page' : undefined} onClick={() => setParams({ page: p.id })}>{p.title}</button>
          ))}
        </nav>
        <div className="stack">
          <section className="card">
            <h2>{page.title}</h2>
            <p><strong>When to use:</strong> {page.when}</p>
            <h3>Pitfalls</h3>
            <ul>{page.pitfalls.map((p) => <li key={p}>{p}</li>)}</ul>
            <p className="row">
              <Link to={`/concept/${page.concept}`}>Concept page</Link>
              {page.problems.map((id) => <Link key={id} to={`/problem/${encodeURIComponent(id)}`}>{byId.get(id)?.title ?? id}</Link>)}
            </p>
            <label><input type="checkbox" checked={side} onChange={(e) => setBoth(e.target.checked)} /> Side by side</label>
          </section>
          {page.variants.map((v) => (
            <section key={v.id} className="card" id={v.id}>
              <h3>{v.title}</h3>
              <div className={side ? 'sidebyside' : ''}>
                {(side ? (['java', 'cpp'] as const) : [language]).map((l) => <CodePanel key={l} lang={l} code={v[l]} />)}
              </div>
            </section>
          ))}
          <p className="muted">Every template here is compiled with javac and g++ by <code>npm run content:verify</code>.</p>
        </div>
      </div>
    </div>
  );
}
