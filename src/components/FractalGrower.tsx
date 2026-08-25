'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NamingCard from '@/components/guided/NamingCard';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useGuidedDiscovery } from '@/hooks/useGuidedDiscovery';
import {
  ANGLE_MAX,
  ANGLE_MIN,
  PRESETS,
  PRESET_IDS,
  RATIO_MAX,
  RATIO_MIN,
  cameraFor,
  clampAngle,
  clampGrowth,
  clampRatio,
  describeStructure,
  growStructure,
  paletteAt,
  projectPoint,
  type Camera,
  type PresetId,
  type Structure,
} from '@/lib/fractal-grower';
import {
  initialDiscoveryState,
  stepDiscovery,
  type FractalDiscoveryId,
  type FractalDiscoveryState,
} from '@/lib/fractal-grower-discovery';

/**
 * Fractal Grower.
 *
 * A seed on the ground. Drag up from it and a stem comes out. Keep dragging and
 * the stem splits, and each piece splits, and each piece of that splits, and the
 * thing standing on the screen is a tree the child grew rather than a tree they
 * were shown.
 *
 * Then their hands find the two numbers the split is using. Drag sideways on the
 * structure and the branching angle opens: a tight pine spreads into an oak, and
 * it happens at every size at once, because the angle they are holding is the
 * angle used at every split all the way down. Drag up and down on it and the
 * children get longer against their parents, until near the top of that range
 * everything overlaps everything and it is a coral. Tap a different seed and the
 * same recursion, given a different split, makes a fern, a fork of lightning, a
 * river delta.
 *
 * There is nothing to reach, nothing to lose, no wrong structure and no question
 * anywhere in it. Four sentences arrive, once each, after the child has already
 * made the thing each one describes.
 *
 * WHAT IS ACTUALLY HAPPENING
 *
 * One recursion, in `fractal-grower.ts`, with two parameters under the child's
 * fingers and four small tables of multipliers for the four seeds. That file is
 * pure and every claim this activity makes to a child is measured in its suite:
 * the turn off the parent is recovered from the geometry and asserted to be the
 * same at every generation, the bounding box is swept across the whole angle
 * range, and the recursion is handed a rule that exists nowhere in the product
 * to prove no seed has code of its own. When a naming line is earned is decided
 * by a pure reducer in `fractal-grower-discovery.ts`.
 *
 * HOW IT IS DRAWN
 *
 * One 2D canvas, hand rolled, no 3D dependency, exactly as the other science
 * sandboxes do it. The structure is genuinely three dimensional: every split
 * throws its children around the parent stem as well as out from it, and the
 * whole thing is put on the screen with a weak perspective divide. Nearer
 * branches are drawn larger, further ones are faded into the sky, and the
 * thickness tapers with the generation, so a flat canvas holds something with a
 * front and a back. The camera is placed from the structure's own measured
 * depth rather than parked at a fixed distance, because a dense coral reaches
 * four and a half trunk lengths deep and a fixed camera would have branches
 * coming out behind the child's eye.
 *
 * Strokes are filled tapered ribbons with a bow along their length rather than
 * lines with a width, which is what stops a thousand branches looking like a
 * wiring diagram.
 *
 * MOTION
 *
 * The structure sways while a finger is on it, and the sway leans with where
 * that finger is: far branches lag, near branches lead, which is parallax and
 * is most of why it reads as depth. When the finger lifts the sway settles and
 * the loop stops painting entirely. Nothing moves on this screen that the child
 * did not just do, which is both the reduced-motion contract and the reason a
 * tablet left open on this activity is not warming itself.
 *
 * SOUND OFF
 *
 * The activity is whole with the volume at zero, which is where it starts.
 *
 * Issue: #225 (wave 3, Fractal Grower)
 */

/* ─────────────────────────────────────────────────────────────────────────
 * Colour
 *
 * Every hue comes from paletteAt, which folds through safeHue, and the suite
 * samples every seed's whole arc to prove nothing lands in the banned 270-350
 * band. It also proves the arcs are narrow enough that a BLEND between any two
 * of a seed's colours stays out of the band, which is what makes the fade into
 * the sky below safe: it is a straight mix in RGB.
 * ───────────────────────────────────────────────────────────────────────── */

type RGB = [number, number, number];

