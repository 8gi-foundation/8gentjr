'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NamingCard from '@/components/guided/NamingCard';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useGuidedDiscovery } from '@/hooks/useGuidedDiscovery';
import {
  AIM_MAX,
  AIM_MIN,
  CAUSTIC_BINS,
  LEVEL_MAX,
  LEVEL_MIN,
  PARTIALS,
  SLOT_MAX,
  TANK_H,
  TANK_W,
  TORCH_ARM,
  TORCH_PIVOT,
  WORLD,
  beamHue,
  causticBand,
  causticHue,
  clampAim,
  clampLevel,
  clampOpen,
  describeTank,
  escapedFraction,
  glassHue,
  holdAmpNext,
  motionAmplitudes,
  partialHz,
  readTrace,
  rippleAt,
  shouldSchedule,
  slotMid,
  slotTop,
  streamHue,
  streamShape,
  toneMix,
  torchHead,
  traceStream,
  traceTank,
  waterHue,
  type StreamShape,
  type StreamTrace,
  type TankTrace,
} from '@/lib/light-bender';
import {
  initialDiscoveryState,
  stepDiscovery,
  type LightBenderDiscoveryId,
  type LightBenderDiscoveryState,
} from '@/lib/light-bender-discovery';

/**
 * Light Bender.
 *
 * A glass tank in a dark room with a lamp under the water on a little arm. The
 * child points anywhere and the lamp swings to point there too, and a beam goes
 * up through the water and out into the room. Swing it over and the beam in the
 * room leans further and further away from the beam in the water. Keep going
 * and, inside about two pixels of finger travel, the beam in the room is gone:
 * the surface has become a mirror and the light is running along inside the
 * tank, bouncing between the top of the water and the floor.
 *
 * Nothing was unlocked and nothing was announced. The child moved their hand
 * and the world stopped behaving the way it had been behaving.
 *
 * Then there is a tab on the side of the tank. Pull it and a slot opens and the
 * water arcs out and falls into a basin. Swing the lamp until the beam finds
 * that slot, and the light goes with the water: down the falling arc, bouncing
 * off the inside of it, round a corner that light does not go round by itself.
 * That is John Tyndall's 1854 demonstration, and it is why a telephone call
 * crosses an ocean.
 *
 * WHAT IS ACTUALLY HAPPENING
 *
 * One module, `light-bender.ts`, which is pure and has no idea a screen exists.
 * Snell's law and the unpolarised Fresnel reflectance, evaluated rather than
 * fitted, at every interface including the ones inside the falling water, whose
 * normals are computed from the shape of the fall. The arc of the stream is the
 * Torricelli parabola with gravity cancelled out of it. Every claim made to a
 * child is measured in `light-bender.test.ts`: the critical angle is pinned,
 * the transmitted and reflected fractions are proved to sum to one across the
 * whole control space, the angle at which the tank stops letting light out is
 * found by bisecting the real trace and comes back equal to the critical angle
 * to twelve places, and the extra margin the BENDING stream needs is measured
 * rather than glossed over.
 *
 * When a naming line is earned is decided by a pure reducer in
 * `light-bender-discovery.ts`, from the same three numbers the picture is drawn
 * from, read once by `readTrace`.
 *
 * HOW IT IS DRAWN
 *
 * One 2D canvas, hand rolled, exactly as the other science sandboxes do it. The
 * scene is fitted once to the largest it can ever be, so opening the spout does
 * not make the tank jump.
 *
 * MOTION
 *
 * Two motions, and they are not the same kind of thing.
 *
 * The BEAM is the child's hand. Where the light goes is a function of three
 * numbers their fingers hold and of nothing else. There is no clock anywhere in
 * `light-bender.ts` and nowhere for momentum to hide, so a lamp let go of is a
 * lamp that has stopped.
 *
 * The SHIMMER is the clock. The surface ripples, and the caustic it throws on
 * the tank floor moves with it. That is autonomous motion however it got
 * started, so under reduced motion it is zero at every moment, held or not: the
 * surface is drawn flat and the floor is lit evenly. The two are separated in
 * `motionAmplitudes`, out in the pure module with a test written to kill the
 * one-character change that collapses them, because Fractal Grower shipped with
 * exactly that collapse.
 *
 * WHERE THE RIPPLE IS AND IS NOT
 *
 * The ripple is in the caustic and in the drawn surface line. It is NOT in the
 * beam: the beam is traced against the mean water level. That is a deliberate
 * split and not an oversight. The caustic exists BECAUSE of the ripple, and a
 * flat surface has no caustic to draw. The beam is one ray, and putting a
 * ripple a hundredth of a tank high under it would make the child's own control
 * jitter under their finger for a change in angle they cannot see. They would
 * learn that part of their hand does not work.
 *
 * SOUND OFF
 *
 * The activity is whole with the volume at zero, which is where it starts.
 *
 * Issue: #225 (wave 6, Light Bender)
 */

/** Accent for the naming card and the controls. Sea green, well outside the ban. */
const ACCENT = '#3FA98A';

