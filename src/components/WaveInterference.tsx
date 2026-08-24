'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Knob from '@/components/math/Knob';
import { useCalmMode } from '@/components/math/useCalmMode';
import NamingCard from '@/components/guided/NamingCard';
import { useGuidedDiscovery } from '@/hooks/useGuidedDiscovery';

/**
 * Wave interference - two sources, one listening spot.
 *
 * do:   the child drags two wave sources, and a listening spot between them.
 * see:  ripples spread and overlap live. Where crests meet crests the field is
 *       bright; along the still lines it stays dark no matter what.
 * name: after the child has moved the sources and found both a quiet spot and a
 *       loud spot, one calm sentence names what they did.
 *
 * Sound-off completeness. The dark and bright bands, the meter bar, and the
 * "Quiet here" / "Loud here" label carry the whole activity. The optional tone
 * only duplicates the meter, so nothing is lost with audio off. The tone is off
 * until the child turns it on.
 *
 * Physics honesty. This draws the textbook two-source picture with equal
 * amplitudes and no distance falloff, which is what makes the still lines
 * crisp. The strength reading is the time-averaged envelope, so it holds steady
 * while the child drags rather than flickering with the animation phase. No
 * copy in this activity claims anything the picture does not show.
 *
 * Issue: #225
 */

const ACCENT = '#E8610A';
const SOURCE_A = '#E8610A'; // warm orange, brand accent
const SOURCE_B = '#14B8A6'; // teal. Hues stay outside the banned 270-350 band.
const CANVAS_BG = '#0E1214';

/** Field is computed on a coarse grid and scaled up. Cheap, and it looks soft. */
const GRID_W = 168;
const GRID_H = 126;

const QUIET_BELOW = 0.25;
const LOUD_ABOVE = 0.85;

/** Canvas is locked to 4:3, so y measured in x-units is y * 0.75. */
const ASPECT = 0.75;

interface Pt {
  x: number;
  y: number;
}

type Handle = 'a' | 'b' | 'ear' | null;

/** Normalised (0..1) positions so the layout survives any canvas size. */
const INITIAL = {
  a: { x: 0.3, y: 0.34 },
  b: { x: 0.3, y: 0.66 },
  ear: { x: 0.78, y: 0.5 },
};

