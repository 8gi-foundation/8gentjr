'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import NamingCard from '@/components/guided/NamingCard';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useGuidedDiscovery } from '@/hooks/useGuidedDiscovery';
import {
  MODES,
  WATER_HUES,
  describeReading,
  harmonicPeak,
  hzToPosition,
  legendre,
  positionToHz,
  readMode,
} from '@/lib/water-sphere';
import {
  initialDiscoveryState,
  stepDiscovery,
  type WaterSphereDiscoveryId,
  type WaterSphereDiscoveryState,
} from '@/lib/water-sphere-discovery';

/**
 * Water Sphere.
 *
 * A drop of water floating in the dark, shaking. Slide the shake speed and the
 * surface churns, until it hits one of the speeds where it stops fighting
 * itself and holds a lobed shape. Poke it and it rings. Turn it with a finger.
 *
 * WHAT THIS IS TRYING TO BE
 *
 * A place, not a panel. It is alive before anything is touched: the drop
 * breathes, the key light drifts, dust hangs in the dark, and a pool of light
 * the drop has focused moves on the floor beneath it. Nothing here celebrates,
 * counts, times, or can be lost. The pleasure is meant to be the pleasure of
 * water, which is a thing children already know how to enjoy.
 *
 * HOW IT IS DRAWN
 *
 * A 2D canvas and hand-rolled projection, exactly as ChladniPlate3D does it and
 * for the same reason: the repo takes no 3D dependency, and an iPad renders
 * this comfortably. The look comes from shading maths, not from mesh count:
 *
 *   - Fresnel. Water is nearly clear looking straight through it and nearly a
 *     mirror at a grazing angle. That single term is what makes a shaded ball
 *     read as a droplet, so the silhouette carries a bright cyan edge and the
 *     middle falls away dark.
 *   - A tight specular glint, which is the "wet" cue.
 *   - An internal focus opposite the key light, because a ball of water is a
 *     lens and a lens concentrates light on its far side.
 *   - A caustic pool below, which is that same focused light landing on
 *     something. When the surface locks into a mode the pool breaks into the
 *     same number of lobes, because a rippled lens throws a rippled pool.
 *   - Additive bloom on wave crests, so light gathers where the water rises.
 *
 * PERFORMANCE
 *
 * The surface displacement is a spherical harmonic, and a spherical harmonic
 * separates: P(cos theta) times cos(m phi). So the polar part is evaluated once
 * per ROW and the azimuthal part once per COLUMN, and each of the ~2000
 * vertices costs a multiply instead of a Legendre recurrence. That is the
 * difference between this being fine on an iPad and not. On top of that the
 * frame cost is measured, and the grid steps down a level rather than dropping
 * frames, per the brief: degrade, do not jank.
 *
 * SOUND OFF
 *
 * The whole activity is complete with the volume at zero. The lock is visible
 * in the surface, in the caustic, and in a labelled steadiness bar, and every
 * naming line is on screen whether or not it is spoken.
 *
 * Issue: #225 (wave 3, Water Sphere)
 */

/* ─────────────────────────────────────────────────────────────────────────
 * Palette
 *
 * Derived at module load from the hues declared in water-sphere.ts, which the
 * test suite holds outside the banned 270-350 band. Every pixel this component
 * paints is a non-negative sum of these colours plus white and black, and a
 * non-negative sum of teal and cyan and white cannot land in the banned band.
 * That is why the fence is one test on a handful of numbers rather than a
 * promise in a comment.
 * ───────────────────────────────────────────────────────────────────────── */

type RGB = [number, number, number];

