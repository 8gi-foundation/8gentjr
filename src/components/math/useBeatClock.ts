'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ringPhase, segmentAt, type Split } from '@/lib/rhythm';

/**
 * The clock behind the Beat lesson.
 *
 * Deliberately independent of the canvas. A child with reduced motion turned
 * on still gets the beat, because the sound and the highlighted segment come
 * from here rather than from the drawing loop, and the drawing loop is the
 * part that reduced motion switches off.
 *
 * `phaseRef` is read by the sketch on every frame it draws. `beat` is React
 * state so the ring highlight and the count still update a few times a second
 * when nothing is animating.
 */

interface BeatClock {
  /** Live position around the ring, 0 to 1. Read from a draw loop. */
  phaseRef: React.MutableRefObject<number>;
  /** The part of the ring currently sounding, or null when stopped. */
  beat: number | null;
  /** Position at this instant. For judging a tap the moment it happens. */
  currentPhase: () => number;
}

export function useBeatClock(
  running: boolean,
  tempo: number,
  split: Split,
  onBeat: (beat: number) => void,
): BeatClock {
  const phaseRef = useRef(0);
  const startRef = useRef(0);
  const lastBeatRef = useRef<number | null>(null);
  const [beat, setBeat] = useState<number | null>(null);

  // Kept in refs so changing tempo mid bar does not restart the animation.
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;
  const splitRef = useRef<Split>(split);
  splitRef.current = split;
  const onBeatRef = useRef(onBeat);
  onBeatRef.current = onBeat;

  const currentPhase = useCallback(() => phaseRef.current, []);

  useEffect(() => {
    if (!running) {
      phaseRef.current = 0;
      lastBeatRef.current = null;
      setBeat(null);
      return;
    }

    let raf = 0;
    startRef.current = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      const phase = ringPhase(elapsed, tempoRef.current);
      phaseRef.current = phase;

      const current = segmentAt(phase, splitRef.current);
      if (current !== lastBeatRef.current) {
        lastBeatRef.current = current;
        setBeat(current);
        onBeatRef.current(current);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // Changing the split mid bar should not fire a phantom beat for the part the
  // playhead happens to be sitting in already.
  useEffect(() => {
    lastBeatRef.current = running ? segmentAt(phaseRef.current, split) : null;
  }, [split, running]);

  return { phaseRef, beat, currentPhase };
}
