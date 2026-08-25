/**
 * Pattern Garden - the chemistry, the map of it, the palette. No DOM in here.
 *
 * Two things spread through a bed of soil and react with each other. One feeds
 * the other; the other eats the first and dies off at its own rate. That is the
 * entire rule, it is four terms long, and out of it come spots, stripes and
 * labyrinths that look exactly like the coats of animals. This is the
 * Gray-Scott reaction-diffusion system, and it is one half of what Turing
 * showed in 1952: pattern does not need a plan, it falls out of a simple rule
 * repeated everywhere at once.
 *
 * Everything a child is told in this activity is something the activity has
 * just done in front of them:
 *
 *   - "Your touch grew a pattern" - they painted seed and the seed grew.
 *   - "It kept growing by itself" - the coverage rose while nobody touched it.
 *   - "The same garden grew a different shape" - the same four terms, one
 *     number moved, a different family of shape.
 *   - "The pattern picks its own size" - a big smear and a small dab settle
 *     into features of the same width, because the width comes from the rule
 *     and not from the finger. That one is the deepest and it is also the one
 *     the child can most easily check.
 *
 * WHY SO MUCH OF THIS IS OUT HERE
 *
 * Wave 1 put the "has the child produced the effect" decisions inline in canvas
 * components and shipped two bugs no test could see. Water Sphere answered that
 * by moving its predicates into a pure reducer. This file goes one further,
 * because Pattern Garden has a second thing worth proving mechanically: that
 * every position of the control grows SOMETHING. A child who drags the control
 * into a corner where the chemistry dies has been handed a failure state, in an
 * activity whose whole promise is that a pattern cannot be wrong. So the sim
 * itself lives here, and the test suite runs it at a grid of control positions
 * and asserts that a pattern actually appears at each. The aliveness of the
 * garden is a test result, not a hope.
 *
 * Issue: #225 (wave 3, Pattern Garden)
 */

// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

/**
 * How fast each substance spreads. The feeder spreads twice as fast as the
 * eater, and that ratio is the whole reason pattern appears at all: if the two
 * spread at the same rate they would smooth each other out into a flat field.
 * Turing's short-range activation and long-range inhibition, as two numbers.
 *
 * The absolute size matters as much as the ratio, and it is not free to pick.
 * Halve these and the features shrink toward one cell across, which renders as
 * speckle rather than as a coat; the first draft of this file used 0.16 and
 * 0.08 and grew a garden with no visible shapes in it at all. Raise them past
 * about 1.25 and the explicit scheme goes unstable and the bed blows up. One
 * and a half is the standard pairing for this stencil, it sits comfortably
 * inside stability, and it puts a feature at roughly eight cells across, which
 * is what makes the growth read as living matter.
 */
export const DIFFUSE_U = 1.0;
export const DIFFUSE_V = 0.5;

/**
 * Time step. Explicit Euler, so this is bounded: the sharpest mode of the
 * stencil has eigenvalue -1.6, and stability needs DIFFUSE_U * DT * 1.6 <= 2.
 * At one, that is 1.6 against a limit of 2. The activity buys growth speed by
 * taking several steps per frame rather than by raising this, because raising
 * it past 1.25 would make the bed explode in a child's hands.
 */
export const DT = 1.0;

/** A cell counts as carrying pattern above this much of the eater. */
export const COVERAGE_THRESHOLD = 0.2;

export interface GardenField {
  width: number;
  height: number;
  /** The feeder. Starts at 1 everywhere: full soil. */
  u: Float32Array;
  /** The eater. Starts at 0: nothing growing yet. */
  v: Float32Array;
  /** Back buffers, swapped each step, so a step allocates nothing. */
  uNext: Float32Array;
  vNext: Float32Array;
  /** Feed and kill per cell. Uniform in the bed, varying in the control map. */
  feed: Float32Array;
  kill: Float32Array;
  /** Wrapped neighbour indices, built once so the inner loop has no modulo. */
  left: Int32Array;
  right: Int32Array;
  up: Int32Array;
  down: Int32Array;
}

