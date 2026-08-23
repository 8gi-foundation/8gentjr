'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { useHaptics } from './useHaptics';

/**
 * Two dimensional control surface for the math lessons.
 *
 * A knob teaches one number at a time. A pad teaches two at once, and it does
 * it with the whole hand: drag up and the wave grows, drag right and it speeds
 * up, and the sound follows the finger with no lag. For a child who cannot yet
 * read the numbers, this is the primary control and the knobs are the backup.
 *
 * Access notes:
 *   - Every position reachable by finger is reachable by keyboard, through two
 *     real range inputs (screen reader and switch access friendly). The visual
 *     pad mirrors them rather than replacing them.
 *   - A haptic tick fires when the puck crosses a grid line, so the pad has a
 *     felt texture even with sound off and eyes elsewhere.
 */

interface TouchPadProps {
  /** Horizontal position, 0 (left) to 1 (right). */
  x: number;
  /** Vertical position, 0 (bottom) to 1 (top). Screen y is flipped for you. */
  y: number;
  onChange: (x: number, y: number) => void;
  xLabel: string;
  yLabel: string;
  /** Plain words for the current position, read out and shown under the pad. */
  describe?: (x: number, y: number) => string;
  calmMode?: boolean;
  accent?: string;
  /** Fired when a drag starts and ends, so a lesson can hold a tone. */
  onGrab?: () => void;
  onRelease?: () => void;
  className?: string;
}

/** Grid lines per axis. Also the haptic resolution. */
const CELLS = 8;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, Number.isNaN(v) ? 0 : v));
}

export default function TouchPad({
  x,
  y,
  onChange,
  xLabel,
  yLabel,
  describe,
  calmMode = false,
  accent = 'var(--brand-accent)',
  onGrab,
  onRelease,
  className,
}: TouchPadProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focusRing, setFocusRing] = useState(false);
  const lastCell = useRef({ cx: -1, cy: -1 });
  const haptics = useHaptics(calmMode);
  const xId = useId();
  const yId = useId();

  const emit = useCallback(
    (nx: number, ny: number) => {
      const cx = Math.round(nx * CELLS);
      const cy = Math.round(ny * CELLS);
      if (cx !== lastCell.current.cx || cy !== lastCell.current.cy) {
        lastCell.current = { cx, cy };
        haptics.tick();
      }
      onChange(nx, ny);
    },
    [haptics, onChange],
  );

  const fromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const nx = clamp01((clientX - rect.left) / rect.width);
      // Screen y grows downward, the maths does not.
      const ny = clamp01(1 - (clientY - rect.top) / rect.height);
      emit(nx, ny);
    },
    [emit],
  );

  const description = describe?.(x, y);

  return (
    <div className={className}>
      <div
        ref={padRef}
        className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden touch-none select-none border transition-shadow duration-150"
        style={{
          borderColor: focusRing || dragging ? accent : 'var(--brand-border)',
          backgroundColor: 'var(--brand-bg-accent)',
          boxShadow: focusRing || dragging ? `0 0 0 4px ${'var(--brand-accent)'}22` : undefined,
        }}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDragging(true);
          haptics.bump();
          onGrab?.();
          fromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          fromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          setDragging(false);
          onRelease?.();
        }}
        onPointerCancel={() => {
          setDragging(false);
          onRelease?.();
        }}
        aria-hidden
      >
        {/* Grid. Gives the drag a visible scale to read positions against. */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Array.from({ length: CELLS - 1 }, (_, i) => {
            const p = ((i + 1) / CELLS) * 100;
            return (
              <g key={i} stroke="var(--brand-border)" strokeWidth="0.4">
                <line x1={p} y1="0" x2={p} y2="100" />
                <line x1="0" y1={p} x2="100" y2={p} />
              </g>
            );
          })}
        </svg>

        {/* Crosshair rails, so the two numbers stay separable by eye. */}
        <div
          className="absolute inset-x-0 h-px opacity-40"
          style={{ bottom: `${y * 100}%`, backgroundColor: accent }}
        />
        <div
          className="absolute inset-y-0 w-px opacity-40"
          style={{ left: `${x * 100}%`, backgroundColor: accent }}
        />

        <div
          className="absolute rounded-full shadow-md transition-transform duration-75 ease-out"
          style={{
            left: `${x * 100}%`,
            bottom: `${y * 100}%`,
            width: 44,
            height: 44,
            marginLeft: -22,
            marginBottom: -22,
            backgroundColor: accent,
            transform: dragging ? 'scale(1.12)' : 'scale(1)',
          }}
        />

        <span
          className="absolute left-3 bottom-2 text-[11px] font-medium uppercase tracking-wide"
          style={{ color: 'var(--brand-text-soft)' }}
        >
          {xLabel}
        </span>
        <span
          className="absolute left-3 top-2 text-[11px] font-medium uppercase tracking-wide"
          style={{ color: 'var(--brand-text-soft)' }}
        >
          {yLabel}
        </span>
      </div>

      {description && (
        <p
          className="text-center text-sm mt-2"
          style={{ color: 'var(--brand-text-soft)' }}
          aria-hidden
        >
          {description}
        </p>
      )}

      {/* The accessible controls. Visually hidden, fully operable. */}
      <label className="sr-only" htmlFor={xId}>
        {xLabel}
      </label>
      <input
        id={xId}
        type="range"
        min={0}
        max={1}
        step={0.02}
        value={x}
        onChange={(e) => emit(clamp01(Number(e.target.value)), y)}
        onFocus={() => setFocusRing(true)}
        onBlur={() => setFocusRing(false)}
        aria-valuetext={description}
        className="sr-only"
      />
      <label className="sr-only" htmlFor={yId}>
        {yLabel}
      </label>
      <input
        id={yId}
        type="range"
        min={0}
        max={1}
        step={0.02}
        value={y}
        onChange={(e) => emit(x, clamp01(Number(e.target.value)))}
        onFocus={() => setFocusRing(true)}
        onBlur={() => setFocusRing(false)}
        aria-valuetext={description}
        className="sr-only"
      />
    </div>
  );
}
