'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NamingCard from '@/components/guided/NamingCard';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useGuidedDiscovery } from '@/hooks/useGuidedDiscovery';
import {
  BALANCE_MAX,
  BALANCE_MIN,
  LENGTH_MAX,
  LENGTH_MIN,
  PHASE_MAX,
  PHASE_MIN,
  RATIO_CARDS,
  SAMPLES_PER_TURN,
  clampBalance,
  clampLength,
  clampPhase,
  describeFigure,
  frequencyFor,
  holdAmpNext,
  inkAfterTravel,
  lengthsForCard,
  makeCamera,
  motionAmplitudes,
  nearestSimpleRatio,
  openness,
  paletteAt,
  paletteTFor,
  projectPoint,
  shouldSchedule,
  traceFigure,
  type Camera,
  type Figure,
  type RatioCard,
} from '@/lib/harmonograph';
import {
  initialDiscoveryState,
  stepDiscovery,
  type HarmonographDiscoveryId,
  type HarmonographDiscoveryState,
} from '@/lib/harmonograph-discovery';

/**
 * Sound Drawing.
 *
 * A machine in a dark room. Two pendulums hang from a beam, a sheet of paper
 * lies on the table under them, and a pen rests on it. Take hold of a bob and
 * slide it up its string and that pendulum swings faster, and the drawing the
 * pen is making changes under the child's own hand: more loops, a different
 * figure, a line that stops coming back over itself.
 *
 * They are not told what a ratio is. They are given two strings, and after a
 * while they find that some pairs of strings draw one clean shape over and over
 * and that everything either side of those pairs drifts into a rosette. Turning
 * the sound on puts the same fact in their ears, because the two pendulums are
 * the two notes and the pairs that draw clean shapes are the pairs that sound
 * like a chord.
 *
 * There is nothing to reach, nothing to lose, no wrong drawing and no question
 * anywhere in it. Five sentences arrive, once each, after the child has already
 * made the thing each one describes.
 *
 * WHAT IS ACTUALLY HAPPENING
 *
 * One pen obeying two swings, in `harmonograph.ts`, which is pure and has no
 * idea a screen exists. Every claim this activity makes to a child is measured
 * in its suite: the loops are COUNTED in the sampled path and swept across the
 * whole length control, the pen is compared against its own earlier laps to
 * decide whether the line is coming back over itself, and the figure is proved
 * to depend on how the two strings COMPARE and not on how long they are. When a
 * naming line is earned is decided by a pure reducer in
 * `harmonograph-discovery.ts`.
 *
 * HOW IT IS DRAWN
 *
 * One 2D canvas, hand rolled, no 3D dependency, exactly as the other science
 * sandboxes do it. The room is genuinely three dimensional: the paper is a
 * plane lying flat in it, the pendulums hang at different depths, and the whole
 * thing goes through one perspective divide, so the near edge of the table is
 * drawn wider than the far edge by the same rule that makes the near bob bigger
 * than the far one. The drawing lies ON the table rather than on the glass,
 * which is why it foreshortens as it recedes.
 *
 * MOTION
 *
 * Two motions, and they are not the same kind of thing.
 *
 * The LEAN is the child's hand. The eye orbits the room towards wherever their
 * finger is, so moving across the screen walks around the machine and the two
 * pendulums swap which of them is in front. It is a function of where the
 * finger is and of nothing else.
 *
 * The SWING is the clock. The pendulums swing at their own real speeds, the
 * fast one visibly quicker than the slow one, which is the whole reason the
 * word "faster" means anything here.
 *
 * Under reduced motion the second one goes, entirely and at all times, held or
 * not, and the pendulums hang still. The lean stays. The two are separated in
 * `motionAmplitudes`, out in the pure module with a test written to kill the
 * one-character change that collapses them, because Fractal Grower shipped with
 * exactly that collapse.
 *
 * The ink is neither of them. It advances with how far the child's hand has
 * travelled and with nothing else, in every motion setting, so the drawing is a
 * record of their gesture rather than of how long they left the screen open.
 *
 * SOUND OFF
 *
 * The activity is whole with the volume at zero, which is where it starts. The
 * ratio is on the paper whether or not anyone can hear it.
 *
 * Issue: #225 (wave 4, Sound Drawing)
 */

/* ─────────────────────────────────────────────────────────────────────────
 * Colour
 *
 * Every hue comes from paletteAt, which folds through safeHue, and the suite
 * samples the whole control to prove nothing lands in the banned 270-350 band.
 * It also proves the palette sits on one narrow arc, which is what makes the
 * fades below safe: they are straight mixes in RGB, and a blend between two
 * colours far apart on the circle can cross the band even when both ends are
 * clear of it.
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

interface SceneColours {
  roomTop: RGB;
  roomBottom: RGB;
  paper: RGB;
  paperEdge: RGB;
  ink: RGB;
  inkOld: RGB;
  brass: RGB;
  cord: RGB;
}

function sceneColours(ratio: number, calm: boolean): SceneColours {
  const p = paletteAt(paletteTFor(ratio));
  return {
    roomTop: hslRgb(p.roomHue, calm ? 16 : 24, calm ? 7 : 6),
    roomBottom: hslRgb(p.roomHue, calm ? 20 : 30, calm ? 14 : 15),
    paper: hslRgb(p.paperHue, calm ? 12 : 18, calm ? 78 : 84),
    paperEdge: hslRgb(p.paperHue, calm ? 16 : 24, calm ? 52 : 56),
    ink: hslRgb(p.inkHue, calm ? 44 : 62, calm ? 34 : 28),
    inkOld: hslRgb(p.inkHue, calm ? 22 : 30, calm ? 62 : 60),
    brass: hslRgb(p.brassHue, calm ? 34 : 48, calm ? 54 : 60),
    cord: hslRgb(p.roomHue, calm ? 12 : 16, calm ? 42 : 46),
  };
}

/** Accent for the naming card and the controls. Sea green, well outside the ban. */
const ACCENT = '#3FA98A';

/* ─────────────────────────────────────────────────────────────────────────
 * The room
 * ───────────────────────────────────────────────────────────────────────── */

