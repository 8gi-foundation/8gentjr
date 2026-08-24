'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Knob from '@/components/math/Knob';
import { useCalmMode } from '@/components/math/useCalmMode';
import NamingCard from '@/components/guided/NamingCard';
import { useGuidedDiscovery } from '@/hooks/useGuidedDiscovery';

/**
 * Light mixer - three coloured lights and a thing to block them.
 *
 * do:   the child drags a red, a green and a blue light around, and drags a
 *       blocker into their beams.
 * see:  overlaps mix live. Two lights make a new colour, all three make white,
 *       and the blocker throws coloured shadows because each shadow is missing
 *       one light.
 * name: once the child has actually produced an overlap, a white patch and a
 *       coloured shadow, one calm sentence names it.
 *
 * This is a sandbox, not a lesson. There is no target to hit, no step order and
 * nothing to get wrong. The child drags things because the colours are
 * interesting, and the naming line arrives after the fact.
 *
 * Sound-off completeness. This activity has no audio at all beyond the spoken
 * naming line, which only repeats the sentence already on screen. Nothing here
 * depends on hearing.
 *
 * Colour honesty. This is additive light mixing, which is why the shadows come
 * out cyan, magenta and yellow: each shadow is lit by the two lights that are
 * not blocked. That magenta is the physical result being demonstrated, not a
 * palette choice. The surrounding interface stays in the warm brand palette.
 *
 * Issue: #225
 */

const ACCENT = '#E8610A';
const CANVAS_BG = '#07070A';

const GRID_W = 168;
const GRID_H = 126;

/** Coarse grid used to detect what the child has actually produced on screen. */
const SAMPLE_W = 30;
const SAMPLE_H = 22;

/** A light counts as "lighting" a sample once its contribution passes this. */
const LIT = 0.42;

type Handle = 'r' | 'g' | 'b' | 'blocker' | null;

interface Pt {
  x: number;
  y: number;
}

const LIGHTS: { id: 'r' | 'g' | 'b'; label: string; swatch: string }[] = [
  { id: 'r', label: 'Red light', swatch: '#FF3B30' },
  { id: 'g', label: 'Green light', swatch: '#25C55E' },
  { id: 'b', label: 'Blue light', swatch: '#2E7BFF' },
];

const INITIAL = {
  r: { x: 0.36, y: 0.32 },
  g: { x: 0.64, y: 0.32 },
  b: { x: 0.5, y: 0.66 },
  // Parked off to the side, not on the triple overlap: the white patch is
  // visible the moment the activity opens, and dragging the blocker into the
  // beams is the child's own next move rather than a hidden prerequisite.
  blocker: { x: 0.17, y: 0.78 },
};

