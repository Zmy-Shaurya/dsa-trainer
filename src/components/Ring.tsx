/** Progress ring for the weekly goals. Shows value/goal and fills up to 100%. */
export function Ring({ value, goal, label }: { value: number; goal: number; label: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, value / goal) : 1;
  return (
    <figure className="ring" aria-label={`${label}: ${value} of ${goal}`}>
      <svg viewBox="0 0 76 76" width={76} height={76} aria-hidden>
        <circle cx={38} cy={38} r={r} className="ring-bg" />
        <circle
          cx={38} cy={38} r={r} className={`ring-fg${pct >= 1 ? ' done' : ''}`}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 38 38)"
        />
        <text x={38} y={43} textAnchor="middle" className="ring-text">{value}/{goal}</text>
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
