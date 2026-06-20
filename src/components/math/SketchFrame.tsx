'use client';

import { useEffect, useRef } from 'react';

/**
 * Canvas wrapper for /math sketches.
 *
 * Calls `draw(ctx, t, w, h)` on every frame. `t` is seconds since the sketch
 * mounted. Handles devicePixelRatio, resize, and prefers-reduced-motion.
 *
 * Motion levels:
 *   on     — 60fps animation loop
 *   gentle — ~30fps, default for the math route (calm by design)
 *   off    — single render on mount and whenever `deps` change
 *
 * `prefers-reduced-motion: reduce` forces `off` regardless of the prop.
 */

export type Motion = 'on' | 'gentle' | 'off';

interface SketchFrameProps {
  draw: (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void;
  motion?: Motion;
  /** Re-renders on prop change so a still sketch updates when knobs move. */
  deps?: ReadonlyArray<unknown>;
  className?: string;
  ariaLabel: string;
}

export default function SketchFrame({
  draw,
  motion = 'gentle',
  deps = [],
  className,
  ariaLabel,
}: SketchFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const effectiveMotion: Motion = reduceMotion ? 'off' : motion;
    const targetFps = effectiveMotion === 'on' ? 60 : 30;
    const frameInterval = 1000 / targetFps;

    let raf = 0;
    let mounted = true;
    const start = performance.now();
    let last = start;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (t: number) => {
      const rect = canvas.getBoundingClientRect();
      drawRef.current(ctx, t, rect.width, rect.height);
    };

    resize();
    render(0);

    const ro = new ResizeObserver(() => {
      resize();
      render((performance.now() - start) / 1000);
    });
    ro.observe(canvas);

    if (effectiveMotion !== 'off') {
      const tick = (now: number) => {
        if (!mounted) return;
        if (now - last >= frameInterval) {
          last = now;
          render((now - start) / 1000);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion, ...deps]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