function hsl(h: number, s: number, l: number): RGB {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = lN - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const C_BODY = hsl(WATER_HUES.bodyLit, 72, 33);
const C_DEEP = hsl(WATER_HUES.bodyDeep, 80, 7);
const C_RIM = hsl(WATER_HUES.rim, 94, 74);
const C_CREST = hsl(WATER_HUES.crest, 90, 64);
const C_CAUSTIC = hsl(WATER_HUES.caustic, 92, 56);
const C_MOTE = hsl(WATER_HUES.mote, 60, 78);
const C_VOID_NEAR = hsl(WATER_HUES.voidNear, 60, 7);
const C_VOID_FAR = hsl(WATER_HUES.voidFar, 70, 2);

const css = (c: RGB, a = 1) =>
  a >= 1
    ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Accent for the naming card and the controls. Teal, well outside the ban. */
const ACCENT = '#2BB3B8';

/* ─────────────────────────────────────────────────────────────────────────
 * Shape of the water
 * ───────────────────────────────────────────────────────────────────────── */

/** Peak surface displacement as a fraction of the drop's radius. */
const AMPLITUDE = 0.2;
/** Fine chop mixed in while the drop is between modes. */
const TURBULENCE = 0.075;
/** The breathing that never stops, so the drop is alive before it is touched. */
const IDLE = 0.022;

/**
 * How fast the standing wave visibly rises and falls.
 *
 * The drive frequency is 40 to 380 Hz and at those rates a surface is a blur,
 * which is exactly why the real demo is filmed with a strobe. This is the
 * strobe: the SHAPE is the real mode at the real frequency, and only the
 * playback of its rise and fall is slowed to something an eye can follow. The
 * naming lines describe the shape, never the speed of the wobble, so nothing
 * claimed is affected by this choice.
 */
function visualRate(modeIndex: number): number {
  return 2 * Math.PI * (0.5 + 0.18 * modeIndex);
}

interface Poke {
  /** Unit direction on the drop where the finger landed. */
  dx: number;
  dy: number;
  dz: number;
  /** Seconds, in the render clock. */
  born: number;
  amp: number;
}

/** Pokes are capped: each one costs an acos per vertex and three is plenty. */
const MAX_POKES = 3;
const POKE_LIFE = 2.4;
const POKE_SPEED = 2.3;
const POKE_WIDTH = 0.42;

/* ─────────────────────────────────────────────────────────────────────────
 * Quality ladder
 * ───────────────────────────────────────────────────────────────────────── */

const QUALITY = [
  { lat: 52, lon: 88, motes: 52 },
  { lat: 38, lon: 64, motes: 38 },
  { lat: 26, lon: 44, motes: 24 },
];

/**
 * The surface is painted into a half-scale buffer and drawn back up.
 *
 * Two problems, one fix. Canvas 2D has no way to shade smoothly across a quad,
 * so every quad is one flat colour and a sphere built from them reads as a
 * faceted gem: the first render of this had thirty-six visible latitude bands,
 * which for a component whose whole argument is beauty-from-shading rather than
 * beauty-from-mesh-count is the argument failing. Drawing at half scale and
 * letting the browser's bilinear filter put the pixels back turns every hard
 * facet edge into a soft ramp.
 *
 * It is also four times fewer pixels to fill, and that is what pays for a grid
 * dense enough (52 by 88) that the facets were small before the smoothing even
 * started. Cheaper AND better, which is rare enough to be worth the extra
 * canvas. WaveInterference already renders its field into a small buffer and
 * scales it up, so this is the repo's existing pattern rather than a new one.
 */
const SURFACE_SCALE = 0.42;

/* ─────────────────────────────────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────────────────────────────────── */

export default function WaterSphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * The drop opens already resonating on its lowest mode. A drop hanging
   * perfectly still would be a screenshot; one that is already holding a shape
   * says "this is a thing that does something" before a word is read. It is
   * also the reason the discovery gate is worth testing, because every frame
   * from mount looks exactly like a discovery.
   */
  const [hz, setHz] = useState(MODES[0].hz);
  /**
   * Sound OFF until the child asks for it.
   *
   * Ripples defaults its sound off behind an explicit press, and where two
   * activities in the same wave disagree about consent the stricter one has to
   * win. An unrequested hum the moment a finger lands is aversive for exactly
   * the children this product is for, and "they can always turn it down" puts
   * the burden on the child least able to carry it.
   *
   * This is also load bearing for the gain fix below. Master gain now follows
   * this value from the moment the graph exists, so leaving the default at 45
   * would have turned a silent bug into an unrequested noise bug.
   */
  const [volume, setVolume] = useState(0);
  const [announce, setAnnounce] = useState('');
  const [quality, setQuality] = useState(0);

  /**
   * Calm Mode, read but not offered here.
   *
   * This was the only science sandbox ignoring it, which is the wrong one to
   * miss: the churn state is the sensory-heaviest thing in the activity, and it
   * is where a child spends their time while hunting, because churn is what
   * "not there yet" looks like. Turbulence, bloom, drifting light and dust all
   * damp together below.
   *
   * The toggle is deliberately not repeated on this surface. One switch a carer
   * sets once beats five that each do a little, and Light Mixer already ships
   * it against the same key. It defaults to on.
   */
  const [calm] = useCalmMode();

  const hzRef = useRef(hz);
  hzRef.current = hz;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  /* Camera */
  const yaw = useRef(0.4);
  const pitch = useRef(0.28);
  const spin = useRef(0.0);

  /* Pointer */
  const drag = useRef<{ x: number; y: number; sx: number; sy: number; t: number; moved: number } | null>(
    null,
  );
  const pokes = useRef<Poke[]>([]);

  /* A snapshot of the last frame's front-facing vertices, so a tap can be
   * turned into a point on the surface without inverting the projection. */
  const hitPoints = useRef<{ sx: number; sy: number; dx: number; dy: number; dz: number }[]>([]);
  /** How many entries of hitPoints the last frame actually filled. */
  const hitCount = useRef(0);

  /* Guided naming */
  const discovery = useRef<WaterSphereDiscoveryState>(initialDiscoveryState());
  const pending = useRef<WaterSphereDiscoveryId[]>([]);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guided = useGuidedDiscovery({
    activityId: 'water-sphere',
    speakEnabled: volume > 0,
  });
  const recordRef = useRef(guided.record);
  recordRef.current = guided.record;

  /* Audio */
  const audio = useRef<{
    ctx: AudioContext;
    master: GainNode;
    hum: OscillatorNode;
    humOct: OscillatorNode;
    humGain: GainNode;
    humOctGain: GainNode;
    noiseGain: GainNode;
    noiseFilter: BiquadFilterNode;
  } | null>(null);

  /* ── Naming pipeline ───────────────────────────────────────────────────
   *
   * The reducer can name more than one thing in a single step. Landing a far
   * higher shape straight after a churning stretch names three at once, which
   * is a lecture, so they queue and are handed over one at a time.
   *
   * The queue also has to compose correctly with the hook's "hold, never burn"
   * gate. That gate DECLINES a record that arrives while a line is showing, and
   * a declined record is not marked named, so the caller is expected to try it
   * again. Handing a queued id over while the card is occupied would therefore
   * be a silent drop, because this reducer has already spent the id from its
   * own state. So a line is only ever handed over when the card is CLEAR, and
   * the card retires itself after a calm read when something is waiting behind
   * it. Nothing is dropped and nothing overlaps.
   */

  const [queueTick, setQueueTick] = useState(0);

  const feed = useCallback((event: Parameters<typeof stepDiscovery>[1]) => {
    const step = stepDiscovery(discovery.current, event);
    discovery.current = step.state;
    if (step.emit.length) {
      pending.current.push(...step.emit);
      setQueueTick((n) => n + 1);
    }
  }, []);

  const dismissRef = useRef(guided.dismiss);
  dismissRef.current = guided.dismiss;
  const lineOnScreen = guided.line !== null;

  useEffect(() => {
    if (pending.current.length === 0) return;

    if (lineOnScreen) {
      // Something is waiting. Retire the current line after long enough to read
      // it aloud twice over, so the queue cannot stall on a child who does not
      // press the close button. With nothing waiting, the card stays until it
      // is dismissed, exactly as it does in the other activities.
      const id = setTimeout(() => dismissRef.current(), 7000);
      return () => clearTimeout(id);
    }

    // Card is clear. A short gap first, so a replaced line reads as a new
    // sentence rather than as a flicker.
    const id = setTimeout(() => {
      const next = pending.current.shift();
      if (next) recordRef.current(next);
    }, 450);
    return () => clearTimeout(id);
  }, [lineOnScreen, queueTick]);

  /** Any real input from the child. This is the gate on every naming line. */
  const interacted = useCallback(() => feed({ type: 'interact' }), [feed]);

  /**
   * The frequency has stopped moving. Only then is it worth judging what the
   * surface settled into: a child sweeping the slider crosses every mode in
   * half a second and should not collect the whole catalogue for it.
   */
  const scheduleObserve = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      feed({ type: 'observe', hz: hzRef.current });
    }, 800);
  }, [feed]);

  useEffect(() => {
    scheduleObserve();
  }, [hz, scheduleObserve]);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  /* ── Audio ─────────────────────────────────────────────────────────────
   *
   * A quiet hum at the actual drive frequency, plus a breath of filtered noise
   * that rises as the surface churns and falls away as it locks. So the lock is
   * audible as well as visible: the sound cleans up as the shape arrives. It is
   * information, not applause, and with the volume at zero the activity is
   * whole.
   *
   * Started on the first touch, never before, which is both good manners and
   * what browsers require.
   */

  const ensureAudio = useCallback(() => {
    if (audio.current) {
      if (audio.current.ctx.state === 'suspended') void audio.current.ctx.resume();
      return audio.current;
    }
    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }

    const master = ctx.createGain();
    /*
     * Follow the slider from the instant the graph exists.
     *
     * This was hardcoded to 0, and the only thing that ever raised it was the
     * [volume] effect, which returns early while `audio.current` is null and
     * then never re-runs, because ensureAudio() is called from the pointer and
     * key handlers and none of those change `volume`. So the whole audio
     * channel was inaudible: hum, churn noise and poke alike. Reading the
     * slider here is what closes that, and the [volume] effect handles every
     * change after.
     */
    master.gain.value = (volumeRef.current / 100) * 0.5;
    master.connect(ctx.destination);

    const mk = (freq: number, gain: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(master);
      osc.start();
      return { osc, g };
    };

    // The fundamental, plus the octave above it. Phone speakers roll off hard
    // below about 200 Hz, so without the octave the bottom of the slider would
    // be silent on the device most children hold.
    const base = mk(hzRef.current, 0.1);
    const oct = mk(hzRef.current * 2, 0.045);

    // Noise for the churn. A short looping buffer is cheaper than a live source
    // and at this filter width nobody can hear the loop.
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp = 0.96 * lp + 0.04 * (Math.random() * 2 - 1);
      data[i] = lp * 3.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = hzRef.current;
    noiseFilter.Q.value = 1.4;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    audio.current = {
      ctx,
      master,
      hum: base.osc,
      humOct: oct.osc,
      humGain: base.g,
      humOctGain: oct.g,
      noiseGain,
      noiseFilter,
    };
    return audio.current;
  }, []);

  useEffect(
    () => () => {
      const a = audio.current;
      audio.current = null;
      if (a) void a.ctx.close().catch(() => {});
    },
    [],
  );

  /** Follow the slider with a glide, so sweeping sounds like a sweep. */
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const now = a.ctx.currentTime;
    a.hum.frequency.setTargetAtTime(hz, now, 0.06);
    a.humOct.frequency.setTargetAtTime(hz * 2, now, 0.06);
    a.noiseFilter.frequency.setTargetAtTime(hz, now, 0.06);
  }, [hz]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.master.gain.setTargetAtTime((volume / 100) * 0.5, a.ctx.currentTime, 0.08);
  }, [volume]);

  /** Lock cleans the tone up; churn muddies it. Same information as the picture. */
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const r = readMode(hz);
    const now = a.ctx.currentTime;
    a.humGain.gain.setTargetAtTime(0.05 + 0.09 * r.lock, now, 0.12);
    a.noiseGain.gain.setTargetAtTime(0.02 + 0.1 * r.churn, now, 0.12);
  }, [hz]);

  const pokeSound = useCallback(() => {
    const a = ensureAudio();
    if (!a || volumeRef.current <= 0) return;
    const { ctx, master } = a;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    // A soft drop in pitch as it fades. This is what a struck body of water
    // does, and it is also the difference between a note and a chime: no
    // reward sound, just the drop answering.
    osc.frequency.setValueAtTime(hzRef.current * 2, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, hzRef.current * 1.35), now + 0.7);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 1.2);
  }, [ensureAudio]);

  /* ── Input ─────────────────────────────────────────────────────────────
   *
   * Horizontal drag turns the drop. Vertical drag changes the shake speed, over
   * the full height of the canvas, which is a far more generous target than the
   * slider and is why the brief asks for it. The slider stays for precision and
   * for anyone who is not dragging.
   */

  const bumpHz = useCallback(
    (deltaPosition: number) => {
      setHz((prev) => {
        const p = hzToPosition(prev) + deltaPosition;
        return positionToHz(p);
      });
    },
    [],
  );

  const doPoke = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Nearest front-facing surface point from the last frame. Cheaper and
      // steadier than inverting a projection that changes every frame, and it
      // cannot miss: the tap always lands on water the child can see.
      let best: (typeof hitPoints.current)[number] | null = null;
      let bestD = Infinity;
      for (let i = 0; i < hitCount.current; i++) {
        const p = hitPoints.current[i];
        const d = (p.sx - x) * (p.sx - x) + (p.sy - y) * (p.sy - y);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      if (!best) return;

      pokes.current.push({
        dx: best.dx,
        dy: best.dy,
        dz: best.dz,
        born: performance.now() / 1000,
        amp: 1,
      });
      if (pokes.current.length > MAX_POKES) pokes.current.shift();

      pokeSound();
      feed({ type: 'poke' });
    },
    [feed, pokeSound],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      ensureAudio();
      interacted();
      // Focus explicitly. A canvas with touch-action none that captures the
      // pointer does not reliably take focus from a click, and this was found
      // by hand: after tapping the drop, the arrow keys did nothing, because
      // focus was still on the body. A child who taps first and then wants to
      // use the keyboard is exactly who that silently failed for.
      canvasRef.current?.focus({ preventScroll: true });
      drag.current = {
        x: e.clientX,
        y: e.clientY,
        sx: e.clientX,
        sy: e.clientY,
        t: performance.now(),
        moved: 0,
      };
      spin.current = 0;
      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is an optimisation, not a requirement */
      }
    },
    [ensureAudio, interacted],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.moved += Math.abs(dx) + Math.abs(dy);
      d.x = e.clientX;
      d.y = e.clientY;

      yaw.current += dx * 0.009;
      spin.current = dx * 0.009;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      // Up is faster. The whole canvas height sweeps the whole range once.
      if (rect.height > 0) bumpHz(-dy / rect.height);
    },
    [bumpHz],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      const quick = performance.now() - d.t < 420;
      if (quick && d.moved < 10) doPoke(e.clientX, e.clientY);
    },
    [doPoke],
  );

  const onPointerCancel = useCallback(() => {
    drag.current = null;
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      ensureAudio();
      const step = 0.035;
      if (e.key === 'ArrowLeft') yaw.current -= 0.14;
      else if (e.key === 'ArrowRight') yaw.current += 0.14;
      else if (e.key === 'ArrowUp') bumpHz(step);
      else if (e.key === 'ArrowDown') bumpHz(-step);
      else if (e.key === ' ' || e.key === 'Enter') {
        const canvas = canvasRef.current;
        if (canvas) {
          const r = canvas.getBoundingClientRect();
          doPoke(r.left + r.width / 2, r.top + r.height / 2);
        }
      } else return;
      e.preventDefault();
      interacted();
    },
    [bumpHz, doPoke, ensureAudio, interacted],
  );

  /* ── Live region ───────────────────────────────────────────────────────
   *
   * The picture tells a sighted child whether the water is holding a shape.
   * This says the same thing, once per change, for a child using a screen
   * reader. Not chatty: only when the answer actually changes.
   */
  const lastSpoken = useRef('');
  useEffect(() => {
    const text = describeReading(readMode(hz));
    if (text === lastSpoken.current) return;
    const id = setTimeout(() => {
      lastSpoken.current = text;
      setAnnounce(text);
    }, 700);
    return () => clearTimeout(id);
  }, [hz]);

  /* ── Render ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const q = QUALITY[quality];
    const LAT = q.lat;
    const LON = q.lon;
    const STRIDE = LON + 1;
    const VERTS = (LAT + 1) * STRIDE;

    /* Reused every frame. A steady 30fps must not churn the heap. */
    const vx = new Float32Array(VERTS);
    const vy = new Float32Array(VERTS);
    const vz = new Float32Array(VERTS);
    const sx = new Float32Array(VERTS);
    const sy = new Float32Array(VERTS);
    const disp = new Float32Array(VERTS);

    /* Separable tables: the polar half once per row, the azimuthal half once
     * per column. This is what keeps ~2200 vertices affordable. */
    const ct = new Float32Array(LAT + 1);
    const st = new Float32Array(LAT + 1);
    for (let i = 0; i <= LAT; i++) {
      const theta = (i / LAT) * Math.PI;
      ct[i] = Math.cos(theta);
      st[i] = Math.sin(theta);
    }
    const cp = new Float32Array(STRIDE);
    const sp = new Float32Array(STRIDE);
    for (let j = 0; j <= LON; j++) {
      const phi = (j / LON) * 2 * Math.PI;
      cp[j] = Math.cos(phi);
      sp[j] = Math.sin(phi);
    }

    const pA = new Float32Array(LAT + 1);
    const pB = new Float32Array(LAT + 1);
    const pT = new Float32Array(LAT + 1);
    const pI = new Float32Array(LAT + 1);
    const aA = new Float32Array(STRIDE);
    const aB = new Float32Array(STRIDE);
    const aT = new Float32Array(STRIDE);
    const aI = new Float32Array(STRIDE);

    const fillPolar = (out: Float32Array, l: number, m: number) => {
      const peak = harmonicPeak(l, m);
      for (let i = 0; i <= LAT; i++) out[i] = legendre(l, m, ct[i]) / peak;
    };
    const fillAzimuth = (out: Float32Array, m: number, phase: number) => {
      for (let j = 0; j <= LON; j++) out[j] = Math.cos(m * ((j / LON) * 2 * Math.PI + phase));
    };

    /* Motes: dust in the dark so the drop is somewhere rather than nowhere. */
    /* Dust thins right down in Calm Mode: it is atmosphere, and atmosphere is
     * the first thing to give up when a child has asked for less going on. */
    const moteCount = calm ? Math.round(q.motes * 0.4) : q.motes;
    const motes: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < moteCount; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = 2.4 + Math.random() * 2.6;
      const s = Math.sqrt(1 - u * u);
      motes.push({ x: r * s * Math.cos(a), y: r * u, z: r * s * Math.sin(a) });
    }

    /* Front-facing quads and their depths, allocated once.
     *
     * `order` holds the base vertex index of each visible quad and `quadDepth`
     * its distance, keyed by the same base index so the comparator is a lookup
     * rather than an object field. Sorting a list of numbers means a frame
     * allocates nothing at all, which is the difference between a smooth
     * activity and one that stutters every few seconds on an iPad. */
    const order: number[] = [];
    const quadDepth = new Float32Array(VERTS);

    /* Bloom and tap-target pools, reused rather than re-created per frame. */
    const blooms: { x: number; y: number; r: number; a: number }[] = [];
    const hitPool: { sx: number; sy: number; dx: number; dy: number; dz: number }[] = [];
    let hitLen = 0;

    let raf = 0;
    let mounted = true;
    let last = 0;
    const start = performance.now();
    const frameInterval = 1000 / 32;

    /* Adaptive quality. Measured, not guessed, and it only ever steps down. */
    let costSum = 0;
    let costCount = 0;
    let downgraded = false;

    /* The half-scale buffer the water itself is painted into. Its transform is
     * set so the drawing code below can keep using CSS pixel coordinates; only
     * the pixels underneath are coarser. */
    const surf = document.createElement('canvas');
    const sctx = surf.getContext('2d');
    if (!sctx) return;

    /* Cached in resize. Measuring the element inside the loop forces a
     * synchronous layout on every frame of an activity a child holds. */
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
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const sdpr = dpr * SURFACE_SCALE;
      surf.width = Math.max(1, Math.round(rect.width * sdpr));
      surf.height = Math.max(1, Math.round(rect.height * sdpr));
      sctx.setTransform(sdpr, 0, 0, sdpr, 0, 0);
    };

    const render = (t: number) => {
      const w = cssW;
      const h = cssH;
      if (w < 2 || h < 2) return;

      const reading = readMode(hzRef.current);
      const lock = reading.lock;
      const churn = reading.churn;
      const modeA = reading.mode;
      const modeB =
        reading.neighbourIndex !== null ? MODES[reading.neighbourIndex] : reading.mode;

      /* Camera. Momentum after the finger lifts, easing to nothing. */
      if (!drag.current && Math.abs(spin.current) > 1e-4) {
        yaw.current += spin.current;
        spin.current *= 0.955;
      }
      const cy = Math.cos(yaw.current);
      const syw = Math.sin(yaw.current);
      const cpi = Math.cos(pitch.current);
      const spi = Math.sin(pitch.current);

      /* Framing. The drop sits above centre so the pool of light it focuses has
       * somewhere to land: without floor under it, it is a ball on a black
       * background rather than a drop hanging in a place. */
      const camD = 4.4;
      const focal = Math.min(w, h * 1.25) * 0.86;
      const ox = w / 2;
      const oy = h * 0.38;

      /* The key light drifts, slowly, forever. It is most of why a still frame
       * of this does not feel like a still frame. */
      const drift = reduceMotion ? 0 : t * (calm ? 0.045 : 0.11);
      let lx = -0.52 + Math.sin(drift) * 0.14;
      let ly = 0.74;
      let lz = 0.55 + Math.cos(drift * 0.8) * 0.12;
      const ll = Math.hypot(lx, ly, lz);
      lx /= ll;
      ly /= ll;
      lz /= ll;

      /* Phases. Frozen under reduced motion at a point where the shape is at
       * full extension, so nothing is hidden by holding it still. */
      const phaseA = reduceMotion ? 0 : Math.cos(t * visualRate(reading.index));
      const phaseB = reduceMotion ? 0.6 : Math.cos(t * visualRate(reading.index) * 1.37 + 1.7);
      const phaseT = reduceMotion ? 0.3 : Math.cos(t * 2.9);
      const phaseI = reduceMotion ? 1 : Math.cos(t * 0.62);
      const swirl = reduceMotion ? 0 : t * (calm ? 0.07 : 0.16);

      fillPolar(pA, modeA.l, modeA.m);
      fillPolar(pB, modeB.l, modeB.m);
      fillPolar(pT, 7, 5);
      fillPolar(pI, 3, 2);
      fillAzimuth(aA, modeA.m, 0);
      fillAzimuth(aB, modeB.m, 0.9);
      fillAzimuth(aT, 5, swirl);
      fillAzimuth(aI, 2, -swirl * 0.5);

      /* Under reduced motion the standing wave is held at full extension, so
       * the amplitude must not be multiplied by a frozen zero. */
      const ampA = AMPLITUDE * (0.35 + 0.65 * lock) * (reduceMotion ? 0.85 : phaseA);
      const ampB = AMPLITUDE * 0.62 * churn * (reduceMotion ? 0.4 : phaseB);
      // The churn is the loudest thing on screen and the state a hunting child
      // sits in longest, so this is the single most useful number to damp.
      const ampT = TURBULENCE * churn * (calm ? 0.4 : 1) * (reduceMotion ? 0.5 : phaseT);
      const ampI = IDLE * (reduceMotion ? 1 : phaseI);

      /* Live pokes. */
      const now = t;
      if (pokes.current.length) {
        pokes.current = pokes.current.filter((p) => now - p.born < POKE_LIFE);
      }
      const live = pokes.current;

      /* ── Vertices ── */
      for (let i = 0; i <= LAT; i++) {
        const cti = ct[i];
        const sti = st[i];
        const rowA = pA[i] * ampA;
        const rowB = pB[i] * ampB;
        const rowT = pT[i] * ampT;
        const rowI = pI[i] * ampI;

        for (let j = 0; j <= LON; j++) {
          const idx = i * STRIDE + j;

          let d = rowA * aA[j] + rowB * aB[j] + rowT * aT[j] + rowI * aI[j];

          const ux = sti * cp[j];
          const uy = cti;
          const uz = sti * sp[j];

          for (let k = 0; k < live.length; k++) {
            const p = live[k];
            const age = now - p.born;
            const dot = ux * p.dx + uy * p.dy + uz * p.dz;
            const ang = Math.acos(dot > 1 ? 1 : dot < -1 ? -1 : dot);
            // An expanding ring that fades, plus the whole drop wobbling after
            // the strike. Together they read as "poke, splash, ring".
            const gap = ang - age * POKE_SPEED;
            const ring = Math.exp((-gap * gap) / (2 * POKE_WIDTH * POKE_WIDTH));
            const decay = Math.exp(-age / 0.85);
            const body = reduceMotion ? 1 : Math.cos(age * 9.4);
            d += 0.115 * p.amp * decay * (ring * body + 0.28 * (1.5 * dot * dot - 0.5));
          }

          disp[idx] = d;
          const r = 1 + d;

          const wx = ux * r;
          const wy = uy * r;
          const wz = uz * r;

          const x1 = wx * cy + wz * syw;
          const z1 = -wx * syw + wz * cy;
          const y2 = wy * cpi - z1 * spi;
          const z2 = wy * spi + z1 * cpi;

          vx[idx] = x1;
          vy[idx] = y2;
          vz[idx] = z2;

          const dep = camD - z2;
          sx[idx] = ox + (x1 * focal) / dep;
          sy[idx] = oy - (y2 * focal) / dep;
        }
      }

      /* ── Background ── */
      const bg = ctx.createRadialGradient(
        ox,
        oy,
        0,
        ox,
        oy,
        Math.max(w, h) * 0.78,
      );
      bg.addColorStop(0, css(C_VOID_NEAR));
      bg.addColorStop(1, css(C_VOID_FAR));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      /* ── Motes ── */
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        const a = swirl * 0.25 + i * 0.7;
        const mx = m.x * Math.cos(a * 0.06) + m.z * Math.sin(a * 0.06);
        const mz = -m.x * Math.sin(a * 0.06) + m.z * Math.cos(a * 0.06);
        const x1 = mx * cy + mz * syw;
        const z1 = -mx * syw + mz * cy;
        const y2 = m.y * cpi - z1 * spi;
        const z2 = m.y * spi + z1 * cpi;
        const dep = camD - z2;
        if (dep < 0.4) continue;
        const px = ox + (x1 * focal) / dep;
        const py = oy - (y2 * focal) / dep;
        const rr = Math.max(0.5, (focal * 0.004) / dep);
        ctx.fillStyle = css(C_MOTE, 0.14 + 0.5 / dep);
        ctx.beginPath();
        ctx.arc(px, py, rr, 0, Math.PI * 2);
        ctx.fill();
      }

      /* ── The caustic pool ──
       *
       * A ball of water is a lens, so the light it gathers lands somewhere. On
       * a smooth drop that is one bright pool; on a drop rippled into a mode it
       * splits into lobes, one per petal, and turns with the wave. This is the
       * lock made visible in a second place, which matters for a child playing
       * with the sound off. */
      const floorY = oy + focal * 0.52;
      const pr = focal * (0.42 + 0.1 * lock);
      const pool = ctx.createRadialGradient(ox, floorY, 0, ox, floorY, pr);
      pool.addColorStop(0, css(C_CAUSTIC, 0.16 + 0.2 * lock));
      pool.addColorStop(0.55, css(C_CAUSTIC, 0.05 + 0.07 * lock));
      pool.addColorStop(1, css(C_CAUSTIC, 0));
      ctx.fillStyle = pool;
      ctx.save();
      ctx.translate(ox, floorY);
      ctx.scale(1, 0.32);
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (lock > 0.25) {
        const lobes = Math.max(3, modeA.m > 0 ? modeA.m * 2 : modeA.l * 2);
        const rr = pr * 0.52;
        const spinP = reduceMotion ? 0 : t * (calm ? 0.12 : 0.28);
        for (let i = 0; i < lobes; i++) {
          const a = (i / lobes) * Math.PI * 2 + spinP + yaw.current;
          const bx = ox + Math.cos(a) * rr;
          const by = floorY + Math.sin(a) * rr * 0.32;
          const br = pr * 0.2;
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          g.addColorStop(0, css(C_CAUSTIC, 0.2 * lock));
          g.addColorStop(1, css(C_CAUSTIC, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      /* ── The drop ──
       *
       * Painted into the half-scale buffer, then drawn back up once. */
      sctx.clearRect(0, 0, w, h);
      order.length = 0;
      blooms.length = 0;
      hitLen = 0;

      for (let i = 0; i < LAT; i++) {
        for (let j = 0; j < LON; j++) {
          const a = i * STRIDE + j;
          const b = a + 1;
          const c = a + STRIDE + 1;
          const dd = a + STRIDE;

          // Face normal from two edges, flipped outward if the winding says so.
          const e1x = vx[b] - vx[a];
          const e1y = vy[b] - vy[a];
          const e1z = vz[b] - vz[a];
          const e2x = vx[dd] - vx[a];
          const e2y = vy[dd] - vy[a];
          const e2z = vz[dd] - vz[a];
          let nx = e1y * e2z - e1z * e2y;
          let ny = e1z * e2x - e1x * e2z;
          let nz = e1x * e2y - e1y * e2x;
          const nl = Math.hypot(nx, ny, nz);
          if (nl < 1e-9) continue;
          nx /= nl;
          ny /= nl;
          nz /= nl;

          const mx = (vx[a] + vx[b] + vx[c] + vx[dd]) * 0.25;
          const my = (vy[a] + vy[b] + vy[c] + vy[dd]) * 0.25;
          const mz = (vz[a] + vz[b] + vz[c] + vz[dd]) * 0.25;
          if (nx * mx + ny * my + nz * mz < 0) {
            nx = -nx;
            ny = -ny;
            nz = -nz;
          }

          // View vector from the surface toward the camera.
          let ex = -mx;
          let ey = -my;
          let ez = camD - mz;
          const el = Math.hypot(ex, ey, ez);
          ex /= el;
          ey /= el;
          ez /= el;

          const ndv = nx * ex + ny * ey + nz * ez;
          if (ndv <= 0.015) continue; // back face

          order.push(a);
          quadDepth[a] = camD - mz;
        }
      }

      // Painter's algorithm over the front-facing set only. Far quads first.
      // A list of numbers sorted in place, with the depth looked up by index,
      // so the sort allocates nothing.
      order.sort((p, r) => quadDepth[r] - quadDepth[p]);

      for (let k = 0; k < order.length; k++) {
        const a = order[k];
        const b = a + 1;
        const c = a + STRIDE + 1;
        const dd = a + STRIDE;

        const e1x = vx[b] - vx[a];
        const e1y = vy[b] - vy[a];
        const e1z = vz[b] - vz[a];
        const e2x = vx[dd] - vx[a];
        const e2y = vy[dd] - vy[a];
        const e2z = vz[dd] - vz[a];
        let nx = e1y * e2z - e1z * e2y;
        let ny = e1z * e2x - e1x * e2z;
        let nz = e1x * e2y - e1y * e2x;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;

        const mx = (vx[a] + vx[b] + vx[c] + vx[dd]) * 0.25;
        const my = (vy[a] + vy[b] + vy[c] + vy[dd]) * 0.25;
        const mz = (vz[a] + vz[b] + vz[c] + vz[dd]) * 0.25;
        if (nx * mx + ny * my + nz * mz < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }

        let ex = -mx;
        let ey = -my;
        let ez = camD - mz;
        const el = Math.hypot(ex, ey, ez) || 1;
        ex /= el;
        ey /= el;
        ez /= el;

        /* Smooth the normal toward the radial direction.
         *
         * A face normal is constant across a quad, so every quad gets one flat
         * value and the surface reads as a mosaic. The first render of this
         * looked like a faceted gem rather than a drop of water, which for a
         * component whose whole argument is "beauty from shading, not from mesh
         * count" is the argument failing.
         *
         * The radial direction at the quad centre is the exact normal of an
         * undisplaced sphere and it varies smoothly from quad to quad, so
         * leaning on it removes the banding. The face normal is kept at a
         * quarter weight because it is the part that knows about the wave: drop
         * it entirely and the crests stop catching the light, which is the one
         * thing the surface most needs to do. */
        const ml = Math.hypot(mx, my, mz) || 1;
        let snx = (mx / ml) * 0.9 + nx * 0.1;
        let sny = (my / ml) * 0.9 + ny * 0.1;
        let snz = (mz / ml) * 0.9 + nz * 0.1;
        const snl = Math.hypot(snx, sny, snz) || 1;
        snx /= snl;
        sny /= snl;
        snz /= snl;
        nx = snx;
        ny = sny;
        nz = snz;

        const ndv = Math.max(0, nx * ex + ny * ey + nz * ez);
        const ndl = Math.max(0, nx * lx + ny * ly + nz * lz);

        // Fresnel: clear looking through it, mirror at the edge. This one term
        // is what turns a shaded ball into a droplet.
        const fres = Math.pow(1 - ndv, 3.1);

        // Half vector, for a tight wet glint.
        let hx = lx + ex;
        let hy = ly + ey;
        let hz2 = lz + ez;
        const hl = Math.hypot(hx, hy, hz2) || 1;
        hx /= hl;
        hy /= hl;
        hz2 /= hl;
        // Broad rather than tight. A 44-power highlight changes from full to
        // nothing across one quad, so it rendered as a staircase of bright
        // squares however smooth the normals were. Water on a moving surface
        // has a soft highlight anyway, so the honest look and the renderable
        // one agree here.
        const spec = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz2), 14);

        // The lens focus on the far side from the light.
        const inner = Math.pow(Math.max(0, -(nx * lx + ny * ly + nz * lz)), 7) * (1 - fres);

        const dAvg = (disp[a] + disp[b] + disp[c] + disp[dd]) * 0.25;
        const crest = Math.max(0, dAvg / AMPLITUDE);

        let r = C_DEEP[0] + C_BODY[0] * ndl * 0.62 + C_RIM[0] * fres * 1.05;
        let g = C_DEEP[1] + C_BODY[1] * ndl * 0.62 + C_RIM[1] * fres * 1.05;
        let bl = C_DEEP[2] + C_BODY[2] * ndl * 0.62 + C_RIM[2] * fres * 1.05;

        // The crest term carries the wave. It is built from the four corner
        // displacements, so it varies smoothly from quad to quad, which is why
        // the normals can lean almost entirely on the smooth radial direction
        // without the surface losing the thing that makes it interesting.
        const cg = Math.pow(crest, 1.4) * 0.7;
        r += C_CREST[0] * cg + 150 * spec + C_CAUSTIC[0] * inner * 0.5;
        g += C_CREST[1] * cg + 165 * spec + C_CAUSTIC[1] * inner * 0.5;
        bl += C_CREST[2] * cg + 172 * spec + C_CAUSTIC[2] * inner * 0.5;

        sctx.fillStyle = `rgb(${r > 255 ? 255 : r | 0},${g > 255 ? 255 : g | 0},${
          bl > 255 ? 255 : bl | 0
        })`;
        // Stroking each quad in its own colour closes the hairline seams
        // antialiasing leaves between neighbours, so the surface reads as one
        // sheet rather than a tiled mosaic.
        sctx.strokeStyle = sctx.fillStyle;
        sctx.lineWidth = 1.4;

        sctx.beginPath();
        sctx.moveTo(sx[a], sy[a]);
        sctx.lineTo(sx[b], sy[b]);
        sctx.lineTo(sx[c], sy[c]);
        sctx.lineTo(sx[dd], sy[dd]);
        sctx.closePath();
        sctx.fill();
        sctx.stroke();

        // Where the water rises highest, light gathers. Collected here and
        // painted additively after the surface, so it spills past the geometry
        // the way real bloom does.
        if (crest > 0.68 && blooms.length < (calm ? 6 : 14) && (k & 3) === 0) {
          blooms.push({
            x: (sx[a] + sx[c]) * 0.5,
            y: (sy[a] + sy[c]) * 0.5,
            r: focal * 0.055,
            a: Math.min(0.3, (crest - 0.68) * 0.85) * (0.4 + 0.6 * lock),
          });
        }

        // Remembered for turning a tap into a point on the surface. Written
        // into a pool that grows once and is then reused, so a frame at 32fps
        // does not leave a hundred short-lived objects behind it.
        if (ndv > 0.35 && (k & 7) === 0) {
          const inv = 1 / (Math.hypot(mx, my, mz) || 1);
          let slot = hitPool[hitLen];
          if (!slot) {
            slot = { sx: 0, sy: 0, dx: 0, dy: 0, dz: 0 };
            hitPool[hitLen] = slot;
          }
          slot.sx = (sx[a] + sx[c]) * 0.5;
          slot.sy = (sy[a] + sy[c]) * 0.5;
          slot.dx = mx * inv;
          slot.dy = my * inv;
          slot.dz = mz * inv;
          hitLen++;
        }
      }

      /* Back up to full size. The bilinear filter is what turns the facet
       * edges into soft ramps, which is the whole reason the buffer exists. */
      ctx.drawImage(surf, 0, 0, w, h);

      /* ── Bloom ──
       * At full resolution and additively, on top of the surface, so the light
       * spills past the geometry the way real bloom does. */
      ctx.globalCompositeOperation = 'lighter';
      for (const bm of blooms) {
        const g = ctx.createRadialGradient(bm.x, bm.y, 0, bm.x, bm.y, bm.r);
        g.addColorStop(0, css(C_CREST, bm.a));
        g.addColorStop(1, css(C_CREST, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bm.x, bm.y, bm.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      /* Hit points are recorded in view space; a poke has to land in the drop's
       * own frame, so the camera rotation is undone here once per point. */
      for (let i = 0; i < hitLen; i++) {
        const p = hitPool[i];
        const y1 = p.dy * cpi + p.dz * spi;
        const z1 = -p.dy * spi + p.dz * cpi;
        const x0 = p.dx * cy - z1 * syw;
        const z0 = p.dx * syw + z1 * cy;
        p.dx = x0;
        p.dy = y1;
        p.dz = z0;
      }
      hitPoints.current = hitPool;
      hitCount.current = hitLen;
    };

    const tick = (nowMs: number) => {
      if (!mounted) return;
      if (nowMs - last >= frameInterval) {
        last = nowMs;
        const t0 = performance.now();
        render((nowMs - start) / 1000);
        costSum += performance.now() - t0;
        costCount++;

        // Degrade rather than jank. Measured over a second of frames, and only
        // ever downward, so this can never oscillate between two levels.
        if (costCount >= 32) {
          const mean = costSum / costCount;
          costSum = 0;
          costCount = 0;
          if (!downgraded && mean > 18 && quality < QUALITY.length - 1) {
            downgraded = true;
            setQuality((prev) => Math.min(QUALITY.length - 1, prev + 1));
          }
        }
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

    raf = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [quality, calm]);

  /* ── UI ────────────────────────────────────────────────────────────────── */

  const reading = readMode(hz);
  const position = hzToPosition(hz);

  return (
    <div
      className="relative flex h-full w-full flex-col"
      style={{ background: css(C_VOID_FAR) }}
    >
      <canvas
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label="A drop of water floating in the dark. Drag up and down to change how fast it shakes, left and right to turn it around. Tap the drop to poke it."
        className="min-h-0 w-full flex-1"
        style={{ touchAction: 'none', cursor: 'grab', display: 'block' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* Controls. Deliberately thin and dark so the drop stays the subject. */}
      <div
        className="shrink-0 px-4 pb-4 pt-3"
        style={{
          background: 'linear-gradient(to top, rgba(3,10,13,0.96), rgba(3,10,13,0))',
        }}
      >
        <NamingCard
          line={guided.line}
          onDismiss={guided.dismiss}
          accent={ACCENT}
          tone="dark"
          className="mb-3"
        />

        {/* Steadiness. Not a score and not a target: it is the same fact the
            surface and the caustic already show, in a form a child who is
            hunting can read at a glance. No number, nothing to reach. */}
        <div className="mb-2 flex items-center gap-3">
          <span className="w-[68px] shrink-0 text-[12px] font-semibold tracking-wide text-[#7FD3D6]">
            {reading.locked ? 'Holding' : 'Churning'}
          </span>
          <div
            className="h-[6px] flex-1 overflow-hidden rounded-full"
            style={{ background: 'rgba(127,211,214,0.14)' }}
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(reading.lock * 100)}%`,
                background: `linear-gradient(90deg, ${css(C_CAUSTIC, 0.5)}, ${css(C_RIM)})`,
                transition: 'width 140ms linear',
              }}
            />
          </div>
        </div>

        <label className="flex items-center gap-3">
          <span className="w-[68px] shrink-0 text-[12px] font-semibold tracking-wide text-[#7FD3D6]">
            Shake
          </span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(position * 1000)}
            onChange={(e) => {
              interacted();
              ensureAudio();
              setHz(positionToHz(Number(e.target.value) / 1000));
            }}
            aria-label="How fast the drop shakes"
            aria-valuetext={`${Math.round(hz)} hertz. ${
              reading.locked ? 'Holding a shape.' : 'Churning.'
            }`}
            className="h-11 min-w-0 flex-1 cursor-pointer bg-transparent"
            style={{ accentColor: ACCENT }}
          />
          <span className="w-[58px] shrink-0 text-right text-[12px] font-semibold tabular-nums text-[#7FD3D6]">
            {Math.round(hz)} Hz
          </span>
        </label>

        <label className="mt-1 flex items-center gap-3">
          <span className="w-[68px] shrink-0 text-[12px] font-semibold tracking-wide text-[#7FD3D6]">
            Sound
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => {
              // A child may reach for sound before touching the drop, and this
              // is the gesture that permits audio, so it has to be able to
              // build the graph on its own.
              ensureAudio();
              setVolume(Number(e.target.value));
            }}
            aria-label="Sound volume. Starts off. The activity is complete with the sound off."
            className="h-11 min-w-0 flex-1 cursor-pointer bg-transparent"
            style={{ accentColor: ACCENT }}
          />
          <span className="w-[58px] shrink-0 text-right text-[12px] font-semibold tabular-nums text-[#7FD3D6]">
            {volume}
          </span>
        </label>
      </div>

      {/*
        Keyboard focus, drawn inside the box.

        A global :focus-visible rule paints a 3px orange outline on whatever has
        focus, and it beat the Tailwind ring utility that was here. On a canvas
        that fills the screen the outline lands on the viewport edges, so all a
        keyboard user actually saw was one orange line under the header: a
        stripe, not an indication of what is focused. Orange on this teal
        surface is also the only warm thing on the screen.

        A negative offset pulls the ring inside the canvas so all four edges are
        on screen, and styled-jsx scopes the selector tightly enough to win.
        This is deliberately not a global change: the same rule affects the
        other activities and that is a separate fix.
      */}
      <style jsx>{`
        canvas:focus-visible {
          outline: 3px solid #7fd3d6;
          outline-offset: -3px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
