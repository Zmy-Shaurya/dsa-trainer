import { Link } from 'react-router-dom';
import { useContent } from '../content/loader';
import { usePathStates } from '../db/usePaths';
import { todayIndex } from '../domain/paths';
import { useActivity } from '../db/useActivity';

export default function Paths() {
  const { index, error } = useContent();
  const states = usePathStates();
  const { today } = useActivity();
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!index) return <p className="muted">Loading…</p>;
  const stateOf = (id: string) => states.find((s) => s.pathId === id);
  const label = (id: string, days: number) => {
    const s = stateOf(id);
    if (!s) return null;
    if (s.status === 'done') return 'Finished';
    const d = Math.min(todayIndex(s, today), days);
    return s.status === 'paused' ? `Paused · day ${d} of ${days}` : `Active · day ${d} of ${days}`;
  };
  const generated = states.filter((s) => s.snapshot);

  return (
    <div className="stack">
      <header>
        <h1>Learning paths</h1>
        <p className="muted">A day-by-day schedule. Work you finish early is credited, and if you fall behind you can shift or compress the plan. One path is active at a time.</p>
      </header>
      <div className="grid">
        {index.paths.map((p) => (
          <Link key={p.id} to={`/paths/${p.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <h2>{p.name}</h2>
            <p className="muted">{p.description}</p>
            <p>{p.days} days · {p.problems} problems · about {p.hoursPerDay} h a day</p>
            {label(p.id, p.days) && <p><span className="chip">{label(p.id, p.days)}</span></p>}
          </Link>
        ))}
      </div>
      {generated.length > 0 && (
        <section className="card" aria-label="Company paths">
          <h2>Company paths</h2>
          <p className="muted">Made on a company page. Each keeps the list it was built from.</p>
          <ul className="plain">
            {generated.map((s) => (
              <li key={s.pathId} className="row">
                <Link to={`/paths/${encodeURIComponent(s.pathId)}`}>{s.snapshot!.name}</Link>
                <span className="chip">{label(s.pathId, s.snapshot!.days.length)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
