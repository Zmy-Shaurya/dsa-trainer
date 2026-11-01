import { Link } from 'react-router-dom';
import { useContent } from '../content/loader';
import { useCompanyList } from '../content/useCompanies';

const LIBS: [name: string, licence: string, use: string][] = [
  ['React and React Router', 'MIT', 'interface and routing'],
  ['Dexie', 'Apache-2.0', 'IndexedDB storage'],
  ['ts-fsrs', 'MIT', 'flashcard scheduling (FSRS)'],
  ['highlight.js', 'BSD-3-Clause', 'code highlighting'],
  ['zustand', 'MIT', 'small shared state'],
  ['fflate', 'MIT', 'zip files for notes export'],
];

export default function Credits() {
  const { index } = useContent();
  const { entries, imported } = useCompanyList();
  return (
    <div className="stack">
      <header>
        <h1>Credits</h1>
        <p className="muted">DSA Studio is a personal project. It runs on your device and sends nothing anywhere. <Link to="/data">Back to Data</Link></p>
      </header>
      <section className="card">
        <h2>Problem lists</h2>
        <p className="muted">Lists are the work of their authors. Problem statements are not copied; each problem links to its original page.</p>
        <ul>
          {(index?.sheets ?? []).map((s) => (
            <li key={s.id}>
              <strong>{s.name}</strong>{s.author ? ` by ${s.author}` : ''}{s.asOf ? `, as of ${s.asOf}` : ''}
              {s.sourceUrl && <> · <a href={s.sourceUrl} target="_blank" rel="noreferrer noopener">source</a></>}
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2>Company data</h2>
        <p className="muted">No company dataset is bundled. Lists you import yourself stay on your device, and their licence and authors stay with that data.</p>
        <ul>
          {(imported ?? []).map((c) => <li key={c.id}><strong>{c.name}</strong>: {c.source.repo}, {c.source.license}, as of {c.asOf}</li>)}
          {(entries ?? []).filter((e) => !e.imported).map((e) => <li key={e.id}><strong>{e.name}</strong>: {e.source.repo}{e.source.commit ? ` @ ${e.source.commit}` : ''}, {e.source.license}, as of {e.asOf}</li>)}
        </ul>
      </section>
      <section className="card">
        <h2>Libraries</h2>
        <ul>{LIBS.map(([n, l, u]) => <li key={n}><strong>{n}</strong> ({l}): {u}</li>)}</ul>
        <p className="muted">Full list in <code>THIRD_PARTY.md</code>.</p>
      </section>
    </div>
  );
}
