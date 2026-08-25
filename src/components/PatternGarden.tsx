'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import NamingCard from '@/components/guided/NamingCard';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useGuidedDiscovery } from '@/hooks/useGuidedDiscovery';
import {
  DEPTH_MAX,
  DEPTH_MIN,
  FEED_MAX,
  FEED_MIN,
  clearField,
  coverage,
  createField,
  describeGarden,
  killCeiling,
  paletteAt,
  resampleField,
  ruleAt,
  seedDisc,
  setUniformRule,
  stepField,
  type GardenField,
} from '@/lib/pattern-garden';
import {
  initialDiscoveryState,
  stepDiscovery,
  type PatternGardenDiscoveryId,
  type PatternGardenDiscoveryState,
} from '@/lib/pattern-garden-discovery';

/**
 * Pattern Garden.
 *
 * A dark bed of soil. Paint into it with a finger and something grows out of
 * where you touched: it spreads, branches, meets itself and settles into a
 * coat. One stone below the bed is dragged around to change what kind of thing
 * grows. There is nothing to reach, nothing to lose, and no pattern that can be
 * wrong.
 *
 * WHAT IS ACTUALLY HAPPENING
 *
 * Two substances spread through the soil and react. One feeds the other; the
 * other eats the first and dies off at its own rate. That is the whole rule and
 * it is the same mathematics behind the spots on a leopard and the stripes on a
 * fish. The child is never told any of that. They are told, once each, four
 * things they have just watched happen, and every one of them is checkable by
 * looking at the bed.
 *
 * The chemistry, the map of it and the colour fence are in `pattern-garden.ts`,
 * and the decision of when a naming line is earned is in
 * `pattern-garden-discovery.ts`. Both are pure and both are tested, including a
 * test that grows real gardens at twenty-five positions of the control and
 * fails if any of them comes out blank or flooded. That test is what makes "a
 * pattern cannot be wrong" a property of the build rather than a claim in a
 * comment: there is no setting the child can drag to where nothing grows.
 *
 * HOW IT IS DRAWN
 *
 * A 2D canvas, no 3D dependency, exactly as the other science sandboxes do it.
 * The chemistry runs on a grid about a quarter of the screen's resolution and
 * is painted into a buffer at that size, which the browser's bilinear filter
 * then stretches up. This is the same half-scale-buffer approach Water Sphere
 * and Wave Interference use, and it is both cheaper and better looking: four
 * times fewer pixels to fill, and the filter turns the cell edges into soft
 * ramps so the growth reads as matter rather than as pixels.
 *
 * The relief is the part that makes it look alive. The growth is lit as if it
 * had height, with the surface normal taken from the gradient of the pattern
 * itself, so the shapes catch a light that drifts slowly overhead and throw a
 * warm iridescent sheen along their turned edges. Nothing is modelled; it is
 * all one dot product per cell.
 *
 * SOUND OFF
 *
 * The activity is whole with the volume at zero, which is where it starts. The
 * sound, when a child asks for it, carries no information the picture does not
 * already carry.
 *
 * Issue: #225 (wave 3, Pattern Garden)
 */

/* ─────────────────────────────────────────────────────────────────────────
 * Palette
 *
 * Every hue is produced by paletteAt, which folds through safeHue, and the
 * test suite samples the whole control at fine spacing to prove nothing lands
 * in the banned 270-350 band. Lightness and saturation are chosen here; the
 * hues are not this file's to choose.
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

interface BedColours {
  soil: RGB;
  growthDeep: RGB;
  growth: RGB;
  rim: RGB;
}

/**
 * Colours for one control position.
 *
 * Calm Mode softens rather than greys: the growth loses some of its saturation
 * and the rim loses most of its brightness, because the sheen is the loudest
 * thing on the screen and it is the part a sensory-sensitive child will feel
 * first. The shapes stay exactly as legible, which matters, since the shapes
 * are the activity.
 */
function bedColours(x: number, y: number, calm: boolean): BedColours {
  const p = paletteAt(x, y);
  return {
    soil: hsl(p.soilHue, calm ? 30 : 42, 5),
    growthDeep: hsl(p.growthHue, calm ? 45 : 62, 13),
    growth: hsl(p.growthHue, calm ? 48 : 66, calm ? 42 : 47),
    rim: hsl(p.rimHue, calm ? 55 : 88, calm ? 52 : 64),
  };
}

/** Accent for the naming card and the controls. Sea green, well outside the ban. */
const ACCENT = '#3FA98A';

/* ─────────────────────────────────────────────────────────────────────────
 * Sizing and pacing
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Quality ladder. Coarser grids only; the number of chemistry steps per frame
 * is deliberately NOT on the ladder, because it sets how fast the garden grows
 * and a child on a slower device should get the same garden, not a slower one.
 */
const QUALITY = [0.26, 0.2, 0.15];

/** Above this the per-cell work stops being affordable on an iPad-class device. */
const MAX_CELLS = 26000;

/**
 * Chemistry steps per frame.
 *
 * Measured, not chosen, and the measurement lives in the suite rather than in
 * this sentence: `growth front speed` in pattern-garden.test.ts runs the real
 * chemistry and fails if these numbers drift.
 *
 * The front advances between about sixteen and forty-five cells every thousand
 * steps depending on where the control sits, and around twenty-six to thirty-two
 * at the middle of it, so on a bed a couple of hundred cells across the growth
 * reaches the far side in roughly four thousand steps. At sixteen steps a
 * frame that is about eight seconds: movement is obvious within a second of a
 * touch, and the bed fills while the child is still watching.
 *
 * The first draft ran six, which looked from the code like a reasonable
 * number and on screen like a stroke of paint that never grew at all. Calm
 * Mode halves it, which is the honest way to slow this activity down, because
 * the simulation IS the motion.
 */
