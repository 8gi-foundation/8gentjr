'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * The Chladni plate in relief, orbited with a finger.
 *
 * The flat view shows where sand ends up. This one shows WHY: the plate is a
 * standing wave, and the sand is sitting in the lines that never move while
 * everything around them rises and falls. Same equation as the flat view, one
 * extra dimension, and the child turns it over by dragging.
 *
 * No 3D library. The repo's existing "sensory-3d" games are hand-rolled
 * projection on a 2D canvas, so this follows that pattern: it adds no
 * dependency and stays light enough for an iPad. Geometry is a modest height
 * field, and the beauty comes from shading rather than from mesh density.
 *
 * Reduced motion freezes the oscillation. The relief and the still lines are
 * fully visible in a frozen frame, and dragging still works, so nothing is
 * lost by holding it still.
 *
 * Issue: #225
 */

/** Same plate equation the flat view uses. */
function chladni(x: number, y: number, n: number, m: number): number {
  return (
    Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) -
    Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y)
  );
}

interface Props {
  n: number;
  m: number;
  /** Peak colour hue from the child's Color slider. */
  hue: number;
  /** Calm mode halves the frame rate and the grid density. */
  calm?: boolean;
  className?: string;
}

interface Grain {
  x: number;
  y: number;
  r: number;
}

/** Grains sit where the plate barely moves, found by sampling the equation. */
function makeGrains(n: number, m: number, count: number): Grain[] {
  const out: Grain[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 200) {
    guard++;
    const x = Math.random();
    const y = Math.random();
    if (Math.abs(chladni(x, y, n, m)) < 0.05) {
      out.push({ x, y, r: 0.9 + Math.random() * 1.3 });
    }
  }
  return out;
}

