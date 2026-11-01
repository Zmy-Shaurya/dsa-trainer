import { Link, useParams } from 'react-router-dom';
import { Markdown } from '../components/Markdown';
import { LEARN_LINKS, SubNav } from '../components/SubNav';
import { useJson } from '../content/loader';
import type { Cheatsheet } from '../content/types';
import { Skeleton } from '../components/Skeleton';

export default function CheatsheetView() {
  const { id = '' } = useParams();
  const { data, error } = useJson<Cheatsheet>(`cheatsheets/${id}.json`);
  if (error) {
    return (
      <div className="card">
        <h1>Unknown cheat sheet</h1>
        <Link to="/learn/cheatsheets">Back to the list</Link>
      </div>
    );
  }
  if (!data) return <Skeleton />;
  return (
    <div className="stack">
      <SubNav links={LEARN_LINKS} />
      <div className="row no-print" style={{ justifyContent: 'space-between' }}>
        <Link to="/learn/cheatsheets">All cheat sheets</Link>
        {data.printable && <button className="btn" onClick={() => window.print()}>Print</button>}
      </div>
      <article className="card printable">
        <h1>{data.title}</h1>
        <Markdown source={data.body} />
        <p className="muted print-only">DSA Studio</p>
      </article>
    </div>
  );
}