/** Half the width of the sheet of paper, in model units. */
const PAPER_HALF = 1.35;
/**
 * The floor the whole machine stands on.
 *
 * Wider and deeper than anything else in the room, so its far edge lands above
 * the paper as a horizon and its near edge runs off the bottom of the screen.
 * It is the cheapest depth cue in the file: without it the paper is a trapezoid
 * hanging in a void, and with it the paper is a sheet lying on the ground and
 * the bobs have somewhere to cast a shadow.
 */
const FLOOR_HALF_X = 4.6;
const FLOOR_Z_NEAR = 3.2;
const FLOOR_Z_FAR = -3.4;
/** Height of the beam the pendulums hang from. */
const BAR_Y = 1.78;
/** How far out from the middle each pivot sits, and how far back. */
const PIVOT_X = 1.62;
const PIVOT_Z = -0.2;
/** Where the posts stand, just outside the two pivots. */
const FRAME_HALF_X = PIVOT_X + 0.26;

/** Where the eye sits when the child's finger is in the middle of the screen. */
const EYE_HEIGHT = 2;
const EYE_DISTANCE = 5;
const FOCAL = 3.1;

/** How far the eye orbits and rises as the finger moves. This is the lean. */
const YAW_LEAN = 0.34;
const HEIGHT_LEAN = 0.85;

/** How much of the canvas the room is fitted into. */
const FIT_W = 0.94;
const FIT_H = 0.94;

/** How far a bob swings at full amplitude, in radians. */
const SWING_ANGLE = 0.34;
const CALM_SWING_ANGLE = 0.2;
/** Swings per second for a string of length 1. Slow enough to watch. */
const SWING_HZ = 0.42;
const CALM_SWING_HZ = 0.3;

/** Drawn length of a string, in model units, for a pendulum of that length. */
function cordLength(length: number): number {
  return 0.28 + 0.26 * clampLength(length);
}

/* ─────────────────────────────────────────────────────────────────────────
 * Feel
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * How far a finger travels to run a bob from one end of its string to the other.
 *
 * Chosen against a hand rather than against a number line: it is roughly the
 * height of a tablet held in two hands, so a child can reach either end in one
 * gesture without having to be precise about it.
 */
const LENGTH_TRAVEL_PX = 520;
/** The same, for the two things a drag on the paper does. */
const PHASE_TRAVEL_PX = 360;
const BALANCE_TRAVEL_PX = 420;
/** What one key press is worth, in pixels of the equivalent drag. */
const KEY_TRAVEL_PX = 42;

/** How near a finger has to land to take hold of a bob, in CSS pixels. */
const BOB_GRAB_PX = 66;

/** Frames are capped: nothing here needs sixty, and thirty is kinder to a tablet. */
const FRAME_INTERVAL_MS = 1000 / 32;

/** Mean paint cost, in milliseconds, above which the ladder steps down once. */
const DOWNGRADE_COST_MS = 20;
const DOWNGRADE_WINDOW = 32;

/** How often the drawing is looked at, once the child has started. */
const SETTLE_INTERVAL_MS = 1400;
/** How long it must be left alone before a look counts as a settled one. */
const SETTLE_QUIET_MS = 700;

/** Ink a ratio card is worth, in swings, so a tap leaves something on the paper. */
const INK_ON_CARD = 4.5;

/**
 * Quality ladder.
 *
 * Every rung is about PAINT and nothing else: how many device pixels, whether
 * the drawing's soft shadow on the paper is laid down, how finely the path is
 * sampled. The drawing itself is not on the ladder and cannot be, because it is
 * a pure function of the numbers the child is holding, and those live in refs
 * that a re-render does not touch.
 *
 * That is deliberate and it is the lesson from Pattern Garden, where the ladder
 * rebuilt the simulation grid and deleted the child's garden at the exact
 * moment it was fullest. Here a downgrade cannot cost the child anything they
 * made: the figure is the same figure, loop for loop, at every rung, which is a
 * claim `harmonograph.test.ts` makes good by counting the loops at half the
 * sampling density and getting the same number.
 *
 * It is not invisible. Rung 1 drops the shadow the drawing casts on the paper,
 * which reads as the line lying flatter. Rung 2 samples the path more coarsely
 * as well, which shows up as slightly straighter corners on the tightest
 * rosettes. Detail surrendered, never structure, and only ever downward.
 */
interface QualityRung {
  maxDpr: number;
  shadow: boolean;
  perTurn: number;
}
const QUALITY: QualityRung[] = [
  { maxDpr: 2, shadow: true, perTurn: SAMPLES_PER_TURN },
  { maxDpr: 1.5, shadow: false, perTurn: 64 },
  { maxDpr: 1, shadow: false, perTurn: 44 },
];

/** How many colour bands the drawing is stroked in, oldest ink to newest. */
const INK_BANDS = 18;

/* ─────────────────────────────────────────────────────────────────────────
 * Card thumbnails
 *
 * Drawn from the real trace function, as SVG, and painted by the browser once.
 *
 * They could have been four little canvases, and that is exactly what they are
 * not. Pattern Garden shipped a second canvas under its control and that canvas
 * animated itself from the moment the activity mounted, which is the one thing
 * the mount gate forbids, and it was found by instrumenting the page rather than
 * by reading the code. The cheapest way not to have that bug is not to have the
 * canvas: there is one canvas in this file, so there is one animation loop to
 * account for.
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * A quarter turn out of step, which is the phase at which each of these four
 * ratios draws the figure it is known by: the circle, the figure of eight, the
 * pretzel and the mesh. At other phases the same ratio draws the same closed
 * curve seen edge on, which is true and which makes a thumbnail nobody can
 * tell from its neighbour.
 */
const CARD_PHASE = Math.PI / 2;