export function createField(width: number, height: number): GardenField {
  const n = width * height;
  const u = new Float32Array(n).fill(1);
  const v = new Float32Array(n);
  const left = new Int32Array(width);
  const right = new Int32Array(width);
  const up = new Int32Array(height);
  const down = new Int32Array(height);
  for (let x = 0; x < width; x++) {
    left[x] = (x - 1 + width) % width;
    right[x] = (x + 1) % width;
  }
  for (let y = 0; y < height; y++) {
    up[y] = (y - 1 + height) % height;
    down[y] = (y + 1) % height;
  }
  return {
    width,
    height,
    u,
    v,
    uNext: new Float32Array(n),
    vNext: new Float32Array(n),
    feed: new Float32Array(n),
    kill: new Float32Array(n),
    left,
    right,
    up,
    down,
  };
}

/** Back to bare soil. Used when the child clears the bed. */
export function clearField(field: GardenField): void {
  field.u.fill(1);
  field.v.fill(0);
}

/**
 * Carry a growing bed across onto a grid of a different size.
 *
 * Nearest neighbour, and the two substances move together. Interpolating would
 * average a peak of the eater against the bare soil beside it and invent
 * concentrations the rule never produced, and a cell's u and v are two halves of
 * one state: mixing them from different source cells is a chemistry the bed was
 * never in.
 *
 * WHEN THIS IS THE RIGHT ANSWER AND WHEN IT IS NOT
 *
 * A bed that changed shape because the CHILD changed it, by turning the tablet
 * or opening the keyboard, still starts fresh. Bare soil is honest there: they
 * changed the container, and a resampled field would read as the garden
 * convulsing in their hands.
 *
 * The quality ladder is the opposite case. Nothing the child did caused it, they
 * were never told it exists, and it fires exactly when the device is struggling,
 * which is when the bed is at its fullest and they are most invested in it.
 * Deleting the garden as a reward for growing too much of it is not a
 * defensible thing to do to a child, so the bed is carried across instead. The
 * grain of the pattern visibly coarsens, which is the truth: the grid really did.
 */
export function resampleField(src: GardenField, width: number, height: number): GardenField {
  const dst = createField(width, height);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y * src.height) / height));
    const srcRow = sy * src.width;
    const dstRow = y * width;
    for (let x = 0; x < width; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / width));
      const s = srcRow + sx;
      const d = dstRow + x;
      dst.u[d] = src.u[s];
      dst.v[d] = src.v[s];
    }
  }
  return dst;
}

/** One rule everywhere. This is what the garden bed itself uses. */
export function setUniformRule(field: GardenField, feed: number, kill: number): void {
  field.feed.fill(feed);
  field.kill.fill(kill);
}

/**
 * Advance the chemistry.
 *
 * The Laplacian is the nine-point stencil (0.2 to the four edge neighbours,
 * 0.05 to the four corners, -1 to the cell). The five-point version is cheaper
 * and it is also visibly square: patterns grown under it line up with the pixel
 * grid, which in a bed of organic shapes reads as a rendering artefact rather
 * than as biology. The corners cost four more reads per cell and buy a bed that
 * has no preferred direction.
 *
 * The edges wrap. A garden bed with hard walls grows a rim of edge artefacts
 * that a child can see and that means nothing; wrapping has no visible seam and
 * no special case in the loop.
 */
