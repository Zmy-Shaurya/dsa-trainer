import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useJson } from '../content/loader';
import type { PathDef } from '../content/types';
import { pathProgress, type Auto } from '../domain/paths';
import { setPathStatus, type PathState } from './paths';
import { db } from './schema';

/** Work the schedule credits without a tick: solved problems and concepts marked learned. */
export function useAuto(): Auto {
  const progress = useLiveQuery(() => db.progress.toArray(), [], []);
  const states = useLiveQuery(() => db.conceptState.toArray(), [], []);
  return useMemo(() => ({
    solved: new Set(progress.filter((p) => p.status === 'solved').map((p) => p.problemId)),
    learned: new Set(states.filter((s) => s.learned).map((s) => String(s.conceptId))),
  }), [progress, states]);
}

export const usePathStates = () => useLiveQuery(async () => (await db.pathState.toArray()) as unknown as PathState[], [], [] as PathState[]);

/** A path's definition: the snapshot for generated paths, otherwise the bundled file. */
export function usePathDef(id: string | undefined, state?: PathState) {
  const bundled = id && !id.startsWith('gen:') ? `paths/${id}.json` : undefined;
  const { data, error } = useJson<PathDef>(bundled);
  return { def: id?.startsWith('gen:') ? state?.snapshot : data, error };
}

/** The one active path, with its definition. Also marks the path done once every required item is done. */
export function useActivePath() {
  const states = usePathStates();
  const state = states.find((s) => s.status === 'active');
  const { def } = usePathDef(state?.pathId, state);
  const auto = useAuto();
  const finished = !!state && !!def && pathProgress(def, state, auto).finished;
  useEffect(() => {
    if (finished && state) void setPathStatus(state.pathId, 'done');
  }, [finished, state]);
  return { state, def, auto };
}