function hslRgb(h: number, s: number, l: number): RGB {
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

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function cssRgb(c: RGB): string {
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

/** The sky, the ground and the stems for one seed, in Calm Mode or out of it. */
interface SceneColours {
  skyTop: RGB;
  skyBottom: RGB;
  ground: RGB;
  haze: RGB;
}

function sceneColours(preset: PresetId, calm: boolean): SceneColours {
  const p = paletteAt(preset, 0.5);
  return {
    skyTop: hslRgb(p.skyHue, calm ? 16 : 24, calm ? 8 : 7),
    skyBottom: hslRgb(p.skyHue, calm ? 22 : 34, calm ? 16 : 17),
    ground: hslRgb(p.skyHue, calm ? 18 : 26, calm ? 11 : 11),
    haze: hslRgb(p.skyHue, calm ? 20 : 30, calm ? 20 : 22),
  };
}

/** Accent for the naming card and the controls. Sea green, well outside the ban. */
const ACCENT = '#3FA98A';

/* ─────────────────────────────────────────────────────────────────────────
 * Sizing, pacing, feel
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Quality ladder.
 *
 * Every rung is about PAINT and nothing else: how many device pixels, whether
 * the lit edge is stroked, whether the soft mark at each growing tip is drawn.
 * The structure is not on the ladder and cannot be, because it is a pure
 * function of the four numbers the child is holding, and those live in refs
 * that a re-render does not touch.
 *
 * That is deliberate and it is the lesson from Pattern Garden, where the ladder
 * rebuilt the simulation grid and deleted the child's garden at the exact
 * moment it was fullest. Here a downgrade is invisible except that the edges
 * get simpler; the tree the child grew is the same tree, to the last branch.
 */
interface QualityRung {
  maxDpr: number;
  highlight: boolean;
  tips: boolean;
}
const QUALITY: QualityRung[] = [
  { maxDpr: 2, highlight: true, tips: true },
  { maxDpr: 1.5, highlight: false, tips: true },
  { maxDpr: 1, highlight: false, tips: false },
];

/** Frames are capped: nothing here needs sixty, and thirty is kinder to a tablet. */
const FRAME_INTERVAL_MS = 1000 / 32;

/** Mean paint cost, in milliseconds, above which the ladder steps down once. */
const DOWNGRADE_COST_MS = 20;
const DOWNGRADE_WINDOW = 32;

/**
 * How far a finger travels to cover each control, in pixels.
 *
 * Chosen against a hand rather than against a number line: the full travel of
 * each one is roughly the width or height of a tablet held in two hands, so a
 * child can reach either end in one gesture without having to be precise about
 * it, and a small movement is genuinely a small change.
 */
const GROW_TRAVEL_PX = 420;
const ANGLE_TRAVEL_PX = 340;
const RATIO_TRAVEL_PX = 380;

/**
 * The bottom band where a drag grows rather than shapes.
 *
 * The child is never told which is which, because they do not need to be. At
 * the start the screen holds a seed on the ground and nothing else, so the only
 * place to put a finger is down there and the only direction that does anything
 * is up. Once a structure exists it fills the space above, and a finger on it
 * shapes it. The thing under the finger is the thing you get.
 */
const GRIP_BAND = 0.26;

/** Where the ground sits, as a fraction of the canvas height. */
const GROUND_LINE = 0.86;

/**
 * How far ahead of the child the frame is fitted.
 *
 * The frame is sized for a structure this much further grown than the one on
 * screen, floored so that the very first pull is not a speck. Measured on the
 * observed pass: fitting to full growth put the child's first split at nine
 * percent of the canvas height, and these numbers put it near half.
 *
 * The multiplier is above one so there is always sky left to grow into, and the
 * floor stops that sky being the entire screen at the start.
 */
const FRAME_LOOKAHEAD = 1.6;
const FRAME_FLOOR = 0.35;

function frameGrowthFor(growth: number): number {
  return Math.min(1, Math.max(FRAME_FLOOR, growth * FRAME_LOOKAHEAD));
}

/** How much of the canvas the structure is fitted into. */
const FIT_W = 0.86;
const FIT_H = 0.78;

/** Sway, in model units at the top of the structure. Small on purpose. */
const SWAY = 0.055;
const CALM_SWAY = 0.03;
/** How far the near and far branches lean apart as the finger moves. */
const PARALLAX = 0.16;
/** How fast the sway settles after the finger lifts. Higher is quicker. */
const SWAY_DECAY = 2.6;
/** Below this the sway is over, the last frame is painted, and the loop stops. */
const SWAY_FLOOR = 0.004;

/** How often the structure is looked at, once the child has started. */
const SETTLE_INTERVAL_MS = 1400;
/** How long it must be left alone before a look counts as a settled one. */
const SETTLE_QUIET_MS = 700;

/** Fixes the wobble on the branches. The same seed grows the same tree, always. */
const SEED = 20260825;

/* ─────────────────────────────────────────────────────────────────────────
 * Seed thumbnails
 *
 * Drawn from the real rule, as SVG, and painted by the browser once.
 *
 * They could have been four little canvases, and that is exactly what they are
 * not. Pattern Garden shipped a second canvas under its control and that canvas
 * animated itself from the moment the activity mounted, which is the one thing
 * the mount gate forbids, and it was found by instrumenting the page rather than
 * by reading the code. The cheapest way not to have that bug is not to have the
 * canvas: there is one canvas in this file, so there is one animation loop to
 * account for.
 * ───────────────────────────────────────────────────────────────────────── */

/** How deep a thumbnail grows. Enough to show the nature, cheap enough to inline. */
const THUMB_GENERATIONS = 3;

function thumbPaths(preset: PresetId): { d: string; width: number }[] {
  const rule = PRESETS[preset];
  const s = growStructure({
    preset,
    angle: 0.55,
    ratio: 0.72,
    growth: THUMB_GENERATIONS / rule.maxDepth,
    seed: SEED,
  });
  const cam = cameraFor(s);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const points = s.segments.map((seg) => {
    const a = projectPoint(seg.x0, seg.y0, seg.z0, cam);
    const b = projectPoint(seg.x1, seg.y1, seg.z1, cam);
    for (const q of [a, b]) {
      if (q.x < minX) minX = q.x;
      if (q.x > maxX) maxX = q.x;
      if (q.y < minY) minY = q.y;
      if (q.y > maxY) maxY = q.y;
    }
    return { a, b, generation: seg.generation };
  });

  const w = Math.max(1e-6, maxX - minX);
  const h = Math.max(1e-6, maxY - minY);
  const scale = Math.min(34 / w, 34 / h);
  const ox = 20 - ((minX + maxX) / 2) * scale;
  const oy = 38 + minY * scale;

  const byGeneration = new Map<number, string[]>();
  for (const p of points) {
    const d = `M${(ox + p.a.x * scale).toFixed(2)} ${(oy - p.a.y * scale).toFixed(2)}L${(
      ox +
      p.b.x * scale
    ).toFixed(2)} ${(oy - p.b.y * scale).toFixed(2)}`;
    const list = byGeneration.get(p.generation) ?? [];
    list.push(d);
    byGeneration.set(p.generation, list);
  }

  return [...byGeneration.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([generation, ds]) => ({
      d: ds.join(''),
      width: Math.max(0.8, 3 * Math.pow(rule.taper, generation)),
    }));
}

/* ─────────────────────────────────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────────────────────────────────── */

export default function FractalGrower() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [preset, setPreset] = useState<PresetId>('tree');
  /**
   * Sound OFF until the child asks for it.
   *
   * Ripples, Water Sphere and Pattern Garden all default their sound off behind
   * an explicit press, and an unrequested hum the moment a finger lands is
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
   * what the structure IS: keeping them out of the render tree is why a quality
   * downgrade, a resize or a re-render cannot cost the child their tree.
   */
  const params = useRef({ angle: 0.42, ratio: 0.7, growth: 0 });
  const presetRef = useRef(preset);
  presetRef.current = preset;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  /** Published copy of the parameters, for the screen reader only. */
  const [described, setDescribed] = useState({ angle: 0.42, ratio: 0.7, generations: 0 });

  /* Pointer, coalesced. Handlers only enqueue; the parameters move once per
   * frame, in the tick. A drag on a touchscreen delivers events far faster than
   * frames, and applying them in the handler would regrow the structure several
   * times over for one picture. Deltas are summed across everything queued, so
   * a fast flick keeps all of its travel rather than only its last hop. */
  const queue = useRef<number[]>([]);
  const gesture = useRef<'none' | 'grow' | 'shape'>('none');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const canvasRect = useRef<DOMRect | null>(null);

  /** Where the finger is, in -1..1 from the middle. Drives the parallax lean. */
  const lean = useRef({ x: 0, y: 0 });
  /** How much the structure is swaying. Rises under a finger, settles after. */
  const swayAmp = useRef(0);
  const holding = useRef(false);

  /** Set when something changed and the canvas owes a repaint. */
  const dirty = useRef(true);
  /**
   * Wakes the render loop.
   *
   * The loop does not run continuously. It stops itself once the structure is
   * still and there is nothing queued, and every input path calls this to start
   * it again. A loop that runs forever and returns early is cheap but it is not
   * nothing, and on an activity a child may leave open on a tablet for an hour
   * the honest answer to "is anything running" should be no.
   */
  const wake = useRef<(() => void) | null>(null);
  /** Set when the parameters moved and the structure has to be grown again. */
  const needsRegrow = useRef(true);
  /** When the child last did anything, so a settled look is really settled. */
  const lastActed = useRef(0);
  /** How much the structure changed lately, which is what the sound follows. */
  const churn = useRef(0);

  const structure = useRef<Structure | null>(null);
  /**
   * The frame the structure is drawn into.
   *
   * Not fitted to the structure as it stands. That would scale a two-inch
   * sprout up to fill the screen and the child's drag would appear to do
   * nothing at all: the tree would stay the same size and only gain detail.
   *
   * The first version fitted to the structure at FULL growth instead, and the
   * observed pass measured what that costs: the first split a child ever makes
   * came out 176 pixels tall on a 1943 pixel canvas, nine percent of the
   * screen, a speck above the seed. The whole activity is do-then-see, and that
   * was barely see.
   *
   * So the frame runs AHEAD of the child rather than all the way ahead. See
   * frameGrowthFor: it is fitted to a structure somewhat taller than the one
   * they have, which leaves the sprout large enough to read while still leaving
   * sky above it to grow into.
   */
  const frame = useRef<{
    cam: Camera;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null>(null);

  /* Guided naming */
  const discovery = useRef<FractalDiscoveryState>(initialDiscoveryState());
  const pendingNames = useRef<FractalDiscoveryId[]>([]);

  const guided = useGuidedDiscovery({
    activityId: 'fractal',
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
    rustleGain: GainNode;
    rustleFilter: BiquadFilterNode;
  } | null>(null);

  /* ── Naming pipeline ───────────────────────────────────────────────────
   *
   * The reducer can name more than one thing in a single step: a child who
   * grows a deep structure, sweeps the angle and taps a second seed before
   * pausing can earn all four at once, which is a lecture. So they queue and
   * are handed over one at a time.
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

  /* ── Looking at the structure ──────────────────────────────────────────
   *
   * Once every second and a bit, and only when the child has left it alone long
   * enough that what is standing there is what they meant. Not every frame: a
   * structure watched continuously would hand a child every sentence in the
   * first two seconds of play, which is a lecture wearing a costume.
   */
  useEffect(() => {
    const id = setInterval(() => {
      if (lastActed.current === 0) return;
      if (performance.now() - lastActed.current < SETTLE_QUIET_MS) return;
      feed({ type: 'settle', generations: structure.current?.generations ?? 0 });
    }, SETTLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [feed]);

  /* ── Audio ─────────────────────────────────────────────────────────────
   *
   * A low pad whose pitch follows the branching angle, and a breath of filtered
   * noise that rises while the structure is being changed and falls away when
   * the hand stops. So growing is audible as well as visible, and a still tree
   * is silent.
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
    master.gain.value = (volumeRef.current / 100) * 0.5;
    master.connect(ctx.destination);

    const padHz = 196 - 78 * ((params.current.angle - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN));
    const padGain = ctx.createGain();
    padGain.gain.value = 0.06;
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
    const padB = mk(padHz * 1.004);

    // The rustle. A short looping buffer is cheaper than a live source and at
    // this filter width nobody can hear the loop.
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp = 0.9 * lp + 0.1 * (Math.random() * 2 - 1);
      data[i] = lp * 2.8;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const rustleFilter = ctx.createBiquadFilter();
    rustleFilter.type = 'bandpass';
    rustleFilter.frequency.value = 1400;
    rustleFilter.Q.value = 0.7;
    const rustleGain = ctx.createGain();
    rustleGain.gain.value = 0;
    noise.connect(rustleFilter);
    rustleFilter.connect(rustleGain);
    rustleGain.connect(master);
    noise.start();

    audio.current = { ctx, master, padA, padB, padGain, rustleGain, rustleFilter };
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

  /* Sound follows the hand. Read on its own slow timer rather than inside the
   * render loop, because a gain node set thirty times a second from a value
   * measured thirty times a second is a zipper noise, and because the audio
   * graph should not be part of the frame budget. */
  useEffect(() => {
    const id = setInterval(() => {
      const a = audio.current;
      if (!a) return;
      const level = Math.min(1, churn.current * 9);
      const t = a.ctx.currentTime;
      a.rustleGain.gain.setTargetAtTime(0.004 + 0.08 * level, t, 0.2);
      a.padGain.gain.setTargetAtTime(0.045 + 0.03 * level, t, 0.35);
      const hz = 196 - 78 * ((params.current.angle - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN));
      a.padA.frequency.setTargetAtTime(hz, t, 0.12);
      a.padB.frequency.setTargetAtTime(hz * 1.004, t, 0.12);
      a.rustleFilter.frequency.setTargetAtTime(
        900 + 1400 * ((params.current.ratio - RATIO_MIN) / (RATIO_MAX - RATIO_MIN)),
        t,
        0.2,
      );
      churn.current *= 0.55;
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
      const y = e.clientY - rect.top;
      gesture.current = y > rect.height * (1 - GRIP_BAND) ? 'grow' : 'shape';
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

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const p = params.current;
      const rule = PRESETS[presetRef.current];
      let handled = true;

      if (e.key === 'ArrowUp' && e.shiftKey) p.ratio = clampRatio(p.ratio + 0.04);
      else if (e.key === 'ArrowDown' && e.shiftKey) p.ratio = clampRatio(p.ratio - 0.04);
      else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        // One whole generation per press, so a keyboard user watches the same
        // splits appear that a finger does, rather than a smooth creep.
        p.growth = clampGrowth(p.growth + 1 / rule.maxDepth);
      } else if (e.key === 'ArrowDown') p.growth = clampGrowth(p.growth - 1 / rule.maxDepth);
      else if (e.key === 'ArrowLeft') p.angle = clampAngle(p.angle - 0.1);
      else if (e.key === 'ArrowRight') p.angle = clampAngle(p.angle + 0.1);
      else handled = false;

      if (!handled) return;
      e.preventDefault();
      ensureAudio();
      acted();
      needsRegrow.current = true;
      dirty.current = true;
      wake.current?.();
    },
    [acted, ensureAudio],
  );

  const pickSeed = useCallback(
    (id: PresetId) => {
      ensureAudio();
      acted();
      setPreset(id);
      feed({ type: 'seed', preset: id });
      needsRegrow.current = true;
      dirty.current = true;
      wake.current?.();
    },
    [acted, ensureAudio, feed],
  );

  const freshSeed = useCallback(() => {
    acted();
    params.current.growth = 0;
    needsRegrow.current = true;
    dirty.current = true;
    wake.current?.();
    // Deliberately does NOT reset the naming state. Those lines are once each
    // per session however many structures the child grows, because repeating
    // them would turn a calm sentence into a nag.
  }, [acted]);

  /* ── Live region ───────────────────────────────────────────────────────
   *
   * The picture tells a sighted child what is standing there. This says the
   * same, once per change, for a child using a screen reader. Not chatty: it is
   * published from the render loop on a debounce, and only when the sentence it
   * would say has actually changed.
   */
  const describedText = useMemo(
    () => describeStructure(preset, described.angle, described.ratio, described.generations),
    [preset, described],
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
    const rule = PRESETS[preset];
    const scene = sceneColours(preset, calm);
    const swayScale = calm ? CALM_SWAY : SWAY;

    let cssW = 0;
    let cssH = 0;
    let skyGradient: CanvasGradient | null = null;
    let groundGradient: CanvasGradient | null = null;

    /* Colour per generation, built once here rather than per segment per frame:
     * it depends only on the seed and the generation, and there are at most ten
     * generations against up to a thousand segments. */
    const stemColour: RGB[] = [];
    const litColour: RGB[] = [];
    for (let g = 0; g < rule.maxDepth; g++) {
      const p = paletteAt(preset, rule.maxDepth === 1 ? 0 : g / (rule.maxDepth - 1));
      stemColour.push(hslRgb(p.stemHue, calm ? 34 : 46, calm ? 34 : 38 + g * 2));
      litColour.push(hslRgb(p.litHue, calm ? 40 : 58, calm ? 52 : 62));
    }

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

      skyGradient = ctx.createLinearGradient(0, 0, 0, cssH);
      skyGradient.addColorStop(0, cssRgb(scene.skyTop));
      skyGradient.addColorStop(1, cssRgb(scene.skyBottom));

      groundGradient = ctx.createLinearGradient(0, cssH * GROUND_LINE, 0, cssH);
      groundGradient.addColorStop(0, cssRgb(scene.ground));
      groundGradient.addColorStop(1, cssRgb(mixRgb(scene.ground, [0, 0, 0], 0.55)));

      // The structure is untouched by any of this. Its parameters live in refs,
      // so a resize, a rotation or a step down the quality ladder gives the
      // child back the same tree at a different size.
      needsRegrow.current = true;
      dirty.current = true;
    };

    /** Grow the structure again from whatever the child is currently holding. */
    const regrow = () => {
      const p = params.current;
      structure.current = growStructure({
        preset,
        angle: p.angle,
        ratio: p.ratio,
        growth: p.growth,
        seed: SEED,
      });
    };

    /**
     * Re-fit the frame.
     *
     * Costs one extra grow of a structure the child never sees, on the frames
     * where they are actually dragging. That is the price of a frame that is
     * neither glued to the tree nor fixed at its final size, and at a thousand
     * segments it is a fraction of a millisecond.
     */
    const refit = () => {
      const p = params.current;
      const full = growStructure({
        preset,
        angle: p.angle,
        ratio: p.ratio,
        growth: frameGrowthFor(p.growth),
        seed: SEED,
      });
      const cam = cameraFor(full);
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const seg of full.segments) {
        const a = projectPoint(seg.x0, seg.y0, seg.z0, cam);
        const b = projectPoint(seg.x1, seg.y1, seg.z1, cam);
        for (const q of [a, b]) {
          if (q.x < minX) minX = q.x;
          if (q.x > maxX) maxX = q.x;
          if (q.y < minY) minY = q.y;
          if (q.y > maxY) maxY = q.y;
        }
      }
      if (!Number.isFinite(minX)) {
        minX = -0.5;
        maxX = 0.5;
        minY = 0;
        maxY = 1;
      }
      frame.current = { cam, minX, maxX, minY, maxY };
    };

    /**
     * Drain the pointer queue into the parameters.
     *
     * One mutation per frame. Deltas are summed across every point queued since
     * the last frame, so a fast flick keeps all of its travel: taking only the
     * newest point would quietly throw away most of a quick gesture.
     */
    /** What the drag did, handed to the reducer once the structure is current. */
    const drained: Parameters<typeof stepDiscovery>[1][] = [];

    const drain = (): boolean => {
      const q = queue.current;
      if (q.length === 0) return false;

      const p = params.current;
      const rect = canvasRect.current;
      let dx = 0;
      let dy = 0;

      for (let i = 0; i < q.length; i += 2) {
        const x = q[i];
        const y = q[i + 1];
        const prev = lastPoint.current;
        if (prev) {
          dx += x - prev.x;
          dy += y - prev.y;
        }
        lastPoint.current = { x, y };
      }
      if (rect) {
        const last = lastPoint.current;
        if (last) {
          lean.current = {
            x: Math.min(1, Math.max(-1, ((last.x - rect.left) / rect.width - 0.5) * 2)),
            y: Math.min(1, Math.max(-1, ((last.y - rect.top) / rect.height - 0.5) * 2)),
          };
        }
      }
      q.length = 0;

      if (dx === 0 && dy === 0) return false;

      const before = { ...p };
      if (gesture.current === 'grow') {
        p.growth = clampGrowth(p.growth - dy / GROW_TRAVEL_PX);
      } else {
        p.angle = clampAngle(p.angle + dx / ANGLE_TRAVEL_PX);
        p.ratio = clampRatio(p.ratio - dy / RATIO_TRAVEL_PX);
      }

      const movedShape = p.angle !== before.angle || p.ratio !== before.ratio;
      const movedGrowth = p.growth !== before.growth;
      if (!movedShape && !movedGrowth) return false;

      needsRegrow.current = true;

      churn.current +=
        Math.abs(p.angle - before.angle) * 2 +
        Math.abs(p.ratio - before.ratio) * 4 +
        Math.abs(p.growth - before.growth) * 3;

      // Queued rather than fed, because a grow event carries how many
      // generations are standing there and the structure has not been grown
      // again yet. Feeding here would report the depth from before the drag and
      // the reducer would always be one frame behind the child's hand.
      if (p.angle !== before.angle) {
        drained.push({ type: 'bend', preset: presetRef.current, angle: p.angle });
      }
      if (p.ratio !== before.ratio) drained.push({ type: 'stretch', preset: presetRef.current });
      if (movedGrowth) drained.push({ type: 'grow', preset: presetRef.current, generations: -1 });

      return true;
    };

    /* ── Painting ─────────────────────────────────────────────────────── */

    /* Light, fixed, from up and to the left. It does not move, ever: a light
     * that drifts is free-running motion, and on this activity there is none. */
    const LIGHT_X = -0.55;
    const LIGHT_Y = -0.84;

    const order: number[] = [];

    const paint = (phase: number) => {
      const s = structure.current;
      const f = frame.current;
      if (!s || !f) return;

      ctx.fillStyle = skyGradient ?? cssRgb(scene.skyTop);
      ctx.fillRect(0, 0, cssW, cssH);

      const groundY = cssH * GROUND_LINE;
      ctx.fillStyle = groundGradient ?? cssRgb(scene.ground);
      ctx.fillRect(0, groundY, cssW, cssH - groundY);

      /* The seed, and the mound it sits in. Always drawn, so a child who has
       * grown nothing yet still has something under their finger. */
      const seedX = cssW / 2;
      ctx.fillStyle = cssRgb(mixRgb(scene.ground, [0, 0, 0], 0.35));
      ctx.beginPath();
      ctx.ellipse(seedX, groundY, 44, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cssRgb(litColour[0]);
      ctx.beginPath();
      ctx.ellipse(seedX, groundY - 3, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      if (s.segments.length === 0) {
        // Nothing grown. A still ladder of marks going up from the seed, which
        // is where a finger goes. Drawn, not animated: this is the first frame
        // a child ever sees and nothing on it moves.
        ctx.fillStyle = cssRgb(mixRgb(scene.haze, litColour[0], 0.5));
        for (let i = 1; i <= 4; i++) {
          ctx.globalAlpha = 0.42 - i * 0.07;
          ctx.beginPath();
          ctx.ellipse(seedX, groundY - 26 * i, 3.4 - i * 0.4, 3.4 - i * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        return;
      }

      const spanX = Math.max(1e-6, f.maxX - f.minX);
      const spanY = Math.max(1e-6, f.maxY - f.minY);
      const scale = Math.min((cssW * FIT_W) / spanX, (cssH * FIT_H) / spanY);
      const originX = cssW / 2 - ((f.minX + f.maxX) / 2) * scale;
      const originY = groundY + f.minY * scale;

      /* No growing tip is drawn larger than this. Two percent of the height of
       * what is actually standing there, so a bud on a bare stem is a bud. */
      const tipCap = Math.max(2, (s.maxY - s.minY) * scale * 0.02);

      const amp = swayAmp.current * swayScale;
      const leanX = lean.current.x * swayAmp.current * PARALLAX;
      const leanY = lean.current.y * swayAmp.current * PARALLAX * 0.35;
      const topY = Math.max(1e-6, s.maxY);

      /* Painter's algorithm: furthest first, so a branch behind another really
       * is behind it. Sorted per frame on an index array so the segments
       * themselves are never copied. */
      order.length = 0;
      for (let i = 0; i < s.segments.length; i++) order.push(i);
      order.sort((a, b) => {
        const sa = s.segments[a];
        const sb = s.segments[b];
        return sb.z0 + sb.z1 - (sa.z0 + sa.z1);
      });

      const cam = f.cam;

      for (const idx of order) {
        const seg = s.segments[idx];

        /* Sway and lean, applied in model space so the perspective divide
         * treats them like anything else: a near branch leaning toward the
         * child moves further across the screen than a far one, which is the
         * whole of the parallax. */
        const swayAt = (y: number, z: number) => {
          if (amp <= 0) return 0;
          const up = Math.max(0, y) / topY;
          return amp * Math.pow(up, 1.5) * Math.sin(phase * 1.6 + z * 1.9 + seg.generation * 0.45);
        };

        const dz0 = seg.z0 - cam.midZ;
        const dz1 = seg.z1 - cam.midZ;
        const a = projectPoint(
          seg.x0 + swayAt(seg.y0, seg.z0) + leanX * dz0,
          seg.y0 + leanY * dz0,
          seg.z0,
          cam,
        );
        const b = projectPoint(
          seg.x1 + swayAt(seg.y1, seg.z1) + leanX * dz1,
          seg.y1 + leanY * dz1,
          seg.z1,
          cam,
        );

        const ax = originX + a.x * scale;
        const ay = originY - a.y * scale;
        const bx = originX + b.x * scale;
        const by = originY - b.y * scale;

        let ux = bx - ax;
        let uy = by - ay;
        const ul = Math.hypot(ux, uy);
        if (ul < 0.001) continue;
        ux /= ul;
        uy /= ul;
        // Perpendicular in screen space, which is also the direction the width
        // is measured along and the direction the bow pushes.
        const nx = -uy;
        const ny = ux;

        const w0 = Math.max(0.45, seg.width * a.k * scale * 0.055);
        const w1 = Math.max(0.35, w0 * rule.taper);

        const bow = seg.bow * scale * a.k;
        const mx = (ax + bx) / 2 + nx * bow;
        const my = (ay + by) / 2 + ny * bow;
        const wm = (w0 + w1) / 2;

        /* How much light this stem catches. One dot product against a fixed
         * direction; there is no geometry anywhere in this. */
        const lit = 0.5 + 0.5 * (nx * LIGHT_X + ny * LIGHT_Y);
        const depth = (a.depthT + b.depthT) / 2;

        const base = stemColour[Math.min(stemColour.length - 1, seg.generation)];
        const shaded: RGB = [
          base[0] * (0.62 + 0.6 * lit),
          base[1] * (0.62 + 0.6 * lit),
          base[2] * (0.62 + 0.6 * lit),
        ];
        // Into the haze with distance. A straight mix in RGB between two
        // colours the suite has proved sit on one narrow arc.
        const fog = depth * (calm ? 0.58 : 0.72);
        ctx.fillStyle = cssRgb(mixRgb(shaded, scene.haze, fog));

        ctx.beginPath();
        ctx.moveTo(ax + nx * w0, ay + ny * w0);
        ctx.quadraticCurveTo(mx + nx * wm, my + ny * wm, bx + nx * w1, by + ny * w1);
        ctx.lineTo(bx - nx * w1, by - ny * w1);
        ctx.quadraticCurveTo(mx - nx * wm, my - ny * wm, ax - nx * w0, ay - ny * w0);
        ctx.closePath();
        ctx.fill();

        /* The lit edge. Only on the thick generations, where it reads as a
         * turned surface rather than as an outline, and the first thing the
         * quality ladder drops. */
        if (rung.highlight && w0 > 1.6) {
          const l = litColour[Math.min(litColour.length - 1, seg.generation)];
          ctx.strokeStyle = cssRgb(mixRgb(l, scene.haze, Math.min(0.85, fog + 0.2)));
          ctx.lineWidth = Math.max(0.6, w0 * 0.34);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ax + nx * w0 * 0.62, ay + ny * w0 * 0.62);
          ctx.quadraticCurveTo(
            mx + nx * wm * 0.62,
            my + ny * wm * 0.62,
            bx + nx * w1 * 0.62,
            by + ny * w1 * 0.62,
          );
          ctx.stroke();
        }

        /* A soft mark where the structure is still growing. Leaves on a tree
         * and a frond, a spark on a bolt, almost nothing on a delta, and it is
         * one number in the seed that decides which.
         *
         * Capped against the size of the whole structure, not just scaled off
         * the segment. The observed pass caught what happens without the cap:
         * on a tree with one stem and its first split, the stem IS a tip, it is
         * six hundred pixels long, and a mark sized off that is a ninety pixel
         * blob sitting exactly on top of the split the child has just made and
         * is at that moment being told about. */
        if (rung.tips && seg.tip && rule.tipSize > 0) {
          const r = Math.min(rule.tipSize * ul * 0.5, tipCap);
          if (r > 0.8) {
            const l = litColour[Math.min(litColour.length - 1, seg.generation)];
            ctx.globalAlpha = 0.5 * seg.fade * (1 - fog * 0.7);
            ctx.fillStyle = cssRgb(l);
            ctx.beginPath();
            ctx.ellipse(bx, by, r, r, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }
    };

    /* ── The loop ─────────────────────────────────────────────────────── */

    let raf = 0;
    let mounted = true;
    let last = 0;
    let lastFrameTime = 0;
    const start = performance.now();

    /* Adaptive quality. Measured, not guessed, and it only ever steps down. */
    let costSum = 0;
    let costCount = 0;
    let downgraded = false;

    /**
     * Start the loop if it is not already running.
     *
     * The loop STOPS when the structure is still, rather than running forever
     * and returning early on every frame. An early return is cheap, and it is
     * not free, and on an activity a child may leave open on a tablet the
     * honest answer to "is anything running" should be no rather than "almost
     * nothing". Every input path calls wake, and the loop reschedules itself
     * only while there is a reason to.
     */
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
      if (cssW < 2) {
        schedule();
        return;
      }

      const moved = drain();

      /*
       * Sway.
       *
       * It exists only under a finger. Holding winds it up, letting go lets it
       * settle, and when it has settled the loop below stops painting
       * altogether. Under reduced motion there is no sway at all: the lean
       * still answers the finger, because that is a direct consequence of
       * something the child is doing, but nothing continues on its own.
       */
      if (reduceMotion) {
        swayAmp.current = holding.current ? 1 : 0;
      } else if (holding.current) {
        swayAmp.current = Math.min(1, swayAmp.current + dt * 4);
      } else if (swayAmp.current > 0) {
        swayAmp.current = Math.max(0, swayAmp.current - dt * SWAY_DECAY);
        if (swayAmp.current < SWAY_FLOOR) swayAmp.current = 0;
        dirty.current = true;
      }

      if (needsRegrow.current) {
        refit();
        regrow();
        needsRegrow.current = false;
        dirty.current = true;
      }

      /* Now the structure is current, so a grow event can say honestly how many
       * generations are standing there. */
      if (drained.length > 0) {
        const generations = structure.current?.generations ?? 0;
        for (const event of drained) {
          feed(event.type === 'grow' ? { ...event, generations } : event);
        }
        drained.length = 0;
      }

      /*
       * Whether there is anything worth drawing.
       *
       * Under reduced motion this is exactly "the child did something", so the
       * canvas is a still picture between touches. Otherwise the sway keeps it
       * painting while it is winding down, and then stops. An activity left
       * open on a tablet paints nothing at all, which is the difference between
       * a still screen and a still screen with a loop running behind it.
       */
      const swaying = !reduceMotion && swayAmp.current > 0;
      const busy = holding.current || queue.current.length > 0 || swaying;
      if (!dirty.current && !moved) {
        if (busy) schedule();
        return;
      }
      dirty.current = false;
      schedule();

      const t0 = performance.now();
      paint((nowMs - start) / 1000);
      costSum += performance.now() - t0;
      costCount++;

      // Degrade rather than jank. Measured over a second of painted frames, and
      // only ever downward, so this can never oscillate between two levels. It
      // cannot touch the structure: see the QUALITY comment.
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
        const generations = structure.current?.generations ?? 0;
        if (prev.angle === p.angle && prev.ratio === p.ratio && prev.generations === generations) {
          return prev;
        }
        return { angle: p.angle, ratio: p.ratio, generations };
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
  }, [quality, calm, reduceMotion, preset, feed]);

  /* ── UI ────────────────────────────────────────────────────────────────── */

  const scene = sceneColours(preset, calm);
  const shellCss = cssRgb(scene.skyTop);

  const thumbs = useMemo(
    () => PRESET_IDS.map((id) => ({ id, label: PRESETS[id].label, paths: thumbPaths(id) })),
    [],
  );

  return (
    <div className="relative flex h-full w-full flex-col" style={{ background: shellCss }}>
      <canvas
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label="A seed on the ground. Drag up from the ground to grow a stem, and it splits into branches. Drag across the branches to open or close the angle, and up or down to make branches longer or shorter."
        aria-describedby="fractal-keys"
        className="min-h-0 w-full flex-1"
        style={{ touchAction: 'none', cursor: 'grab', display: 'block' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onKeyDown={onKeyDown}
      />

      <span id="fractal-keys" className="sr-only">
        Up and down arrows grow and shrink. Left and right arrows change the branching angle. Hold
        shift with up and down to make branches longer or shorter.
      </span>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* Controls. Deliberately thin and dark so the structure stays the subject. */}
      <div
        className="relative shrink-0 px-4 pb-4 pt-3"
        style={{
          background: `linear-gradient(to top, ${cssRgb(mixRgb(scene.skyTop, [0, 0, 0], 0.5))}, ${cssRgb(scene.skyTop)}00)`,
        }}
      >
        {/*
          The card floats above the controls rather than sitting in the column.

          In flow it is a real box eighty pixels tall, and the canvas is the flex
          child that gives those pixels up. Pattern Garden learned what that
          costs the hard way: a resize there rebuilt the simulation grid and the
          child's garden was wiped underneath the sentence congratulating them
          on growing it.

          Here the structure survives a resize, because it is a pure function of
          four numbers held in refs, so this is no longer a correctness problem.
          It is still the right layout: the canvas keeps its size, so the tree
          does not jump a hundred pixels down the screen at the exact moment the
          child is being told what they made. NamingCard renders nothing when
          there is no line, so this wrapper is a zero height box that catches no
          touches while nothing is being said.

          The card and its wrapper are BOTH transparent to touch, and that is
          not a nicety. Out of flow the card lands over the bottom of the canvas,
          which is exactly the band a drag has to start in to grow the trunk. The
          observed pass caught it twice. First: with a card up, a full-length
          grow drag moved the structure not at all, because every event went to
          the card, so the child was told "the stem split into two branches" and
          then could not grow it any further until they found the close button.
          Then, with the card alone made transparent, the drag was caught by this
          wrapper instead, which is a zero height box until a card gives it one.
          Only buttons take touches in here now.
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

        {/* The seeds. Each thumbnail is the real rule, grown three generations
            deep and drawn once by the browser, so what is on the button is what
            the seed makes. */}
        <div className="flex items-center gap-2" role="group" aria-label="Seeds">
          {thumbs.map((t) => {
            const chosen = t.id === preset;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pickSeed(t.id)}
                aria-pressed={chosen}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border-none py-1"
                style={{
                  minHeight: 62,
                  background: chosen ? 'rgba(63,169,138,0.22)' : 'rgba(255,255,255,0.06)',
                  color: chosen ? '#9FE3C8' : 'rgba(255,255,255,0.72)',
                  cursor: 'pointer',
                  outline: chosen ? `1px solid ${ACCENT}` : '1px solid transparent',
                }}
              >
                <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                  {t.paths.map((p, i) => (
                    <path
                      key={i}
                      d={p.d}
                      stroke="currentColor"
                      strokeWidth={p.width}
                      strokeLinecap="round"
                      fill="none"
                    />
                  ))}
                </svg>
                <span className="text-[11px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-end gap-4">
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
            onClick={freshSeed}
            className="shrink-0 rounded-xl border-none px-4 text-[13px] font-semibold"
            style={{
              minHeight: 44,
              background: 'rgba(63,169,138,0.16)',
              color: '#9FE3C8',
              cursor: 'pointer',
            }}
          >
            Fresh seed
          </button>
        </div>
      </div>

      {/*
        Keyboard focus, drawn inside the box.

        A global :focus-visible rule paints a 3px orange outline on whatever has
        focus, and on a canvas that fills the screen that outline lands on the
        viewport edges, so all a keyboard user actually sees is one orange line
        under the header. A negative offset pulls the ring inside the element so
        all four edges are on screen, and styled-jsx scopes it tightly enough to
        win. Same fix as Water Sphere and Pattern Garden, and for the same reason.
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
