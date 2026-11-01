export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="card">
      <h1>{title}</h1>
      <p className="muted">Not built yet. See PRD.md §22 for the phase that delivers this page.</p>
    </div>
  );
}
