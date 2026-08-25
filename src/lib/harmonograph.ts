/**
 * Sound Drawing - two pendulums, one pen, and the picture their ratio makes.
 *
 * No DOM in here.
 *
 * WHAT THE MACHINE IS
 *
 * A harmonograph. One pendulum swings the pen left and right. A second swings
 * the paper towards and away. The pen is only ever obeying two swings at once,
 * and what it leaves behind is the shape of how those two swings compare.
 *
 * That comparison is a RATIO, and it is the only thing the drawing is made of.
 * Two pendulums swinging at 3 against 2 draw one closed figure and keep
 * retracing it forever. Two swinging at 3 against 2.05 draw very nearly that
 * figure, and then a little to the side of it, and then a little further, until
 * what is on the paper is a rosette. Nothing was added to make that happen. The
 * ratio stopped being simple, and that is all.
 *
 * The same ratio is a musical interval. 2:1 is an octave, 3:2 a fifth, 4:3 a
 * fourth. When the child turns the sound on, the two pendulums are the two
 * notes, so the shape on the paper and the chord in the room are the same fact
 * arriving through two senses. Nothing in this file asserts that to a child;
 * the activity plays the two notes and draws the two swings and lets them be
 * the same thing.
 *
 * WHY IT IS OUT HERE
 *
 * Every claim the activity makes to a child is a claim about this file, so each
 * one is a measurement in `harmonograph.test.ts` rather than a sentence in a
 * comment:
 *
 *   - "a shorter string makes more loops" is measured: `loopCount` counts the
 *     turns the pen actually makes across a fixed length of drawing, by finding
 *     local maxima in the sampled path, and the suite sweeps the whole control
 *     and asserts the count never goes down as the string gets shorter.
 *
 *   - "the line came back over itself" is measured: `openness` is the largest
 *     distance between the pen now and the pen one whole figure later, taken
 *     across everything drawn so far. At an exact simple ratio it is zero to
 *     floating point. Just off one, it grows with every turn.
 *
 *   - "the picture is the ratio, not the size" is structural: the traced path
 *     is a function of `ratio` and nothing else knows the two lengths, and a
 *     test grows two figures from different lengths at one ratio and compares
 *     them point for point.
 *
 * THE PENDULUM LAW IS REAL
 *
 * `frequencyFor` is 1/sqrt(length), which is the actual pendulum law up to the
 * constant, and a test pins the consequence a child can see and hear: four
 * times the string is exactly half the speed and exactly an octave down.
 *
 * Issue: #225 (wave 4, Sound Drawing)
 */

/*
 * The colour fence is imported rather than copied.
 *
 * Hues 270-350 are banned by BRAND.md across the whole product, and
 * `pattern-garden.ts` is where that ban was first made unreachable-by-
 * construction rather than promised. Two copies of a fence drift the day after
 * they are written, so this file folds through the same function. Its own suite
 * still measures the arc THIS activity can reach, because importing a safe
 * function does not prove a caller uses it everywhere.
 */
import { hueIsAllowed, safeHue } from '@/lib/pattern-garden';

export { hueIsAllowed, safeHue };

// ---------------------------------------------------------------------------
// The two strings
// ---------------------------------------------------------------------------

/**
 * How long a pendulum can be, in units of the machine's own frame.
 *
 * The span is sixteen to one, which is exactly four to one in speed, which is
 * two octaves. Both ends are usable rather than one being a broken corner: the
 * long end is a slow heavy swing that draws wide open curves, the short end is
 * a fast one that packs loops into the same drawing. There is no setting in
 * between that does nothing.
 */
export const LENGTH_MIN = 0.25;
export const LENGTH_MAX = 4;

export function clampLength(length: number): number {
  if (!Number.isFinite(length)) return LENGTH_MIN;
  return Math.min(LENGTH_MAX, Math.max(LENGTH_MIN, length));
}

/**
 * How fast a pendulum of that length swings, relative to a string of length 1.
 *
 * The real law is f = (1/2pi) sqrt(g/L). Everything in front of the square root
 * is a constant, and a constant multiplying BOTH pendulums cancels out of their
 * ratio and therefore out of the drawing entirely, so it is not carried. What
 * survives is the part a child can find with their hands: shorter is faster,
 * and it is faster by the square root, so it takes four times the string to
 * halve the speed.
 */
