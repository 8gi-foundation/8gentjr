'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NamingCard from '@/components/guided/NamingCard';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useGuidedDiscovery } from '@/hooks/useGuidedDiscovery';
import {
  AREA_CAP,
  FLOOR_R,
  IDENTITY,
  LAMP_KEY_STEP,
  LAMP_MAX,
  PARTIALS,
  PATTERNS,
  anchorAtStart,
  applyDrag,
  applyKeyTurn,
  camera,
  circleSamples,
  clampLampTilt,
  describeShadow,
  dot,
  fitScene,
  floorFrame,
  floorHue,
  floorPoint,
  globeHue,
  holdAmpNext,
  lampDirection,
  lampHue,
  motionAmplitudes,
  partialHz,
  patternCircles,
  patternLabel,
  readShadow,
  rotate,
  sceneRotation,
  shadowFootprint,
  shadowHue,
  shadowInk,
  shadowPolyline,
  shouldSchedule,
  turnCircle,
  v3,
  type Floor,
  type Footprint,
  type PatternId,
  type Quat,
  type TurnKey,
  type Vec3,
} from '@/lib/shadow-globe';
import {
  initialDiscoveryState,
  stepDiscovery,
  type ShadowGlobeDiscoveryId,
  type ShadowGlobeDiscoveryState,
} from '@/lib/shadow-globe-discovery';

/**
 * Shadow Globe.
 *
 * A glass ball in a dark room, with a lamp sitting on its skin and a pattern of
 * rings painted on the glass. Underneath, a wide warm floor. The light goes
 * through the glass and lands on the floor, and what it draws there is the
 * ball's shadow.
 *
 * Put a finger on the ball and roll it. The shadow does things a shadow has no
 * business doing. Roll the pattern down under the ball and its shadow gathers
 * into a neat little picture in the middle of the floor. Roll it up over the
 * top toward the lamp and the shadow swings outward and SWELLS, one ring
 * running off the edge of the floor while another shrinks to a speck, and at
 * the moment a ring passes right under the lamp its shadow straightens out into
 * a line and turns itself inside out.
 *
 * Nothing tore. Every ring is still a ring. And rolling it back brings the
 * picture back exactly, because nothing was ever lost.
 *
 * WHAT IS ACTUALLY HAPPENING
 *
 * One module, `shadow-globe.ts`, which is pure and has no idea a screen exists.
 * Stereographic projection from the lamp, the analytic image of a circle on the
 * sphere derived rather than fitted, quaternions for the roll, and a hand
 * rolled orthographic camera. No three.js.
 *
 * Every claim made to a child is measured in `shadow-globe.test.ts`: circles
 * are proved to stay circles by fitting a circle to the points the canvas
 * actually strokes and requiring the residual to be within a part in a billion
 * of the radius; the map is proved invertible to twelve places; it is proved
 * conformal by taking its derivative along two perpendicular directions; the
 * magnification is proved monotone all the way up to the lamp; and the drawn
 * shadow is proved to sit on the straight line from the lamp through the point,
 * so the rays are the projection rather than a picture of it.
 *
 * When a naming line is earned is decided by a pure reducer in
 * `shadow-globe-discovery.ts`, from the same four numbers the picture is drawn
 * from, read once by `readShadow`.
 *
 * HOW IT IS DRAWN
 *
 * One 2D canvas, hand rolled, exactly as the other science sandboxes do it. The
 * camera looks further down on a tall canvas than on a wide one, so a phone
 * held upright gets something nearer a map and a laptop gets the low roomy
 * view; both are the same scene and the same numbers.
 *
 * MOTION
 *
 * Two motions, and they are not the same kind of thing.
 *
 * The BALL is the child's hand. Where the shadow goes is a function of two
 * numbers their fingers hold and of nothing else. There is no clock anywhere in
 * `shadow-globe.ts` and nowhere for momentum to hide, so a ball let go of is a
 * ball that has stopped. It does not spin on.
 *
 * The LAMP GLOW is the clock. It breathes under a finger. That is autonomous
 * motion however it got started, so under reduced motion it is zero at every
 * moment, held or not: the lamp is drawn at one steady size. The two are
 * separated in `motionAmplitudes`, out in the pure module with a test written
 * to kill the one-character change that collapses them, because Fractal Grower
 * shipped with exactly that collapse.
 *
 * WHY THERE IS NO BUTTON THAT ROLLS THE BALL BACK
 *
 * There is one that puts the LAMP back on top, because the lamp has a home and
 * sliding it home again is fiddly. There is deliberately none for the ball.
 * Rolling it back is the fourth thing this activity is for, and a button that
 * did it would spend that sentence on a tap.
 *
 * SOUND OFF
 *
 * The activity is whole with the volume at zero, which is where it starts.
 *
 * Issue: #225 (wave 7, Shadow Globe)
 */