const STEPS_PER_FRAME = 16;
const CALM_STEPS_PER_FRAME = 8;

/**
 * Under reduced motion the chemistry runs only when the child does something.
 *
 * The obvious implementation of reduced motion here would be to keep the loop
 * running and stop drawing, which is the mistake flagged on Water Sphere: it
 * hides the activity rather than calming it. And simply freezing the bed would
 * be worse, because then a touch would paint a static smear and the growth,
 * which is the entire activity, would never happen at all.
 *
 * So a touch buys a burst of growth. The child paints, the bed grows out from
 * it for about a second and stops; they touch again and it moves again. Motion
 * only ever happens as a direct answer to something they did, which is what
 * the setting asks for, and nothing about the activity is lost.
 */
const PULSE_STEPS = 220;

/** How much of the bed one touch of the brush covers. */
const BRUSH_FRACTION = 0.034;

/** How often the bed is looked at, once the child has started. */
const SETTLE_INTERVAL_MS = 2000;
/** How long the bed must be left alone before a look counts as a settled one. */
const SETTLE_QUIET_MS = 900;

/* ─────────────────────────────────────────────────────────────────────────
 * The control map
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * The map under the control stone is a real garden.
 *
 * It is one Gray-Scott bed whose rule VARIES across its own width and height,
 * exactly as the control does, so the picture is not an illustration of what
 * grows where, it is what grows there. That is worth the extra field: a legend
 * a child can trust without a word on it, and it removes the last reason to put
 * numbers on this activity.
 *
 * It grows in while they watch, a slice of steps per frame, and then holds.
 */
const ATLAS_SCALE = 0.5;
const ATLAS_STEPS_TOTAL = 2600;
const ATLAS_STEPS_PER_FRAME = 26;

/* ─────────────────────────────────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────────────────────────────────── */

