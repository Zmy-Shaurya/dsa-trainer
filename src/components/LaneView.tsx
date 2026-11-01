import { AuxPanel, ViewRenderer } from './views';
import type { Frame } from '../engine/types';

/** One algorithm's current frame, shown compactly (Race and Compare). */
export function LaneView({ title, frame, extra }: { title: string; frame: Frame; extra?: string }) {
  return (
    <div className="race-lane card" role="group" aria-label={title}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>{title}</strong>
        <span className="chip">ops <b>{frame.counters.ops ?? 0}</b></span>
      </div>
      {extra && <div className="muted">{extra}</div>}
      {frame.views.slice(0, 1).map((v, i) => <ViewRenderer key={i} view={v} />)}
      {frame.aux?.map((a, i) => <AuxPanel key={i} aux={a} />)}
      <div className="strip" aria-live="off">{frame.message}</div>
    </div>
  );
}
