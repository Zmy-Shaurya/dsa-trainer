import { Link } from 'react-router-dom';
import { ALGOS } from '../engine/algos';
import { challengeFor } from '../engine/breakit';
import type { Category } from '../engine/types';

const TITLES: Record<Category, string> = {
  sorting: 'Sorting',
  searching: 'Searching',
  linear: 'Arrays, strings and linked lists',
  tree: 'Trees and heaps',
  graph: 'Graphs and grids',
  dp: 'Dynamic programming',
  backtracking: 'Backtracking',
  hashing: 'Hashing',
  string: 'String matching',
  misc: 'Math and recursion',
};

export default function Visualize() {
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Visualizers</h1>
        <Link className="btn" to="/visualize/race">Race algorithms</Link>
      </div>
      <p className="muted">
        Every visualizer has Watch. Look for the badges: <b>Predict</b> asks what happens next, <b>Drive</b> makes you click the next step,
        <b> Break it</b> hands you flawed code to defeat, <b>Race</b> pits algorithms against each other.
      </p>
      {(Object.keys(TITLES) as Category[]).map((cat) => {
        const list = ALGOS.filter((a) => a.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat}>
            <h2>{TITLES[cat]} <span className="count">{list.length}</span></h2>
            <div className="grid">
              {list.map((a) => (
                <Link key={a.id} to={`/visualize/${a.id}`} className="card algo-card">
                  <strong>{a.name}</strong>
                  <span className="muted">{a.blurb}</span>
                  <span className="mono">{a.time} · {a.space}</span>
                  <span className="row">
                    {a.modes.predict && <span className="chip m-predict">Predict</span>}
                    {a.modes.drive && <span className="chip m-drive">Drive</span>}
                    {challengeFor(a.id) && <span className="chip m-break">Break it</span>}
                    {a.modes.race && <span className="chip m-race">Race</span>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