export default function PatternGarden() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Where the control stone sits. The middle of the map, which grows a
   * middling weave at a middling scale: whichever way the child drags from
   * here, something changes.
   */
  const [pad, setPad] = useState({ x: 0.5, y: 0.5 });
  /**
   * Sound OFF until the child asks for it.
   *
   * Ripples and Water Sphere both default their sound off behind an explicit
   * press, and an unrequested hum the moment a finger lands is aversive for
   * exactly the children this product is for. "They can always turn it down"
   * puts the burden on the child least able to carry it.
   */
  const [volume, setVolume] = useState(0);
  const [announce, setAnnounce] = useState('');
  const [quality, setQuality] = useState(0);

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

  const padRefValue = useRef(pad);
  padRefValue.current = pad;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  /* The bed itself, kept out of React entirely: it changes sixty times a
   * second and nothing about it belongs in a render. */
  const field = useRef<GardenField | null>(null);

  /* Pointer, coalesced. Every move appends to this queue and sets a flag; the
   * bed is seeded once per animation frame, never once per event. A drag on a
   * touchscreen delivers events far faster than frames, and seeding inside the
   * handler would do the same work several times over for one picture. */
  const strokeQueue = useRef<number[]>([]);
  const painting = useRef(false);
  const lastPaint = useRef<{ x: number; y: number } | null>(null);
  /** Cells this stroke has touched, so a dab reads smaller than a smear. */
  const strokeCells = useRef(0);
  /** Cached in resize. Measuring the element per event forces a layout. */
  const bedRect = useRef<DOMRect | null>(null);
  const padRect = useRef<DOMRect | null>(null);

  /** Growth budget under reduced motion. Spent by the loop, refilled by a touch. */
  const pulse = useRef(0);
  /** Set when something changed the bed outside the loop, so it repaints once. */
  const bedDirty = useRef(true);
  /** When the child last did anything, so a settled look is really settled. */
  const lastActed = useRef(0);
  /** How much the bed changed lately, which is what the sound follows. */
  const churn = useRef(0);
  /**
   * The CSS size the bed was last built at, kept across effect instances.
   *
   * The render effect closes over its own cssW/cssH, so when a quality change
   * re-runs it those start at zero and it cannot tell "the child rotated the
   * tablet" from "the ladder just stepped down". This ref is the memory that
   * survives the re-run, and it is the whole basis of that distinction.
   */
  const builtCss = useRef<{ w: number; h: number } | null>(null);
  /**
   * True while the bed has nothing growing on it.
   *
   * Cheaper and exact where a sampled scan would be neither: a seed too small
   * to land on a sampled cell would read as bare and cost the child a frame of
   * their own growth.
   */
  const bedBare = useRef(true);

  /* Guided naming */
  const discovery = useRef<PatternGardenDiscoveryState>(initialDiscoveryState());
  const pending = useRef<PatternGardenDiscoveryId[]>([]);

  const guided = useGuidedDiscovery({
    activityId: 'pattern-garden',
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
    padA: OscillatorNode;
    padB: OscillatorNode;
    padGain: GainNode;
    shimmerGain: GainNode;
    shimmerFilter: BiquadFilterNode;
  } | null>(null);

  /* ── Naming pipeline ───────────────────────────────────────────────────
   *
   * The reducer can name more than one thing in a single step: a child who
   * plants a smear after a dab and then looks up can earn three at once, which
   * is a lecture. So they queue and are handed over one at a time.
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
      pending.current.push(...step.emit);
      setQueueTick((n) => n + 1);
    }
  }, []);

  const lineOnScreen = guided.line !== null;

  useEffect(() => {
    if (pending.current.length === 0) return;

    if (lineOnScreen) {
      // Something is waiting. Retire the current line after long enough to
      // read it aloud twice over, so the queue cannot stall on a child who
      // does not press the close button. With nothing waiting, the card stays
      // until it is dismissed, exactly as in the other activities.
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
  const acted = useCallback(() => {
    lastActed.current = performance.now();
    if (reduceMotion) pulse.current = PULSE_STEPS;
  }, [reduceMotion]);

  const tuned = useCallback(() => {
    acted();
    feed({ type: 'tune' });
  }, [acted, feed]);

  /* ── Looking at the bed ────────────────────────────────────────────────
   *
   * Once, every couple of seconds, and only when the child has left it alone
   * long enough that what is there is what it settled into. Not every frame: a
   * bed watched continuously would hand a child every sentence in the first two
   * seconds of play, which is a lecture wearing a costume.
   */
  useEffect(() => {
    const id = setInterval(() => {
      const f = field.current;
      if (!f) return;
      if (performance.now() - lastActed.current < SETTLE_QUIET_MS) return;
      // Nothing has happened at all yet. The reducer's gate would swallow this
      // anyway; not raising it saves a pass over the bed sixty times a minute.
      if (lastActed.current === 0) return;
      feed({
        type: 'settle',
        x: padRefValue.current.x,
        y: padRefValue.current.y,
        coverage: coverage(f),
      });
    }, SETTLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [feed]);

  /* ── Audio ─────────────────────────────────────────────────────────────
   *
   * A low pad whose pitch follows the control sideways, and a breath of
   * filtered noise that rises while the bed is changing and falls away as it
   * settles. So growth is audible as well as visible: the garden whispers while
   * it is spreading and goes quiet when it is done.
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
    // inaudible while every code path looked right. Reading the slider here is
    // what closes that.
    master.gain.value = (volumeRef.current / 100) * 0.5;
    master.connect(ctx.destination);

    const padHz = 110 + 86 * padRefValue.current.x;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.07;
    padGain.connect(master);

    const mk = (freq: number) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(padGain);
      osc.start();
      return osc;
    };
    // Two, slightly apart, so the pad breathes instead of sitting still. A
    // single sine at a fixed pitch is the sound of a machine left on.
    const padA = mk(padHz);
    const padB = mk(padHz * 1.005);

    // Noise for the growth. A short looping buffer is cheaper than a live
    // source and at this filter width nobody can hear the loop.
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp = 0.94 * lp + 0.06 * (Math.random() * 2 - 1);
      data[i] = lp * 3.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = 'bandpass';
    shimmerFilter.frequency.value = 900;
    shimmerFilter.Q.value = 0.8;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0;
    noise.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(master);
    noise.start();

    audio.current = { ctx, master, padA, padB, padGain, shimmerGain, shimmerFilter };
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
    a.master.gain.setTargetAtTime((volume / 100) * 0.5, a.ctx.currentTime, 0.08);
  }, [volume]);

  /** The pad follows the control sideways, with a glide so a drag sounds like one. */
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const hz = 110 + 86 * pad.x;
    const now = a.ctx.currentTime;
    a.padA.frequency.setTargetAtTime(hz, now, 0.12);
    a.padB.frequency.setTargetAtTime(hz * 1.005, now, 0.12);
    a.shimmerFilter.frequency.setTargetAtTime(560 + 900 * pad.y, now, 0.12);
  }, [pad]);

  /* ── Input ─────────────────────────────────────────────────────────────── */

  const queuePoint = useCallback((clientX: number, clientY: number) => {
    const rect = bedRect.current;
    if (!rect) return;
    strokeQueue.current.push(clientX - rect.left, clientY - rect.top);
  }, []);

  const onBedPointerDown = useCallback(
    (e: React.PointerEvent) => {
      ensureAudio();
      acted();
      // Focus explicitly. A canvas with touch-action none that captures the
      // pointer does not reliably take focus from a tap, and a child who taps
      // first and then reaches for the keyboard is exactly who that fails for.
      canvasRef.current?.focus({ preventScroll: true });
      bedRect.current = (e.currentTarget as HTMLElement).getBoundingClientRect();
      painting.current = true;
      strokeCells.current = 0;
      lastPaint.current = null;
      queuePoint(e.clientX, e.clientY);
      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is an optimisation, not a requirement */
      }
    },
    [acted, ensureAudio, queuePoint],
  );

  const onBedPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!painting.current) return;
      acted();
      queuePoint(e.clientX, e.clientY);
    },
    [acted, queuePoint],
  );

  const endStroke = useCallback(() => {
    if (!painting.current) return;
    painting.current = false;
    lastPaint.current = null;
    const f = field.current;
    if (!f || strokeCells.current === 0) return;
    feed({
      type: 'plant',
      area: strokeCells.current / (f.width * f.height),
      coverage: coverage(f),
    });
    strokeCells.current = 0;
  }, [feed]);

  const onBedKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      ensureAudio();
      acted();
      // A seed in the middle of the bed. The one thing a keyboard user needs
      // from this surface is a way to start something growing.
      const rect = bedRect.current ?? canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      bedRect.current = rect as DOMRect;
      painting.current = true;
      strokeCells.current = 0;
      lastPaint.current = null;
      strokeQueue.current.push(rect.width / 2, rect.height / 2);
      // Ended on the next frame, once the queue has actually been drained, so
      // the planted area is counted rather than guessed.
      requestAnimationFrame(() => requestAnimationFrame(() => endStroke()));
    },
    [acted, endStroke, ensureAudio],
  );

  /* The control stone. */

  const movePad = useCallback(
    (nx: number, ny: number) => {
      setPad({
        x: Math.min(1, Math.max(0, nx)),
        y: Math.min(1, Math.max(0, ny)),
      });
      tuned();
    },
    [tuned],
  );

  const padFromEvent = useCallback((clientX: number, clientY: number) => {
    const rect = padRect.current;
    if (!rect || rect.width < 2 || rect.height < 2) return null;
    return {
      x: (clientX - rect.left) / rect.width,
      // Up on the screen is up on the control. Anything else is a puzzle.
      y: 1 - (clientY - rect.top) / rect.height,
    };
  }, []);

  const padDragging = useRef(false);

  const onPadPointerDown = useCallback(
    (e: React.PointerEvent) => {
      ensureAudio();
      padRect.current = (e.currentTarget as HTMLElement).getBoundingClientRect();
      padDragging.current = true;
      (e.currentTarget as HTMLElement).focus({ preventScroll: true });
      const p = padFromEvent(e.clientX, e.clientY);
      if (p) movePad(p.x, p.y);
      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is an optimisation, not a requirement */
      }
    },
    [ensureAudio, movePad, padFromEvent],
  );

  const onPadPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!padDragging.current) return;
      const p = padFromEvent(e.clientX, e.clientY);
      if (p) movePad(p.x, p.y);
    },
    [movePad, padFromEvent],
  );

  const onPadPointerUp = useCallback(() => {
    padDragging.current = false;
  }, []);

  const onPadKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 0.08;
      const p = padRefValue.current;
      if (e.key === 'ArrowLeft') movePad(p.x - step, p.y);
      else if (e.key === 'ArrowRight') movePad(p.x + step, p.y);
      else if (e.key === 'ArrowUp') movePad(p.x, p.y + step);
      else if (e.key === 'ArrowDown') movePad(p.x, p.y - step);
      else return;
      e.preventDefault();
      ensureAudio();
    },
    [ensureAudio, movePad],
  );

  const freshSoil = useCallback(() => {
    const f = field.current;
    if (!f) return;
    clearField(f);
    bedDirty.current = true;
    bedBare.current = true;
    acted();
    // Deliberately does NOT reset the naming state. Those lines are once each
    // per session however many gardens the child grows, because repeating them
    // would turn a calm sentence into a nag.
  }, [acted]);

  /* ── Live region ───────────────────────────────────────────────────────
   *
   * The picture tells a sighted child what kind of thing is growing. This says
   * the same, once per change, for a child using a screen reader. Not chatty:
   * only when the answer actually changes.
   */
  const lastSpoken = useRef('');
  useEffect(() => {
    const text = describeGarden(pad.x, pad.y);
    if (text === lastSpoken.current) return;
    const id = setTimeout(() => {
      lastSpoken.current = text;
      setAnnounce(text);
    }, 700);
    return () => clearTimeout(id);
  }, [pad]);

  /* ── The bed ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const scale = QUALITY[quality];
    const stepsPerFrame = calm ? CALM_STEPS_PER_FRAME : STEPS_PER_FRAME;

    /* The buffer the chemistry is painted into, at the chemistry's own
     * resolution. Drawn back up once per frame, and the browser's bilinear
     * filter is what turns cell edges into soft ramps. */
    const surf = document.createElement('canvas');
    const sctx = surf.getContext('2d');
    if (!sctx) return;

    let img: ImageData | null = null;
    let px: Uint8ClampedArray | null = null;

    /* Cached: measuring the element inside the loop forces a synchronous
     * layout on every frame of an activity a child is holding. */
    let cssW = 0;
    let cssH = 0;
    let cells = 0;

    /* Last rule written into the bed. NaN so the first frame always writes. */
    let ruledX = NaN;
    let ruledY = NaN;

    /* Rebuilt on resize, not per frame. */
    let vignette: CanvasGradient | null = null;

    /**
     * Sampled snapshot of the bed, for measuring how much it is changing.
     *
     * Every sixteenth cell. The sound follows this, and a full pass would be
     * fifteen thousand extra reads a frame to control one gain node.
     */
    const SAMPLE_STRIDE = 16;
    let snapshot: Float32Array | null = null;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      bedRect.current = rect;
      if (rect.width < 2 || rect.height < 2) return;
      // Setting canvas.width reallocates the backing store and can itself
      // nudge layout, so a resize observer that rebuilt unconditionally would
      // be free to feed itself. Nothing here runs unless the size really moved.
      if (Math.round(rect.width) === Math.round(cssW) && Math.round(rect.height) === Math.round(cssH)) {
        return;
      }
      cssW = rect.width;
      cssH = rect.height;

      let w = Math.max(24, Math.round(cssW * scale));
      let h = Math.max(24, Math.round(cssH * scale));
      if (w * h > MAX_CELLS) {
        const shrink = Math.sqrt(MAX_CELLS / (w * h));
        w = Math.max(24, Math.round(w * shrink));
        h = Math.max(24, Math.round(h * shrink));
      }

      /*
       * Who moved the bed decides what happens to the garden in it.
       *
       * A CSS size that really changed means the CHILD changed it, by turning
       * the tablet or opening the keyboard. That starts a fresh bed: they
       * changed the container, and bare soil is the honest answer.
       *
       * A CSS size that did NOT change, on a build that is still producing a
       * different grid, can only be the quality ladder stepping down under us.
       * The child did not ask for that, was never told the ladder exists, and it
       * fires exactly when the bed is at its fullest. So the garden is carried
       * across rather than deleted.
       */
      const prevCss = builtCss.current;
      const childResized =
        !prevCss ||
        Math.round(prevCss.w) !== Math.round(cssW) ||
        Math.round(prevCss.h) !== Math.round(cssH);
      builtCss.current = { w: cssW, h: cssH };

      const old = field.current;
      if (!old || old.width !== w || old.height !== h) {
        if (old && !childResized) {
          field.current = resampleField(old, w, h);
        } else {
          field.current = createField(w, h);
          bedBare.current = true;
        }
      }
      cells = w * h;

      surf.width = w;
      surf.height = h;
      img = sctx.createImageData(w, h);
      px = img.data;
      // Opaque from the start, so the alpha channel is written once here
      // rather than on every cell of every frame.
      for (let i = 3; i < px.length; i += 4) px[i] = 255;

      snapshot = new Float32Array(Math.ceil(cells / SAMPLE_STRIDE));

      /*
       * The bed is drawn at CSS resolution, deliberately, and this is the one
       * place in the repo that does not take the device pixel ratio.
       *
       * The picture starts life as a grid a couple of hundred cells wide, so
       * putting it on a backing store twice the width of the screen invents no
       * detail whatsoever and costs four times the pixels to fill. The first
       * version did take the ratio, and with high-quality smoothing on top of
       * an eleven-fold upscale it locked the renderer hard enough that the
       * browser stopped answering at all. Both of those are gone.
       *
       * Default smoothing rather than 'high' for the same reason: the upscale
       * is large, bilinear is the part the GPU does for free, and on shapes
       * this soft there is nothing for a better filter to recover.
       */
      canvas.width = Math.max(1, Math.round(cssW));
      canvas.height = Math.max(1, Math.round(cssH));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;

      /* Built here rather than per frame: it depends only on the size. */
      vignette = ctx.createRadialGradient(
        cssW / 2,
        cssH * 0.46,
        Math.min(cssW, cssH) * 0.24,
        cssW / 2,
        cssH * 0.46,
        Math.max(cssW, cssH) * 0.72,
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, calm ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.58)');

      // The bed may be a different one now, and it certainly has no rule
      // written into it, so the next frame must write one and repaint.
      ruledX = NaN;
      ruledY = NaN;
      bedDirty.current = true;
    };

    /**
     * Drain the pointer queue into the bed.
     *
     * Points are joined up rather than stamped, because a finger dragged fast
     * across a touchscreen delivers points tens of pixels apart and a garden
     * planted as a dotted line is not what the child drew.
     */
    const drainStrokes = (): boolean => {
      const f = field.current;
      const q = strokeQueue.current;
      if (!f || q.length === 0) return false;

      const radius = Math.max(2, f.width * BRUSH_FRACTION);
      const sx = f.width / cssW;
      const sy = f.height / cssH;

      for (let i = 0; i < q.length; i += 2) {
        const cx = q[i] * sx;
        const cy = q[i + 1] * sy;
        const prev = lastPaint.current;
        if (prev) {
          const dx = cx - prev.x;
          const dy = cy - prev.y;
          const dist = Math.hypot(dx, dy);
          const steps = Math.min(48, Math.ceil(dist / (radius * 0.55)));
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            strokeCells.current += seedDisc(f, prev.x + dx * t, prev.y + dy * t, radius);
          }
        } else {
          strokeCells.current += seedDisc(f, cx, cy, radius);
        }
        lastPaint.current = { x: cx, y: cy };
      }
      q.length = 0;
      bedBare.current = false;
      return true;
    };

    /** How much the bed has moved since the last frame, on the sampled cells. */
    const measureChurn = (f: GardenField) => {
      if (!snapshot) return 0;
      const v = f.v;
      let sum = 0;
      let n = 0;
      for (let i = 0, s = 0; i < v.length; i += SAMPLE_STRIDE, s++) {
        sum += Math.abs(v[i] - snapshot[s]);
        snapshot[s] = v[i];
        n++;
      }
      return n > 0 ? sum / n : 0;
    };

    /* Light. It drifts, slowly, forever, which is most of why a still frame of
     * this does not feel like a still frame. Held still under reduced motion. */
    let lx = -0.42;
    let ly = -0.62;
    let lz = 0.66;

    const paint = (f: GardenField, t: number) => {
      if (!img || !px) return;
      const { width: w, height: h, v, left, right, up, down } = f;
      const p = padRefValue.current;
      const col = bedColours(p.x, p.y, calm);

      const drift = reduceMotion ? 0 : t * (calm ? 0.09 : 0.2);
      lx = -0.42 + Math.sin(drift) * 0.2;
      ly = -0.62 + Math.cos(drift * 0.77) * 0.14;
      lz = 0.66;
      const ll = Math.hypot(lx, ly, lz);
      lx /= ll;
      ly /= ll;
      lz /= ll;

      // Half vector against a viewer straight on. Constant per frame, so the
      // specular term costs one dot product per cell and nothing else.
      let hx = lx;
      let hy = ly;
      let hz = lz + 1;
      const hl = Math.hypot(hx, hy, hz);
      hx /= hl;
      hy /= hl;
      hz /= hl;

      // How steeply the relief rises out of the bed. The gradient of the
      // pattern IS the slope of the surface; there is no geometry anywhere.
      const RELIEF = calm ? 4.2 : 6.4;
      const SHEEN = calm ? 0.5 : 1;

      const [sr, sg, sb] = col.soil;
      const [dr, dg, db] = col.growthDeep;
      const [gr, gg, gb] = col.growth;
      const [rr, rg, rb] = col.rim;

      for (let y = 0; y < h; y++) {
        const rowC = y * w;
        const rowU = up[y] * w;
        const rowD = down[y] * w;
        for (let x = 0; x < w; x++) {
          const c = rowC + x;
          const vc = v[c];

          const gx = v[rowC + right[x]] - v[rowC + left[x]];
          const gy = v[rowD + x] - v[rowU + x];

          // Surface normal from the slope of the pattern itself.
          let nx = -gx * RELIEF;
          let ny = -gy * RELIEF;
          let nz = 1;
          const nl = Math.hypot(nx, ny, nz);
          nx /= nl;
          ny /= nl;
          nz /= nl;

          const ndl = nx * lx + ny * ly + nz * lz;
          const lit = ndl > 0 ? ndl : 0;
          const ndh = nx * hx + ny * hy + nz * hz;
          const spec = ndh > 0 ? Math.pow(ndh, 26) : 0;

          // How much of this cell is living matter. Two ramps rather than one,
          // so the growth has a dark heart and a lit shoulder and reads as
          // something with thickness on it.
          const t0 = vc < 0.1 ? 0 : vc > 0.36 ? 1 : (vc - 0.1) / 0.26;
          const body = t0 * t0 * (3 - 2 * t0);
          const t1 = vc < 0.22 ? 0 : vc > 0.5 ? 1 : (vc - 0.22) / 0.28;
          const crown = t1 * t1 * (3 - 2 * t1);

          // The iridescent edge. Steep slope means a face turned away from the
          // viewer, which on a real shell is exactly where the sheen sits.
          const slope = Math.hypot(gx, gy);
          const sheen = Math.min(1, slope * 7) * body * SHEEN;

          const base = 0.5 + 0.5 * lit;
          let r = sr + (dr - sr) * body + (gr - dr) * crown * base;
          let g = sg + (dg - sg) * body + (gg - dg) * crown * base;
          let b = sb + (db - sb) * body + (gb - db) * crown * base;

          r += rr * sheen * 0.5 + 210 * spec * body;
          g += rg * sheen * 0.5 + 215 * spec * body;
          b += rb * sheen * 0.5 + 205 * spec * body;

          const o = c << 2;
          px[o] = r;
          px[o + 1] = g;
          px[o + 2] = b;
        }
      }

      sctx.putImageData(img, 0, 0);
      ctx.drawImage(surf, 0, 0, cssW, cssH);

      /* A soft darkening toward the edges, so the bed reads as a place with a
       * middle rather than as a rectangle of texture. */
      if (vignette) {
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, cssW, cssH);
      }
    };

    let raf = 0;
    let mounted = true;
    let last = 0;
    const start = performance.now();
    const frameInterval = 1000 / 32;

    /* Adaptive quality. Measured, not guessed, and it only ever steps down. */
    let costSum = 0;
    let costCount = 0;
    let downgraded = false;
    let frames = 0;

    const tick = (nowMs: number) => {
      if (!mounted) return;
      raf = requestAnimationFrame(tick);
      if (nowMs - last < frameInterval) return;
      last = nowMs;

      const f = field.current;
      if (!f || cssW < 2) return;

      const t0 = performance.now();
      frames++;

      const planted = drainStrokes();

      // Writing the rule into every cell is thirty thousand writes, so it
      // happens when the control moves rather than on every frame.
      const p = padRefValue.current;
      const retuned = p.x !== ruledX || p.y !== ruledY;
      if (retuned) {
        ruledX = p.x;
        ruledY = p.y;
        const rule = ruleAt(p.x, p.y);
        setUniformRule(f, rule.feed, rule.kill);
      }

      // How many chemistry steps this frame gets. Under reduced motion, only
      // what a touch has paid for.
      let steps = stepsPerFrame;
      if (reduceMotion) {
        steps = Math.min(stepsPerFrame, pulse.current);
        pulse.current -= steps;
      }

      if (steps > 0) stepField(f, steps);

      // Measured every frame now rather than only on the frames that draw, so
      // the shimmer follows the bed instead of following the repaint decision.
      // It falls to nothing on its own when the bed stops moving, which is what
      // the old decay was imitating.
      churn.current = measureChurn(f);

      /*
       * Whether there is anything worth drawing.
       *
       * Something the child did always draws. Beyond that:
       *
       *   - No steps ran, so nothing moved. This is what makes reduced motion a
       *     still bed rather than a still picture with a loop running behind it.
       *   - Steps ran but the bed has nothing growing on it. Bare soil under a
       *     drifting light is a flat field either way, so the thirty thousand
       *     cells would be spent producing the picture that is already on
       *     screen. An untouched activity left open on a tablet should not be
       *     warming it.
       *
       * Once anything is growing this is true every frame, so the drifting sheen
       * on a real garden is untouched.
       */
      const forced = planted || retuned || bedDirty.current;
      bedDirty.current = false;
      const repaint = forced || (steps > 0 && !bedBare.current);
      if (!repaint) return;

      paint(f, (nowMs - start) / 1000);

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
    };

    build();

    const ro = new ResizeObserver(() => build());
    ro.observe(canvas);

    raf = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [quality, calm, reduceMotion]);

  /* ── Sound follows the growth ──────────────────────────────────────────
   *
   * Read on its own slow timer rather than inside the render loop, because a
   * gain node set sixty times a second from a value measured sixty times a
   * second is a zipper noise, and because the audio graph should not be part of
   * the frame budget.
   */
  useEffect(() => {
    const id = setInterval(() => {
      const a = audio.current;
      if (!a) return;
      const level = Math.min(1, churn.current * 26);
      a.shimmerGain.gain.setTargetAtTime(0.006 + 0.075 * level, a.ctx.currentTime, 0.25);
      a.padGain.gain.setTargetAtTime(0.05 + 0.03 * level, a.ctx.currentTime, 0.4);
    }, 180);
    return () => clearInterval(id);
  }, []);

  /* ── The control map ───────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = padRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let atlas: GardenField | null = null;
    let grown = 0;
    let img: ImageData | null = null;
    let px: Uint8ClampedArray | null = null;
    let cssW = 0;
    let cssH = 0;

    /* Palette lookups. The growth and soil hues depend only on the sideways
     * axis and the rim hue only on the up axis, exactly as paletteAt is
     * defined, so a whole colour table is one row plus one column rather than
     * a value per cell. */
    let colX: RGB[][] = [];
    let rimY: RGB[] = [];

    /* One buffer, made once. The map paints about a hundred times while it
     * grows in, and a fresh canvas each time would be a hundred of them. */
    const buf = document.createElement('canvas');
    const bctx = buf.getContext('2d');
    if (!bctx) return;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      padRect.current = rect;
      if (cssW < 8 || cssH < 8) return;

      const w = Math.max(24, Math.round(cssW * ATLAS_SCALE));
      const h = Math.max(18, Math.round(cssH * ATLAS_SCALE));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;

      atlas = createField(w, h);
      grown = 0;

      // The rule varies across the map, so each column and row of the map is
      // the rule the control would give at that spot. That is what makes this
      // a real picture of what grows where rather than an illustration of it.
      for (let y = 0; y < h; y++) {
        const py = 1 - y / (h - 1);
        for (let x = 0; x < w; x++) {
          const pxn = x / (w - 1);
          const feedV = FEED_MIN + (FEED_MAX - FEED_MIN) * pxn;
          const depth = DEPTH_MIN + (DEPTH_MAX - DEPTH_MIN) * py;
          const c = y * w + x;
          atlas.feed[c] = feedV;
          atlas.kill[c] = killCeiling(feedV) - depth;
        }
      }

      // Deterministic scatter, so the map looks the same every time a child
      // opens the activity and becomes something they can recognise.
      let seed = 20260824;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 26; i++) {
        seedDisc(atlas, rnd() * w, rnd() * h, 2.2);
      }

      /*
       * Under reduced motion the map is grown here, in one go, and never
       * animated.
       *
       * The bed honours the setting and this did not, which made the setting a
       * half measure: a child who needs the screen to hold still got a hundred
       * frames of chemistry crawling across the control the moment the activity
       * opened, and unlike the bed it was not even something they had done. It
       * is also the worst offender of the two, because it starts at mount, so it
       * greets them with it.
       *
       * The whole run costs a few tens of milliseconds once, against a map that
       * is then painted a single time and holds.
       */
      if (reduceMotion) {
        stepField(atlas, ATLAS_STEPS_TOTAL);
        grown = ATLAS_STEPS_TOTAL;
      }

      img = ctx.createImageData(w, h);
      px = img.data;
      for (let i = 3; i < px.length; i += 4) px[i] = 255;
      buf.width = w;
      buf.height = h;

      colX = [];
      for (let x = 0; x < w; x++) {
        const p = paletteAt(x / (w - 1), 0.5);
        colX.push([hsl(p.soilHue, 30, 6), hsl(p.growthHue, calm ? 46 : 62, calm ? 42 : 50)]);
      }
      rimY = [];
      for (let y = 0; y < h; y++) {
        const p = paletteAt(0.5, 1 - y / (h - 1));
        rimY.push(hsl(p.rimHue, calm ? 55 : 86, calm ? 52 : 64));
      }
    };

    const paint = () => {
      if (!atlas || !img || !px) return;
      const { width: w, height: h, v, left, right, up, down } = atlas;

      for (let y = 0; y < h; y++) {
        const rowC = y * w;
        const rowU = up[y] * w;
        const rowD = down[y] * w;
        const [rr, rg, rb] = rimY[y];
        for (let x = 0; x < w; x++) {
          const c = rowC + x;
          const vc = v[c];
          const [soil, growth] = colX[x];

          const gx = v[rowC + right[x]] - v[rowC + left[x]];
          const gy = v[rowD + x] - v[rowU + x];
          const slope = Math.hypot(gx, gy);

          const t = vc < 0.1 ? 0 : vc > 0.4 ? 1 : (vc - 0.1) / 0.3;
          const body = t * t * (3 - 2 * t);
          const sheen = Math.min(1, slope * 6) * body * 0.55;

          const o = c << 2;
          px[o] = soil[0] + (growth[0] - soil[0]) * body + rr * sheen;
          px[o + 1] = soil[1] + (growth[1] - soil[1]) * body + rg * sheen;
          px[o + 2] = soil[2] + (growth[2] - soil[2]) * body + rb * sheen;
        }
      }

      bctx.putImageData(img, 0, 0);
      ctx.drawImage(buf, 0, 0, cssW, cssH);
    };

    let raf = 0;
    let mounted = true;

    const tick = () => {
      if (!mounted) return;
      if (atlas && grown < ATLAS_STEPS_TOTAL) {
        stepField(atlas, ATLAS_STEPS_PER_FRAME);
        grown += ATLAS_STEPS_PER_FRAME;
        paint();
        raf = requestAnimationFrame(tick);
        return;
      }
      // Grown in. The map does not change again, so nothing keeps running.
    };

    // Grown already under reduced motion, so there is no loop to start. Not
    // merely a loop that would exit on its own: nothing is scheduled at all.
    build();
    paint();
    if (!reduceMotion) raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      build();
      paint();
      cancelAnimationFrame(raf);
      if (!reduceMotion) raf = requestAnimationFrame(tick);
    });
    ro.observe(canvas);

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [calm, reduceMotion]);

  /* ── UI ────────────────────────────────────────────────────────────────── */

  const soil = bedColours(pad.x, pad.y, calm).soil;
  const soilCss = `rgb(${soil[0] | 0},${soil[1] | 0},${soil[2] | 0})`;

  return (
    <div className="relative flex h-full w-full flex-col" style={{ background: soilCss }}>
      <canvas
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label="A dark garden bed. Drag a finger across it to plant seeds, and patterns grow out from where you touched. Press space to plant in the middle."
        className="min-h-0 w-full flex-1"
        style={{ touchAction: 'none', cursor: 'crosshair', display: 'block' }}
        onPointerDown={onBedPointerDown}
        onPointerMove={onBedPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onKeyDown={onBedKeyDown}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* Controls. Deliberately thin and dark so the bed stays the subject. */}
      <div
        className="relative shrink-0 px-4 pb-4 pt-3"
        style={{ background: 'linear-gradient(to top, rgba(4,12,10,0.96), rgba(4,12,10,0))' }}
      >
        {/*
          The card floats above the controls rather than sitting in the column,
          and that is not a cosmetic choice.

          In flow it is a real 82px tall box, and the bed is the flex child that
          gives those pixels up. A bed that changes size gets a new field, and a
          new field is bare soil by design. So the card cost the child their
          garden: the observed pass measured coverage going from 0.15 to 0.00 on
          the frame the first sentence arrived, and again every time a card
          came or went. The child was told "your touch grew a pattern" while the
          pattern was being wiped underneath the words, which is the exact
          opposite of what the sentence is for.

          Out of flow, the card lands in the same place on screen and the bed
          never resizes. NamingCard renders nothing when there is no line, so
          this wrapper is a zero height box that catches no touches while the
          garden is quiet.
        */}
        <div className="absolute inset-x-4 bottom-full">
          <NamingCard
            line={guided.line}
            onDismiss={guided.dismiss}
            accent={ACCENT}
            tone="dark"
            className="mb-3"
          />
        </div>

        <div className="flex items-end gap-4">
          {/* The control stone.
              No numbers, no labels, no axis names. The map underneath is a real
              garden grown under the very rules the control gives, so what is
              over there is what will grow. */}
          <div className="relative shrink-0" style={{ width: 132, height: 92 }}>
            <canvas
              ref={padRef}
              role="application"
              tabIndex={0}
              aria-label="Where in the garden to plant. Drag the stone, or use the arrow keys. Every place on this map grows something."
              aria-describedby="garden-pad-note"
              className="h-full w-full rounded-xl"
              style={{
                touchAction: 'none',
                cursor: 'grab',
                display: 'block',
                border: '1px solid rgba(63,169,138,0.35)',
              }}
              onPointerDown={onPadPointerDown}
              onPointerMove={onPadPointerMove}
              onPointerUp={onPadPointerUp}
              onPointerCancel={onPadPointerUp}
              onKeyDown={onPadKeyDown}
            />
            {/* The stone itself, drawn over the map rather than into it, so
                dragging it never costs a repaint of the garden underneath. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full"
              style={{
                width: 22,
                height: 22,
                left: `calc(${pad.x * 100}% - 11px)`,
                top: `calc(${(1 - pad.y) * 100}% - 11px)`,
                border: '2px solid rgba(255,255,255,0.92)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.6)',
                background: 'rgba(255,255,255,0.10)',
              }}
            />
            <span id="garden-pad-note" className="sr-only">
              {describeGarden(pad.x, pad.y)}
            </span>
          </div>

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
                  // A child may reach for sound before touching the bed, and
                  // this is the gesture that permits audio, so it has to be
                  // able to build the graph on its own.
                  ensureAudio();
                  setVolume(Number(e.target.value));
                }}
                aria-label="Sound volume. Starts off. The activity is complete with the sound off."
                className="h-11 min-w-0 flex-1 cursor-pointer bg-transparent"
                style={{ accentColor: ACCENT }}
              />
            </label>

            <button
              type="button"
              onClick={freshSoil}
              className="mt-1 rounded-xl border-none px-4 text-[13px] font-semibold"
              style={{
                minHeight: 44,
                background: 'rgba(63,169,138,0.16)',
                color: '#9FE3C8',
                cursor: 'pointer',
              }}
            >
              Fresh soil
            </button>
          </div>
        </div>
      </div>

      {/*
        Keyboard focus, drawn inside the box.

        A global :focus-visible rule paints a 3px orange outline on whatever has
        focus, and on a canvas that fills the screen that outline lands on the
        viewport edges, so all a keyboard user actually sees is one orange line
        under the header. A negative offset pulls the ring inside the element so
        all four edges are on screen, and styled-jsx scopes it tightly enough to
        win. Same fix as Water Sphere, and for the same reason.
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
