'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NamingCard from '@/components/guided/NamingCard';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useGuidedDiscovery } from '@/hooks/useGuidedDiscovery';
import {
  CUBE_CLIMB,
  DEFAULT_TURN,
  FIT_RADIUS,
  FULL_CLIMB,
  HARMONIC_MULTIPLES,
  SHADOW_RING,
  angleDelta,
  axisHue,
  buildFigure,
  clampClimb,
  clampToRung,
  climbAfterTravel,
  describeLadder,
  dialAngleAt,
  handleHue,
  harmonicHz,
  harmonicLevels,
  holdAmpNext,
  motionAmplitudes,
  projectVertex,
  shadowBeadDirection,
  shadowHandleShown,
  shadowHue,
  shadowTurnBy,
  shouldSchedule,
  sweepGlow,
  SHADOW_KEY_STEP,
  sweepHandleFor,
  turnAfterDrag,
  viewFor,
  type Figure,
  type Turn,
} from '@/lib/dimensions';
import {
  initialDiscoveryState,
  stepDiscovery,
  type DimensionsDiscoveryId,
  type DimensionsDiscoveryState,
} from '@/lib/dimensions-discovery';

/**
 * Shape Ladder.
 *
 * A single point of light in a dark room, and a bead floating just beside it.
 * Pull the bead and the point sweeps out into a line, the light trailing behind
 * it as it goes. A new bead appears at right angles. Pull that one and the line
 * sweeps into a square. Then a cube. Then, once, one more time.
 *
 * The child is never told what a dimension is. They are given a bead and after
 * a while they find that the answer to every bead is the same drag, and that
 * each drag leaves one more direction behind it. The last bead is drawn off to
 * one side on a lead, because by then the screen has run out of directions to
 * draw it in, and what happens when it is pulled is that the shape acquires a
 * shadow with another shape nested inside it.
 *
 * There is nothing to reach, nothing to lose, no wrong shape and no question
 * anywhere in it. Four sentences arrive, once each, after the child has already
 * made the thing each one describes.
 *
 * WHAT IS ACTUALLY HAPPENING
 *
 * One loop, in `dimensions.ts`, which is pure and has no idea a screen exists.
 * Every claim this activity makes to a child is measured in its suite: the
 * corner and edge counts are checked against the closed forms rather than a
 * table, each rung is PROVED to contain two exact copies of the rung below it
 * joined corner to corner, turning is proved to preserve every length in four
 * dimensions before anything is projected, and both perspective divides are
 * swept across the whole control space and proved never to approach zero. When
 * a naming line is earned is decided by a pure reducer in
 * `dimensions-discovery.ts`.
 *
 * HOW IT IS DRAWN
 *
 * One 2D canvas, hand rolled, no 3D dependency, exactly as the other science
 * sandboxes do it. Two perspective divides in a row: how near each corner is
 * along the fourth axis, then how near the result is along z. The same rule
 * twice, which is the same joke the whole activity is built on.
 *
 * MOTION
 *
 * Two motions, and they are not the same kind of thing.
 *
 * The SHAPE is the child's hand. Where it stands, how far it is swept and which
 * way it faces are functions of what their finger has done and of nothing else.
 * There is no clock anywhere in `dimensions.ts` and nowhere for momentum to
 * hide, so an object let go of is an object that has stopped.
 *
 * The GLINT is the clock. A spark travels along the edges while the object is
 * being handled. That is autonomous motion however it got started, so under
 * reduced motion it is zero at every moment, held or not, and the edges are lit
 * flat instead. The two are separated in `motionAmplitudes`, out in the pure
 * module with a test written to kill the one-character change that collapses
 * them, because Fractal Grower shipped with exactly that collapse.
 *
 * SOUND OFF
 *
 * The activity is whole with the volume at zero, which is where it starts. The
 * ladder is on the screen whether or not anyone can hear it.
 *
 * Issue: #225 (wave 5, Shape Ladder)
 */

/* ─────────────────────────────────────────────────────────────────────────
 * Colour
 *
 * Every hue comes from `axisHue`, `handleHue` and `shadowHue`, which all fold
 * through `safeHue` in the garden module, and the suite sweeps the real
 * function to prove nothing can land in the banned 270-350 band.
 * ───────────────────────────────────────────────────────────────────────── */

/** Accent for the naming card and the controls. Sea green, well outside the ban. */
const ACCENT = '#3FA98A';