export function stepField(field: GardenField, steps: number): void {
  const { width: w, height: h, left, right, up, down, feed, kill } = field;

  for (let s = 0; s < steps; s++) {
    const u = field.u;
    const v = field.v;
    const un = field.uNext;
    const vn = field.vNext;

    for (let y = 0; y < h; y++) {
      const rowC = y * w;
      const rowU = up[y] * w;
      const rowD = down[y] * w;

      for (let x = 0; x < w; x++) {
        const xl = left[x];
        const xr = right[x];
        const c = rowC + x;

        const uc = u[c];
        const vc = v[c];

        const lu =
          0.2 * (u[rowC + xl] + u[rowC + xr] + u[rowU + x] + u[rowD + x]) +
          0.05 * (u[rowU + xl] + u[rowU + xr] + u[rowD + xl] + u[rowD + xr]) -
          uc;
        const lv =
          0.2 * (v[rowC + xl] + v[rowC + xr] + v[rowU + x] + v[rowD + x]) +
          0.05 * (v[rowU + xl] + v[rowU + xr] + v[rowD + xl] + v[rowD + xr]) -
          vc;

        const reaction = uc * vc * vc;
        const f = feed[c];
        const k = kill[c];

        let nu = uc + (DIFFUSE_U * lu - reaction + f * (1 - uc)) * DT;
        let nv = vc + (DIFFUSE_V * lv + reaction - (f + k) * vc) * DT;

        // Both are concentrations. Clamping is not cosmetic: a single NaN or a
        // runaway cell would spread across the whole bed within a few steps and
        // the child's garden would go black and stay black.
        if (!(nu > 0)) nu = 0;
        else if (nu > 1) nu = 1;
        if (!(nv > 0)) nv = 0;
        else if (nv > 1) nv = 1;

        un[c] = nu;
        vn[c] = nv;
      }
    }

    field.u = un;
    field.v = vn;
    field.uNext = u;
    field.vNext = v;
  }
}

/**
 * Drop seed into the bed.
 *
 * A soft disc rather than a hard one, because a hard edge seeds a ring of
 * identical cells that grows a suspiciously perfect circle, and the point of
 * this garden is that the shapes come from the rule rather than from the
 * finger. Returns how many cells were touched, which the activity converts into
 * "was that a dab or a smear" without ever showing a number.
 */
export function seedDisc(
  field: GardenField,
  cx: number,
  cy: number,
  radius: number,
  strength = 1,
): number {
  const { width: w, height: h, u, v } = field;
  if (radius <= 0) return 0;

  const x0 = Math.floor(cx - radius);
  const x1 = Math.ceil(cx + radius);
  const y0 = Math.floor(cy - radius);
  const y1 = Math.ceil(cy + radius);
  const r2 = radius * radius;
  let touched = 0;

  for (let y = y0; y <= y1; y++) {
    const yy = ((y % h) + h) % h;
    const dy = y - cy;
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const xx = ((x % w) + w) % w;
      const c = yy * w + xx;
      // Soft shoulder, full in the middle.
      const falloff = 1 - Math.sqrt(d2 / r2);
      const a = Math.min(1, falloff * 1.6) * strength;
      if (a <= 0) continue;
      v[c] = Math.max(v[c], 0.5 * a);
      u[c] = Math.min(u[c], 1 - 0.5 * a);
      touched++;
    }
  }
  return touched;
}

/** Fraction of the bed carrying pattern. Not shown to the child as a number. */
export function coverage(field: GardenField, threshold = COVERAGE_THRESHOLD): number {
  const v = field.v;
  let n = 0;
  for (let i = 0; i < v.length; i++) if (v[i] > threshold) n++;
  return n / v.length;
}

/**
 * Mean gradient of the eater across the bed: how much EDGE there is.
 *
 * Coverage alone cannot tell a garden from a wash, because a bed evenly filled
 * to half strength and a bed of crisp shapes covering half of it score the
 * same. Edges are what a shape is. Zero for any uniform field at any level,
 * which is exactly the failure this is here to catch.
 */
export function edgeDensity(field: GardenField): number {
  const { width: w, height: h, v, left, right, up, down } = field;
  let sum = 0;
  for (let y = 0; y < h; y++) {
    const rowC = y * w;
    const rowU = up[y] * w;
    const rowD = down[y] * w;
    for (let x = 0; x < w; x++) {
      const gx = v[rowC + right[x]] - v[rowC + left[x]];
      const gy = v[rowD + x] - v[rowU + x];
      sum += Math.hypot(gx, gy);
    }
  }
  return sum / (w * h);
}

