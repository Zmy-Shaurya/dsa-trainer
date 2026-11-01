import { useCallback, useEffect, useRef, useState } from 'react';
import type { Frame } from './types';

export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
const BASE_MS = 800;

/** Index of the nearest frame (after/before `from`) whose event equals `event`, or -1. */
export function findEvent(frames: Frame[], from: number, event: string, dir: 1 | -1): number {
  for (let i = from + dir; i >= 0 && i < frames.length; i += dir) if (frames[i]?.event === event) return i;
  return -1;
}

interface Options {
  /** Playback may not move past frame `i` while this returns true (unanswered predict). */
  blocked: (i: number) => boolean;
  speed: number;
}

export function usePlayer(frames: Frame[], { blocked, speed }: Options) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const last = frames.length - 1;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  // New frames (input changed) restart the player.
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [frames]);

  const goto = useCallback((i: number) => setIndex(Math.max(0, Math.min(last, i))), [last]);
  const next = useCallback(() => {
    setIndex((i) => (i >= last || blockedRef.current(i) ? i : i + 1));
  }, [last]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const reset = useCallback(() => {
    setIndex(0);
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setIndex((i) => {
        if (blockedRef.current(i)) {
          setPlaying(false);
          return i;
        }
        if (i >= last) {
          if (loop) return 0;
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, BASE_MS / speed);
    return () => clearInterval(id);
  }, [playing, speed, last, loop]);

  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p && index >= last) setIndex(0);
      return !p;
    });
  }, [index, last]);

  return { index, playing, loop, setLoop, goto, next, prev, reset, toggle, last };
}