function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${h.toFixed(1)},${s}%,${l}%,${a.toFixed(3)})`;
}

/* ─────────────────────────────────────────────────────────────────────────
 * The room
 * ───────────────────────────────────────────────────────────────────────── */

/** How much of the smaller side of the canvas the fit circle takes up. */
const FIT_FRACTION = 0.4;

/** How close a finger has to land to take hold of a bead, in CSS pixels. */
const BEAD_GRAB_PX = 46;

/** Radius of a bead on screen, in CSS pixels. */
const BEAD_R = 13;

/** How far one key press moves a control, as finger travel in CSS pixels. */
const KEY_TRAVEL_PX = 26;

/** How long the object has to be left alone before a look at it counts. */
const SETTLE_QUIET_MS = 900;
const SETTLE_INTERVAL_MS = 1400;

/**
 * Quality rungs. Only ever stepped DOWN, and never by anything the child did.
 *
 * None of this can touch the shape: the climb and the view live in refs and the
 * figure is a pure function of them, so a downgrade gives the child back the
 * same object with fewer glow passes behind it.
 */
const QUALITY = [
  { maxDpr: 2, glow: 3 },
  { maxDpr: 1.5, glow: 2 },
  { maxDpr: 1, glow: 1 },
];
const DOWNGRADE_WINDOW = 32;
const DOWNGRADE_COST_MS = 13;

const FRAME_INTERVAL_MS = 1000 / 32;

type Gesture = 'none' | 'sweep' | 'shadow' | 'turn';

export default function ShapeLadder() {
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
   * The four numbers the child is holding.
   *
   * Refs, not state, and this is the load bearing decision in the file. They
   * change on every frame of a drag, and putting them through React would be
   * thirty renders a second of a component that owns a canvas. They are also
   * what the shape IS: keeping them out of the render tree is why a quality
   * downgrade, a resize or a re-render cannot cost the child their object or
   * their place on the ladder.
   */
  const params = useRef<{ climb: number; turn: Turn }>({
    climb: 0,
    turn: { ...DEFAULT_TURN },
  });
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  /** Published copy of the parameters, for the screen reader only. */
  const [described, setDescribed] = useState({ climb: 0, shadow: 0 });

  /* Pointer, coalesced. Handlers only enqueue; the parameters move once per
   * frame, in the tick. A drag on a touchscreen delivers events far faster than
   * frames, and applying them in the handler would rebuild the figure several
   * times over for one picture. Deltas are summed across everything queued, so
   * a fast flick keeps all of its travel rather than only its last hop. */
  const queue = useRef<number[]>([]);
  const gesture = useRef<Gesture>('none');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const canvasRect = useRef<DOMRect | null>(null);

  /** Where round the ring the finger last was, so the dial can follow it. */
  const dialAngle = useRef(0);

  /**
   * The direction, and the rung, a sweep gesture was started on.
   *
   * Latched at the moment the bead is taken hold of and held for the whole
   * gesture. Both halves matter: the bead for the next direction stands at
   * right angles to this one, so reading either live would turn a finger that
   * is doing one steady thing into a shape that chatters at the rung. See
   * `clampToRung`.
   */
  const sweepGrip = useRef<{ axis: number; ux: number; uy: number } | null>(null);

  /** How lit the object is under the hand. Rises under a finger, settles after. */
  const holdAmp = useRef(0);
  const holding = useRef(false);

  /** Set when something changed and the canvas owes a repaint. */
  const dirty = useRef(true);
  /**
   * Wakes the render loop.
   *
   * The loop does not run continuously. It stops itself once the object is
   * still and there is nothing queued, and every input path calls this to start
   * it again. A frame loop that runs forever and returns early is cheap but it
   * is not nothing, and on an activity a child may leave open on a tablet for an
   * hour it should not be there.
   *
   * Scoped to the frame loop, which is what this ref wakes. It is not a claim
   * that the component is idle: three slow intervals do keep ticking for as long
   * as it is mounted, at 1400ms (looking at the shape), 500ms (publishing the
   * screen-reader sentence) and 180ms (following the sound to the hand). Each
   * returns immediately when nothing has happened, and between them they are
   * about eight wakeups a second against a frame loop's thirty-two, none of them
   * touching the canvas.
   */
  const wake = useRef<(() => void) | null>(null);
  /** Set when the climb moved and the figure has to be built again. */
  const needsRebuild = useRef(true);
  /** When the child last did anything, so a settled look is really settled. */
  const lastActed = useRef(0);

  const figure = useRef<Figure>(buildFigure(0));

  /**
   * Where the two beads were last painted, in CSS pixels, so a finger can take
   * hold of them.
   *
   * Written by the painter and read by the pointer handler, which is the same
   * arrangement Sound Drawing uses for its pendulum bobs: the beads move with
   * the view and the climb, and the only place that knows where they ended up
   * is the frame that drew them.
   */
  const beads = useRef<{
    centre: { x: number; y: number } | null;
    sweep: { x: number; y: number } | null;
    shadow: { x: number; y: number } | null;
  }>({ centre: null, sweep: null, shadow: null });

  /* Guided naming */
  const discovery = useRef<DimensionsDiscoveryState>(initialDiscoveryState());
  const pendingNames = useRef<DimensionsDiscoveryId[]>([]);

  const guided = useGuidedDiscovery({
    activityId: 'dimensions',
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
   * sweeps straight to the top of the ladder and turns the dial before pausing
   * can earn all four at once, which is a lecture. So they queue and are handed
   * over one at a time.
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

  /* ── Looking at the shape ──────────────────────────────────────────────
   *
   * Once every second and a bit, and only when the child has left it alone long
   * enough that what is on the screen is what they meant. Not every frame: a
   * shape watched continuously would hand a child every sentence in the first
   * two seconds of play, which is a lecture wearing a costume.
   */
  useEffect(() => {
    const id = setInterval(() => {
      if (lastActed.current === 0) return;
      if (performance.now() - lastActed.current < SETTLE_QUIET_MS) return;
      feed({ type: 'settle', climb: params.current.climb });
    }, SETTLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [feed]);

  /* ── Audio ─────────────────────────────────────────────────────────────
   *
   * The ladder, as sound. One sine per rung, at the multiples in
   * HARMONIC_MULTIPLES, each fading in across the sweep that pulls its rung
   * out. They stack rather than replace, so climbing is audibly adding.
   *
   * The pitches and the levels come from `harmonicHz` and `harmonicLevels`,
   * which are the same two functions the rungs drawn beside the object are
   * drawn from. Water Sphere shipped a sound whose pitches had drifted away
   * from its picture because they were written down twice.
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
    master.gain.value = (volumeRef.current / 100) * 0.36;
    master.connect(ctx.destination);

    const levels = harmonicLevels(params.current.climb);
    const voices = HARMONIC_MULTIPLES.map((multiple, rung) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = harmonicHz(rung);
      const gain = ctx.createGain();
      // Higher harmonics quieter, in proportion to their own multiple, so the
      // stack stays a warm hum rather than turning into a whistle at the top.
      gain.gain.value = (levels[rung] * 0.26) / multiple;
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
    a.master.gain.setTargetAtTime((volume / 100) * 0.36, a.ctx.currentTime, 0.08);
  }, [volume]);

  /* Sound follows the hand. Read on its own slow timer rather than inside the
   * render loop, because a gain node set thirty times a second from a value
   * measured thirty times a second is a zipper noise, and because the audio
   * graph should not be part of the frame budget. */
  useEffect(() => {
    const id = setInterval(() => {
      const a = audio.current;
      if (!a) return;
      const levels = harmonicLevels(params.current.climb);
      const t = a.ctx.currentTime;
      a.voices.forEach((v, rung) => {
        v.gain.gain.setTargetAtTime((levels[rung] * 0.26) / HARMONIC_MULTIPLES[rung], t, 0.12);
      });
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

      // The thing under the finger is the thing you get. Beads first, because
      // they are objects with a place on the screen; everything else turns the
      // shape, which is what a hand landing on an object expects to do.
      let best: Gesture = 'turn';
      let bestDistance = BEAD_GRAB_PX;
      const b = beads.current;
      if (b.sweep) {
        const d = Math.hypot(b.sweep.x - px, b.sweep.y - py);
        if (d < bestDistance) {
          bestDistance = d;
          best = 'sweep';
        }
      }
      if (b.shadow) {
        const d = Math.hypot(b.shadow.x - px, b.shadow.y - py);
        if (d < bestDistance) {
          bestDistance = d;
          best = 'shadow';
        }
      }
      gesture.current = best;
      sweepGrip.current = null;
      if (best === 'sweep' && b.sweep && b.centre) {
        const ax = b.sweep.x - b.centre.x;
        const ay = b.sweep.y - b.centre.y;
        const len = Math.hypot(ax, ay) || 1;
        const handle = sweepHandleFor(params.current.climb);
        if (handle) sweepGrip.current = { axis: handle.axis, ux: ax / len, uy: ay / len };
      }
      if (best === 'shadow' && b.centre) {
        dialAngle.current = dialAngleAt(px - b.centre.x, py - b.centre.y);
      }

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
   * `holding` stays true forever: the frame loop never stops, and under reduced
   * motion the object stays lit at full brightness with nobody touching it.
   *
   * So the release is also listened for where it cannot be missed. endGesture
   * returns immediately when there is no gesture, so the ordinary path, where
   * the canvas handler has already run, costs a comparison. lostpointercapture
   * is in here for the other half of the same failure: capture taken and then
   * taken away, by a browser gesture or by the element being removed, which
   * delivers no pointerup at all.
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

  /**
   * Move the ladder. One place, so a key and a finger agree.
   *
   * `axis` is the rung a drag was started on, when there is one. It keeps the
   * sweep inside that direction for the whole gesture: see `clampToRung`.
   */
  const sweepBy = useCallback((travelPx: number, axis?: number) => {
    const p = params.current;
    const before = p.climb;
    const moved = climbAfterTravel(p.climb, travelPx);
    p.climb = axis === undefined ? moved : clampToRung(moved, axis);
    return p.climb !== before;
  }, []);

  /** Turn the dial by some radians. Refuses below a cube, where it does not exist. */
  const dialBy = useCallback((radians: number) => {
    const p = params.current;
    if (!shadowHandleShown(p.climb)) return false;
    const before = p.turn.shadow;
    const after = shadowTurnBy(before, radians);
    if (after === before) return false;
    p.turn = { ...p.turn, shadow: after };
    return true;
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const p = params.current;
      let handled = true;
      let event: Parameters<typeof stepDiscovery>[1] | null = null;

      if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        p.turn = turnAfterDrag(p.turn, e.key === 'ArrowRight' ? KEY_TRAVEL_PX : -KEY_TRAVEL_PX, 0);
        event = { type: 'turn' };
      } else if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        p.turn = turnAfterDrag(p.turn, 0, e.key === 'ArrowDown' ? KEY_TRAVEL_PX : -KEY_TRAVEL_PX);
        event = { type: 'turn' };
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        if (sweepBy(KEY_TRAVEL_PX)) event = { type: 'climb', climb: p.climb };
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        if (sweepBy(-KEY_TRAVEL_PX)) event = { type: 'climb', climb: p.climb };
      } else if (e.key === ',' || e.key === '.') {
        if (dialBy(e.key === '.' ? SHADOW_KEY_STEP : -SHADOW_KEY_STEP)) {
          event = { type: 'shadow', climb: p.climb, shadow: p.turn.shadow };
        }
      } else handled = false;

      if (!handled) return;
      e.preventDefault();
      ensureAudio();
      acted();
      if (event) feed(event);
      needsRebuild.current = true;
      dirty.current = true;
      wake.current?.();
    },
    [acted, dialBy, ensureAudio, feed, sweepBy],
  );

  const startOver = useCallback(() => {
    acted();
    params.current.climb = 0;
    params.current.turn = { ...DEFAULT_TURN };
    needsRebuild.current = true;
    dirty.current = true;
    wake.current?.();
    // Deliberately does NOT reset the naming state. Those lines are once each
    // per session however many times the child climbs, because repeating them
    // would turn a calm sentence into a nag.
  }, [acted]);

  /* ── Live region ───────────────────────────────────────────────────────
   *
   * The picture tells a sighted child what is on the screen. This says the same,
   * once per change, for a child using a screen reader. Not chatty: it is
   * published from a slow timer, and only when the sentence it would say has
   * actually changed.
   */
  const describedText = useMemo(
    () => describeLadder(described.climb, described.shadow),
    [described],
  );
  const lastSpoken = useRef('');
  useEffect(() => {
    if (describedText === lastSpoken.current) return;
    const id = setTimeout(() => {
      lastSpoken.current = describedText;
      setAnnounce(describedText);
    }, 700);
    return () => clearTimeout(id);
  }, [describedText]);

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
    let originX = 0;
    let originY = 0;

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

      /* Fitted to the LARGEST the object can ever be, once per size, rather
       * than to whatever is on screen right now. A fit that followed the object
       * would shrink the cube back to the size of the point the child started
       * from, and a sweep that adds a whole direction would look like nothing
       * happening. See FIT_RADIUS in `dimensions.ts`, which the suite proves
       * bounds every reachable state. */
      scale = (Math.min(cssW, cssH) * FIT_FRACTION) / FIT_RADIUS;
      originX = cssW / 2;
      originY = cssH / 2;

      // The shape is untouched by any of this. Its two parameters live in refs,
      // so a resize, a rotation or a step down the quality ladder gives the
      // child back the same object at a different size.
      needsRebuild.current = true;
      dirty.current = true;
    };

    /**
     * Drain the pointer queue into the parameters.
     *
     * One mutation per frame. Deltas are summed across every point queued since
     * the last frame, so a fast flick keeps all of its travel: taking only the
     * newest point would quietly throw away most of a quick gesture.
     *
     * A sweep and a dial turn each take the component of the finger's travel
     * along their own direction, so pulling a bead outwards sweeps and dragging
     * across it does not. The direction is read from where the bead was last
     * PAINTED, which is the only place that knows where the view put it.
     */
    const drained: Parameters<typeof stepDiscovery>[1][] = [];

    const drain = (): boolean => {
      const q = queue.current;
      if (q.length === 0) return false;

      const p = params.current;
      let dx = 0;
      let dy = 0;
      let travelled = 0;

      for (let i = 0; i < q.length; i += 2) {
        const x = q[i];
        const y = q[i + 1];
        const prev = lastPoint.current;
        if (prev) {
          dx += x - prev.x;
          dy += y - prev.y;
          travelled += Math.hypot(x - prev.x, y - prev.y);
        }
        lastPoint.current = { x, y };
      }
      q.length = 0;
      if (travelled === 0) return false;

      const beforeClimb = p.climb;
      const beforeTurn = p.turn;

      if (gesture.current === 'sweep') {
        const grip = sweepGrip.current;
        if (grip) sweepBy(dx * grip.ux + dy * grip.uy, grip.axis);
      } else if (gesture.current === 'shadow') {
        // The dial follows the finger's ANGLE about the middle of the shape, so
        // the bead stays under the finger whatever size the canvas is. See
        // `dialAngleAt` for the sizing bug a travel rule has instead.
        const b = beads.current;
        const rect = canvasRect.current;
        const last = lastPoint.current;
        if (b.centre && rect && last) {
          const angle = dialAngleAt(last.x - rect.left - b.centre.x, last.y - rect.top - b.centre.y);
          dialBy(angleDelta(dialAngle.current, angle));
          dialAngle.current = angle;
        }
      } else if (gesture.current === 'turn') {
        p.turn = turnAfterDrag(p.turn, dx, dy);
      }

      const moved = p.climb !== beforeClimb || p.turn !== beforeTurn;
      if (!moved) return false;

      needsRebuild.current = true;
      if (p.climb !== beforeClimb) drained.push({ type: 'climb', climb: p.climb });
      if (p.turn.shadow !== beforeTurn.shadow) {
        drained.push({ type: 'shadow', climb: p.climb, shadow: p.turn.shadow });
      }
      if (p.turn.yaw !== beforeTurn.yaw || p.turn.pitch !== beforeTurn.pitch) {
        drained.push({ type: 'turn' });
      }
      return true;
    };

    /* ── Painting ─────────────────────────────────────────────────────── */

    const toScreen = (x: number, y: number) => ({
      x: originX + x * scale,
      y: originY - y * scale,
    });

    /** How much a thing at this depth is washed into the room behind it. */
    const fogAt = (depth: number) => {
      const t = Math.min(1, Math.max(0, (depth - 2.4) / 2.0));
      return t * (calm ? 0.46 : 0.6);
    };

    const paint = (seconds: number) => {
      const p = params.current;
      const f = figure.current;
      const view = viewFor(p.turn, p.climb);
      const amp = motionAmplitudes({ reduceMotion, holdAmp: holdAmp.current });
      const glow = sweepGlow(f.partial);
      const newest = f.partial > 0 ? f.whole : -1;

      const drawBead = (at: { x: number; y: number }, hue: number, strength: number) => {
        const r = BEAD_R * (0.86 + 0.14 * amp.hold) * strength;
        const halo = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, r * 2.6);
        halo.addColorStop(0, hsla(hue, calm ? 52 : 72, 78, calm ? 0.62 : 0.82));
        halo.addColorStop(0.45, hsla(hue, calm ? 50 : 68, 58, calm ? 0.24 : 0.34));
        halo.addColorStop(1, hsla(hue, 50, 50, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(at.x, at.y, r * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hsla(hue, calm ? 44 : 62, 90, calm ? 0.82 : 0.95);
        ctx.beginPath();
        ctx.arc(at.x, at.y, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      };

      /* The room. A near-black ground with a breath of the colour of whichever
         direction is being swept, so the room agrees with the shape without
         ever competing with it. */
      const roomHue = axisHue(Math.min(3, f.whole));
      const bg = ctx.createRadialGradient(
        originX,
        originY,
        0,
        originX,
        originY,
        Math.max(cssW, cssH) * 0.7,
      );
      bg.addColorStop(0, hsla(roomHue, calm ? 18 : 26, calm ? 8 : 9, 1));
      bg.addColorStop(1, hsla(roomHue, calm ? 20 : 30, 3, 1));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);

      const centre = { x: originX, y: originY };
      beads.current.centre = centre;

      /* The dial, drawn under everything so the shape is never behind it. */
      let shadowBead: { x: number; y: number } | null = null;
      if (shadowHandleShown(p.climb)) {
        const r = SHADOW_RING * FIT_RADIUS * scale;
        ctx.strokeStyle = hsla(shadowHue(), calm ? 26 : 40, 48, calm ? 0.16 : 0.24);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(originX, originY, r, 0, Math.PI * 2);
        ctx.stroke();

        const d = shadowBeadDirection(p.turn.shadow);
        shadowBead = { x: originX + d.x * r, y: originY + d.y * r };
      }
      beads.current.shadow = shadowBead;

      /* The shape. Back to front, so near edges lie over far ones. */
      const points = f.vertices.map((v) => {
        const q = projectVertex(v, view);
        const s = toScreen(q.x, q.y);
        return { x: s.x, y: s.y, depth: q.depth };
      });

      const order = f.edges
        .map((e, i) => ({ e, i, depth: (points[e.a].depth + points[e.b].depth) / 2 }))
        .sort((m, n) => n.depth - m.depth);

      ctx.lineCap = 'round';
      for (const { e, depth } of order) {
        const a = points[e.a];
        const b = points[e.b];
        const fog = fogAt(depth);
        const live = e.axis === newest;
        const hue = axisHue(e.axis);
        const lightness = (calm ? 52 : 58) + (live ? glow * 18 : 0);
        const alpha = (1 - fog) * (calm ? 0.72 : 0.86) * (live ? 0.55 + 0.45 * glow : 1);
        const width = (calm ? 1.7 : 2.1) * (1 - fog * 0.5) * (live ? 1 + glow * 0.8 : 1);

        // The soft halo under the line. One pass at the bottom of the quality
        // ladder, three at the top, and it is the first thing given up.
        for (let g = rung.glow; g > 0; g--) {
          ctx.strokeStyle = hsla(hue, calm ? 44 : 62, lightness, alpha * 0.1);
          ctx.lineWidth = width * (1 + g * 1.9);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        ctx.strokeStyle = hsla(hue, calm ? 40 : 58, lightness + 16, alpha);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      /* The corners. Bright where they are near, and brighter under the hand. */
      for (const q of points) {
        const fog = fogAt(q.depth);
        const r = (calm ? 2.2 : 2.6) * (1 - fog * 0.55);
        ctx.fillStyle = hsla(
          axisHue(Math.min(3, f.whole)),
          calm ? 26 : 36,
          88,
          (1 - fog) * (calm ? 0.5 : 0.7) * (0.6 + 0.4 * amp.hold),
        );
        ctx.beginPath();
        ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      /*
       * The glint. THE ONLY THING IN THIS FILE DRIVEN BY THE CLOCK, and it is
       * gone entirely under reduced motion, held or not: `amp.glint` is zero
       * there at every moment, so this loop does not run and the edges are lit
       * flat. Everything else on the screen is a function of the child's finger.
       */
      if (amp.glint > 0.002 && f.edges.length > 0) {
        const phase = seconds * 0.22;
        order.forEach(({ e, i, depth }) => {
          const u = ((phase + i * 0.137) % 1 + 1) % 1;
          const a = points[e.a];
          const b = points[e.b];
          const x = a.x + (b.x - a.x) * u;
          const y = a.y + (b.y - a.y) * u;
          ctx.fillStyle = hsla(
            axisHue(e.axis),
            calm ? 30 : 44,
            94,
            (1 - fogAt(depth)) * amp.glint * (calm ? 0.2 : 0.34),
          );
          ctx.beginPath();
          ctx.arc(x, y, calm ? 1.6 : 2.1, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      /* The bead the child pulls. */
      const handle = sweepHandleFor(p.climb);
      let sweepBead: { x: number; y: number } | null = null;
      if (handle) {
        if (handle.point) {
          const q = projectVertex(handle.point, view);
          sweepBead = toScreen(q.x, q.y);
        } else if (handle.screen) {
          sweepBead = toScreen(handle.screen.x, handle.screen.y);
        }
      }
      beads.current.sweep = sweepBead;

      if (sweepBead) {
        // A lead from the shape to the bead, so it reads as attached to the
        // object rather than floating beside it.
        ctx.strokeStyle = hsla(handleHue(), calm ? 34 : 48, 62, calm ? 0.2 : 0.3);
        ctx.lineWidth = 1.2;
        ctx.setLineDash(handle && handle.axis === 3 ? [3, 5] : []);
        ctx.beginPath();
        ctx.moveTo(centre.x, centre.y);
        ctx.lineTo(sweepBead.x, sweepBead.y);
        ctx.stroke();
        ctx.setLineDash([]);
        drawBead(sweepBead, handleHue(), 1);
      }
      if (shadowBead) drawBead(shadowBead, shadowHue(), 0.86);

      /* The rungs. Length from HARMONIC_MULTIPLES and brightness from
         `harmonicLevels`, which are the same two things the oscillators are
         built from, so what is lit is what is sounding. */
      const levels = harmonicLevels(p.climb);
      const widest = Math.max(...HARMONIC_MULTIPLES);
      // Top left, and that is deliberate. The naming card floats over the bottom
      // of the canvas, so rungs drawn down there were covered at the exact
      // moment a child was being told what they had just made.
      const barX = 18;
      const barTop = 18;
      levels.forEach((level, i) => {
        const w = 10 + (HARMONIC_MULTIPLES[i] / widest) * 44;
        ctx.fillStyle = hsla(
          axisHue(Math.min(3, i)),
          calm ? 34 : 48,
          calm ? 56 : 62,
          0.12 + level * (calm ? 0.5 : 0.68),
        );
        ctx.fillRect(barX, barTop + i * 11, w, 5);
      });

    };

    /* ── The loop ─────────────────────────────────────────────────────── */

    let mounted = true;
    let raf = 0;
    let last = 0;
    let lastFrameTime = 0;
    const start = performance.now();

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

      const before = holdAmp.current;
      holdAmp.current = holdAmpNext({
        reduceMotion,
        holding: holding.current,
        amp: holdAmp.current,
        dt,
      });
      if (holdAmp.current !== before) dirty.current = true;

      if (needsRebuild.current) {
        figure.current = buildFigure(params.current.climb);
        needsRebuild.current = false;
        dirty.current = true;
      }

      /* Now the figure is current, so the events the drag produced can be handed
       * over against a shape that really exists. */
      if (drained.length > 0) {
        for (const event of drained) feed(event);
        drained.length = 0;
      }

      /*
       * The glint is the one thing on this canvas driven by the clock, so it is
       * a reason to PAINT and not only a reason to schedule.
       *
       * Found by the observed pass and not by reading the code. With the glint
       * counted only in the scheduling rule, a finger held perfectly still on
       * the canvas kept the loop running and painted nothing: `dirty` goes
       * false once `holdAmp` saturates at one, so every frame after that
       * returned early and the spark froze mid-edge. The reduced-motion
       * evidence was then vacuous, because the canvas hash was identical during
       * a held-still touch whether reduced motion was on or off. Under reduced
       * motion `glinting` is false by construction, so this cannot smuggle
       * clock-driven painting back in there.
       */
      const glinting = !reduceMotion && holdAmp.current > 0;
      const paintNeeded = dirty.current || moved || glinting;
      /*
       * Whether the loop runs again, and whether it runs at all.
       *
       * Both rules live in `shouldSchedule`, out in the pure module with tests
       * that kill the reverts: a canvas with no size gets no frame however busy
       * everything else is, and a still, unhandled object gets none either, so
       * a tablet left open on this activity has no rAF callback at all.
       *
       * WHAT THE SIZE GUARD IS EXACT ABOUT. cssW and cssH are only ever set by
       * build(), and build() returns BEFORE setting either when the element
       * measures under two pixels on a side. For a canvas that has never had a
       * size the guard is therefore exact: both sit at their initial zero and a
       * hidden subtree parks here until the ResizeObserver wakes it. For a
       * canvas that HAD a size and then collapsed, these two hold the LAST REAL
       * measurement rather than the current one, so the loop can still schedule
       * for the frames between the collapse and build() next running against a
       * real size. That window is why the pair is passed rather than the width
       * alone: a collapsing subtree usually loses its height while keeping its
       * width, and only a rule reading both can refuse once build() catches up.
       *
       * IT IS ALSO NOT THE ONLY GATE. The frame limiter above reschedules and
       * returns before ever reaching here, so a frame that arrives inside
       * FRAME_INTERVAL_MS asks for one more rAF without consulting this rule at
       * all. That costs at most one extra callback per stop, because the next
       * frame is outside the interval and does consult it, but a reader counting
       * callbacks should expect the trailing one.
       */
      if (
        !shouldSchedule({
          cssW,
          cssH,
          dirty: paintNeeded,
          holding: holding.current,
          queued: queue.current.length > 0,
          animating: glinting,
        })
      ) {
        return;
      }
      schedule();
      if (!paintNeeded) return;
      dirty.current = false;

      const t0 = performance.now();
      paint((nowMs - start) / 1000);
      costSum += performance.now() - t0;
      costCount++;

      // Degrade rather than jank. Measured over a second of painted frames, and
      // only ever downward, so this can never oscillate between two levels. It
      // cannot touch the shape: see the QUALITY comment.
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
      const p = params.current;
      setDescribed((prev) => {
        if (prev.climb === p.climb && prev.shadow === p.turn.shadow) return prev;
        return { climb: p.climb, shadow: p.turn.shadow };
      });
    }, 500);

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
  }, [quality, calm, reduceMotion, feed, dialBy, sweepBy]);

  /* ── UI ────────────────────────────────────────────────────────────────── */

  const shellCss = `hsl(${axisHue(0).toFixed(1)},${calm ? 20 : 28}%,4%)`;
  const atTop = clampClimb(described.climb) >= FULL_CLIMB;

  return (
    <div className="relative flex h-full w-full flex-col" style={{ background: shellCss }}>
      <canvas
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label="A shape made of glowing edges, with a bead floating beside it. Drag the bead away from the shape to sweep it into a new direction: a point becomes a line, a line becomes a square, a square becomes a cube. Drag anywhere else to turn the shape and look at it."
        aria-describedby="dimensions-keys"
        className="min-h-0 w-full flex-1"
        style={{ touchAction: 'none', cursor: 'grab', display: 'block' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onKeyDown={onKeyDown}
      />

      <span id="dimensions-keys" className="sr-only">
        Right arrow and up arrow sweep out a new direction. Left arrow and down arrow collapse it
        again. Hold shift with the arrows to turn the shape. Once there is a cube, the comma and
        full stop keys turn it in a direction the screen cannot show.
      </span>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* Controls. Deliberately thin and dark so the shape stays the subject. */}
      <div
        className="relative shrink-0 px-4 pb-4 pt-3"
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))`,
        }}
      >
        {/*
          The card floats above the controls rather than sitting in the column.

          In flow it is a real box eighty pixels tall, and the canvas is the flex
          child that gives those pixels up. Pattern Garden learned what that
          costs the hard way: a resize there rebuilt the simulation grid and the
          child's garden was wiped underneath the sentence congratulating them on
          growing it.

          Here the shape survives a resize, because it is a pure function of two
          numbers held in refs, so this is no longer a correctness problem. It is
          still the right layout: the canvas keeps its size, so the object does
          not jump a hundred pixels down the screen at the exact moment the child
          is being told what they made.

          The card and its wrapper are BOTH transparent to touch, and that is not
          a nicety. Out of flow the card lands over the bottom of the canvas,
          which is where the fourth bead is drawn. Only buttons take touches in
          here.
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
            Back to a point
          </button>
        </div>

        <p className="mt-2 text-center text-[12px] text-white/45">
          {atTop
            ? 'Drag the bead on the ring to turn it in a direction the screen cannot show.'
            : 'Pull the bead away from the shape.'}
        </p>
      </div>

      {/*
        Keyboard focus, drawn inside the box.

        A global :focus-visible rule paints a 3px orange outline on whatever has
        focus, and on a canvas that fills the screen that outline lands on the
        viewport edges, so all a keyboard user actually sees is one orange line
        under the header. A negative offset pulls the ring inside the element so
        all four edges are on screen, and styled-jsx scopes it tightly enough to
        win. Same fix as Water Sphere, Pattern Garden, Fractal Grower and Sound
        Drawing.
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