export function frequencyFor(length: number): number {
  return 1 / Math.sqrt(clampLength(length));
}

/** The string that swings at that speed. Inverse of `frequencyFor`. */
export function lengthForFrequency(frequency: number): number {
  return clampLength(1 / (frequency * frequency));
}

/** Fastest and slowest the machine can be driven, from the two length ends. */
export const FREQ_MAX = 1 / Math.sqrt(LENGTH_MIN);
export const FREQ_MIN = 1 / Math.sqrt(LENGTH_MAX);

/** Every ratio the two strings can be put into, in either direction. */
export const RATIO_MIN = FREQ_MIN / FREQ_MAX;
export const RATIO_MAX = FREQ_MAX / FREQ_MIN;

// ---------------------------------------------------------------------------
// The paper
// ---------------------------------------------------------------------------

/**
 * How far the pen's two swings are out of step, in radians.
 *
 * At zero, with the strings equal, the pen goes out and back along one straight
 * diagonal, because both swings peak together. At a quarter turn it draws a
 * circle. Everything between is an ellipse leaning one way or the other. It is
 * the most immediately legible control on the machine and it changes nothing
 * about whether the figure closes, which is why it is safe to leave under a
 * finger that is exploring.
 */
export const PHASE_MIN = 0;
export const PHASE_MAX = Math.PI;

export function clampPhase(phase: number): number {
  if (!Number.isFinite(phase)) return PHASE_MIN;
  return Math.min(PHASE_MAX, Math.max(PHASE_MIN, phase));
}

/**
 * How hard the second pendulum was pushed against the first.
 *
 * Stretches the figure tall or wide. Like the phase, it cannot make a closed
 * figure open or an open one closed: it scales the two axes and nothing else,
 * so a child pulling the drawing about is never accidentally undoing the thing
 * they just found.
 */
export const BALANCE_MIN = 0.4;
export const BALANCE_MAX = 2.5;

export function clampBalance(balance: number): number {
  if (!Number.isFinite(balance)) return 1;
  return Math.min(BALANCE_MAX, Math.max(BALANCE_MIN, balance));
}

// ---------------------------------------------------------------------------
// Ink
// ---------------------------------------------------------------------------

/**
 * How much drawing there can be, counted in swings of the first pendulum.
 *
 * Sixteen is where the densest rosette this machine can make stops gaining
 * anything a child can see: past it the paper is a solid disc of ink.
 */
export const INK_MAX = 16;

/** Below this there is not enough on the paper to be a picture. */
export const INK_MIN = 0;

export function clampInk(ink: number): number {
  if (!Number.isFinite(ink)) return INK_MIN;
  return Math.min(INK_MAX, Math.max(INK_MIN, ink));
}

/**
 * How much drawing one pixel of finger travel is worth.
 *
 * Chosen against a hand: a full-height drag across a tablet is roughly seven
 * swings, so a child gets a real figure out of one gesture and the whole
 * sixteen out of a few.
 */
export const INK_PER_PX = 1 / 90;

/**
 * Advance the drawing by a distance the finger moved.
 *
 * NOTE WHAT IS NOT AN ARGUMENT: there is no time here, and there is no frame
 * count. The ink on the paper is a function of how far the child's hand has
 * travelled and of nothing else, so a hand that stops draws nothing more, in
 * every motion setting, and the reduced-motion rule about this activity is a
 * property of its shape rather than a branch someone has to remember to write.
 */
export function inkAfterTravel(ink: number, travelPx: number): number {
  if (!Number.isFinite(travelPx) || travelPx <= 0) return clampInk(ink);
  return clampInk(ink + travelPx * INK_PER_PX);
}

// ---------------------------------------------------------------------------
// The figure
// ---------------------------------------------------------------------------

export interface FigureParams {
  /** Second pendulum's speed against the first. The whole shape lives here. */
  ratio: number;
  phase: number;
  balance: number;
  /** Swings of the first pendulum drawn so far. */
  turns: number;
}

export interface Figure {
  xs: Float64Array;
  ys: Float64Array;
  count: number;
  /** Half the width and height the path actually reaches. */
  halfW: number;
  halfH: number;
}

