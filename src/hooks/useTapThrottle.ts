"use client";

import { useRef, useCallback } from "react";

/**
 * Touch debounce / rapid-tap gate.
 *
 * Coalesces accidental double-touches and iOS pointer-event coalescing
 * clusters (~40 ms windows). Defaults to 60 ms — above the coalescing
 * window, well below any child's intentional tap cadence.
 *
 * Real crash insurance lives in the audio pool (`lib/tts.ts`) and batched
 * session logger (`lib/session-logger.ts`); this is belt-and-suspenders.
 */
export function useTapThrottle(throttleMs = 60): () => boolean {
  const lastTapRef = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < throttleMs) return false;
    lastTapRef.current = now;
    return true;
  }, [throttleMs]);
}