function cardPath(card: RatioCard): string {
  const figure = traceFigure(
    { ratio: card.p / card.q, phase: CARD_PHASE, balance: 1, turns: card.q },
    28,
  );
  const parts: string[] = [];
  for (let i = 0; i < figure.count; i++) {
    const x = 20 + figure.xs[i] * 15;
    const y = 20 - figure.ys[i] * 15;
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return parts.join('');
}

/* ─────────────────────────────────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────────────────────────────────── */

type Gesture = 'none' | 'stringX' | 'stringY' | 'paper';

export default function Harmonograph() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Sound OFF until the child asks for it.
   *
   * Ripples, Water Sphere, Pattern Garden and Fractal Grower all default their
   * sound off behind an explicit press, and an unrequested tone the moment a
   * finger lands is aversive for exactly the children this product is for.
   */
  const [volume, setVolume] = useState(0);
  const [quality, setQuality] = useState(0);
  const [announce, setAnnounce] = useState('');
  const [chosenCard, setChosenCard] = useState<string | null>(null);

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
   * The five numbers the child is holding.
   *
   * Refs, not state, and this is the load bearing decision in the file. They
   * change on every frame of a drag, and putting them through React would be
   * thirty renders a second of a component that owns a canvas. They are also
   * what the drawing IS: keeping them out of the render tree is why a quality
   * downgrade, a resize or a re-render cannot cost the child their picture.
   */
  const params = useRef({
    lengthX: 1,
    lengthY: 1,
    phase: 0.72,
    balance: 1,
    ink: 0,
  });
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  /** Published copy of the parameters, for the screen reader only. */
  const [described, setDescribed] = useState({ ratio: 1, phase: 0.72, balance: 1, ink: 0 });

  /* Pointer, coalesced. Handlers only enqueue; the parameters move once per
   * frame, in the tick. A drag on a touchscreen delivers events far faster than
   * frames, and applying them in the handler would retrace the figure several
   * times over for one picture. Deltas are summed across everything queued, so
   * a fast flick keeps all of its travel rather than only its last hop. */
  const queue = useRef<number[]>([]);
  const gesture = useRef<Gesture>('none');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const canvasRect = useRef<DOMRect | null>(null);

  /** Where the finger is, in -1..1 from the middle. Drives the orbit. */
  const lean = useRef({ x: 0, y: 0 });
  /** How wound up the machine is. Rises under a finger, settles after. */
  const holdAmp = useRef(0);
  const holding = useRef(false);

  /** Set when something changed and the canvas owes a repaint. */
  const dirty = useRef(true);
  /**
   * Wakes the render loop.
   *
   * The loop does not run continuously. It stops itself once the machine is
   * still and there is nothing queued, and every input path calls this to start
   * it again. A frame loop that runs forever and returns early is cheap but it
   * is not nothing, and on an activity a child may leave open on a tablet for an
   * hour it should not be there.
   *
   * Scoped to the frame loop, which is what this ref wakes. It is not a claim
   * that the component is idle: three slow intervals do keep ticking for as long
   * as it is mounted, at 1400ms (looking at the drawing), 500ms (publishing the
   * screen-reader sentence) and 180ms (following the sound to the hand). Each
   * returns immediately when nothing has happened, and between them they are
   * about eight wakeups a second against a frame loop's thirty-two, none of them
   * touching the canvas.
   */
  const wake = useRef<(() => void) | null>(null);
  /** Set when the parameters moved and the path has to be sampled again. */
  const needsRetrace = useRef(true);
  /** When the child last did anything, so a settled look is really settled. */
  const lastActed = useRef(0);
  /** How much the drawing changed lately, which is what the pen sound follows. */
  const churn = useRef(0);

  const figure = useRef<Figure | null>(null);

  /* Guided naming */
  const discovery = useRef<HarmonographDiscoveryState>(initialDiscoveryState());
  const pendingNames = useRef<HarmonographDiscoveryId[]>([]);

  const guided = useGuidedDiscovery({
    activityId: 'harmonograph',
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
    toneX: OscillatorNode;
    toneY: OscillatorNode;
    toneGain: GainNode;
    penGain: GainNode;
    penFilter: BiquadFilterNode;
  } | null>(null);

  /* ── Naming pipeline ───────────────────────────────────────────────────
   *
   * The reducer can name more than one thing in a single step: a child who
   * drags both strings a long way and then taps a card before pausing can earn
   * four at once, which is a lecture. So they queue and are handed over one at
   * a time.
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

  /* ── Looking at the drawing ────────────────────────────────────────────
   *
   * Once every second and a bit, and only when the child has left it alone long
   * enough that what is on the paper is what they meant. Not every frame: a
   * drawing watched continuously would hand a child every sentence in the first
   * two seconds of play, which is a lecture wearing a costume.
   */
  useEffect(() => {
    const id = setInterval(() => {
      if (lastActed.current === 0) return;
      if (performance.now() - lastActed.current < SETTLE_QUIET_MS) return;
      const p = params.current;
      const ratio = frequencyFor(p.lengthY) / frequencyFor(p.lengthX);
      const shape = { ratio, phase: p.phase, balance: p.balance, turns: p.ink };
      feed({
        type: 'settle',
        ratio,
        turns: p.ink,
        gap: openness(shape),
        ratioError: nearestSimpleRatio(ratio).error,
      });
    }, SETTLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [feed]);

  /* ── Audio ─────────────────────────────────────────────────────────────
   *
   * The two pendulums, as two notes. Their pitches are in the same proportion
   * as their swings, so the interval in the room IS the ratio on the paper: at
   * two against one it is an octave, at three against two a fifth. A breath of
   * filtered noise underneath rises while the pen is moving and falls away when
   * the hand stops, so drawing is audible as well as visible and a finished
   * drawing is quiet.
   *
   * It is information, not applause, and with the volume at zero the activity is
   * whole. Started on the first touch, never before, which is both good manners
   * and what browsers require.
   */

  /** Where the lower of the two notes sits. The rest follows the two strings. */
  const BASE_HZ = 220;

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
    master.gain.value = (volumeRef.current / 100) * 0.42;
    master.connect(ctx.destination);

    const toneGain = ctx.createGain();
    toneGain.gain.value = 0.09;
    toneGain.connect(master);

    const mk = (freq: number) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(toneGain);
      osc.start();
      return osc;
    };
    const p = params.current;
    const toneX = mk(BASE_HZ * frequencyFor(p.lengthX));
    const toneY = mk(BASE_HZ * frequencyFor(p.lengthY));

    // The pen. A short looping buffer is cheaper than a live source and at this
    // filter width nobody can hear the loop.
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp = 0.86 * lp + 0.14 * (Math.random() * 2 - 1);
      data[i] = lp * 2.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const penFilter = ctx.createBiquadFilter();
    penFilter.type = 'bandpass';
    penFilter.frequency.value = 2200;
    penFilter.Q.value = 0.8;
    const penGain = ctx.createGain();
    penGain.gain.value = 0;
    noise.connect(penFilter);
    penFilter.connect(penGain);
    penGain.connect(master);
    noise.start();

    audio.current = { ctx, master, toneX, toneY, toneGain, penGain, penFilter };
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
    a.master.gain.setTargetAtTime((volume / 100) * 0.42, a.ctx.currentTime, 0.08);
  }, [volume]);

  /* Sound follows the hand. Read on its own slow timer rather than inside the
   * render loop, because a gain node set thirty times a second from a value
   * measured thirty times a second is a zipper noise, and because the audio
   * graph should not be part of the frame budget. */
  useEffect(() => {
    const id = setInterval(() => {
      const a = audio.current;
      if (!a) return;
      const p = params.current;
      const level = Math.min(1, churn.current * 7);
      const t = a.ctx.currentTime;
      a.toneX.frequency.setTargetAtTime(BASE_HZ * frequencyFor(p.lengthX), t, 0.1);
      a.toneY.frequency.setTargetAtTime(BASE_HZ * frequencyFor(p.lengthY), t, 0.1);
      a.toneGain.gain.setTargetAtTime(0.055 + 0.05 * level, t, 0.3);
      a.penGain.gain.setTargetAtTime(0.002 + 0.05 * level, t, 0.2);
      churn.current *= 0.55;
    }, 180);
    return () => clearInterval(id);
  }, []);

  /* ── Input ─────────────────────────────────────────────────────────────── */

  /** Any real input from the child. This is the gate on every naming line. */
  const acted = useCallback(() => {
    lastActed.current = performance.now();
  }, []);

  /** Where each bob is on the screen right now, so a finger can take hold of it. */
  const bobScreen = useRef<{ x: number; y: number }[]>([]);

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

      // The thing under the finger is the thing you get. Bobs first, because
      // they are objects with a place on the screen; everything else is paper.
      let best: Gesture = 'paper';
      let bestDistance = BOB_GRAB_PX;
      const bobs = bobScreen.current;
      for (let i = 0; i < bobs.length; i++) {
        const d = Math.hypot(bobs[i].x - px, bobs[i].y - py);
        if (d < bestDistance) {
          bestDistance = d;
          best = i === 0 ? 'stringX' : 'stringY';
        }
      }
      gesture.current = best;

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
   * motion the eye stays frozen at full orbit on a machine nobody is touching.
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

  /** Slide a bob along its string. One place, so a key and a finger agree. */
  const slideString = useCallback((which: 'x' | 'y', travelPx: number) => {
    const p = params.current;
    const span = Math.log(LENGTH_MAX / LENGTH_MIN);
    const factor = Math.exp((travelPx / LENGTH_TRAVEL_PX) * span);
    const before = which === 'x' ? p.lengthX : p.lengthY;
    const after = clampLength(before * factor);
    if (which === 'x') p.lengthX = after;
    else p.lengthY = after;
    return after !== before;
  }, []);

  /** The ratio the machine is in right now. Reads refs only, so it is stable. */
  const ratioNow = useCallback(
    () => frequencyFor(params.current.lengthY) / frequencyFor(params.current.lengthX),
    [],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const p = params.current;
      let handled = true;
      let event: Parameters<typeof stepDiscovery>[1] | null = null;

      if (e.key === 'ArrowLeft' && e.shiftKey) p.phase = clampPhase(p.phase - 0.12);
      else if (e.key === 'ArrowRight' && e.shiftKey) p.phase = clampPhase(p.phase + 0.12);
      else if (e.key === 'ArrowUp') {
        if (slideString('y', -KEY_TRAVEL_PX)) event = { type: 'string', which: 'y', ratio: 0 };
      } else if (e.key === 'ArrowDown') {
        if (slideString('y', KEY_TRAVEL_PX)) event = { type: 'string', which: 'y', ratio: 0 };
      } else if (e.key === 'ArrowLeft') {
        if (slideString('x', -KEY_TRAVEL_PX)) event = { type: 'string', which: 'x', ratio: 0 };
      } else if (e.key === 'ArrowRight') {
        if (slideString('x', KEY_TRAVEL_PX)) event = { type: 'string', which: 'x', ratio: 0 };
      } else if (e.key === ' ' || e.key === 'Enter') {
        event = { type: 'paper' };
      } else handled = false;

      if (!handled) return;
      e.preventDefault();
      ensureAudio();
      acted();
      // Every key press draws, because a shape nobody has put ink on is not
      // visible, and a keyboard user pressing an arrow should see the same
      // thing a finger does.
      p.ink = inkAfterTravel(p.ink, KEY_TRAVEL_PX);
      churn.current += 0.08;
      if (event) feed(event.type === 'string' ? { ...event, ratio: ratioNow() } : event);
      needsRetrace.current = true;
      dirty.current = true;
      wake.current?.();
    },
    [acted, ensureAudio, feed, ratioNow, slideString],
  );

  const pickCard = useCallback(
    (card: RatioCard) => {
      ensureAudio();
      acted();
      const p = params.current;
      const { lengthX, lengthY } = lengthsForCard(card);
      p.lengthX = lengthX;
      p.lengthY = lengthY;
      // A card that left the paper blank would be a shape nobody can see, so it
      // is worth some ink. Never less than the child already had.
      p.ink = Math.max(p.ink, INK_ON_CARD);
      setChosenCard(card.id);
      churn.current += 0.3;
      feed({ type: 'card', ratio: ratioNow() });
      needsRetrace.current = true;
      dirty.current = true;
      wake.current?.();
    },
    [acted, ensureAudio, feed, ratioNow],
  );

  const freshPaper = useCallback(() => {
    acted();
    params.current.ink = 0;
    needsRetrace.current = true;
    dirty.current = true;
    wake.current?.();
    // Deliberately does NOT reset the naming state. Those lines are once each
    // per session however many drawings the child makes, because repeating them
    // would turn a calm sentence into a nag.
  }, [acted]);

  /* ── Live region ───────────────────────────────────────────────────────
   *
   * The picture tells a sighted child what is on the paper. This says the same,
   * once per change, for a child using a screen reader. Not chatty: it is
   * published from a slow timer, and only when the sentence it would say has
   * actually changed.
   */
  const describedText = useMemo(
    () =>
      describeFigure({
        ratio: described.ratio,
        phase: described.phase,
        balance: described.balance,
        turns: described.ink,
      }),
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
    const swingAngle = calm ? CALM_SWING_ANGLE : SWING_ANGLE;
    const swingHz = calm ? CALM_SWING_HZ : SWING_HZ;

    let cssW = 0;
    let cssH = 0;
    let scale = 1;
    let originX = 0;
    let originY = 0;

    /*
     * Colour follows the ratio, and it is read INSIDE the frame rather than
     * captured when the effect runs.
     *
     * Holding it as an effect dependency was tried and is wrong: the ratio
     * moves while a finger is on a bob, so the whole canvas effect would tear
     * down and rebuild mid-drag, which resets the clock the pendulums swing
     * against and makes them jump. Four colour conversions on a painted frame
     * is the cheaper half of that trade by a wide margin.
     */
    const currentColours = () => sceneColours(ratioNow(), calm);

    /** The neutral camera, which is what the room is FITTED to. */
    const fitCamera = makeCamera(0, EYE_HEIGHT, EYE_DISTANCE, FOCAL);

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

      /* Fit the whole machine, at the neutral camera, into the canvas. Done
       * once per size rather than per frame: the room is a fixed set of corners
       * and only the eye moves, so a fit that followed the eye would make the
       * machine breathe in and out as the child's finger crossed the screen. */
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      const corners: [number, number, number][] = [
        [-PAPER_HALF, 0, -PAPER_HALF],
        [PAPER_HALF, 0, -PAPER_HALF],
        [-PAPER_HALF, 0, PAPER_HALF],
        [PAPER_HALF, 0, PAPER_HALF],
        // Both ends of the beam, and both feet of the posts under them. The
        // posts were fitted out of frame once and all that reached the screen
        // was the bottom third of each one, which reads as a scratch rather
        // than as a leg.
        [-FRAME_HALF_X, BAR_Y, PIVOT_Z],
        [FRAME_HALF_X, BAR_Y, PIVOT_Z],
        [-FRAME_HALF_X, 0, PIVOT_Z],
        [FRAME_HALF_X, 0, PIVOT_Z],
      ];
      for (const [x, y, z] of corners) {
        const q = projectPoint(x, y, z, fitCamera);
        if (q.x < minX) minX = q.x;
        if (q.x > maxX) maxX = q.x;
        if (q.y < minY) minY = q.y;
        if (q.y > maxY) maxY = q.y;
      }
      scale = Math.min((cssW * FIT_W) / (maxX - minX), (cssH * FIT_H) / (maxY - minY));
      originX = cssW / 2 - ((minX + maxX) / 2) * scale;
      originY = cssH / 2 + ((minY + maxY) / 2) * scale;

      // The drawing is untouched by any of this. Its parameters live in refs,
      // so a resize, a rotation or a step down the quality ladder gives the
      // child back the same figure at a different size.
      needsRetrace.current = true;
      dirty.current = true;
    };

    /** Sample the path again from whatever the child is currently holding. */
    const retrace = () => {
      const p = params.current;
      figure.current = traceFigure(
        {
          ratio: frequencyFor(p.lengthY) / frequencyFor(p.lengthX),
          phase: p.phase,
          balance: p.balance,
          turns: p.ink,
        },
        rung.perTurn,
      );
    };

    /**
     * Drain the pointer queue into the parameters.
     *
     * One mutation per frame. Deltas are summed across every point queued since
     * the last frame, so a fast flick keeps all of its travel: taking only the
     * newest point would quietly throw away most of a quick gesture. The TRAVEL
     * is summed as a distance rather than as a displacement, so a child
     * scribbling back and forth in one spot is drawing, which is what a hand
     * doing that expects.
     */
    const drained: Parameters<typeof stepDiscovery>[1][] = [];

    const drain = (): boolean => {
      const q = queue.current;
      if (q.length === 0) return false;

      const p = params.current;
      const rect = canvasRect.current;
      let dx = 0;
      let dy = 0;
      let travel = 0;

      for (let i = 0; i < q.length; i += 2) {
        const x = q[i];
        const y = q[i + 1];
        const prev = lastPoint.current;
        if (prev) {
          dx += x - prev.x;
          dy += y - prev.y;
          travel += Math.hypot(x - prev.x, y - prev.y);
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

      if (travel === 0) return false;

      const beforeX = p.lengthX;
      const beforeY = p.lengthY;
      const beforePhase = p.phase;
      const beforeBalance = p.balance;
      const beforeInk = p.ink;

      if (gesture.current === 'stringX') slideString('x', dy);
      else if (gesture.current === 'stringY') slideString('y', dy);
      else if (gesture.current === 'paper') {
        p.phase = clampPhase(p.phase + (dx / PHASE_TRAVEL_PX) * (PHASE_MAX - PHASE_MIN));
        p.balance = clampBalance(
          p.balance - (dy / BALANCE_TRAVEL_PX) * (BALANCE_MAX - BALANCE_MIN),
        );
      }

      // Every gesture draws. The pen is on the paper the whole time the machine
      // is being handled, which is what a harmonograph does.
      p.ink = inkAfterTravel(p.ink, travel);

      const moved =
        p.lengthX !== beforeX ||
        p.lengthY !== beforeY ||
        p.phase !== beforePhase ||
        p.balance !== beforeBalance ||
        p.ink !== beforeInk;
      if (!moved) return false;

      needsRetrace.current = true;
      churn.current +=
        Math.abs(Math.log(p.lengthX / beforeX)) +
        Math.abs(Math.log(p.lengthY / beforeY)) +
        Math.abs(p.phase - beforePhase) * 0.5 +
        (p.ink - beforeInk) * 0.05;

      const ratio = frequencyFor(p.lengthY) / frequencyFor(p.lengthX);
      if (p.lengthX !== beforeX) drained.push({ type: 'string', which: 'x', ratio });
      if (p.lengthY !== beforeY) drained.push({ type: 'string', which: 'y', ratio });
      if (p.phase !== beforePhase || p.balance !== beforeBalance || p.ink !== beforeInk) {
        drained.push({ type: 'paper' });
      }

      return true;
    };

    /* ── Painting ─────────────────────────────────────────────────────── */

    const project = (x: number, y: number, z: number, cam: Camera) => {
      const q = projectPoint(x, y, z, cam);
      return { x: originX + q.x * scale, y: originY - q.y * scale, k: q.k, depth: q.depth };
    };

    /** How much a thing at this depth is washed into the room behind it. */
    const fogAt = (depth: number) => {
      const t = Math.min(1, Math.max(0, (depth - 3.4) / 4.2));
      return t * (calm ? 0.5 : 0.62);
    };

    const paint = (seconds: number) => {
      const p = params.current;
      const f = figure.current;
      const colours = currentColours();

      const amp = motionAmplitudes({ reduceMotion, holdAmp: holdAmp.current });
      const cam = makeCamera(
        lean.current.x * YAW_LEAN * amp.lean,
        EYE_HEIGHT + lean.current.y * HEIGHT_LEAN * amp.lean,
        EYE_DISTANCE,
        FOCAL,
      );

      const roomGradient = ctx.createLinearGradient(0, 0, 0, cssH);
      roomGradient.addColorStop(0, cssRgb(colours.roomTop));
      roomGradient.addColorStop(1, cssRgb(colours.roomBottom));
      ctx.fillStyle = roomGradient;
      ctx.fillRect(0, 0, cssW, cssH);

      /* The floor. Its far edge is the horizon, and every one of its four
       * corners goes through the same divide as everything else, so the ground
       * runs away from the child rather than sitting behind them. The paper
       * standing on it is the difference between a sheet on a table and a
       * trapezoid hanging in a void. */
      const floor = [
        project(-FLOOR_HALF_X, 0, FLOOR_Z_NEAR, cam),
        project(FLOOR_HALF_X, 0, FLOOR_Z_NEAR, cam),
        project(FLOOR_HALF_X, 0, FLOOR_Z_FAR, cam),
        project(-FLOOR_HALF_X, 0, FLOOR_Z_FAR, cam),
      ];
      const ground = ctx.createLinearGradient(0, floor[3].y, 0, floor[0].y);
      ground.addColorStop(0, cssRgb(mixRgb(colours.roomBottom, colours.roomTop, 0.55)));
      ground.addColorStop(1, cssRgb(mixRgb(colours.roomBottom, [0, 0, 0], 0.45)));
      ctx.fillStyle = ground;
      ctx.beginPath();
      ctx.moveTo(floor[0].x, floor[0].y);
      for (let i = 1; i < floor.length; i++) ctx.lineTo(floor[i].x, floor[i].y);
      ctx.closePath();
      ctx.fill();

      /* Where each bob is, worked out before anything is drawn, because the
       * shadows they cast belong on the floor and the bobs themselves belong in
       * front of the paper.
       *
       * The swing is the only place the wall clock reaches the picture, and
       * `amp.swing` is zero under reduced motion at every moment, held or not,
       * so under it the bobs hang straight down and a finger resting still
       * paints the same pixels frame after frame. */
      const lengths: [number, number] = [p.lengthX, p.lengthY];
      const bobs: { pivot: [number, number, number]; bob: [number, number, number] }[] = [];
      for (let i = 0; i < 2; i++) {
        const length = lengths[i];
        const cord = cordLength(length);
        const theta =
          amp.swing *
          swingAngle *
          Math.sin(seconds * Math.PI * 2 * swingHz * frequencyFor(length) + i * 0.6);
        const px = i === 0 ? -PIVOT_X : PIVOT_X;
        // One swings across the paper and the other away from the child, which
        // is exactly what the two axes of the drawing are.
        const bob: [number, number, number] =
          i === 0
            ? [px + Math.sin(theta) * cord, BAR_Y - Math.cos(theta) * cord, PIVOT_Z]
            : [px, BAR_Y - Math.cos(theta) * cord, PIVOT_Z + Math.sin(theta) * cord];
        bobs.push({ pivot: [px, BAR_Y, PIVOT_Z], bob });
      }

      /* The shadow each bob drops onto the floor directly under itself. A soft
       * ellipse that widens as the bob rises, which is the one cue that says
       * how high up a thing is when everything else about it is round. */
      for (const b of bobs) {
        const under = project(b.bob[0], 0, b.bob[2], cam);
        const height = Math.max(0.05, b.bob[1]);
        const r = 16 * under.k * (0.7 + height * 0.32);
        ctx.globalAlpha = Math.max(0.06, 0.3 - height * 0.09);
        ctx.fillStyle = cssRgb(mixRgb(colours.roomBottom, [0, 0, 0], 0.75));
        ctx.beginPath();
        ctx.ellipse(under.x, under.y, r, r * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      /* The paper. Four corners through the same divide as everything else, so
       * it foreshortens: the far edge is drawn shorter than the near one, which
       * is most of why the drawing reads as lying on a table rather than on the
       * glass. */
      const corners = [
        project(-PAPER_HALF, 0, PAPER_HALF, cam),
        project(PAPER_HALF, 0, PAPER_HALF, cam),
        project(PAPER_HALF, 0, -PAPER_HALF, cam),
        project(-PAPER_HALF, 0, -PAPER_HALF, cam),
      ];
      const sheet = ctx.createLinearGradient(0, corners[3].y, 0, corners[0].y);
      sheet.addColorStop(0, cssRgb(mixRgb(colours.paper, colours.roomBottom, 0.42)));
      sheet.addColorStop(1, cssRgb(colours.paper));
      ctx.fillStyle = sheet;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = cssRgb(colours.paperEdge);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      /* The drawing, in bands from the oldest ink to the newest. Banded rather
       * than stroked per segment: the colour depends only on how old the ink is
       * and there are eighteen bands against up to four thousand points. */
      let penX = 0;
      let penY = 0;
      let penK = 1;
      if (f && f.count > 1 && p.ink > 0) {
        const fit = PAPER_HALF * 0.9;
        const shrink = Math.max(1, p.balance);
        const sx: number[] = new Array(f.count);
        const sy: number[] = new Array(f.count);
        for (let i = 0; i < f.count; i++) {
          const q = project((f.xs[i] * fit) / shrink, 0, (f.ys[i] * fit) / shrink, cam);
          sx[i] = q.x;
          sy[i] = q.y;
          if (i === f.count - 1) {
            penX = q.x;
            penY = q.y;
            penK = q.k;
          }
        }

        // The drawing's own soft shadow on the paper, which is what stops the
        // ink looking like it is floating above the sheet. First thing the
        // quality ladder gives up.
        if (rung.shadow) {
          ctx.strokeStyle = cssRgb(mixRgb(colours.paper, [0, 0, 0], 0.16));
          ctx.lineWidth = 4.2;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sx[0] + 1.6, sy[0] + 2.4);
          for (let i = 1; i < f.count; i++) ctx.lineTo(sx[i] + 1.6, sy[i] + 2.4);
          ctx.stroke();
        }

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const per = Math.max(2, Math.ceil((f.count - 1) / INK_BANDS));

        /* Wet ink: one wide, faint pass under the line and one crisp pass on
         * top. A single hairline reads as a diagram, and the point of this
         * activity is that what the child made is worth looking at. */
        for (const pass of [0, 1] as const) {
          if (pass === 0 && !rung.shadow) continue;
          for (let band = 0; band * per < f.count - 1; band++) {
            const t = (band * per) / Math.max(1, f.count - 1);
            const colour = mixRgb(colours.inkOld, colours.ink, t);
            if (pass === 0) {
              ctx.globalAlpha = 0.16;
              ctx.strokeStyle = cssRgb(colour);
              ctx.lineWidth = 6.5;
            } else {
              ctx.globalAlpha = 1;
              ctx.strokeStyle = cssRgb(colour);
              ctx.lineWidth = 1.5 + 1.4 * t;
            }
            ctx.beginPath();
            ctx.moveTo(sx[band * per], sy[band * per]);
            const end = Math.min(f.count - 1, (band + 1) * per);
            for (let i = band * per + 1; i <= end; i++) ctx.lineTo(sx[i], sy[i]);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;

        // The pen itself, sitting on the end of the line.
        ctx.fillStyle = cssRgb(colours.brass);
        ctx.beginPath();
        ctx.ellipse(penX, penY, 4 * penK, 4 * penK, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Nothing drawn. The pen still rests in the middle of the sheet, so the
        // machine is complete on the first frame a child ever sees and there is
        // something for the drawing to start from. Drawn, not animated.
        const rest = project(0, 0, 0, cam);
        ctx.fillStyle = cssRgb(colours.brass);
        ctx.beginPath();
        ctx.ellipse(rest.x, rest.y, 4 * rest.k, 4 * rest.k, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      /* The frame the machine is built out of: two posts standing on the floor
       * and a beam across them. It is not decoration. Without the posts the
       * beam floats, and a beam that floats makes the pendulums look pinned to
       * the glass rather than hung inside a room the child is looking into. */
      const barA = project(-FRAME_HALF_X, BAR_Y, PIVOT_Z, cam);
      const barB = project(FRAME_HALF_X, BAR_Y, PIVOT_Z, cam);
      const frameColour = cssRgb(mixRgb(colours.cord, colours.roomTop, 0.25));
      for (const bar of [barA, barB]) {
        const foot = project(bar === barA ? -FRAME_HALF_X : FRAME_HALF_X, 0, PIVOT_Z, cam);
        ctx.strokeStyle = frameColour;
        ctx.lineWidth = Math.max(2, 6 * bar.k * 0.9);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bar.x, bar.y);
        ctx.lineTo(foot.x, foot.y);
        ctx.stroke();
      }
      ctx.strokeStyle = frameColour;
      ctx.lineWidth = Math.max(2, 5 * ((barA.k + barB.k) / 2) * 0.9);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(barA.x, barA.y);
      ctx.lineTo(barB.x, barB.y);
      ctx.stroke();

      const screens: { x: number; y: number }[] = [];
      const order = bobs
        .map((b, i) => ({ i, depth: project(b.bob[0], b.bob[1], b.bob[2], cam).depth }))
        .sort((a, b) => b.depth - a.depth);

      for (let n = 0; n < order.length; n++) {
        const { i } = order[n];
        const b = bobs[i];
        const top = project(b.pivot[0], b.pivot[1], b.pivot[2], cam);
        const end = project(b.bob[0], b.bob[1], b.bob[2], cam);
        screens[i] = { x: end.x, y: end.y };

        const fog = fogAt(end.depth);
        ctx.strokeStyle = cssRgb(mixRgb(colours.cord, colours.roomBottom, fog));
        ctx.lineWidth = Math.max(1, 1.7 * end.k);
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        const r = 19 * end.k;
        const body = mixRgb(colours.brass, colours.roomBottom, fog);
        const shade = ctx.createRadialGradient(
          end.x - r * 0.36,
          end.y - r * 0.42,
          r * 0.1,
          end.x,
          end.y,
          r,
        );
        shade.addColorStop(0, cssRgb(mixRgb(body, [255, 255, 255], 0.4)));
        shade.addColorStop(1, cssRgb(mixRgb(body, [0, 0, 0], 0.42)));
        ctx.fillStyle = shade;
        ctx.beginPath();
        ctx.ellipse(end.x, end.y, r, r, 0, 0, Math.PI * 2);
        ctx.fill();

        /* A ring around each bob, and only while the paper is still blank.
         * This is the whole of the instruction layer: no words, no arrow, no
         * "tap here", just a mark saying that this round thing is the thing to
         * take hold of. It is drawn and not animated, because it is on the
         * first frame a child ever sees, and it goes away for good the moment
         * they have drawn anything. */
        if (p.ink <= 0) {
          ctx.strokeStyle = cssRgb(mixRgb(colours.brass, colours.roomTop, 0.35));
          ctx.lineWidth = Math.max(1, 1.4 * end.k);
          ctx.beginPath();
          ctx.ellipse(end.x, end.y, r * 1.9, r * 1.9, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      bobScreen.current = screens;

      /* A vignette, last, over everything. It is a still gradient and it does
       * one job: pulling the eye off the corners of the room and onto the paper
       * in the middle of it. */
      const vignette = ctx.createRadialGradient(
        cssW / 2,
        cssH * 0.56,
        Math.min(cssW, cssH) * 0.3,
        cssW / 2,
        cssH * 0.56,
        Math.max(cssW, cssH) * 0.78,
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, calm ? 'rgba(0,0,0,0.34)' : 'rgba(0,0,0,0.46)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, cssW, cssH);
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

      if (needsRetrace.current) {
        retrace();
        needsRetrace.current = false;
        dirty.current = true;
      }

      /* Now the path is current, so the events the drag produced can be handed
       * over against a drawing that really exists. */
      if (drained.length > 0) {
        for (const event of drained) feed(event);
        drained.length = 0;
      }

      const paintNeeded = dirty.current || moved;
      /*
       * Whether the loop runs again, and whether it runs at all.
       *
       * Both rules live in `shouldSchedule`, out in the pure module with tests
       * that kill the reverts: a canvas with no size gets no frame however busy
       * everything else is, and a still, unhandled machine gets none either, so
       * a tablet left open on this activity has no rAF callback at all. cssW is
       * only ever set by build(), and build() returns without setting it when
       * the element measures under two pixels, so a hidden subtree parks here
       * until the ResizeObserver wakes it.
       */
      const swinging = !reduceMotion && holdAmp.current > 0;
      if (
        !shouldSchedule({
          cssW,
          dirty: paintNeeded,
          holding: holding.current,
          queued: queue.current.length > 0,
          swinging,
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
      // cannot touch the drawing: see the QUALITY comment.
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
      const ratio = frequencyFor(p.lengthY) / frequencyFor(p.lengthX);
      setDescribed((prev) => {
        if (
          prev.ratio === ratio &&
          prev.phase === p.phase &&
          prev.balance === p.balance &&
          prev.ink === p.ink
        ) {
          return prev;
        }
        return { ratio, phase: p.phase, balance: p.balance, ink: p.ink };
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
  }, [quality, calm, reduceMotion, feed, ratioNow, slideString]);

  /* ── UI ────────────────────────────────────────────────────────────────── */

  const colours = sceneColours(described.ratio, calm);
  const shellCss = cssRgb(colours.roomTop);

  const cards = useMemo(
    () => RATIO_CARDS.map((card) => ({ card, d: cardPath(card) })),
    [],
  );

  return (
    <div className="relative flex h-full w-full flex-col" style={{ background: shellCss }}>
      <canvas
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label="Two pendulums hang over a sheet of paper. Drag a hanging weight up or down its string to change how fast that pendulum swings, and the pen draws a different figure. Drag on the paper to lean the drawing and to keep drawing."
        aria-describedby="harmonograph-keys"
        className="min-h-0 w-full flex-1"
        style={{ touchAction: 'none', cursor: 'grab', display: 'block' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onKeyDown={onKeyDown}
      />

      <span id="harmonograph-keys" className="sr-only">
        Up and down arrows move the weight on the second pendulum. Left and right arrows move the
        weight on the first. Hold shift with left and right to lean the drawing. Space draws more.
      </span>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {/* Controls. Deliberately thin and dark so the machine stays the subject. */}
      <div
        className="relative shrink-0 px-4 pb-4 pt-3"
        style={{
          background: `linear-gradient(to top, ${cssRgb(mixRgb(colours.roomTop, [0, 0, 0], 0.5))}, ${cssRgb(colours.roomTop)}00)`,
        }}
      >
        {/*
          The card floats above the controls rather than sitting in the column.

          In flow it is a real box eighty pixels tall, and the canvas is the flex
          child that gives those pixels up. Pattern Garden learned what that
          costs the hard way: a resize there rebuilt the simulation grid and the
          child's garden was wiped underneath the sentence congratulating them
          on growing it.

          Here the drawing survives a resize, because it is a pure function of
          five numbers held in refs, so this is no longer a correctness problem.
          It is still the right layout: the canvas keeps its size, so the machine
          does not jump a hundred pixels down the screen at the exact moment the
          child is being told what they made.

          The card and its wrapper are BOTH transparent to touch, and that is not
          a nicety. Out of flow the card lands over the bottom of the canvas,
          which is where the near edge of the paper is and therefore where a drag
          to keep drawing starts. Only buttons take touches in here.
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

        {/* The cards. Each thumbnail is the real trace function at that ratio,
            drawn once by the browser, so what is on the button is what the two
            pendulums make. */}
        <div className="flex items-center gap-2" role="group" aria-label="Pendulum pairs">
          {cards.map(({ card, d }) => {
            const chosen = card.id === chosenCard;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => pickCard(card)}
                aria-pressed={chosen}
                aria-label={`${card.p} against ${card.q}`}
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
                  <path
                    d={d}
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span className="text-[11px] font-semibold">{card.label}</span>
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
            onClick={freshPaper}
            className="shrink-0 rounded-xl border-none px-4 text-[13px] font-semibold"
            style={{
              minHeight: 44,
              background: 'rgba(63,169,138,0.16)',
              color: '#9FE3C8',
              cursor: 'pointer',
            }}
          >
            Fresh paper
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
        win. Same fix as Water Sphere, Pattern Garden and Fractal Grower.
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