/** Accent for the naming card and the controls. Warm amber, well outside the ban. */
const ACCENT = '#D98A3C';

function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${h.toFixed(1)},${s}%,${l}%,${a.toFixed(3)})`;
}

/** How close a finger has to land to take hold of the lamp, in CSS pixels. */
const LAMP_GRAB_PX = 44;

/** How long the scene has to be left alone before a look at it counts. */
const SETTLE_QUIET_MS = 900;
const SETTLE_INTERVAL_MS = 1400;

/** How fast the lamp breathes, when it is allowed to breathe at all. */
const GLOW_SPEED = 1.5;

/**
 * Quality rungs. Only ever stepped DOWN, and never by anything the child did.
 *
 * None of this can touch the shadow's shape: the two parameters live in refs
 * and every ring is a pure function of them, so a downgrade gives the child
 * back the same picture drawn from fewer points.
 */
const QUALITY = [
  { maxDpr: 2, samples: 240, glow: 3 },
  { maxDpr: 1.5, samples: 160, glow: 2 },
  { maxDpr: 1, samples: 96, glow: 1 },
];
const DOWNGRADE_WINDOW = 32;
const DOWNGRADE_COST_MS = 13;

const FRAME_INTERVAL_MS = 1000 / 32;

/** How many rings get a light ray drawn from the lamp down to the floor. */
const RAY_SPOKES = 7;

type Gesture = 'none' | 'globe' | 'lamp';

export default function ShadowGlobe() {
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
  const [pattern, setPattern] = useState<PatternId>('beetle');

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
   * The two numbers the child is holding, and the pattern they picked.
   *
   * Refs, not state, and this is the load bearing decision in the file. The
   * orientation changes on every frame of a drag, and putting it through React
   * would be thirty renders a second of a component that owns a canvas. They
   * are also what the SCENE is: keeping them out of the render tree is why a
   * quality downgrade, a resize, a pattern change or a re-render cannot cost
   * the child the setup they spent a minute finding.
   */
  const params = useRef<{ orient: Quat; lampTilt: number }>({
    orient: IDENTITY,
    lampTilt: 0,
  });
  const patternRef = useRef<PatternId>(pattern);
  /**
   * Where the middle of THIS pattern's shadow sits before anything is rolled.
   *
   * Per pattern, and that is not a detail. The shift a naming line is gated on
   * is measured against it, and measuring one pattern against another's
   * starting point would hand a child their first sentence for pressing a
   * button.
   */
  const startAnchor = useRef<Floor>(anchorAtStart(pattern));
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  /** Published copy of what is on screen, for the screen reader only. */
  const [described, setDescribed] = useState('');

  /* Pointer, coalesced. Handlers only enqueue; the parameters move once per
   * frame, in the tick. A drag on a touchscreen delivers events far faster than
   * frames, and applying them in the handler would rebuild the whole shadow
   * several times over for one picture. */
  const queue = useRef<number[]>([]);
  const gesture = useRef<Gesture>('none');
  const canvasRect = useRef<DOMRect | null>(null);
  /** Where the finger was when the last segment was consumed. */
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  /** How lit the scene is under the hand. Rises under a finger, settles after. */
  const holdAmp = useRef(0);
  const holding = useRef(false);

  /** Where the lamp's breath has got to. The ONE clock-driven number in the file. */
  const glowPhase = useRef(0);

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
   * the screen-reader sentence) and 200ms (following the chord to the shadow).
   * Each returns immediately when nothing has happened.
   */
  const wake = useRef<(() => void) | null>(null);
  /** Set when a control moved and the shadow has to be worked out again. */
  const needsRebuild = useRef(true);
  /** When the child last did anything, so a settled look is really settled. */
  const lastActed = useRef(0);
  /** Set when a key or a button changed something, so the tick can report it. */
  const stepped = useRef(false);

  const footprint = useRef<Footprint>(
    shadowFootprint({ pattern: 'beetle', orient: IDENTITY, lampTilt: 0 }),
  );
  /** The one number the sound is built from. Written by the tick, read by a timer. */
  const spread = useRef(footprint.current.area);

  /**
   * Where the lamp was last painted, in CSS pixels, so a finger can take hold.
   *
   * Written by the painter and read by the pointer handler, which is the same
   * arrangement Light Bender uses for its tabs and Shape Ladder for its beads:
   * it moves with the fit and with the child's own control, and the only place
   * that knows where it ended up is the frame that drew it.
   */
  const lampHandle = useRef<{ x: number; y: number } | null>(null);
  /** The ball's centre and painted radius, so a drag can be measured in ball radii. */
  const ballOnScreen = useRef<{ x: number; y: number; r: number }>({ x: 0, y: 0, r: 1 });

  /* Guided naming */
  const discovery = useRef<ShadowGlobeDiscoveryState>(initialDiscoveryState());
  const pendingNames = useRef<ShadowGlobeDiscoveryId[]>([]);

  const guided = useGuidedDiscovery({
    activityId: 'shadow-globe',
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
   * rolls the pattern right over the top before pausing can earn three at once,
   * which is a lecture. So they queue and are handed over one at a time.
   *
   * The queue also has to compose with the hook's "hold, never burn" gate. That
   * gate DECLINES a record that arrives while a line is showing, and a declined
   * record is not marked named, so the caller is expected to try again. Handing
   * a queued id over while the card is occupied would be a silent drop, because
   * this reducer has already spent the id from its own state. So a line is only
   * handed over when the card is CLEAR, and the card retires itself after a
   * calm read when something is waiting behind it.
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

  /** The reading, taken off the footprint that was last drawn. */
  const currentReading = useCallback(
    () =>
      readShadow({
        footprint: footprint.current,
        anchorAtStart: startAnchor.current,
        orient: params.current.orient,
      }),
    [],
  );

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
      feed({ type: 'settle', ...currentReading() });
    }, SETTLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [feed, currentReading]);

  /* ── Audio ─────────────────────────────────────────────────────────────
   *
   * The shadow's spread, as a chord. One sine per entry in PARTIALS, and their
   * frequencies come from `partialHz` fed with the area of the very shadow on
   * the screen. Gathered into a neat little picture the chord is close and
   * plain; spread right across the floor it opens out and goes airy.
   *
   * It is information, not applause, and with the volume at zero the activity
   * is whole. Started on the first touch, never before, which is both good
   * manners and what browsers require.
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
    master.gain.value = (volumeRef.current / 100) * 0.3;
    master.connect(ctx.destination);

    const voices = PARTIALS.map((_, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = partialHz(i, spread.current);
      const gain = ctx.createGain();
      // The upper partials sit under the root, so the chord reads as one sound
      // rather than as four tones.
      gain.gain.value = 0.5 / (i + 1);
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
    a.master.gain.setTargetAtTime((volume / 100) * 0.3, a.ctx.currentTime, 0.08);
  }, [volume]);

  /* The chord follows the shadow. Read on its own slow timer rather than inside
   * the render loop, because an oscillator retuned thirty times a second from a
   * value measured thirty times a second is a warble, and because the audio
   * graph should not be part of the frame budget. */
  useEffect(() => {
    const id = setInterval(() => {
      const a = audio.current;
      if (!a) return;
      const t = a.ctx.currentTime;
      a.voices.forEach((voice, i) =>
        voice.osc.frequency.setTargetAtTime(partialHz(i, spread.current), t, 0.14),
      );
    }, 200);
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

      // The lamp is a bead with a place on the screen; everything else rolls
      // the ball, which is what a hand landing anywhere on a ball expects to do.
      const lamp = lampHandle.current;
      gesture.current =
        lamp && Math.hypot(lamp.x - px, lamp.y - py) < LAMP_GRAB_PX ? 'lamp' : 'globe';

      holding.current = true;
      lastPoint.current = { x: e.clientX, y: e.clientY };
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
    lastPoint.current = null;
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
   * `holding` stays true forever: the frame loop never stops and the lamp
   * breathes on with nobody touching it. So the release is also listened for
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
      const turn: Record<string, TurnKey> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      };
      let handled = true;

      if (turn[e.key]) p.orient = applyKeyTurn(p.orient, turn[e.key]);
      else if (e.key === '.') p.lampTilt = clampLampTilt(p.lampTilt + LAMP_KEY_STEP);
      else if (e.key === ',') p.lampTilt = clampLampTilt(p.lampTilt - LAMP_KEY_STEP);
      else handled = false;

      if (!handled) return;
      e.preventDefault();
      ensureAudio();
      acted();
      needsRebuild.current = true;
      // The event is fed AFTER the rebuild, in the tick, so it describes a
      // scene that exists rather than the one that is about to be replaced.
      stepped.current = true;
      dirty.current = true;
      wake.current?.();
    },
    [acted, ensureAudio],
  );

  const lampHome = useCallback(() => {
    acted();
    params.current.lampTilt = 0;
    needsRebuild.current = true;
    stepped.current = true;
    dirty.current = true;
    wake.current?.();
    // Deliberately does NOT touch the orientation, and does NOT reset the
    // naming state. The ball is rolled back by hand or not at all, and the
    // lines are once each per session however many times the lamp goes home.
  }, [acted]);

  const choosePattern = useCallback(
    (id: PatternId) => {
      acted();
      patternRef.current = id;
      startAnchor.current = anchorAtStart(id);
      setPattern(id);
      needsRebuild.current = true;
      stepped.current = true;
      dirty.current = true;
      wake.current?.();
    },
    [acted],
  );

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
      'Arrow keys roll the globe. Up and down roll the pattern over the top toward the lamp ' +
      'and back under. Left and right spin it round. The comma and full stop keys slide the ' +
      'lamp along the top of the globe.',
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
    let cx = 0;
    let cy = 0;
    let cam = camera(0.6);

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
       * to whatever is on the screen now, by `fitScene`, which lives in
       * `shadow-globe.ts` where the suite drives it at real canvas shapes and
       * asserts how much of the screen the scene comes out covering and that
       * the ball survives every crop. */
      const fit = fitScene({ cssW, cssH });
      scale = fit.scale;
      cx = fit.cx;
      cy = fit.cy;
      cam = camera(fit.pitch);

      // The child's setup is untouched by any of this. The orientation, the
      // lamp and the pattern live in refs, so a resize or a step down the
      // quality ladder gives them back the same picture at a different size.
      needsRebuild.current = true;
      dirty.current = true;
    };

    /** A point of the room, on the canvas. */
    const screen = (p: Vec3) => ({
      x: cx + dot(p, cam.right) * scale,
      y: cy - dot(p, cam.up) * scale,
      depth: dot(p, cam.toward),
    });

    /**
     * Drain the pointer queue into the parameters.
     *
     * The two controls are drained differently, and that is not an
     * inconsistency. Rolling the ball is a TRAVEL control, so every queued
     * point is a real piece of the finger's journey and collapsing them would
     * throw away a curved drag and turn it into a straight one. The lamp is an
     * ABSOLUTE control, where the last point is the whole answer because the
     * earlier ones describe places the finger has already left.
     */
    const drain = (): boolean => {
      const q = queue.current;
      if (q.length === 0) return false;
      const rect = canvasRect.current;
      if (!rect) {
        q.length = 0;
        return false;
      }

      const p = params.current;
      let moved = false;

      if (gesture.current === 'globe') {
        const ball = ballOnScreen.current;
        for (let i = 0; i < q.length; i += 2) {
          const from = lastPoint.current;
          lastPoint.current = { x: q[i], y: q[i + 1] };
          if (!from) continue;
          // Measured in ball radii, so the same swipe turns the ball by the
          // same amount on a phone and on a desk.
          const dx = (q[i] - from.x) / ball.r;
          const dy = (q[i + 1] - from.y) / ball.r;
          if (dx === 0 && dy === 0) continue;
          p.orient = applyDrag(p.orient, dx, dy);
          moved = true;
        }
      } else if (gesture.current === 'lamp') {
        const ball = ballOnScreen.current;
        const px = q[q.length - 2] - rect.left;
        const py = q[q.length - 1] - rect.top;
        lastPoint.current = { x: q[q.length - 2], y: q[q.length - 1] };
        // The lamp slides along a meridian in the plane of the screen, so how
        // far round it goes is the angle of the finger from straight up above
        // the ball's centre.
        const before = p.lampTilt;
        p.lampTilt = clampLampTilt(Math.atan2(px - ball.x, ball.y - py));
        moved = p.lampTilt !== before;
      }

      q.length = 0;
      if (moved) needsRebuild.current = true;
      return moved;
    };

    /* ── Painting ─────────────────────────────────────────────────────── */

    const paint = () => {
      const p = params.current;
      const id = patternRef.current;
      const fp = footprint.current;
      const amp = motionAmplitudes({ reduceMotion, holdAmp: holdAmp.current });

      const floorH = floorHue();
      const globeH = globeHue();
      const shadowH = shadowHue();
      const lampH = lampHue();

      const lamp = lampDirection(p.lampTilt);
      const frame = floorFrame(p.lampTilt);
      const turn = sceneRotation(p.orient, p.lampTilt);
      const rings = patternCircles(id);

      /* The room. Near black with a breath of the floor's warmth in it. */
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cssW, cssH));
      bg.addColorStop(0, hsla(floorH, calm ? 18 : 26, calm ? 7 : 8, 1));
      bg.addColorStop(1, hsla(floorH, calm ? 20 : 30, 3, 1));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);

      /* ── The floor ────────────────────────────────────────────────────
       *
       * Drawn as a polygon of its own boundary rather than as an ellipse,
       * because the floor tips with the lamp and an ellipse would only be
       * right with the lamp on top.
       */
      const floorRing = (radius: number, steps: number) => {
        const out: { x: number; y: number }[] = [];
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * Math.PI * 2;
          out.push(
            screen(floorPoint(frame, radius * Math.cos(t), radius * Math.sin(t))),
          );
        }
        return out;
      };

      const edge = floorRing(FLOOR_R, 72);
      ctx.beginPath();
      edge.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
      ctx.closePath();
      const middle = screen(floorPoint(frame, 0, 0));
      const pool = ctx.createRadialGradient(
        middle.x,
        middle.y,
        0,
        middle.x,
        middle.y,
        FLOOR_R * scale,
      );
      // A long soft falloff rather than a bright disc with an edge on it. With
      // the lamp slid round, the floor is seen at a steep angle and a crisp
      // outline there reads as a shaft of light rather than as ground; fading
      // it most of the way to the room's own black by the rim gives back the
      // sense of a lit patch of floor. Found by looking at the observed run's
      // own screenshots.
      pool.addColorStop(0, hsla(floorH, calm ? 34 : 48, calm ? 19 : 23, 1));
      pool.addColorStop(0.42, hsla(floorH, calm ? 33 : 46, calm ? 14 : 17, 1));
      pool.addColorStop(0.76, hsla(floorH, calm ? 30 : 42, calm ? 7 : 9, 1));
      pool.addColorStop(1, hsla(floorH, calm ? 26 : 36, 3, 1));
      ctx.fillStyle = pool;
      ctx.fill();

      /* The waist ring: the shadow of the ball's own equator, which lands
         exactly on the unit circle. Free, and it gives the child a mark on the
         floor to read everything else against. */
      const waist = floorRing(1, 72);
      ctx.strokeStyle = hsla(floorH, calm ? 36 : 52, 56, calm ? 0.22 : 0.3);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      waist.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
      ctx.stroke();

      /* ── The cast picture ────────────────────────────────────────────
       *
       * The projection of every ring, drawn from the points `shadowPolyline`
       * hands back rather than as an analytic circle, so what is on the screen
       * is what the suite measures. Runs are broken where a ring leaves the
       * floor, which is a real thing that happens rather than a rendering
       * compromise: a ring near the lamp genuinely goes off the edge.
       *
       * Drawn in LIGHT, with a soft wide pass under a crisp one, because the
       * rings on the glass glow and what a glowing ring casts is a bright mark
       * and not a dark one. It also has to survive being seen through the ball,
       * which at rest is where most of it is.
       */
      const ink = shadowInk(fp.area) * (calm ? 0.8 : 1) * (0.72 + 0.28 * amp.hold);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const ring of rings) {
        const run = shadowPolyline(turnCircle(ring, turn), rung.samples);
        const trace = () => {
          ctx.beginPath();
          let open = false;
          for (const point of run) {
            if (!point || Math.hypot(point.u, point.v) > FLOOR_R) {
              open = false;
              continue;
            }
            const q = screen(floorPoint(frame, point.u, point.v));
            if (!open) {
              ctx.moveTo(q.x, q.y);
              open = true;
            } else {
              ctx.lineTo(q.x, q.y);
            }
          }
          ctx.stroke();
        };
        for (let g = rung.glow; g > 0; g--) {
          ctx.strokeStyle = hsla(shadowH, calm ? 46 : 62, 60, Math.min(1, ink) * 0.11);
          ctx.lineWidth = ring.weight * (2 + g * 3.2);
          trace();
        }
        ctx.strokeStyle = hsla(shadowH, calm ? 40 : 56, calm ? 78 : 86, Math.min(1, ink));
        ctx.lineWidth = Math.max(1.3, ring.weight * 1.9);
        trace();
      }

      /* ── The light ────────────────────────────────────────────────────
       *
       * A few rays from the lamp, through a ring, down to where that piece of
       * the ring lands. They are the construction itself: the suite proves the
       * drawn shadow is on the straight line from the lamp through the point,
       * so these are not an illustration of the projection, they are it.
       */
      const lampScreen = screen(lamp);
      ctx.strokeStyle = hsla(lampH, calm ? 40 : 58, 66, calm ? 0.07 : 0.11);
      ctx.lineWidth = 1;
      ctx.beginPath();
      const spoke = rings[rings.length - 1] ?? rings[0];
      if (spoke) {
        const onGlass = circleSamples(turnCircle(spoke, p.orient), RAY_SPOKES);
        for (const point of onGlass) {
          const inScene = rotate(sceneRotation(IDENTITY, p.lampTilt), point);
          const k = 1 - inScene.z;
          if (k < 1e-6) continue;
          const landed = { u: inScene.x / k, v: inScene.y / k };
          if (Math.hypot(landed.u, landed.v) > FLOOR_R) continue;
          const end = screen(floorPoint(frame, landed.u, landed.v));
          ctx.moveTo(lampScreen.x, lampScreen.y);
          ctx.lineTo(end.x, end.y);
        }
      }
      ctx.stroke();

      /* ── The ball ─────────────────────────────────────────────────────
       *
       * Glass: a faint body, a rim, and the rings painted on it drawn in two
       * passes so the far side reads as being seen THROUGH the glass.
       */
      const ballCentre = screen(v3(0, 0, 0));
      ballOnScreen.current = { x: ballCentre.x, y: ballCentre.y, r: scale };

      const body = ctx.createRadialGradient(
        ballCentre.x - scale * 0.3,
        ballCentre.y - scale * 0.35,
        0,
        ballCentre.x,
        ballCentre.y,
        scale,
      );
      body.addColorStop(0, hsla(globeH, calm ? 26 : 36, 40, calm ? 0.2 : 0.26));
      body.addColorStop(0.7, hsla(globeH, calm ? 28 : 40, 22, calm ? 0.14 : 0.18));
      body.addColorStop(1, hsla(globeH, calm ? 30 : 44, 14, calm ? 0.24 : 0.32));
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(ballCentre.x, ballCentre.y, scale, 0, Math.PI * 2);
      ctx.fill();

      const drawRings = (front: boolean) => {
        for (const ring of rings) {
          const points = circleSamples(turnCircle(ring, p.orient), rung.samples);
          ctx.strokeStyle = front
            ? hsla(shadowH, calm ? 46 : 64, calm ? 66 : 74, calm ? 0.72 : 0.88)
            : hsla(shadowH, calm ? 30 : 42, 46, calm ? 0.16 : 0.22);
          ctx.lineWidth = front ? Math.max(1.4, ring.weight * 2.2) : 1.1;
          ctx.beginPath();
          let open = false;
          for (const point of points) {
            const q = screen(point);
            if (q.depth > 0 !== front) {
              open = false;
              continue;
            }
            if (!open) {
              ctx.moveTo(q.x, q.y);
              open = true;
            } else {
              ctx.lineTo(q.x, q.y);
            }
          }
          ctx.stroke();
        }
      };

      drawRings(false);
      drawRings(true);

      /* The rim. A ball with no rim reads as a disc. */
      ctx.strokeStyle = hsla(globeH, calm ? 40 : 56, 72, calm ? 0.36 : 0.5);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ballCentre.x, ballCentre.y, scale, 0, Math.PI * 2);
      ctx.stroke();

      /* ── The lamp ─────────────────────────────────────────────────────
       *
       * The one thing in the picture with a clock in it. `amp.glow` is zero
       * under reduced motion at every moment, held or not, so there the lamp is
       * drawn at one steady size.
       */
      lampHandle.current = { x: lampScreen.x, y: lampScreen.y };
      const breath = 1 + 0.18 * amp.glow * Math.sin(glowPhase.current);
      const halo = Math.max(10, scale * 0.34) * breath;
      const glow = ctx.createRadialGradient(
        lampScreen.x,
        lampScreen.y,
        0,
        lampScreen.x,
        lampScreen.y,
        halo,
      );
      glow.addColorStop(0, hsla(lampH, calm ? 60 : 80, 90, calm ? 0.85 : 0.98));
      glow.addColorStop(0.35, hsla(lampH, calm ? 56 : 74, 66, calm ? 0.28 : 0.4));
      glow.addColorStop(1, hsla(lampH, 60, 50, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lampScreen.x, lampScreen.y, halo, 0, Math.PI * 2);
      ctx.fill();

      /* The meridian the lamp slides along, so the child can see it can move. */
      ctx.strokeStyle = hsla(lampH, calm ? 30 : 44, 60, calm ? 0.16 : 0.24);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const q = screen(lampDirection((i / 40) * LAMP_MAX));
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();

      /* ── How far the shadow is spread ─────────────────────────────────
       *
       * One bar, and it is `footprint.area` over its cap, which is the same
       * number the chord is built from. Not a score: there is nothing to make
       * it go up, and pushing it up makes the picture fainter rather than
       * better.
       *
       * Top left, and that is deliberate. The naming card floats over the
       * bottom of the canvas, so a readout down there would be covered at the
       * exact moment a child was being told what they had just made.
       */
      const barW = 74;
      ctx.fillStyle = hsla(lampH, calm ? 26 : 38, 40, 0.2);
      ctx.fillRect(16, 16, barW, 6);
      ctx.fillStyle = hsla(lampH, calm ? 44 : 62, 70, calm ? 0.55 : 0.75);
      ctx.fillRect(16, 16, barW * Math.min(1, fp.area / AREA_CAP), 6);

      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
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
       * The lamp's breath is the one thing in this component driven by the
       * clock, so it is a reason to PAINT and not only a reason to schedule.
       * Shape Ladder shipped that the other way round in its first cut: with
       * the clock counted only in the scheduling rule, a finger held perfectly
       * still kept the loop running and painted nothing, because `dirty` goes
       * false once the hold saturates. Its reduced-motion evidence was then
       * vacuous, because the canvas was identical during a held-still touch
       * whether reduced motion was on or off.
       *
       * Under reduced motion `amp.glow` is zero by construction, so this cannot
       * smuggle clock-driven painting back in there.
       */
      const glow = motionAmplitudes({ reduceMotion, holdAmp: holdAmp.current }).glow;
      const glowing = glow > 0.002;
      if (glowing) glowPhase.current += dt * GLOW_SPEED;

      if (needsRebuild.current) {
        const p = params.current;
        footprint.current = shadowFootprint({
          pattern: patternRef.current,
          orient: p.orient,
          lampTilt: p.lampTilt,
        });
        spread.current = footprint.current.area;
        needsRebuild.current = false;
        dirty.current = true;
      }

      /* Now the shadow is current, so what the child did can be reported
       * against a picture that really exists rather than the one it replaced. */
      if (moved || stepped.current) {
        stepped.current = false;
        feed({
          type: 'handled',
          ...readShadow({
            footprint: footprint.current,
            anchorAtStart: startAnchor.current,
            orient: params.current.orient,
          }),
        });
      }

      const paintNeeded = dirty.current || moved || glowing;
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
          animating: glowing,
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
      // cannot touch the shadow's shape: see the QUALITY comment.
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
      const said = describeShadow({
        pattern: patternRef.current,
        footprint: footprint.current,
        orient: params.current.orient,
        lampTilt: params.current.lampTilt,
      });
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

  const shellCss = `hsl(${floorHue().toFixed(1)},${calm ? 18 : 26}%,4%)`;

  return (
    <div className="relative flex h-full w-full flex-col" style={{ background: shellCss }}>
      <canvas
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label="A glass ball in a dark room with a lamp on top of it and a pattern of rings painted on the glass. The light casts the pattern as a shadow on the floor below. Drag the ball to roll the pattern around, and the shadow stretches and swells. Drag the lamp to slide it along the top of the ball."
        aria-describedby="shadow-globe-keys"
        className="min-h-0 w-full flex-1"
        style={{ touchAction: 'none', cursor: 'grab', display: 'block' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onKeyDown={onKeyDown}
      />

      <span id="shadow-globe-keys" className="sr-only">
        {keyHelp}
      </span>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* Controls. Deliberately thin and dark so the room stays the subject. */}
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

          Here the scene survives a resize, because it is a pure function of two
          numbers held in refs, so this is no longer a correctness problem. It is
          still the right layout: the canvas keeps its size, so the ball does not
          jump a hundred pixels down the screen at the exact moment the child is
          being told what they made.

          The card and its wrapper are BOTH transparent to touch, and that is not
          a nicety. Out of flow the card lands over the bottom of the canvas,
          which is where the near edge of the floor is drawn. Only buttons take
          touches in here.
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

        <div className="mb-3 flex items-center gap-2">
          <span className="w-[52px] shrink-0 text-[12px] font-semibold tracking-wide text-[#E7B27C]">
            Pattern
          </span>
          <div className="flex min-w-0 flex-1 gap-2" role="group" aria-label="Pattern on the glass">
            {PATTERNS.map((id) => {
              const chosen = id === pattern;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => choosePattern(id)}
                  aria-pressed={chosen}
                  className="min-w-0 flex-1 rounded-xl border-none text-[13px] font-semibold"
                  style={{
                    minHeight: 44,
                    background: chosen ? 'rgba(217,138,60,0.26)' : 'rgba(255,255,255,0.06)',
                    color: chosen ? '#F6D3AC' : 'rgba(255,255,255,0.62)',
                    cursor: 'pointer',
                  }}
                >
                  {patternLabel(id)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <label className="flex items-center gap-3">
              <span className="w-[52px] shrink-0 text-[12px] font-semibold tracking-wide text-[#E7B27C]">
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
            onClick={lampHome}
            className="shrink-0 rounded-xl border-none px-4 text-[13px] font-semibold"
            style={{
              minHeight: 44,
              background: 'rgba(217,138,60,0.16)',
              color: '#F0C193',
              cursor: 'pointer',
            }}
          >
            Lamp on top
          </button>
        </div>

        <p className="mt-2 text-center text-[12px] text-white/45">
          Drag the ball to roll it. Drag the lamp to slide it round the top.
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
        Drawing, Shape Ladder and Light Bender.
      */}
      <style jsx>{`
        canvas:focus-visible {
          outline: 3px solid #e7b27c;
          outline-offset: -3px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