/**
 * Ceiling on sampled points.
 *
 * The path is a smooth curve, so the only thing that decides how many samples
 * it needs is how fast the faster of the two swings turns over. That is
 * `turns * ratio` half-cycles at the very most, which at the extreme corner of
 * the controls is sixteen swings against a four times faster string. This cap
 * is comfortably above the honest worst case and is here so that a later widening
 * of a control cannot quietly hand a tablet a hundred thousand line segments.
 */
export const POINT_CAP = 4000;

/** Samples per swing of the first pendulum, before the faster string is allowed for. */
export const SAMPLES_PER_TURN = 96;

/**
 * How many samples this figure needs.
 *
 * Density follows the FASTER of the two swings, because that is the one that
 * would alias into a lie: undersampled, a fast second pendulum draws a figure
 * with fewer loops in it than the machine is actually making, which is the one
 * error this activity cannot afford, since counting loops is a thing the child
 * is being invited to do.
 */
export function samplesFor(params: FigureParams, perTurn = SAMPLES_PER_TURN): number {
  const turns = Math.max(0, params.turns);
  const speed = Math.max(1, Math.abs(params.ratio));
  const wanted = Math.ceil(turns * perTurn * speed) + 1;
  return Math.max(2, Math.min(POINT_CAP, wanted));
}

/** The pen's position after `u` radians of the first pendulum's swing. */
export function penAt(params: FigureParams, u: number): { x: number; y: number } {
  return {
    x: Math.sin(u + params.phase),
    y: params.balance * Math.sin(params.ratio * u),
  };
}

/**
 * The whole drawing, sampled.
 *
 * A pure function of the four numbers above. In particular it does not know
 * either pendulum's LENGTH, only how they compare, which is what makes "the
 * picture is the ratio, not the size" a fact about the code rather than a
 * hopeful sentence: there is no argument through which a size could reach it.
 */
export function traceFigure(params: FigureParams, perTurn = SAMPLES_PER_TURN): Figure {
  const count = samplesFor(params, perTurn);
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  const span = Math.max(0, params.turns) * Math.PI * 2;
  let halfW = 0;
  let halfH = 0;
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0 : (span * i) / (count - 1);
    const p = penAt(params, u);
    xs[i] = p.x;
    ys[i] = p.y;
    if (Math.abs(p.x) > halfW) halfW = Math.abs(p.x);
    if (Math.abs(p.y) > halfH) halfH = Math.abs(p.y);
  }
  return { xs, ys, count, halfW, halfH };
}

// ---------------------------------------------------------------------------
// Simple numbers
// ---------------------------------------------------------------------------

/**
 * Biggest number either side of a ratio may use before it stops being simple.
 *
 * Five, because 5:4 is still a figure a child can see the shape of and 7:6 is
 * not: it is a ring of ink that happens to close. The honesty of the two lines
 * this activity says about closing depends on that being true, so the boundary
 * is drawn where the eye draws it rather than where arithmetic could go.
 */
export const MAX_TERM = 5;

export interface SimpleRatio {
  /** The second pendulum's share. */
  p: number;
  /** The first pendulum's share, and the number of swings a whole figure takes. */
  q: number;
  /** How far the real ratio is from this simple one. */
  error: number;
}

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/**
 * The simplest ratio the two strings are near, and how near.
 *
 * Brute force over every reduced pair inside MAX_TERM, which is 19 candidates.
 * A continued-fraction expansion would be cleverer and would need its own test
 * to prove it agrees with the obvious answer, so this is the obvious answer.
 *
 * Ties go to the smaller q, so a ratio sitting exactly between two candidates
 * is described by the one whose figure closes sooner, which is the one the
 * child can actually see close.
 */
export function nearestSimpleRatio(ratio: number, maxTerm = MAX_TERM): SimpleRatio {
  let best: SimpleRatio = { p: 1, q: 1, error: Math.abs(ratio - 1) };
  for (let q = 1; q <= maxTerm; q++) {
    for (let p = 1; p <= maxTerm; p++) {
      if (gcd(p, q) !== 1) continue;
      const error = Math.abs(ratio - p / q);
      if (error < best.error - 1e-12 || (Math.abs(error - best.error) <= 1e-12 && q < best.q)) {
        best = { p, q, error };
      }
    }
  }
  return best;
}

