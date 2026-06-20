'use client';

import { useCallback, useId, useRef, useState } from 'react';

/**
 * iOS-style slider for /math sketches.
 *
 * Renders a labeled value, a track, and a thumb. Pointer + keyboard
 * accessible. Emits a soft 8ms haptic tick whenever the snapped step
 * changes (skipped when `calmMode` is on).
 */

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Format the visible value, e.g. (v) => `${v.toFixed(1)}×`. */
  format?: (v: number) => string;
  onChange: (next: number) => void;
  calmMode?: boolean;
  accent?: string;
}

const ACCENT_DEFAULT = 'var(--brand-accent)';

export default function Knob({
  label,
  value,
  min,
  max,
  step = 0.01,
  format,
  onChange,
  calmMode = false,
  accent = ACCENT_DEFAULT,
}: KnobProps) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const lastStepRef = useRef<number>(value);

  const pct = ((value - min) / (max - min)) * 100;
  const clamped = Math.max(0, Math.min(100, pct));

  const updateFromX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      const bounded = Math.max(min, Math.min(max, snapped));
      if (bounded !== lastStepRef.current) {
        lastStepRef.current = bounded;
        if (!calmMode && navigator.vibrate) navigator.vibrate(8);
        onChange(bounded);
      }
    },
    [min, max, step, onChange, calmMode],
  );

  const handleKey = (e: React.KeyboardEvent) => {
    const span = max - min;
    const big = step * 10;
    let next = value;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = value - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = value + step;
    else if (e.key === 'PageDown') next = value - big;
    else if (e.key === 'PageUp') next = value + big;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    else return;
    e.preventDefault();
    const bounded = Math.max(min, Math.min(max, next));
    onChange(Math.round(bounded / step) * step);
  };

  return (
    <div className="select-none">
      <div className="flex items-baseline justify-between mb-2">
        <label htmlFor={id} className="text-sm font-medium text-[color:var(--brand-text-soft)]">
          {label}
        </label>
        <span
          className="font-mono text-base font-semibold tabular-nums"
          style={{ color: accent }}
          aria-live="polite"
        >
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <div
        ref={trackRef}
        className="relative h-10 touch-none"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDragging(true);
          updateFromX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          updateFromX(e.clientX);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[color:var(--brand-border)]" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: accent }}
        />
        <button
          id={id}
          type="button"
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label}
          onKeyDown={handleKey}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-transform duration-150 ease-out ${
            dragging ? 'scale-110' : 'active:scale-105'
          }`}
          style={{ left: `${clamped}%`, boxShadow: dragging ? `0 0 0 6px ${accent}22, 0 2px 6px rgb(0 0 0 / 0.15)` : undefined }}
        />
      </div>
    </div>
  );
}