/** Spread of the eater across the bed. High only when there is real structure. */
export function structure(field: GardenField): number {
  const v = field.v;
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i];
  const mean = sum / v.length;
  let acc = 0;
  for (let i = 0; i < v.length; i++) {
    const d = v[i] - mean;
    acc += d * d;
  }
  return Math.sqrt(acc / v.length);
}

// ---------------------------------------------------------------------------
// The control: a map of the rule, with no dead ground on it
// ---------------------------------------------------------------------------

/**
 * The largest kill rate at which anything can grow at a given feed rate.
 *
 * Above this line the eater cannot sustain itself at any concentration and the
 * bed returns to bare soil whatever the child paints. It is not a tuned
 * constant: it is where the non-trivial steady states of the rule stop
 * existing, which happens when feed = 4 (feed + kill)^2, so kill = sqrt(feed)/2
 * - feed. The control is laid out underneath this line so the child can never
 * reach the dead half of the space.
 */
export function killCeiling(feed: number): number {
  return Math.sqrt(feed) / 2 - feed;
}

/**
 * The rectangle of rules the control covers.
 *
 * These four numbers were not reasoned out, they were measured. The first
 * draft of this file derived a band analytically from the ceiling and the
 * aliveness test failed twenty of its twenty-five positions: most of the space
 * that looks reasonable on paper either dies back to bare soil or floods into
 * a flat sheet, and the live part is a thin curved sliver that no tidy formula
 * lands on by accident. So the parameter space was swept, the living rectangle
 * inside it was read off the sweep, and the numbers below are the corners of
 * that rectangle with a margin left on every side.
 *
 * Sideways is feed rate, and it sets the SCALE of the growth: broad soft lobes
 * at the low end, fine intricate filigree at the high end.
 *
 * Up and down is how far under the kill ceiling the rule sits, and it sets the
 * WEAVE: near the ceiling the growth barely holds together and leaves wide
 * gaps, further under it thickens and closes up.
 *
 * The aliveness test in the suite grows real gardens across this rectangle and
 * fails if any corner of it is blank or flooded, so moving any of these four
 * numbers without re-measuring is caught rather than shipped.
 */
export const FEED_MIN = 0.026;
export const FEED_MAX = 0.058;
export const DEPTH_MIN = 0.00008;
export const DEPTH_MAX = 0.00145;

export interface GardenRule {
  feed: number;
  kill: number;
}

/**
 * Control position to rule. x and y are 0..1, y measured with 0 at the bottom.
 *
 * The vertical axis rides the ceiling rather than cutting straight across it.
 * The ceiling climbs steeply with feed rate, so a control that cut straight
 * across would be dead along one edge and flooded along the other, and a child
 * would learn that most of their control does nothing.
 */
export function ruleAt(x: number, y: number): GardenRule {
  const px = Math.min(1, Math.max(0, x));
  const py = Math.min(1, Math.max(0, y));
  const feed = FEED_MIN + (FEED_MAX - FEED_MIN) * px;
  const depth = DEPTH_MIN + (DEPTH_MAX - DEPTH_MIN) * py;
  return { feed, kill: killCeiling(feed) - depth };
}

/**
 * How the garden at a control position reads, in two words.
 *
 * These ids never reach a child as words, and they are deliberately NOT used to
 * decide when a naming line is earned: a boundary at some exact position would
 * fire "you made a different kind of pattern" for a nudge across it and stay
 * silent for a long journey that happened to stay one side. The reducer uses
 * distance travelled instead, which is the thing actually being claimed. What
 * these are for is the live region, so a child using a screen reader is told
 * what the sighted child is looking at.
 */
export type GrowthScale = 'broad' | 'medium' | 'fine';
export type GrowthWeave = 'open' | 'medium' | 'dense';

