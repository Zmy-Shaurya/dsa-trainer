import { Link } from 'react-router-dom';
import { LEARN_LINKS, SubNav } from '../components/SubNav';
import { useContent } from '../content/loader';
import { Skeleton } from '../components/Skeleton';

export default function Cheatsheets() {
  const { index, error } = useContent();
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!index) return <Skeleton />;
  return (
    <div className="stack">
      <SubNav links={LEARN_LINKS} />
      <h1>Cheat sheets</h1>
      <p className="muted">One page each, laid out for printing.</p>
      <div className="grid">
        {index.cheatsheets.map((c) => (
          <Link key={c.id} to={`/learn/cheatsheets/${c.id}`} className="card">
            <h2>{c.title}</h2>
            {c.printable && <span className="chip">Printable</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
