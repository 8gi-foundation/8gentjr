"use client";

import React, { useState, useCallback } from "react";
import { useTapThrottle } from "@/hooks/useTapThrottle";

/**
 * Tappable card primitive.
 *
 * Shared across Talk grid, phrases, browse pages, and any other surface
 * where a child taps a card to speak a word or trigger a sound. Owns:
 *
 *   - pointer-down/up/leave for a visual press-in scale
 *   - rapid-tap throttle (default 60 ms) — absorbs iOS pointer-event
 *     coalescing and accidental double-touches
 *
 * Real crash protection (audio pool, batched logger, memoization) lives
 * elsewhere; the throttle is belt-and-suspenders.
 */
export interface TapCardProps {
  onTap: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  throttleMs?: number;
  disabled?: boolean;
  /** CSS scale applied while pressed. Set to 1 to disable press-in. */
  pressScale?: number;
}

export const TapCard = React.memo(function TapCard({
  onTap,
  children,
  className = "",
  style,
  ariaLabel,
  throttleMs = 60,
  disabled = false,
  pressScale = 0.92,
}: TapCardProps) {
  const [pressed, setPressed] = useState(false);
  const allowTap = useTapThrottle(throttleMs);

  const handleUp = useCallback(() => {
    setPressed(false);
    if (disabled) return;
    if (!allowTap()) return;
    onTap();
  }, [allowTap, onTap, disabled]);

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={handleUp}
      onPointerLeave={() => setPressed(false)}
      className={`cursor-pointer select-none touch-manipulation transition-transform duration-100 ${className}`}
      style={{
        ...style,
        transform: pressed ? `scale(${pressScale})` : "scale(1)",
      }}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {children}
    </button>
  );
});