export interface GardenCharacter {
  scale: GrowthScale;
  weave: GrowthWeave;
}

export const THIRD = 1 / 3;
export const TWO_THIRDS = 2 / 3;

export function characterAt(x: number, y: number): GardenCharacter {
  const px = Math.min(1, Math.max(0, x));
  const py = Math.min(1, Math.max(0, y));
  return {
    scale: px >= TWO_THIRDS ? 'fine' : px >= THIRD ? 'medium' : 'broad',
    weave: py >= TWO_THIRDS ? 'dense' : py >= THIRD ? 'medium' : 'open',
  };
}

const SCALE_WORDS: Record<GrowthScale, string> = {
  broad: 'broad',
  medium: 'middle sized',
  fine: 'fine',
};

const WEAVE_WORDS: Record<GrowthWeave, string> = {
  open: 'with wide gaps between them',
  medium: 'with gaps between them',
  dense: 'packed close together',
};

/**
 * A plain sentence for the live region.
 *
 * Descriptive, never congratulatory, and never a target to reach. It says what
 * is on the screen, which is the same job the picture does for everyone else.
 */
export function describeGarden(x: number, y: number): string {
  const { scale, weave } = characterAt(x, y);
  return `The garden is growing ${SCALE_WORDS[scale]} shapes ${WEAVE_WORDS[weave]}.`;
}

// ---------------------------------------------------------------------------
// The palette
// ---------------------------------------------------------------------------

/**
 * BRAND.md bans hues 270 to 350. Rather than promise that no mapping lands
 * there, the fold below makes it unreachable, and the test suite samples the
 * whole control at fine spacing to prove it.
 */
export const BANNED_HUE_MIN = 270;
export const BANNED_HUE_MAX = 350;

/** True when a hue is clear of the banned band. */
export function hueIsAllowed(hue: number): boolean {
  const h = ((hue % 360) + 360) % 360;
  return h < BANNED_HUE_MIN || h > BANNED_HUE_MAX;
}

/**
 * Any hue, folded onto the allowed arc.
 *
 * The banned band is 80 degrees wide, so 280 degrees remain, running from just
 * above 350 through zero and up to just below 270. This maps the whole circle
 * onto that arc continuously, which matters: a fold with a jump in it would
 * make a colour snap as the child dragged past one particular spot, and they
 * would learn that a piece of their control is broken.
 */
export const SAFE_ARC_START = 352;
export const SAFE_ARC_SPAN = 276;

export function safeHue(t: number): number {
  const wrapped = ((t % 1) + 1) % 1;
  return (SAFE_ARC_START + wrapped * SAFE_ARC_SPAN) % 360;
}

export interface GardenPalette {
  /** Deep bed the pattern grows out of. */
  soilHue: number;
  /** The living matter itself. */
  growthHue: number;
  /** The iridescent edge where the growth turns over. Beetle-shell, not neon. */
  rimHue: number;
}

/**
 * Colour for a control position.
 *
 * Moving sideways walks the growth from jade through sea green to deep teal,
 * which is a walk along one continuous arc of leaf and water colours rather
 * than a rainbow: a rainbow would say the colour means something, and here it
 * does not, it is the species the child happens to be growing.
 *
 * Moving up shifts the rim from copper to gold. Real iridescence is a warm
 * sheen sitting on a cool body, and it is what turns a green blob into
 * something that looks like it is alive.
 *
 * Every value goes through safeHue, so the fence holds even if someone widens
 * these arcs later without reading this comment.
 */
export function paletteAt(x: number, y: number): GardenPalette {
  const px = Math.min(1, Math.max(0, x));
  const py = Math.min(1, Math.max(0, y));
  return {
    soilHue: safeHue((168 + 10 * px) / 360),
    growthHue: safeHue((152 + 44 * px) / 360),
    rimHue: safeHue((20 + 34 * py) / 360),
  };
}