export default function ChladniPlate3D({ n, m, hue, calm = true, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const yaw = useRef(0.62);
  const pitch = useRef(0.92);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const grains = useRef<Grain[]>([]);
  const repaint = useRef<(() => void) | null>(null);

  const modeRef = useRef({ n, m });
  modeRef.current = { n, m };
  const hueRef = useRef(hue);
  hueRef.current = hue;

  useEffect(() => {
    grains.current = makeGrains(n, m, 620);
    repaint.current?.();
  }, [n, m]);

  /* ── Orbit ──────────────────────────────────────────────────────────── */

  const onDown = useCallback((e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* capture is an optimisation, not a requirement */
    }
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    yaw.current += (e.clientX - d.x) * 0.01;
    // Clamped so the child cannot flip under the plate and lose their bearings.
    pitch.current = Math.max(0.15, Math.min(1.45, pitch.current + (e.clientY - d.y) * 0.006));
    drag.current = { x: e.clientX, y: e.clientY };
    repaint.current?.();
  }, []);

  const onUp = useCallback(() => {
    drag.current = null;
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 0.12;
    if (e.key === 'ArrowLeft') yaw.current -= step;
    else if (e.key === 'ArrowRight') yaw.current += step;
    else if (e.key === 'ArrowUp') pitch.current = Math.max(0.15, pitch.current - step * 0.5);
    else if (e.key === 'ArrowDown') pitch.current = Math.min(1.45, pitch.current + step * 0.5);
    else return;
    e.preventDefault();
    repaint.current?.();
  }, []);

  /* ── Render ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = !reduceMotion;
    const grid = calm ? 38 : 46;
    const fps = calm ? 24 : 34;
    const frameInterval = 1000 / fps;

    let raf = 0;
    let mounted = true;
    let last = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Reused across frames so a steady 30fps does not churn the heap.
    const px = new Float64Array((grid + 1) * (grid + 1));
    const py = new Float64Array((grid + 1) * (grid + 1));
    const pz = new Float64Array((grid + 1) * (grid + 1));
    const hh = new Float64Array((grid + 1) * (grid + 1));
    const order: { i: number; depth: number }[] = [];

    const render = (t: number) => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w < 2 || h < 2) return;

      const { n: nn, m: mm } = modeRef.current;
      const baseHue = hueRef.current;

      // The plate breathes: a standing wave rising and falling in place. The
      // still lines stay at zero through the whole cycle, which is the point.
      const swing = animate ? Math.cos(t * 2.0) : 0.82;
      const amp = 0.30 * swing;

      const cy = Math.cos(yaw.current);
      const sy = Math.sin(yaw.current);
      const cp = Math.cos(pitch.current);
      const sp = Math.sin(pitch.current);
      // Framed to sit inside the panel at any orbit angle rather than bleeding
      // off the edges when the child turns it.
      const camD = 3.9;
      const focal = Math.min(w, h) * 1.16;
      const ox = w / 2;
      const oy = h / 2 + Math.min(w, h) * 0.03;

      const project = (gx: number, gy: number, hgt: number) => {
        const u = (gx - 0.5) * 2;
        const v = (gy - 0.5) * 2;
        const x1 = u * cy + v * sy;
        const z1 = -u * sy + v * cy;
        const y2 = hgt * cp - z1 * sp;
        const z2 = hgt * sp + z1 * cp;
        const d = camD + z2;
        return { sx: ox + (x1 * focal) / d, sy: oy - (y2 * focal) / d, depth: d };
      };

      // Vertex pass.
      const stride = grid + 1;
      for (let gy = 0; gy <= grid; gy++) {
        for (let gx = 0; gx <= grid; gx++) {
          const idx = gy * stride + gx;
          const x = gx / grid;
          const y = gy / grid;
          const z = chladni(x, y, nn, mm) * 0.5; // -1..1
          hh[idx] = z;
          const p = project(x, y, z * amp);
          px[idx] = p.sx;
          py[idx] = p.sy;
          pz[idx] = p.depth;
        }
      }

      ctx.fillStyle = '#080A0C';
      ctx.fillRect(0, 0, w, h);

      // Painter's algorithm: far quads first.
      order.length = 0;
      for (let gy = 0; gy < grid; gy++) {
        for (let gx = 0; gx < grid; gx++) {
          const i = gy * stride + gx;
          order.push({
            i,
            depth: (pz[i] + pz[i + 1] + pz[i + stride] + pz[i + stride + 1]) * 0.25,
          });
        }
      }
      order.sort((a, b) => b.depth - a.depth);

      for (let k = 0; k < order.length; k++) {
        const i = order[k].i;
        const i2 = i + 1;
        const i3 = i + stride + 1;
        const i4 = i + stride;

        const zAvg = (hh[i] + hh[i2] + hh[i3] + hh[i4]) * 0.25;

        // Cheap lighting: slope across the quad stands in for a normal, so
        // crests catch the light and troughs fall away.
        const slope = hh[i3] - hh[i];
        const lambert = Math.max(0, Math.min(1, 0.62 + slope * 0.9));

        // Warm peaks in the child's chosen hue, cool teal troughs, near-black
        // along the still lines. Teal at 190 keeps every hue clear of 270-350.
        const t2 = Math.max(-1, Math.min(1, zAvg));
        const mag = Math.abs(t2);
        const hueUse = t2 >= 0 ? baseHue : 190;
        const light = (14 + mag * 52) * lambert;
        const sat = 30 + mag * 55;
        const paint = `hsl(${hueUse} ${sat}% ${light}%)`;
        ctx.fillStyle = paint;
        // Stroking each quad in its own colour closes the hairline seams that
        // antialiasing leaves between neighbours, so the surface reads as one
        // smooth sheet instead of a tiled mosaic.
        ctx.strokeStyle = paint;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(px[i], py[i]);
        ctx.lineTo(px[i2], py[i2]);
        ctx.lineTo(px[i3], py[i3]);
        ctx.lineTo(px[i4], py[i4]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Sand, sitting in the lines that never move.
      const gs = grains.current;
      for (let i = 0; i < gs.length; i++) {
        const g = gs[i];
        const z = chladni(g.x, g.y, nn, mm) * 0.5;
        const p = project(g.x, g.y, z * amp);
        const size = (g.r * focal) / (p.depth * 260);
        ctx.fillStyle = 'rgba(255, 244, 224, 0.92)';
        ctx.fillRect(p.sx - size / 2, p.sy - size / 2, size, size);
      }
    };

    repaint.current = () => render(animate ? (performance.now() - start) / 1000 : 0);

    const tick = (now: number) => {
      if (!mounted) return;
      if (now - last >= frameInterval) {
        last = now;
        render((now - start) / 1000);
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    render(0);

    const ro = new ResizeObserver(() => {
      resize();
      render((performance.now() - start) / 1000);
    });
    ro.observe(canvas);

    if (animate) raf = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      repaint.current = null;
    };
  }, [calm]);

  return (
    <canvas
      ref={canvasRef}
      role="application"
      tabIndex={0}
      aria-label="The plate seen in relief. Drag or use arrow keys to turn it around. The sand sits along the lines that stay still."
      className={className}
      style={{ touchAction: 'none', cursor: 'grab' }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKeyDown}
    />
  );
}