/**
 * How far the drawing has drifted off itself, across everything drawn so far.
 *
 * A closed figure takes `q` swings of the first pendulum to complete, so every
 * later lap should land exactly on the first one. This compares the first lap
 * against EVERY later lap and takes the largest distance it finds.
 *
 * Comparing only against the NEXT lap was tried first and is wrong twice over.
 * It saturates, because the offset between two neighbouring laps is the same
 * constant however many laps have been drawn, so it cannot express the thing
 * the child is watching happen. And it can read zero on a drawing that is
 * plainly a rosette, when the drift per lap happens to come to a whole turn.
 * Taking the worst across all laps fixes both: it is zero exactly when every
 * lap sits on the first one, and because adding a lap only adds a term to a
 * maximum, it can never go DOWN as the child keeps drawing.
 *
 * At an exact simple ratio the answer is zero to floating point, at every
 * length of drawing, because the path really does retrace itself. Just off one,
 * it grows lap by lap, which is why the same rosette that looked closed after
 * four swings is plainly open after sixteen. That growth is the whole physical
 * content of the activity and it is what makes both of the closing lines
 * earnable by drawing MORE rather than by being told.
 *
 * Returns null rather than a number when fewer than two whole laps have been
 * drawn, because with nothing to compare against, zero would be a claim of
 * closure that no evidence supports.
 */
export function openness(params: FigureParams, samples = 192): number | null {
  const simple = nearestSimpleRatio(params.ratio);
  const period = simple.q;
  const laps = Math.floor(params.turns / period);
  if (laps < 2) return null;

  const lap = period * Math.PI * 2;
  const steps = Math.max(2, samples);
  let worst = 0;
  for (let i = 0; i < steps; i++) {
    const u = (lap * i) / (steps - 1);
    const a = penAt(params, u);
    for (let k = 1; k < laps; k++) {
      const b = penAt(params, u + lap * k);
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > worst) worst = d;
    }
  }
  return worst;
}

/**
 * How many loops the pen has made across the drawing.
 *
 * Counted from the sampled path rather than worked out from the ratio, because
 * what the line names is the thing a child can point at, and a number derived
 * from the parameters would agree with the parameters even if the drawing on
 * the paper disagreed with both.
 */
export function loopCount(params: FigureParams, perTurn = SAMPLES_PER_TURN): number {
  const figure = traceFigure(params, perTurn);
  let loops = 0;
  for (let i = 1; i < figure.count - 1; i++) {
    if (figure.ys[i] > figure.ys[i - 1] && figure.ys[i] >= figure.ys[i + 1]) loops++;
  }
  return loops;
}

// ---------------------------------------------------------------------------
// The cards
// ---------------------------------------------------------------------------

/**
 * Four ratios a child can put the machine into with one tap.
 *
 * They are not a menu of answers and they are not a quiz. They are the same
 * thing the two strings do, reachable by a hand that has not yet worked out how
 * to reach it, and tapping one moves both pendulums where the child can watch
 * them go. Every one of them is a musical interval as well as a figure: the
 * unison, the octave, the fifth and the fourth, which is the four intervals a
 * person hears as consonant before they have been taught anything.
 */
export interface RatioCard {
  id: string;
  /** Second pendulum's share. */
  p: number;
  /** First pendulum's share. */
  q: number;
  label: string;
}

export const RATIO_CARDS: readonly RatioCard[] = [
  { id: '1-1', p: 1, q: 1, label: '1:1' },
  { id: '2-1', p: 2, q: 1, label: '2:1' },
  { id: '3-2', p: 3, q: 2, label: '3:2' },
  { id: '4-3', p: 4, q: 3, label: '4:3' },
];

/**
 * The two string lengths that put the machine at a card's ratio.
 *
 * Anchored on the geometric middle of the length range, so both strings stay
 * well inside their travel at every card and the child can still drag either
 * one afterwards in both directions. The card is a starting place, never a
 * terminus.
 */