export default function WaveInterference() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fieldRef = useRef<HTMLCanvasElement | null>(null);
  const [calm, setCalm] = useCalmMode();
  const [wavelength, setWavelength] = useState(0.12);
  const [soundOn, setSoundOn] = useState(false);

  /** Strength at the listening spot, 0..1. Drives the meter and the label. */
  const [strength, setStrength] = useState(0);

  const pts = useRef({ ...INITIAL });
  const dragging = useRef<Handle>(null);
  const wavelengthRef = useRef(wavelength);
  wavelengthRef.current = wavelength;

  /**
   * Paints one frame on demand. With reduced motion the animation loop is
   * frozen, so dragging a source would otherwise leave a stale picture. Every
   * interaction calls this, which keeps the still view fully interactive.
   */
  const repaintRef = useRef<(() => void) | null>(null);

  const { line, record, dismiss } = useGuidedDiscovery({
    activityId: 'interference',
    speakEnabled: soundOn,
  });

  /* ── Optional tone: duplicates the meter, never replaces it ─────────── */

  const audioCtx = useRef<AudioContext | null>(null);
  const osc = useRef<OscillatorNode | null>(null);
  const gain = useRef<GainNode | null>(null);

  /**
   * Fade out, then stop.
   *
   * Cutting an oscillator mid-cycle steps the waveform to zero, and a step is a
   * click: broadband, sudden, and loud in the exact way a sensory-sensitive
   * child cannot filter out. Turning the sound OFF must not be the loudest
   * moment in the activity. The ramp is short enough to feel immediate and long
   * enough to have no edge, and the context is suspended afterwards so nothing
   * keeps the audio hardware awake once the child has said they do not want it.
   */
  const stopTone = useCallback(() => {
    const ctx = audioCtx.current;
    const g = gain.current;
    const o = osc.current;
    osc.current = null;
    gain.current = null;

    if (!ctx || !g || !o) return;
    const now = ctx.currentTime;
    const FADE = 0.09;
    try {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + FADE);
      o.stop(now + FADE + 0.02);
    } catch {
      /* the node may already be stopped: nothing left to fade */
    }
    setTimeout(
      () => {
        try {
          o.disconnect();
          g.disconnect();
        } catch {
          /* already torn down */
        }
        if (audioCtx.current === ctx && !osc.current && ctx.state === 'running') {
          void ctx.suspend().catch(() => {});
        }
      },
      (FADE + 0.05) * 1000,
    );
  }, []);

  const startTone = useCallback(() => {
    if (osc.current) return;
    try {
      if (!audioCtx.current || audioCtx.current.state === 'closed') {
        audioCtx.current = new AudioContext();
      }
      if (audioCtx.current.state === 'suspended') void audioCtx.current.resume();
      const ctx = audioCtx.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 220;
      g.gain.value = 0;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      osc.current = o;
      gain.current = g;
    } catch {
      /* no audio available: the visual channel is unaffected */
    }
  }, []);

  useEffect(() => {
    if (soundOn) startTone();
    else stopTone();
  }, [soundOn, startTone, stopTone]);

  useEffect(() => {
    return () => {
      stopTone();
      if (audioCtx.current && audioCtx.current.state !== 'closed') {
        void audioCtx.current.close();
      }
    };
  }, [stopTone]);

  /* ── Strength at the listening spot ─────────────────────────────────── */

  /**
   * Time-averaged envelope for two equal sources: |cos(k * (r1 - r2) / 2)|.
   * Zero along the still lines, one where the two waves add up.
   *
   * Distances are measured in x-units, exactly as the painted field does. Using
   * raw normalised y here instead would make the meter disagree with the bands
   * the child can see, so a dark band would not read as quiet.
   */
  const envelopeAt = useCallback((p: Pt, a: Pt, b: Pt, lambda: number) => {
    const r1 = Math.hypot(p.x - a.x, (p.y - a.y) * ASPECT);
    const r2 = Math.hypot(p.x - b.x, (p.y - b.y) * ASPECT);
    const k = (Math.PI * 2) / lambda;
    return Math.abs(Math.cos((k * (r1 - r2)) / 2));
  }, []);

  /**
   * True once the child has actually touched something.
   *
   * The listening spot starts on the centre line, where the two waves always
   * arrive together, so reading it at mount would put "Loud here" on screen as
   * a naming line before the child had moved anything. do -> see -> name means
   * the sentence describes what the CHILD did. The meter itself still reads
   * from the very first frame; only naming waits.
   */
  const interacted = useRef(false);

  /**
   * Record what the child produced. Quiet and loud are independent findings,
   * not alternatives, so both are checked on every reading.
   */
  const noteStrength = useCallback(
    (v: number) => {
      if (!interacted.current) return;
      if (v < QUIET_BELOW) record('found-quiet');
      if (v > LOUD_ABOVE) record('found-loud');
    },
    [record],
  );

  /* ── Pointer handling ───────────────────────────────────────────────── */

  const toNorm = useCallback((e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }, []);

  const nearest = useCallback((p: Pt): Handle => {
    const d = (q: Pt) => Math.hypot(p.x - q.x, p.y - q.y);
    const list: { h: Exclude<Handle, null>; dist: number }[] = [
      { h: 'a', dist: d(pts.current.a) },
      { h: 'b', dist: d(pts.current.b) },
      { h: 'ear', dist: d(pts.current.ear) },
    ];
    list.sort((m, n) => m.dist - n.dist);
    // Generous grab radius: child fingers, not mouse pointers.
    return list[0].dist < 0.12 ? list[0].h : null;
  }, []);

  const applyMove = useCallback(
    (p: Pt, handle: Exclude<Handle, null>) => {
      pts.current[handle] = p;
      if (handle === 'a' || handle === 'b') record('waves-overlap');
      const v = envelopeAt(pts.current.ear, pts.current.a, pts.current.b, wavelengthRef.current);
      setStrength(v);
      noteStrength(v);
      repaintRef.current?.();
    },
    [envelopeAt, noteStrength, record],
  );

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      const p = toNorm(e);
      const h = nearest(p);
      if (!h) return;
      dragging.current = h;
      interacted.current = true;
      applyMove(p, h);
      // Capture last, and never fatally: if the browser refuses the pointer id
      // the drag must still work rather than dying before it starts.
      try {
        (e.target as Element).setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is an optimisation, not a requirement */
      }
    },
    [applyMove, nearest, toNorm],
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const h = dragging.current;
      if (!h) return;
      applyMove(toNorm(e), h);
    },
    [applyMove, toNorm],
  );

  const onUp = useCallback(() => {
    dragging.current = null;
  }, []);

  /** Keyboard path: nudge the listening spot without a pointer. */
  const nudgeEar = useCallback(
    (dx: number, dy: number) => {
      const e = pts.current.ear;
      pts.current.ear = {
        x: Math.max(0, Math.min(1, e.x + dx)),
        y: Math.max(0, Math.min(1, e.y + dy)),
      };
      const v = envelopeAt(pts.current.ear, pts.current.a, pts.current.b, wavelengthRef.current);
      setStrength(v);
      noteStrength(v);
      repaintRef.current?.();
    },
    [envelopeAt, noteStrength],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 0.04;
      // Set before nudging: nudgeEar reads this when it records.
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        interacted.current = true;
      }
      if (e.key === 'ArrowLeft') nudgeEar(-step, 0);
      else if (e.key === 'ArrowRight') nudgeEar(step, 0);
      else if (e.key === 'ArrowUp') nudgeEar(0, -step);
      else if (e.key === 'ArrowDown') nudgeEar(0, step);
      else return;
      e.preventDefault();
    },
    [nudgeEar],
  );

  /* ── Keep the meter honest when the wavelength knob moves ───────────── */

  useEffect(() => {
    const v = envelopeAt(pts.current.ear, pts.current.a, pts.current.b, wavelength);
    setStrength(v);
    noteStrength(v);
    repaintRef.current?.();
  }, [wavelength, envelopeAt, noteStrength]);

  /* ── Tone follows the meter ─────────────────────────────────────────── */

  useEffect(() => {
    const g = gain.current;
    const ctx = audioCtx.current;
    if (!g || !ctx) return;
    // Quiet ceiling on purpose. This is a sensory surface, not a klaxon.
    g.gain.setTargetAtTime(soundOn ? strength * 0.06 : 0, ctx.currentTime, 0.05);
  }, [strength, soundOn]);

  /* ── Render loop ────────────────────────────────────────────────────── */

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

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Frozen time still shows every still line and bright band: the pattern is
    // stationary, only the ripple phase moves. Nothing is lost without motion.
    const animate = !reduceMotion;
    const fps = calm ? 24 : 40;
    const frameInterval = 1000 / fps;

    let raf = 0;
    let mounted = true;
    let last = 0;
    /** Set by repaintRef while the loop runs, so a drag costs one pass per frame. */
    let dirty = false;
    const start = performance.now();

    /* Cached in resize rather than measured per frame. getBoundingClientRect
     * forces layout, and asking for it inside the loop puts a synchronous
     * layout on every frame of an activity a child holds a finger on. */
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (t: number) => {
      const w = cssW;
      const h = cssH;
      if (w < 2 || h < 2) return;

      const a = pts.current.a;
      const b = pts.current.b;
      const lambda = wavelengthRef.current;
      const k = (Math.PI * 2) / lambda;
      const phase = t * 2.2;
      // The canvas is wider than it is tall; measure distance in x-units so the
      // ripples stay round instead of stretching into ovals.
      const aspect = h / w;

      const data = image.data;
      let i = 0;
      for (let gy = 0; gy < GRID_H; gy++) {
        const ny = (gy / (GRID_H - 1)) * aspect;
        const ay = a.y * aspect;
        const by = b.y * aspect;
        for (let gx = 0; gx < GRID_W; gx++) {
          const nx = gx / (GRID_W - 1);
          const r1 = Math.hypot(nx - a.x, ny - ay);
          const r2 = Math.hypot(nx - b.x, ny - by);
          const sum = Math.sin(k * r1 - phase) + Math.sin(k * r2 - phase);
          // sum is -2..2. Map crest to warm amber, trough to teal, node to near black.
          const v = sum / 2;
          const mag = Math.abs(v);
          const warm = v > 0;
          data[i++] = warm ? Math.round(232 * mag) : Math.round(20 * mag);
          data[i++] = warm ? Math.round(140 * mag) : Math.round(184 * mag);
          data[i++] = warm ? Math.round(40 * mag) : Math.round(166 * mag);
          data[i++] = 255;
        }
      }
      fctx.putImageData(image, 0, 0);

      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(field, 0, 0, w, h);

      // Sources and listening spot, drawn on top.
      const dot = (p: Pt, color: string, r: number, ring: boolean) => {
        const x = p.x * w;
        const y = p.y * h;
        if (ring) {
          ctx.beginPath();
          ctx.arc(x, y, r + 7, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFFCC';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#00000055';
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      dot(a, SOURCE_A, 13, false);
      dot(b, SOURCE_B, 13, false);
      dot(pts.current.ear, '#FFFFFF', 9, true);
    };

    // Scheduling lives here and nowhere else. `render` is a pure paint, so the
    // initial paint and the ResizeObserver cannot each spawn a second loop.
    const tick = (now: number) => {
      if (!mounted) return;
      if (dirty || now - last >= frameInterval) {
        last = now;
        dirty = false;
        render((now - start) / 1000);
      }
      raf = requestAnimationFrame(tick);
    };

    /**
     * The on-demand repaint, which until now was declared, called from three
     * places, and never assigned.
     *
     * The consequence landed hardest on exactly the audience this product is
     * for. Under `prefers-reduced-motion: reduce` the rAF loop never starts, so
     * the canvas painted once at mount and then froze. Dragging a source still
     * moved the state and the meter, so the readout announced "Quiet here" over
     * a picture that had not changed since mount. A child using reduced motion
     * had a broken activity that looked like a working one.
     *
     * It also coalesces. iOS delivers pointer moves faster than it delivers
     * frames, so painting synchronously per event would run a full field pass
     * each time. While the loop is running this only marks the frame dirty, so
     * the cost is one field pass per frame however hard a child drags.
     */
    repaintRef.current = () => {
      if (animate) {
        dirty = true;
        return;
      }
      render(0);
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
      repaintRef.current = null;
    };
  }, [calm]);

  /* ── Copy for the meter. Describes the picture, claims nothing beyond it. */

  const label =
    strength < QUIET_BELOW ? 'Quiet here' : strength > LOUD_ABOVE ? 'Loud here' : 'In between';

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--brand-bg, #FFF8F0)' }}>
      <div className="flex-1 min-h-0 p-3 flex flex-col gap-3 max-w-2xl w-full mx-auto">
        <div
          className="relative rounded-3xl overflow-hidden shadow-sm shrink-0"
          style={{ aspectRatio: '4 / 3', backgroundColor: CANVAS_BG }}
        >
          <canvas
            ref={canvasRef}
            role="application"
            tabIndex={0}
            aria-label={
              'Two wave sources and a listening spot. Drag the orange and teal dots to move the ' +
              'sources, and the white ringed dot to listen. Arrow keys move the listening spot. ' +
              `The listening spot is currently ${label.toLowerCase()}.`
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

        {/* Visual strength meter. This is the primary channel, not a decoration. */}
        <div className="rounded-2xl bg-white/80 border border-[color:var(--brand-border,#F0DECA)] px-4 py-3 shrink-0">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-medium text-[color:var(--brand-text-soft,#6B7280)]">
              Listening spot
            </span>
            <span className="text-base font-bold" style={{ color: ACCENT }} aria-live="polite">
              {label}
            </span>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: '#EFE6DA' }}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(strength * 100)}
            aria-label="Wave strength at the listening spot"
          >
            <div
              className="h-full rounded-full transition-[width] duration-100 ease-out"
              style={{
                width: `${Math.round(strength * 100)}%`,
                backgroundColor: strength < QUIET_BELOW ? '#14B8A6' : ACCENT,
              }}
            />
          </div>
        </div>

        <NamingCard line={line} onDismiss={dismiss} accent={ACCENT} className="shrink-0" />

        <div className="rounded-2xl bg-white/70 border border-[color:var(--brand-border,#F0DECA)] p-4 flex flex-col gap-4 shrink-0">
          <Knob
            label="Wave size"
            value={wavelength}
            min={0.05}
            max={0.3}
            step={0.005}
            format={(v) => (v < 0.12 ? 'small' : v > 0.22 ? 'big' : 'medium')}
            onChange={(v) => {
              interacted.current = true;
              setWavelength(v);
            }}
            calmMode={calm}
            accent={ACCENT}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSoundOn((s) => !s)}
              aria-pressed={soundOn}
              className="px-4 rounded-full border-none font-bold text-sm cursor-pointer"
              style={{
                minHeight: 44,
                backgroundColor: soundOn ? ACCENT : '#F0DECA',
                color: soundOn ? '#FFFFFF' : '#6B7280',
              }}
            >
              {soundOn ? 'Sound on' : 'Sound off'}
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
