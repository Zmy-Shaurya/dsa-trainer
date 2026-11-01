/** Placeholder shaped like a page (title, intro, two cards) so loading does not jump. */
export function Skeleton() {
  return (
    <div className="skel" role="status" aria-label="Loading">
      <span className="skel-line title" />
      <span className="skel-line" style={{ width: '46%' }} />
      <div className="skel-card" />
      <div className="skel-card short" />
    </div>
  );
}