function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${h.toFixed(1)},${s}%,${l}%,${a.toFixed(3)})`;
}

/* ─────────────────────────────────────────────────────────────────────────
 * The room
 * ───────────────────────────────────────────────────────────────────────── */

/** How much of the canvas width the scene is allowed, leaving a margin. */
const FIT_WIDTH = 0.94;
/**
 * How much of the canvas HEIGHT the scene is allowed.
 *
 * Under one, because a beam that leaves the water is drawn to the edge of the
 * canvas rather than to the edge of the scene, and the room above the tank is
 * where that beam lives.
 *
 * It was 0.62 and the observed pass is what corrected it. On a tall phone the
 * width is the binding constraint and the value does nothing, which is where it
 * was chosen; on a laptop, where the canvas is wider than it is tall, HEIGHT is
 * the binding constraint and 0.62 left the tank occupying a third of the
 * picture with six hundred empty pixels beside it. The sky the beam needs is
 * still here, it is just no longer most of the screen.
 */
const FIT_HEIGHT = 0.86;
/** Where down the canvas the middle of the scene sits. More sky above than below. */
const FIT_ANCHOR = 0.58;

/** How close a finger has to land to take hold of a tab, in CSS pixels. */
const TAB_GRAB_PX = 46;

/** How far the spout tab is pulled out from the wall when fully open, in tank units. */
const SPOUT_PULL = 0.3;

/** How far one key press moves a control. */
const AIM_KEY_STEP = 0.06;
const LEVEL_KEY_STEP = 0.02;
const OPEN_KEY_STEP = 0.08;

/** How long the scene has to be left alone before a look at it counts. */
const SETTLE_QUIET_MS = 900;
const SETTLE_INTERVAL_MS = 1400;

/** How fast the surface ripple walks, when it is allowed to walk at all. */
const RIPPLE_SPEED = 1.15;

/**
 * Quality rungs. Only ever stepped DOWN, and never by anything the child did.
 *
 * None of this can touch the light: the three controls live in refs and every
 * trace is a pure function of them, so a downgrade gives the child back the
 * same beam with fewer glow passes behind it.
 */
const QUALITY = [
  { maxDpr: 2, glow: 3 },
  { maxDpr: 1.5, glow: 2 },
  { maxDpr: 1, glow: 1 },
];
const DOWNGRADE_WINDOW = 32;
const DOWNGRADE_COST_MS = 13;

const FRAME_INTERVAL_MS = 1000 / 32;

type Gesture = 'none' | 'aim' | 'level' | 'spout';

interface Scene {
  tank: TankTrace;
  stream: StreamShape;
  ride: StreamTrace | null;
  caustic: number[];
}

function buildScene(
  aim: number,
  level: number,
  open: number,
  phase: number,
  shimmer: number,
): Scene {
  const tank = traceTank({ aim, level, open });
  const stream = streamShape({ level, open });
  const ride = tank.slotRay ? traceStream({ stream, entry: tank.slotRay }) : null;
  return { tank, stream, ride, caustic: causticBand({ level, phase, amplitude: shimmer }) };
}

export default function LightBender() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Sound OFF until the child asks for it.
   *
   * Every science sandbox in this repo defaults its sound off behind an
   * explicit press, and an unrequested tone the moment a finger lands is
   * aversive for exactly the children this product is for.
   */
  const [volume, setVolume] = useState(0);
  const [quality, setQuality] = useState(0);
  const [announce, setAnnounce] = useState('');

  /**
   * Calm Mode, read but not offered here. One switch a carer sets once beats
   * five that each do a little, and Light Mixer already ships the toggle
   * against the same key. It defaults to on.
   */
  const [calm] = useCalmMode();

  /**
   * Reduced motion, watched rather than read once, because a carer may turn it
   * on mid-session precisely BECAUSE the screen is doing too much.
   */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /*
   * The three numbers the child is holding.
   *
   * Refs, not state, and this is the load bearing decision in the file. They
   * change on every frame of a drag, and putting them through React would be
   * thirty renders a second of a component that owns a canvas. They are also
   * what the SCENE is: keeping them out of the render tree is why a quality
   * downgrade, a resize or a re-render cannot cost the child the setup they
   * spent a minute finding.
   */
  const params = useRef({ aim: 0, level: 0.42, open: 0 });
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  /** Published copy of what is on screen, for the screen reader only. */
  const [described, setDescribed] = useState('');

  /* Pointer, coalesced. Handlers only enqueue; the parameters move once per
   * frame, in the tick. A drag on a touchscreen delivers events far faster than
   * frames, and applying them in the handler would retrace the whole scene
   * several times over for one picture. */
  const queue = useRef<number[]>([]);
  const gesture = useRef<Gesture>('none');
  const canvasRect = useRef<DOMRect | null>(null);

  /** How lit the scene is under the hand. Rises under a finger, settles after. */
  const holdAmp = useRef(0);
  const holding = useRef(false);

  /** Where the ripple has walked to. The ONE clock-driven number in the file. */
  const ripplePhase = useRef(0);

  /** Set when something changed and the canvas owes a repaint. */
  const dirty = useRef(true);
  /**
   * Wakes the render loop.
   *
   * The loop does not run continuously. It stops itself once the scene is still
   * and there is nothing queued, and every input path calls this to start it
   * again. A frame loop that runs forever and returns early is cheap but it is
   * not nothing, and on an activity a child may leave open on a tablet for an
   * hour it should not be there.
   *
   * Scoped to the frame loop, which is what this ref wakes. It is not a claim
   * that the component is idle: three slow intervals do keep ticking for as
   * long as it is mounted, at 1400ms (looking at the scene), 600ms (publishing
   * the screen-reader sentence) and 180ms (following the sound to the light).
   * Each returns immediately when nothing has happened.
   */
  const wake = useRef<(() => void) | null>(null);
  /** Set when a control moved and the light has to be traced again. */
  const needsRebuild = useRef(true);
  /** When the child last did anything, so a settled look is really settled. */
  const lastActed = useRef(0);

  const scene = useRef<Scene>(buildScene(0, 0.42, 0, 0, 0));
  /** The one number the sound is built from. Written by the tick, read by a timer. */
  const escaped = useRef(0);

  /**
   * Where the two tabs and the lamp were last painted, in CSS pixels, so a
   * finger can take hold of them.
   *
   * Written by the painter and read by the pointer handler, which is the same
   * arrangement Shape Ladder uses for its beads: they move with the fit and the
   * controls, and the only place that knows where they ended up is the frame
   * that drew them.
   */
  const handles = useRef<{
    pivot: { x: number; y: number } | null;
    level: { x: number; y: number } | null;
    spout: { x: number; y: number } | null;
  }>({ pivot: null, level: null, spout: null });

  /* Guided naming */
  const discovery = useRef<LightBenderDiscoveryState>(initialDiscoveryState());
  const pendingNames = useRef<LightBenderDiscoveryId[]>([]);

  const guided = useGuidedDiscovery({
    activityId: 'light-bender',
    speakEnabled: volume > 0,
  });
  const recordRef = useRef(guided.record);
  recordRef.current = guided.record;
  const dismissRef = useRef(guided.dismiss);
  dismissRef.current = guided.dismiss;

  /* Audio */
  const audio = useRef<{
    ctx: AudioContext;
    master: GainNode;
    voices: { osc: OscillatorNode; gain: GainNode }[];
  } | null>(null);

  /* ── Naming pipeline ───────────────────────────────────────────────────
   *
   * The reducer can name more than one thing in a single step: a child who
   * finds the flip and then finds the stream before pausing can earn three at
   * once, which is a lecture. So they queue and are handed over one at a time.
   *
   * The queue also has to compose with the hook's "hold, never burn" gate. That
   * gate DECLINES a record that arrives while a line is showing, and a declined
   * record is not marked named, so the caller is expected to try again. Handing
   * a queued id over while the card is occupied would be a silent drop, because
   * this reducer has already spent the id from its own state. So a line is only
   * handed over when the card is CLEAR, and the card retires itself after a calm
   * read when something is waiting behind it.
   */

  const [queueTick, setQueueTick] = useState(0);

  const feed = useCallback((event: Parameters<typeof stepDiscovery>[1]) => {
    const step = stepDiscovery(discovery.current, event);
    discovery.current = step.state;
    if (step.emit.length) {
      pendingNames.current.push(...step.emit);
      setQueueTick((n) => n + 1);
    }
  }, []);

  const lineOnScreen = guided.line !== null;

  useEffect(() => {
    if (pendingNames.current.length === 0) return;

    if (lineOnScreen) {
      // Something is waiting. Retire the current line after long enough to read
      // it aloud twice over, so the queue cannot stall on a child who does not
      // press the close button. With nothing waiting, the card stays until it
      // is dismissed, exactly as in the other activities.
      const id = setTimeout(() => dismissRef.current(), 7000);
      return () => clearTimeout(id);
    }

    // Card is clear. A short gap first, so a replaced line reads as a new
    // sentence rather than as a flicker.
    const id = setTimeout(() => {
      const next = pendingNames.current.shift();
      if (next) recordRef.current(next);
    }, 450);
    return () => clearTimeout(id);
  }, [lineOnScreen, queueTick]);

  /* ── Looking at the scene ──────────────────────────────────────────────
   *
   * Once every second and a bit, and only when the child has left it alone long
   * enough that what is on the screen is what they meant. Not every frame: a
   * scene watched continuously would hand a child every sentence in the first
   * two seconds of play, which is a lecture wearing a costume.
   */
  useEffect(() => {
    const id = setInterval(() => {
      if (lastActed.current === 0) return;
      if (performance.now() - lastActed.current < SETTLE_QUIET_MS) return;
      const s = scene.current;
      feed({ type: 'settle', ...readTrace(s.tank, s.ride) });
    }, SETTLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [feed]);

  /* ── Audio ─────────────────────────────────────────────────────────────
   *
   * How much light is getting out, as a sound. One sine per partial in
   * PARTIALS, and the gains come from `toneMix` fed with `escapedFraction` of
   * the very trace on the screen. With light streaming out the tone is open and
   * bright; as the child swings past the critical angle the partials fall away
   * and what is left is a low hum with nothing above it. Trapped sounds closed.
   *
   * It is information, not applause, and with the volume at zero the activity is
   * whole. Started on the first touch, never before, which is both good manners
   * and what browsers require.
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
    // Follows the slider from the instant the graph exists. Water Sphere
    // hardcoded this to zero and the only thing that raised it was an effect
    // that had already returned early, so its entire audio channel was
    // inaudible while every code path looked right.
    master.gain.value = (volumeRef.current / 100) * 0.34;
    master.connect(ctx.destination);

    const mix = toneMix(escaped.current);
    const voices = PARTIALS.map((_, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = partialHz(i);
      const gain = ctx.createGain();
      gain.gain.value = mix[i];
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      return { osc, gain };
    });

    audio.current = { ctx, master, voices };
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

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.master.gain.setTargetAtTime((volume / 100) * 0.34, a.ctx.currentTime, 0.08);
  }, [volume]);

  /* Sound follows the light. Read on its own slow timer rather than inside the
   * render loop, because a gain node set thirty times a second from a value
   * measured thirty times a second is a zipper noise, and because the audio
   * graph should not be part of the frame budget. */
  useEffect(() => {
    const id = setInterval(() => {
      const a = audio.current;
      if (!a) return;
      const mix = toneMix(escaped.current);
      const t = a.ctx.currentTime;
      a.voices.forEach((v, i) => v.gain.gain.setTargetAtTime(mix[i], t, 0.12));
    }, 180);
    return () => clearInterval(id);
  }, []);

  /* ── Input ─────────────────────────────────────────────────────────────── */

  /** Any real input from the child. This is the gate on every naming line. */
  const acted = useCallback(() => {
    lastActed.current = performance.now();
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      ensureAudio();
      acted();
      // Focus explicitly. A canvas with touch-action none that captures the
      // pointer does not reliably take focus from a tap, and a child who taps
      // first and then reaches for the keyboard is exactly who that fails for.
      canvasRef.current?.focus({ preventScroll: true });

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      canvasRect.current = rect;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      // The thing under the finger is the thing you get. The two tabs are
      // objects with a place on the screen; everything else points the lamp,
      // which is what a hand landing anywhere in a dark room expects to do with
      // a torch.
      let best: Gesture = 'aim';
      let bestDistance = TAB_GRAB_PX;
      const h = handles.current;
      if (h.level) {
        const d = Math.hypot(h.level.x - px, h.level.y - py);
        if (d < bestDistance) {
          bestDistance = d;
          best = 'level';
        }
      }
      if (h.spout) {
        const d = Math.hypot(h.spout.x - px, h.spout.y - py);
        if (d < bestDistance) {
          bestDistance = d;
          best = 'spout';
        }
      }
      gesture.current = best;

      holding.current = true;
      queue.current.push(e.clientX, e.clientY);
      dirty.current = true;
      wake.current?.();

      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is an optimisation, not a requirement */
      }
    },
    [acted, ensureAudio],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (gesture.current === 'none') return;
      acted();
      queue.current.push(e.clientX, e.clientY);
      wake.current?.();
    },
    [acted],
  );

  const endGesture = useCallback(() => {
    if (gesture.current === 'none') return;
    gesture.current = 'none';
    holding.current = false;
    dirty.current = true;
    wake.current?.();
  }, []);

  /*
   * The gesture ends on the window, not only on the canvas.
   *
   * setPointerCapture is wrapped in a try above and treated as an optimisation,
   * which means the code has already admitted it may do nothing. If it does
   * nothing, a finger that slides off the canvas mid-drag delivers its pointerup
   * to whatever is under it instead, the canvas never hears the release, and
   * `holding` stays true forever: the frame loop never stops, and the surface
   * shimmers on with nobody touching it. So the release is also listened for
   * where it cannot be missed. endGesture returns immediately when there is no
   * gesture, so the ordinary path costs a comparison. lostpointercapture is in
   * here for the other half of the same failure: capture taken and then taken
   * away, which delivers no pointerup at all.
   */
  useEffect(() => {
    const end = () => endGesture();
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('lostpointercapture', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('lostpointercapture', end);
    };
  }, [endGesture]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const p = params.current;
      const before = { ...p };
      let handled = true;

      if (e.key === 'ArrowRight') p.aim = clampAim(p.aim + AIM_KEY_STEP);
      else if (e.key === 'ArrowLeft') p.aim = clampAim(p.aim - AIM_KEY_STEP);
      else if (e.key === 'ArrowUp') p.level = clampLevel(p.level + LEVEL_KEY_STEP);
      else if (e.key === 'ArrowDown') p.level = clampLevel(p.level - LEVEL_KEY_STEP);
      else if (e.key === '.') p.open = clampOpen(p.open + OPEN_KEY_STEP);
      else if (e.key === ',') p.open = clampOpen(p.open - OPEN_KEY_STEP);
      else handled = false;

      if (!handled) return;
      e.preventDefault();
      ensureAudio();
      acted();
      if (p.aim !== before.aim || p.level !== before.level || p.open !== before.open) {
        needsRebuild.current = true;
        // The event is fed AFTER the rebuild, in the tick, so it describes a
        // scene that exists rather than the one that is about to be replaced.
        keyMoved.current = true;
      }
      dirty.current = true;
      wake.current?.();
    },
    [acted, ensureAudio],
  );

  /** Set when a key changed a control, so the tick can report it once traced. */
  const keyMoved = useRef(false);

  const startOver = useCallback(() => {
    acted();
    params.current = { aim: 0, level: 0.42, open: 0 };
    needsRebuild.current = true;
    dirty.current = true;
    wake.current?.();
    // Deliberately does NOT reset the naming state. Those lines are once each
    // per session however many times the child starts again, because repeating
    // them would turn a calm sentence into a nag.
  }, [acted]);

  /* ── Live region ───────────────────────────────────────────────────────
   *
   * The picture tells a sighted child what is on the screen. This says the same,
   * once per change, for a child using a screen reader. Not chatty: it is
   * published from a slow timer, and only when the sentence it would say has
   * actually changed.
   */
  const lastSpoken = useRef('');
  useEffect(() => {
    if (described === lastSpoken.current) return;
    const id = setTimeout(() => {
      lastSpoken.current = described;
      setAnnounce(described);
    }, 700);
    return () => clearTimeout(id);
  }, [described]);

  const keyHelp = useMemo(
    () =>
      'Left and right arrows swing the torch. Up and down arrows raise and lower the water. ' +
      'The comma and full stop keys close and open the spout in the side of the tank.',
    [],
  );

  /* ── The canvas ────────────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const rung = QUALITY[quality];

    let cssW = 0;
    let cssH = 0;
    let scale = 1;
    let padX = 0;
    let padY = 0;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      canvasRect.current = rect;
      if (rect.width < 2 || rect.height < 2) return;
      // Setting canvas.width reallocates the backing store and can itself nudge
      // layout, so a resize observer that rebuilt unconditionally would be free
      // to feed itself. Nothing here runs unless the size really moved.
      if (
        Math.round(rect.width) === Math.round(cssW) &&
        Math.round(rect.height) === Math.round(cssH)
      ) {
        return;
      }
      cssW = rect.width;
      cssH = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, rung.maxDpr);
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Fitted to the LARGEST the scene can ever be, once per size, rather than
       * to whatever is on the screen now. A fit that followed the scene would
       * shrink the tank the moment the spout opened, so pulling the tab would
       * look like the tank moving away rather than like water coming out. See
       * WORLD in `light-bender.ts`, which the suite proves bounds every
       * reachable state. */
      const worldW = WORLD.x1 - WORLD.x0;
      const worldH = WORLD.y1 - WORLD.y0;
      scale = Math.min((cssW * FIT_WIDTH) / worldW, (cssH * FIT_HEIGHT) / worldH);
      padX = (cssW - worldW * scale) / 2;
      padY = Math.max(6, cssH * FIT_ANCHOR - (worldH * scale) / 2);

      // The light is untouched by any of this. Its three parameters live in
      // refs, so a resize or a step down the quality ladder gives the child
      // back the same beam at a different size.
      needsRebuild.current = true;
      dirty.current = true;
    };

    const sx = (x: number) => padX + (x - WORLD.x0) * scale;
    const sy = (y: number) => padY + (WORLD.y1 - y) * scale;
    const worldXOf = (px: number) => (px - padX) / scale + WORLD.x0;
    const worldYOf = (py: number) => WORLD.y1 - (py - padY) / scale;

    /**
     * Drain the pointer queue into the parameters.
     *
     * One mutation per frame. All three controls are ABSOLUTE: the lamp points
     * where the finger is, the water line sits where the finger is, the tab is
     * pulled as far as the finger has pulled it. For an absolute control the
     * last queued point is the whole answer, because the earlier ones describe
     * positions the finger has already left. Nothing is thrown away by
     * collapsing them, which is not true of a control driven by travel.
     */
    const drain = (): boolean => {
      const q = queue.current;
      if (q.length === 0) return false;
      const clientX = q[q.length - 2];
      const clientY = q[q.length - 1];
      q.length = 0;

      const rect = canvasRect.current;
      if (!rect) return false;
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      const p = params.current;
      const before = { ...p };

      if (gesture.current === 'aim') {
        const pivotX = sx(TORCH_PIVOT.x);
        const pivotY = sy(TORCH_PIVOT.y);
        // The angle from straight up, so the lamp points AT the finger. An
        // absolute rule rather than a travel rule, because a travel rule has to
        // be tuned per screen size and then feels different on a phone and on a
        // desk. This one is the same gesture at every size.
        p.aim = clampAim(Math.atan2(px - pivotX, pivotY - py));
      } else if (gesture.current === 'level') {
        p.level = clampLevel(worldYOf(py));
      } else if (gesture.current === 'spout') {
        p.open = clampOpen((worldXOf(px) - TANK_W) / SPOUT_PULL);
      }

      if (p.aim === before.aim && p.level === before.level && p.open === before.open) return false;
      needsRebuild.current = true;
      return true;
    };

    /* ── Painting ─────────────────────────────────────────────────────── */

    const paint = () => {
      const p = params.current;
      const s = scene.current;
      const amp = motionAmplitudes({ reduceMotion, holdAmp: holdAmp.current });
      const water = waterHue();
      const glass = glassHue();
      const beam = beamHue();
      const stream = streamHue();
      const caustic = causticHue();

      const lift = calm ? 0.72 : 1;

      /* The room. Near black with a breath of the water in it. */
      const bg = ctx.createRadialGradient(
        cssW / 2,
        sy(TANK_H) ,
        0,
        cssW / 2,
        sy(TANK_H),
        Math.max(cssW, cssH),
      );
      bg.addColorStop(0, hsla(water, calm ? 20 : 28, calm ? 8 : 9, 1));
      bg.addColorStop(1, hsla(water, calm ? 22 : 32, 3, 1));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);

      /* The basin the stream falls into, so the water has somewhere to go. */
      const basinTop = sy(WORLD.y0 + 0.06);
      ctx.fillStyle = hsla(water, calm ? 24 : 34, 10, 0.55);
      ctx.fillRect(sx(TANK_W * 0.45), basinTop, cssW - sx(TANK_W * 0.45), cssH - basinTop);
      ctx.strokeStyle = hsla(water, calm ? 30 : 44, 44, calm ? 0.2 : 0.3);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx(TANK_W * 0.45), basinTop);
      ctx.lineTo(cssW, basinTop);
      ctx.stroke();

      /* ── The tank ─────────────────────────────────────────────────── */

      const left = sx(0);
      const right = sx(TANK_W);
      const floor = sy(0);
      const top = sy(TANK_H);
      const surface = sy(p.level);
      const slot = slotTop(p.open);

      /* The water body. */
      const body = ctx.createLinearGradient(0, surface, 0, floor);
      body.addColorStop(0, hsla(water, calm ? 34 : 48, 34, calm ? 0.24 : 0.32));
      body.addColorStop(1, hsla(water, calm ? 36 : 52, 20, calm ? 0.34 : 0.46));
      ctx.fillStyle = body;
      ctx.fillRect(left, surface, right - left, floor - surface);

      /* The caustic. Ray density on the floor, from `causticBand`, which sends
         room light down through the real surface with Snell's law. Flat and
         even under reduced motion, because the amplitude is zero there. */
      const binW = (right - left) / CAUSTIC_BINS;
      const causticH = Math.min((floor - surface) * 0.72, 0.13 * scale);
      // ONE continuous shape whose top edge follows the ray density, rather than
      // eighty-four separate rectangles. The rectangles were the first cut and
      // the observed pass showed what they look like: hard vertical edges every
      // few pixels, which reads as wallpaper rather than as light pooling. The
      // three-tap average is a smoothing of the DRAWING and not of the physics;
      // `causticBand` is untouched and is what the suite measures.
      const smooth = (i: number) =>
        (s.caustic[Math.max(0, i - 1)] + s.caustic[i] + s.caustic[Math.min(CAUSTIC_BINS - 1, i + 1)]) /
        3;
      const pool = ctx.createLinearGradient(0, floor, 0, floor - causticH);
      pool.addColorStop(0, hsla(caustic, calm ? 42 : 60, 74, calm ? 0.26 : 0.38));
      pool.addColorStop(1, hsla(caustic, calm ? 42 : 60, 74, 0));
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.moveTo(left, floor);
      for (let i = 0; i < CAUSTIC_BINS; i++) {
        ctx.lineTo(left + (i + 0.5) * binW, floor - causticH * Math.min(1, smooth(i) / 2.2));
      }
      ctx.lineTo(right, floor);
      ctx.closePath();
      ctx.fill();

      /* The surface. Rippled when motion is allowed, flat when it is not, and
         the amplitude comes from the same split the caustic was built with. */
      ctx.strokeStyle = hsla(water, calm ? 44 : 62, 76, calm ? 0.5 : 0.68);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const x = (TANK_W * i) / 120;
        const y = p.level + rippleAt(x, ripplePhase.current, amp.shimmer).height;
        if (i === 0) ctx.moveTo(sx(x), sy(y));
        else ctx.lineTo(sx(x), sy(y));
      }
      ctx.stroke();

      /* ── The light ────────────────────────────────────────────────── */

      const drawRay = (
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        intensity: number,
        hue: number,
      ) => {
        const a = Math.min(1, intensity) * (calm ? 0.62 : 0.9) * (0.72 + 0.28 * amp.hold);
        if (a < 0.004) return;
        for (let g = rung.glow; g > 0; g--) {
          ctx.strokeStyle = hsla(hue, calm ? 52 : 74, 62, a * 0.1);
          ctx.lineWidth = (calm ? 2 : 2.6) * (1 + g * 2.1);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
        ctx.strokeStyle = hsla(hue, calm ? 42 : 62, 88, a);
        ctx.lineWidth = calm ? 1.7 : 2.1;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      };

      /* The rays that got out, drawn to the edge of the CANVAS rather than to
         the edge of the scene. That is the point of the room above the tank:
         the beam leaving the water is the thing the child is steering, and it
         should sweep the whole dark space as they swing. */
      const reach = Math.hypot(cssW, cssH) * 1.2;
      for (const e of s.tank.escapes) {
        drawRay(
          sx(e.x),
          sy(e.y),
          sx(e.x) + e.dx * reach,
          sy(e.y) - e.dy * reach,
          e.intensity,
          beam,
        );
      }

      /* The beam inside the water. */
      for (const seg of s.tank.segments) {
        drawRay(sx(seg.x0), sy(seg.y0), sx(seg.x1), sy(seg.y1), seg.intensity, beam);
      }

      /* ── The stream ───────────────────────────────────────────────── */

      if (s.stream.points.length > 1) {
        const pts = s.stream.points;
        const edge = (i: number, sign: number) => {
          const a = pts[Math.max(0, i - 1)];
          const b = pts[Math.min(pts.length - 1, i + 1)];
          const tx = b.x - a.x;
          const ty = b.y - a.y;
          const len = Math.hypot(tx, ty) || 1;
          return {
            x: pts[i].x + (-ty / len) * pts[i].w * sign,
            y: pts[i].y + (tx / len) * pts[i].w * sign,
          };
        };
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const q = edge(i, 1);
          if (i === 0) ctx.moveTo(sx(q.x), sy(q.y));
          else ctx.lineTo(sx(q.x), sy(q.y));
        }
        for (let i = pts.length - 1; i >= 0; i--) {
          const q = edge(i, -1);
          ctx.lineTo(sx(q.x), sy(q.y));
        }
        ctx.closePath();
        const fall = ctx.createLinearGradient(sx(TANK_W), 0, sx(pts[pts.length - 1].x), 0);
        fall.addColorStop(0, hsla(stream, calm ? 40 : 56, 46, calm ? 0.4 : 0.52));
        fall.addColorStop(1, hsla(stream, calm ? 40 : 56, 34, calm ? 0.26 : 0.36));
        ctx.fillStyle = fall;
        ctx.fill();
        ctx.strokeStyle = hsla(stream, calm ? 44 : 62, 74, calm ? 0.32 : 0.46);
        ctx.lineWidth = 1;
        ctx.stroke();

        /* And the light riding it. */
        if (s.ride) {
          for (const seg of s.ride.segments) {
            drawRay(sx(seg.x0), sy(seg.y0), sx(seg.x1), sy(seg.y1), seg.intensity, beam);
          }
          for (const leak of s.ride.leaks) {
            const run = 0.16 * scale;
            drawRay(
              sx(leak.x),
              sy(leak.y),
              sx(leak.x) + leak.dx * run,
              sy(leak.y) - leak.dy * run,
              leak.intensity * 0.7,
              beam,
            );
          }
        }
      }

      /* ── The glass, drawn over the water so it reads as a container ─── */

      // The right wall stops at the top of the slot, because below that there is
      // a hole. It used to be drawn all the way down, so an open spout had a
      // pane of glass across it and the water appeared to come through the
      // glass. Found by looking at the observed run's own screenshots.
      ctx.strokeStyle = hsla(glass, calm ? 26 : 38, 62, calm ? 0.34 : 0.46);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, floor);
      ctx.lineTo(right, floor);
      ctx.moveTo(right, top);
      ctx.lineTo(right, sy(slot));
      ctx.stroke();

      // The slot itself, so a shut spout still shows where the spout is.
      ctx.strokeStyle = hsla(stream, calm ? 40 : 58, 66, calm ? 0.3 : 0.44);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(right, sy(0));
      ctx.lineTo(right, sy(Math.max(slot, SLOT_MAX * 0.18)));
      ctx.stroke();

      /* ── The lamp ─────────────────────────────────────────────────── */

      const pivot = { x: sx(TORCH_PIVOT.x), y: sy(TORCH_PIVOT.y) };
      handles.current.pivot = pivot;

      // The track it swings on, so the child can see where it can go.
      ctx.strokeStyle = hsla(beam, calm ? 26 : 38, 52, calm ? 0.14 : 0.22);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(
        pivot.x,
        pivot.y,
        TORCH_ARM * scale,
        -Math.PI / 2 - (Math.PI / 2 - AIM_MIN),
        -Math.PI / 2 + AIM_MAX,
      );
      ctx.stroke();

      const head = torchHead(p.aim);
      const hx = sx(head.x);
      const hy = sy(head.y);
      ctx.strokeStyle = hsla(beam, calm ? 24 : 34, 58, calm ? 0.42 : 0.56);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pivot.x, pivot.y);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.lineCap = 'butt';

      const lamp = ctx.createRadialGradient(hx, hy, 0, hx, hy, 22);
      lamp.addColorStop(0, hsla(beam, calm ? 46 : 66, 88, calm ? 0.8 : 0.95));
      lamp.addColorStop(0.4, hsla(beam, calm ? 44 : 62, 62, calm ? 0.24 : 0.34));
      lamp.addColorStop(1, hsla(beam, 50, 50, 0));
      ctx.fillStyle = lamp;
      ctx.beginPath();
      ctx.arc(hx, hy, 22, 0, Math.PI * 2);
      ctx.fill();

      /* ── The two tabs ─────────────────────────────────────────────── */

      const levelTab = { x: sx(-0.055), y: surface };
      handles.current.level = levelTab;
      ctx.fillStyle = hsla(water, calm ? 40 : 56, 62, calm ? 0.5 : 0.68);
      ctx.beginPath();
      ctx.roundRect(levelTab.x - 11, levelTab.y - 6, 22, 12, 5);
      ctx.fill();

      const spoutTab = { x: sx(TANK_W + p.open * SPOUT_PULL + 0.045), y: sy(slotMid(p.open)) };
      handles.current.spout = spoutTab;
      ctx.strokeStyle = hsla(stream, calm ? 32 : 46, 52, calm ? 0.28 : 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(right, spoutTab.y);
      ctx.lineTo(spoutTab.x, spoutTab.y);
      ctx.stroke();
      ctx.fillStyle = hsla(stream, calm ? 42 : 60, 64, calm ? 0.52 : 0.72);
      ctx.beginPath();
      ctx.roundRect(spoutTab.x - 7, spoutTab.y - 11, 14, 22, 5);
      ctx.fill();

      /* ── How much is getting out ──────────────────────────────────
       *
       * One bar, split. The lit part is the fraction of the torch that left the
       * water and the dark part is what stayed in, and it is `escapedFraction`
       * of the trace being drawn, which is the same number the sound is built
       * from. Not a score: there is nothing to make it go up.
       *
       * Top left, and that is deliberate. The naming card floats over the
       * bottom of the canvas, so a readout down there would be covered at the
       * exact moment a child was being told what they had just made.
       */
      const out = escapedFraction(s.tank);
      const barW = 74;
      ctx.fillStyle = hsla(beam, calm ? 30 : 44, 40, 0.22);
      ctx.fillRect(16, 16, barW, 6);
      ctx.fillStyle = hsla(beam, calm ? 44 : 62, 70, calm ? 0.6 : 0.8);
      ctx.fillRect(16, 16, barW * out, 6);
    };

    /* ── The loop ─────────────────────────────────────────────────────── */

    let mounted = true;
    let raf = 0;
    let last = 0;
    let lastFrameTime = 0;

    /* Adaptive quality. Measured, not guessed, and it only ever steps down. */
    let costSum = 0;
    let costCount = 0;
    let downgraded = false;

    const schedule = () => {
      if (raf === 0 && mounted) raf = requestAnimationFrame(tick);
    };
    wake.current = () => {
      dirty.current = true;
      schedule();
    };

    const tick = (nowMs: number) => {
      raf = 0;
      if (!mounted) return;
      if (nowMs - last < FRAME_INTERVAL_MS) {
        schedule();
        return;
      }
      const dt = lastFrameTime === 0 ? 0 : Math.min(0.2, (nowMs - lastFrameTime) / 1000);
      last = nowMs;
      lastFrameTime = nowMs;

      const moved = drain();

      const beforeHold = holdAmp.current;
      holdAmp.current = holdAmpNext({
        reduceMotion,
        holding: holding.current,
        amp: holdAmp.current,
        dt,
      });
      if (holdAmp.current !== beforeHold) dirty.current = true;

      /*
       * The shimmer is the one thing in this component driven by the clock, so
       * it is a reason to PAINT and not only a reason to schedule. Shape Ladder
       * shipped that the other way round in its first cut: with the clock
       * counted only in the scheduling rule, a finger held perfectly still kept
       * the loop running and painted nothing, because `dirty` goes false once
       * the hold saturates. Its reduced-motion evidence was then vacuous,
       * because the canvas was identical during a held-still touch whether
       * reduced motion was on or off.
       *
       * Under reduced motion `amp.shimmer` is zero by construction, so this
       * cannot smuggle clock-driven painting back in there.
       */
      const shimmer = motionAmplitudes({ reduceMotion, holdAmp: holdAmp.current }).shimmer;
      const shimmering = shimmer > 0.002;
      if (shimmering) {
        ripplePhase.current += dt * RIPPLE_SPEED;
        needsRebuild.current = true;
      }

      if (needsRebuild.current) {
        const p = params.current;
        scene.current = buildScene(p.aim, p.level, p.open, ripplePhase.current, shimmer);
        escaped.current = escapedFraction(scene.current.tank);
        needsRebuild.current = false;
        dirty.current = true;
      }

      /* Now the scene is current, so what the child did can be reported against
       * a picture that really exists rather than the one it replaced. */
      if (moved || keyMoved.current) {
        keyMoved.current = false;
        const s = scene.current;
        feed({ type: 'handled', ...readTrace(s.tank, s.ride) });
      }

      const paintNeeded = dirty.current || moved || shimmering;
      /*
       * Whether the loop runs again, and whether it runs at all.
       *
       * Both rules live in `shouldSchedule`, out in the pure module with tests
       * that kill the reverts: a canvas with no size gets no frame however busy
       * everything else is, and a still, unhandled scene gets none either, so a
       * tablet left open on this activity has no rAF callback at all.
       *
       * WHAT THE SIZE GUARD IS EXACT ABOUT. cssW and cssH are only ever set by
       * build(), and build() returns BEFORE setting either when the element
       * measures under two pixels on a side. For a canvas that has never had a
       * size the guard is therefore exact. For a canvas that HAD a size and
       * then collapsed, these two hold the LAST REAL measurement rather than
       * the current one, so the loop can still schedule for the frames between
       * the collapse and build() next running against a real size. That window
       * is why the pair is passed rather than the width alone: a collapsing
       * subtree usually loses its height while keeping its width.
       *
       * IT IS ALSO NOT THE ONLY GATE. The frame limiter above reschedules and
       * returns before ever reaching here, so a frame arriving inside
       * FRAME_INTERVAL_MS asks for one more rAF without consulting this rule.
       * That costs at most one extra callback per stop, and a reader counting
       * callbacks should expect the trailing one.
       */
      if (
        !shouldSchedule({
          cssW,
          cssH,
          dirty: paintNeeded,
          holding: holding.current,
          queued: queue.current.length > 0,
          animating: shimmering,
        })
      ) {
        return;
      }
      schedule();
      if (!paintNeeded) return;
      dirty.current = false;

      const t0 = performance.now();
      paint();
      costSum += performance.now() - t0;
      costCount++;

      // Degrade rather than jank. Measured over a second of painted frames, and
      // only ever downward, so this can never oscillate between two levels. It
      // cannot touch the light: see the QUALITY comment.
      if (costCount >= DOWNGRADE_WINDOW) {
        const meanCost = costSum / costCount;
        costSum = 0;
        costCount = 0;
        if (!downgraded && meanCost > DOWNGRADE_COST_MS && quality < QUALITY.length - 1) {
          downgraded = true;
          setQuality((prev) => Math.min(QUALITY.length - 1, prev + 1));
        }
      }
    };

    /* Published for the screen reader on a slow timer rather than from the
     * frame, because the sentence changes far less often than the picture. */
    const publish = setInterval(() => {
      // Nothing has happened yet, so there is nothing to say and no reason to
      // touch React at all. Same gate the settle timer uses.
      if (lastActed.current === 0) return;
      const s = scene.current;
      const said = describeTank(s.tank, s.ride);
      setDescribed((prev) => (prev === said ? prev : said));
    }, 600);

    build();

    const ro = new ResizeObserver(() => {
      build();
      schedule();
    });
    ro.observe(canvas);

    schedule();

    return () => {
      mounted = false;
      wake.current = null;
      cancelAnimationFrame(raf);
      raf = 0;
      clearInterval(publish);
      ro.disconnect();
    };
  }, [quality, calm, reduceMotion, feed]);

  /* ── UI ────────────────────────────────────────────────────────────────── */

  const shellCss = `hsl(${waterHue().toFixed(1)},${calm ? 20 : 28}%,4%)`;

  return (
    <div className="relative flex h-full w-full flex-col" style={{ background: shellCss }}>
      <canvas
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label="A glass tank of water in a dark room, with a small torch under the water on a swinging arm. Drag anywhere to point the torch. The beam bends as it leaves the water, and past a certain angle it stops leaving at all and bounces along inside. Drag the tab on the left to change how deep the water is, and the tab on the right to open a spout and let the water arc out."
        aria-describedby="light-bender-keys"
        className="min-h-0 w-full flex-1"
        style={{ touchAction: 'none', cursor: 'crosshair', display: 'block' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onKeyDown={onKeyDown}
      />

      <span id="light-bender-keys" className="sr-only">
        {keyHelp}
      </span>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* Controls. Deliberately thin and dark so the tank stays the subject. */}
      <div
        className="relative shrink-0 px-4 pb-4 pt-3"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))' }}
      >
        {/*
          The card floats above the controls rather than sitting in the column.

          In flow it is a real box eighty pixels tall, and the canvas is the flex
          child that gives those pixels up. Pattern Garden learned what that
          costs the hard way: a resize there rebuilt the simulation grid and the
          child's garden was wiped underneath the sentence congratulating them on
          growing it.

          Here the scene survives a resize, because it is a pure function of
          three numbers held in refs, so this is no longer a correctness problem.
          It is still the right layout: the canvas keeps its size, so the tank
          does not jump a hundred pixels down the screen at the exact moment the
          child is being told what they made.

          The card and its wrapper are BOTH transparent to touch, and that is not
          a nicety. Out of flow the card lands over the bottom of the canvas,
          which is where the basin and the end of the stream are drawn. Only
          buttons take touches in here.
        */}
        <div className="pointer-events-none absolute inset-x-4 bottom-full [&_button]:pointer-events-auto">
          <NamingCard
            line={guided.line}
            onDismiss={guided.dismiss}
            accent={ACCENT}
            tone="dark"
            className="mb-3"
          />
        </div>

        <div className="flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <label className="flex items-center gap-3">
              <span className="w-[52px] shrink-0 text-[12px] font-semibold tracking-wide text-[#7FD3B8]">
                Sound
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => {
                  // A child may reach for sound before touching the canvas, and
                  // this is the gesture that permits audio, so it has to be able
                  // to build the graph on its own.
                  ensureAudio();
                  setVolume(Number(e.target.value));
                }}
                aria-label="Sound volume. Starts off. The activity is complete with the sound off."
                className="h-11 min-w-0 flex-1 cursor-pointer bg-transparent"
                style={{ accentColor: ACCENT }}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={startOver}
            className="shrink-0 rounded-xl border-none px-4 text-[13px] font-semibold"
            style={{
              minHeight: 44,
              background: 'rgba(63,169,138,0.16)',
              color: '#9FE3C8',
              cursor: 'pointer',
            }}
          >
            Straight up again
          </button>
        </div>

        <p className="mt-2 text-center text-[12px] text-white/45">
          Touch the dark to point the torch. Pull the tab on the right to open the spout.
        </p>
      </div>

      {/*
        Keyboard focus, drawn inside the box.

        A global :focus-visible rule paints a 3px orange outline on whatever has
        focus, and on a canvas that fills the screen that outline lands on the
        viewport edges, so all a keyboard user actually sees is one orange line
        under the header. A negative offset pulls the ring inside the element so
        all four edges are on screen, and styled-jsx scopes it tightly enough to
        win. Same fix as Water Sphere, Pattern Garden, Fractal Grower, Sound
        Drawing and Shape Ladder.
      */}
      <style jsx>{`
        canvas:focus-visible {
          outline: 3px solid #7fd3b8;
          outline-offset: -3px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