export function lengthsForCard(card: RatioCard): { lengthX: number; lengthY: number } {
  const mid = Math.sqrt(LENGTH_MIN * LENGTH_MAX);
  const midFreq = 1 / Math.sqrt(mid);
  const ratio = card.p / card.q;
  // Split the ratio evenly either side of the middle, so neither string is
  // pushed towards its end of the travel more than the other.
  const spread = Math.sqrt(ratio);
  return {
    lengthX: lengthForFrequency(midFreq / spread),
    lengthY: lengthForFrequency(midFreq * spread),
  };
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

export interface Palette {
  /** The room behind the machine. */
  roomHue: number;
  /** The paper on the table. */
  paperHue: number;
  /** The ink the pen lays down. */
  inkHue: number;
  /** The lit side of a swinging bob. */
  brassHue: number;
}

/**
 * Colour for a position on the ratio control.
 *
 * Walking the ratio walks the ink from a leaf green through olive to a warm
 * amber, which is a walk along one continuous arc rather than a rainbow.
 * The arc is deliberately narrow: the ink is mixed towards the paper colour as
 * it recedes and as it ages, and a blend between two colours far apart on the
 * circle can cross the banned band even when both ends are clear of it. The
 * suite samples the whole control and every blend between any two of its
 * colours.
 *
 * Every value goes through safeHue, so the fence holds even if someone widens
 * these arcs later without reading this comment.
 */
export function paletteAt(t: number): Palette {
  const pt = Math.min(1, Math.max(0, t));
  return {
    roomHue: safeHue((202 - 14 * pt) / 360),
    paperHue: safeHue((42 - 8 * pt) / 360),
    inkHue: safeHue((196 - 158 * pt) / 360),
    brassHue: safeHue((44 - 10 * pt) / 360),
  };
}

/** Where on the palette arc a ratio sits. Monotone, so colour never doubles back. */
export function paletteTFor(ratio: number): number {
  const lo = Math.log(RATIO_MIN);
  const hi = Math.log(RATIO_MAX);
  const r = Math.min(RATIO_MAX, Math.max(RATIO_MIN, Math.abs(ratio) || RATIO_MIN));
  return (Math.log(r) - lo) / (hi - lo);
}

// ---------------------------------------------------------------------------
// The camera
// ---------------------------------------------------------------------------

export interface Camera {
  sinYaw: number;
  cosYaw: number;
  sinPitch: number;
  cosPitch: number;
  eyeHeight: number;
  distance: number;
  focal: number;
}

export interface Projected {
  x: number;
  /** Screen-space up. Positive is higher on the screen. */
  y: number;
  /** Perspective factor. Larger means nearer, so widths scale by it. */
  k: number;
  /** Distance from the eye along the view axis. Drives the haze and the sorting. */
  depth: number;
}

/**
 * A camera looking down at the table from in front of it.
 *
 * The pitch is not a free parameter: it is whatever angle points the eye at the
 * middle of the table from wherever the eye is, so raising the eye tilts the
 * view rather than sliding the table off the screen.
 */
export function makeCamera(yaw: number, eyeHeight: number, distance: number, focal: number): Camera {
  const pitch = Math.atan2(eyeHeight, distance);
  return {
    sinYaw: Math.sin(yaw),
    cosYaw: Math.cos(yaw),
    sinPitch: Math.sin(pitch),
    cosPitch: Math.cos(pitch),
    eyeHeight,
    distance,
    focal,
  };
}

/**
 * One point of the machine, put on the screen.
 *
 * Yaw first, which orbits the eye around the table, then the look-down, then a
 * single perspective divide. That divide is the whole reason a flat canvas
 * holds something with a front and a back: the near end of the table is drawn
 * wider than the far end by the same rule that makes the near pendulum's bob
 * bigger than the far one's.
 */
export function projectPoint(x: number, y: number, z: number, cam: Camera): Projected {
  const wx = x * cam.cosYaw + z * cam.sinYaw;
  const wz = -x * cam.sinYaw + z * cam.cosYaw;

  const vy = y - cam.eyeHeight;
  const vz = wz + cam.distance;

  const ry = vy * cam.cosPitch + vz * cam.sinPitch;
  const rz = -vy * cam.sinPitch + vz * cam.cosPitch;

  const depth = Math.max(0.15, rz);
  const k = cam.focal / depth;
  return { x: wx * k, y: ry * k, k, depth };
}

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

/** Below this the settle is over, the last frame is painted, and the loop stops. */
export const HOLD_FLOOR = 0.004;
/** How fast the machine winds up under a finger. Per second. */
export const HOLD_RISE = 4;
/** How fast it settles after the finger lifts. Per second. */
export const HOLD_DECAY = 2.2;

/**
 * How wound up the machine is, one frame on.
 *
 * Under reduced motion this SNAPS rather than ramping. A ramp is itself an
 * animation that outlives the input that started it, and a child who taps once
 * would otherwise watch the pendulums ease into place on their own.
 */
export function holdAmpNext(args: {
  reduceMotion: boolean;
  holding: boolean;
  amp: number;
  dt: number;
}): number {
  if (args.reduceMotion) return args.holding ? 1 : 0;
  if (args.holding) return Math.min(1, args.amp + args.dt * HOLD_RISE);
  const next = Math.max(0, args.amp - args.dt * HOLD_DECAY);
  return next < HOLD_FLOOR ? 0 : next;
}

export interface MotionAmplitudes {
  /**
   * The scene's lean towards the finger. POSITION driven: a function of where
   * the finger is and of nothing else, so it moves when and only when the
   * finger moves. Kept under reduced motion, because it is the child's own hand
   * shown back to them rather than motion the screen invented.
   */
  lean: number;
  /**
   * The pendulums' swing. TIME driven: a wall-clock sinusoid, so it keeps going
   * under a finger resting perfectly still. That is autonomous motion however
   * it got started, so it is zero under reduced motion at every moment, held or
   * not, and the pendulums are drawn hanging still.
   */
  swing: number;
}

/**
 * The two amplitudes, kept apart.
 *
 * They are separated here, in a pure function with a test that kills the
 * one-character change collapsing them, because Fractal Grower shipped with
 * exactly that collapse: its time-driven sway ran at full amplitude under
 * reduced motion for as long as a finger was held on the screen, and the only
 * reason it was found is that the observed pass sampled the canvas DURING a
 * held-still touch instead of only after the release.
 */
export function motionAmplitudes(args: {
  reduceMotion: boolean;
  holdAmp: number;
}): MotionAmplitudes {
  return {
    lean: args.holdAmp,
    swing: args.reduceMotion ? 0 : args.holdAmp,
  };
}

/** Under this many CSS pixels wide there is nothing to paint into. */
export const MIN_CANVAS_PX = 2;

/**
 * Whether the render loop should run another frame.
 *
 * Two separate rules, in one place, because they are the two ways this kind of
 * loop goes wrong and both have already cost a fix round in this repo:
 *
 *   1. A canvas with no size gets NO frame. A component whose subtree is hidden,
 *      or which has not been laid out yet, would otherwise spin the loop for as
 *      long as it stays hidden, painting nothing. The ResizeObserver wakes it
 *      when a size arrives, so nothing is lost by refusing here.
 *
 *   2. A machine that is still and unhandled gets NO frame. The loop stops
 *      itself rather than running forever and returning early, so a tablet left
 *      open on this activity has no rAF callback at all.
 */
export function shouldSchedule(args: {
  cssW: number;
  dirty: boolean;
  holding: boolean;
  queued: boolean;
  swinging: boolean;
}): boolean {
  if (!(args.cssW >= MIN_CANVAS_PX)) return false;
  return args.dirty || args.holding || args.queued || args.swinging;
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

/**
 * What is standing on the paper, for a child using a screen reader.
 *
 * Describes the drawing, not the controls: how many loops are on the paper and
 * whether the line is coming back over itself. That is the same information the
 * picture gives, which is the point.
 */
export function describeFigure(params: FigureParams): string {
  if (params.turns < 0.35) return 'The paper is blank. Drag a pendulum to start drawing.';

  const loops = loopCount(params);
  const simple = nearestSimpleRatio(params.ratio);
  const gap = openness(params);

  const shape =
    loops <= 1 ? 'one loop' : loops === 2 ? 'two loops' : `${Math.round(loops)} loops`;

  if (gap === null) {
    return `A drawing with ${shape} so far.`;
  }
  if (gap <= CLOSED_GAP) {
    return `A closed figure with ${shape}, drawn at ${simple.p} against ${simple.q}. The line keeps coming back over itself.`;
  }
  return `A spiralling drawing with ${shape}. The line is not coming back over itself.`;
}

/**
 * How near the pen has to come to its own path before the figure counts as
 * closed, in the units the figure is drawn in, where the pen's own swing
 * reaches 1.
 *
 * Measured rather than chosen: `harmonograph.test.ts` sweeps ratios either side
 * of 3:2 at the full sixteen swings and pins both the value and the width of
 * the band of ratios that clears it.
 */
export const CLOSED_GAP = 0.08;

/**
 * How far off itself the pen has to wander before the drawing counts as one
 * that never joins up.
 */
export const OPEN_GAP = 0.8;