export default function LightMixer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fieldRef = useRef<HTMLCanvasElement | null>(null);
  const [calm, setCalm] = useCalmMode();
  const [reach, setReach] = useState(0.42);
  const [blockerOn, setBlockerOn] = useState(true);

  const pts = useRef({ ...INITIAL });
  const dragging = useRef<Handle>(null);
  const reachRef = useRef(reach);
  reachRef.current = reach;
  const blockerOnRef = useRef(blockerOn);
  blockerOnRef.current = blockerOn;
  const repaintRef = useRef<(() => void) | null>(null);

  /** Plain-language description of the scene, for the sound-off channel. */
  const [sceneNote, setSceneNote] = useState('Three lights, not overlapping yet.');

  /**
   * True once the child has actually touched something.
   *
   * do -> see -> name means the naming line describes what the CHILD did. The
   * opening scene already contains overlaps, so scanning it at mount would put
   * a sentence on screen before the child had moved anything, which is a
   * lecture. The scene description still updates; only naming waits.
   */
  const interacted = useRef(false);

  const { line, record, dismiss } = useGuidedDiscovery({ activityId: 'light-mix' });

  const blockerRadius = 0.085;

  /* ── Light model ────────────────────────────────────────────────────── */

  /**
   * How strongly one light reaches a point, 0..1, with a soft edge. Distances
   * are measured in x-units so the pools stay round on a wide canvas.
   */
  const contribution = useCallback((px: number, py: number, l: Pt, r: number) => {
    const d = Math.hypot(px - l.x, py - l.y);
    if (d >= r) return 0;
    const t = 1 - d / r;
    // GAIN lifts the pool so a triple overlap actually reads as white rather
    // than pale grey. Each channel is clamped when drawn, so the core of a
    // single light stays a saturated pure colour.
    const GAIN = 1.9;
    return Math.min(1, t * t * GAIN);
  }, []);

  /** True when the blocker sits between the light and the point. */
  const blocked = useCallback((px: number, py: number, l: Pt, c: Pt, radius: number) => {
    const vx = px - l.x;
    const vy = py - l.y;
    const wx = c.x - l.x;
    const wy = c.y - l.y;
    const len2 = vx * vx + vy * vy;
    if (len2 === 0) return false;
    // Closest approach of the light-to-point segment to the blocker centre.
    let t = (wx * vx + wy * vy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = l.x + t * vx;
    const cy = l.y + t * vy;
    return Math.hypot(c.x - cx, c.y - cy) < radius;
  }, []);

  /* ── Read what the child has actually produced, then record it ───────── */

  const scan = useCallback(() => {
    const p = pts.current;
    const r = reachRef.current;
    const useBlocker = blockerOnRef.current;
    const aspect = 0.75; // canvas is 4:3, y measured in x-units

    let sawTwo = false;
    let sawWhite = false;
    let sawColoredShadow = false;

    for (let sy = 0; sy < SAMPLE_H; sy++) {
      const py = (sy / (SAMPLE_H - 1)) * aspect;
      for (let sx = 0; sx < SAMPLE_W; sx++) {
        const px = sx / (SAMPLE_W - 1);

        const raw = [
          contribution(px, py, { x: p.r.x, y: p.r.y * aspect }, r),
          contribution(px, py, { x: p.g.x, y: p.g.y * aspect }, r),
          contribution(px, py, { x: p.b.x, y: p.b.y * aspect }, r),
        ];
        const occ = useBlocker
          ? [
              blocked(px, py, { x: p.r.x, y: p.r.y * aspect }, { x: p.blocker.x, y: p.blocker.y * aspect }, blockerRadius),
              blocked(px, py, { x: p.g.x, y: p.g.y * aspect }, { x: p.blocker.x, y: p.blocker.y * aspect }, blockerRadius),
              blocked(px, py, { x: p.b.x, y: p.b.y * aspect }, { x: p.blocker.x, y: p.blocker.y * aspect }, blockerRadius),
            ]
          : [false, false, false];

        const final = raw.map((v, i) => (occ[i] ? 0 : v));
        const litCount = final.filter((v) => v > LIT).length;
        const reachedCount = raw.filter((v) => v > LIT).length;

        if (litCount === 2) sawTwo = true;
        if (litCount === 3) sawWhite = true;
        // A coloured shadow: light would have reached here, but the blocker
        // removed some of it, and something is still lit.
        if (reachedCount > litCount && litCount > 0) sawColoredShadow = true;
      }
    }

    // Each effect is recorded on its own. These are not alternatives: a white
    // core is always ringed by two-way overlaps, so an `else if` here made
    // "two lights" unreachable for any child who got to white, which is the
    // most likely thing to do first.
    if (interacted.current) {
      if (sawTwo) record('two-lights');
      if (sawWhite) record('all-three-white');
      if (sawColoredShadow) record('shadow-colors');
    }

    setSceneNote(
      sawWhite
        ? 'All three lights overlap. That patch is white.'
        : sawTwo
          ? 'Two lights overlap, making a new color.'
          : 'Three lights, not overlapping yet.',
    );
  }, [blocked, contribution, record]);

  /* ── Pointer handling ───────────────────────────────────────────────── */

  const toNorm = useCallback((e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const nearest = useCallback((p: Pt): Handle => {
    const d = (q: Pt) => Math.hypot(p.x - q.x, p.y - q.y);
    const list: { h: Exclude<Handle, null>; dist: number }[] = [
      { h: 'r', dist: d(pts.current.r) },
      { h: 'g', dist: d(pts.current.g) },
      { h: 'b', dist: d(pts.current.b) },
    ];
    if (blockerOnRef.current) list.push({ h: 'blocker', dist: d(pts.current.blocker) });
    list.sort((m, n) => m.dist - n.dist);
    return list[0].dist < 0.12 ? list[0].h : null;
  }, []);

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      const p = toNorm(e);
      const h = nearest(p);
      if (!h) return;
      dragging.current = h;
      interacted.current = true;
      pts.current[h] = p;
      repaintRef.current?.();
      scan();
      // Capture last, and never fatally: if the browser refuses the pointer id
      // the drag must still work rather than dying before it starts.
      try {
        (e.target as Element).setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is an optimisation, not a requirement */
      }
    },
    [nearest, scan, toNorm],
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const h = dragging.current;
      if (!h) return;
      pts.current[h] = toNorm(e);
      repaintRef.current?.();
      scan();
    },
    [scan, toNorm],
  );

  const onUp = useCallback(() => {
    dragging.current = null;
  }, []);

  /** Keyboard path: arrow keys move the red light, so this is reachable without a pointer. */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 0.04;
      const p = pts.current.r;
      let nx = p.x;
      let ny = p.y;
      if (e.key === 'ArrowLeft') nx -= step;
      else if (e.key === 'ArrowRight') nx += step;
      else if (e.key === 'ArrowUp') ny -= step;
      else if (e.key === 'ArrowDown') ny += step;
      else return;
      e.preventDefault();
      interacted.current = true;
      pts.current.r = { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) };
      repaintRef.current?.();
      scan();
    },
    [scan],
  );

  useEffect(() => {
    repaintRef.current?.();
    scan();
  }, [reach, blockerOn, scan]);

  /* ── Render ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!fieldRef.current) {
      fieldRef.current = document.createElement('canvas');
      fieldRef.current.width = GRID_W;
      fieldRef.current.height = GRID_H;
    }
    const field = fieldRef.current;
    const fctx = field.getContext('2d')!;
    const image = fctx.createImageData(GRID_W, GRID_H);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w < 2 || h < 2) return;

      const p = pts.current;
      const r = reachRef.current;
      const useBlocker = blockerOnRef.current;
      const aspect = h / w;
      const lights = [
        { x: p.r.x, y: p.r.y * aspect },
        { x: p.g.x, y: p.g.y * aspect },
        { x: p.b.x, y: p.b.y * aspect },
      ];
      const bc = { x: p.blocker.x, y: p.blocker.y * aspect };

      const data = image.data;
      let i = 0;
      for (let gy = 0; gy < GRID_H; gy++) {
        const py = (gy / (GRID_H - 1)) * aspect;
        for (let gx = 0; gx < GRID_W; gx++) {
          const px = gx / (GRID_W - 1);

          let cr = contribution(px, py, lights[0], r);
          let cg = contribution(px, py, lights[1], r);
          let cb = contribution(px, py, lights[2], r);

          if (useBlocker) {
            if (blocked(px, py, lights[0], bc, blockerRadius)) cr = 0;
            if (blocked(px, py, lights[1], bc, blockerRadius)) cg = 0;
            if (blocked(px, py, lights[2], bc, blockerRadius)) cb = 0;
          }

          // Additive mixing, exactly as light behaves.
          data[i++] = Math.min(255, Math.round(cr * 255));
          data[i++] = Math.min(255, Math.round(cg * 255));
          data[i++] = Math.min(255, Math.round(cb * 255));
          data[i++] = 255;
        }
      }
      fctx.putImageData(image, 0, 0);

      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(field, 0, 0, w, h);

      // The blocker itself, drawn as a solid object.
      if (useBlocker) {
        ctx.beginPath();
        ctx.arc(p.blocker.x * w, p.blocker.y * h, blockerRadius * w, 0, Math.PI * 2);
        ctx.fillStyle = '#15161A';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF44';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Light handles.
      for (const l of LIGHTS) {
        const q = pts.current[l.id];
        const x = q.x * w;
        const y = q.y * h;
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.fillStyle = l.swatch;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFFAA';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    };

    repaintRef.current = render;

    resize();
    render();

    const ro = new ResizeObserver(() => {
      resize();
      render();
    });
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      repaintRef.current = null;
    };
  }, [blocked, contribution]);

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--brand-bg, #FFF8F0)' }}>
      <div className="flex-1 min-h-0 p-3 flex flex-col gap-3 max-w-2xl w-full mx-auto">
        <div
          className="rounded-3xl overflow-hidden shadow-sm shrink-0"
          style={{ aspectRatio: '4 / 3', backgroundColor: CANVAS_BG }}
        >
          <canvas
            ref={canvasRef}
            role="application"
            tabIndex={0}
            aria-label={
              'Three coloured lights on a dark table, with a round blocker. Drag the red, green ' +
              `and blue dots to move the lights, and the dark circle to cast shadows. ${sceneNote}`
            }
            className="w-full h-full block touch-none outline-none focus-visible:ring-4"
            style={{ cursor: 'grab' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onKeyDown={onKeyDown}
          />
        </div>

        {/* The sound-off channel: what is on screen, in words. */}
        <p
          className="m-0 text-center text-sm font-semibold shrink-0"
          style={{ color: 'var(--brand-text-soft, #6B7280)' }}
          aria-live="polite"
        >
          {sceneNote}
        </p>

        <NamingCard line={line} onDismiss={dismiss} accent={ACCENT} className="shrink-0" />

        <div className="rounded-2xl bg-white/70 border border-[color:var(--brand-border,#F0DECA)] p-4 flex flex-col gap-4 shrink-0">
          <Knob
            label="How far the light reaches"
            value={reach}
            min={0.2}
            max={0.7}
            step={0.01}
            format={(v) => (v < 0.34 ? 'small' : v > 0.55 ? 'wide' : 'medium')}
            onChange={(v) => {
              interacted.current = true;
              setReach(v);
            }}
            calmMode={calm}
            accent={ACCENT}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                interacted.current = true;
                setBlockerOn((s) => !s);
              }}
              aria-pressed={blockerOn}
              className="px-4 rounded-full border-none font-bold text-sm cursor-pointer"
              style={{
                minHeight: 44,
                backgroundColor: blockerOn ? ACCENT : '#F0DECA',
                color: blockerOn ? '#FFFFFF' : '#6B7280',
              }}
            >
              {blockerOn ? 'Blocker on' : 'Blocker off'}
            </button>

            <button
              type="button"
              onClick={() => setCalm(!calm)}
              aria-pressed={calm}
              className="px-4 rounded-full border-none font-bold text-sm cursor-pointer"
              style={{
                minHeight: 44,
                backgroundColor: calm ? ACCENT : '#F0DECA',
                color: calm ? '#FFFFFF' : '#6B7280',
              }}
            >
              {calm ? 'Calm' : 'Lively'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
