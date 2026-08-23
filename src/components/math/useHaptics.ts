'use client';

import { useCallback, useRef } from 'react';

/**
 * Touch feedback for the math route.
 *
 * Vibration is the third channel after sight and sound: a child who is not
 * looking at the screen, or who has sound off, still feels the wave cross zero
 * and feels a step complete. Patterns are deliberately short. Long buzzes are
 * aversive for a lot of the children this app is built for.
 *
 * Calm mode silences haptics entirely, matching how it silences motion.
 */

export interface Haptics {
  /** Smallest possible nudge. Grid crossings, value steps. */
  tick: () => void;
  /** Slightly firmer. A control was grabbed or released. */
  bump: () => void;
  /** Two quick pulses. A guided step just completed. */
  success: () => void;
  /** Arbitrary pattern, still subject to calm mode and the rate limit. */
  pattern: (ms: number | number[]) => void;
}

/** Minimum gap between pulses. Anything faster reads as one long buzz. */
const MIN_GAP_MS = 40;

export function useHaptics(calmMode: boolean): Haptics {
  const lastRef = useRef(0);
  const calmRef = useRef(calmMode);
  calmRef.current = calmMode;

  const pattern = useCallback((ms: number | number[]) => {
    if (calmRef.current) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastRef.current < MIN_GAP_MS) return;
    lastRef.current = now;
    try {
      navigator.vibrate(ms);
    } catch {
      /* unsupported or blocked by the user agent */
    }
  }, []);

  const tick = useCallback(() => pattern(8), [pattern]);
  const bump = useCallback(() => pattern(16), [pattern]);
  const success = useCallback(() => pattern([18, 60, 26]), [pattern]);

  return { tick, bump, success, pattern };
}
