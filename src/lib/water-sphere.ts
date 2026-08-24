/**
 * Water Sphere - the physics, the palette, and nothing that touches the DOM.
 *
 * A drop of water held in the air and shaken does not ripple randomly. At a
 * handful of specific shaking speeds its surface settles into a standing wave
 * and holds one steady lobed shape. Between those speeds it churns. That is the
 * whole game: the child slides the speed and hunts for the shapes.
 *
 * Everything here is real and everything here is producible on screen:
 *
 *   - The shapes are spherical harmonics, the actual solutions for a wave
 *     standing on the surface of a sphere. Mode l has l nodal lines, so higher
 *     modes genuinely have more lobes. The naming line "higher made more
 *     petals" is a description of what the child just watched, not a claim.
 *
 *   - The speeds are laid out by Rayleigh's result for an oscillating drop,
 *     omega_l^2 proportional to l(l-1)(l+2). The mode frequencies are therefore
 *     not arbitrary numbers picked to feel nice: they are that relation, scaled
 *     so mode 2 lands on 60 Hz.
 *
 *   - The width of each lock window is a resonance bandwidth, so the windows
 *     crowd together at the top exactly as real resonances do.
 *
 * This module is pure so the mode maths and the colour fence are unit tested
 * rather than eyeballed. The rendering is in WaterSphere.tsx.
 *
 * Issue: #225 (wave 3, Water Sphere)
 */

// ---------------------------------------------------------------------------
// The mode ladder
// ---------------------------------------------------------------------------

/** Rayleigh's frequency factor for surface mode l on a drop. */
export function rayleighFactor(l: number): number {
  return Math.sqrt(l * (l - 1) * (l + 2));
}

/** Mode 2 is pinned here, and every other mode follows from Rayleigh. */
export const BASE_MODE_L = 2;
export const BASE_MODE_HZ = 60;

export interface SphereMode {
  /** Degree. The number of nodal lines on the surface, so also "how busy". */
  l: number;
  /** Order. How much of the pattern runs around the equator versus in bands. */
  m: number;
  /** Drive frequency, rounded for display. */
  hz: number;
  /** Unrounded frequency, used for the lock maths so display never shifts it. */
  exactHz: number;
  /** Plain words for the live region and the aria label. No jargon at a child. */
  label: string;
}

/**
 * The five shapes the child can find.
 *
 * m is varied on purpose. All-sectoral modes (m = l) would give five versions
 * of the same flower; mixing in a zonal and a tesseral mode means each lock
 * looks like a different creature, while l still rises monotonically so "higher
 * is busier" stays true.
 */
const MODE_SHAPES: { l: number; m: number; label: string }[] = [
  { l: 2, m: 0, label: 'a slow squash and stretch' },
  { l: 3, m: 3, label: 'six petals' },
  { l: 4, m: 2, label: 'a checker of bumps' },
  { l: 5, m: 5, label: 'ten petals' },
  { l: 6, m: 4, label: 'a busy star' },
];

export const MODES: readonly SphereMode[] = MODE_SHAPES.map(({ l, m, label }) => {
  const exactHz = (BASE_MODE_HZ * rayleighFactor(l)) / rayleighFactor(BASE_MODE_L);
  return { l, m, exactHz, hz: Math.round(exactHz), label };
});

/** The slider range. Wide enough to hold every mode with churn on both sides. */
export const MIN_HZ = 40;
export const MAX_HZ = 380;

/**
 * Resonance half-bandwidth as a fraction of centre frequency (a Q of about 9).
 *
 * Constant in fractional terms means constant in log terms, and the control is
 * logarithmic, so every mode is the same number of pixels wide to hunt for. It
 * is also why the top two modes sit close together: real resonances crowd.
 * Chosen just under the tightest half-gap in the ladder so no two windows
 * overlap, which is what keeps the churn between them real.
 */
export const LOCK_HALF_BANDWIDTH = 0.115;

/** At or above this, the surface holds a shape. */
export const LOCK_THRESHOLD = 0.6;
/** At or below this, the surface is properly churning rather than nearly there. */
export const CHURN_THRESHOLD = 0.15;

// ---------------------------------------------------------------------------
// Where the slider is, and what the water does there
// ---------------------------------------------------------------------------

/** Slider position 0..1 to frequency. Logarithmic, so every mode is equally findable. */
export function positionToHz(p: number): number {
  const clamped = Math.min(1, Math.max(0, p));
  return MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, clamped);
}

/** Frequency back to slider position 0..1. */
export function hzToPosition(hz: number): number {
  const clamped = Math.min(MAX_HZ, Math.max(MIN_HZ, hz));
  return Math.log(clamped / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ);
}

export interface ModeReading {
  /** Index into MODES of the nearest mode in log-frequency. */
  index: number;
  mode: SphereMode;
  /** 0 when far from any mode, 1 dead on centre. */
  lock: number;
  /** 1 - lock. How much turbulence to mix into the surface. */
  churn: number;
  /** True when the surface holds a steady shape. */
  locked: boolean;
  /** The other mode being blended toward, or null when sitting on a centre. */
  neighbourIndex: number | null;
}

/**
 * What the water is doing at this drive frequency.
 *
 * Off a mode centre the surface is a blend of the two nearest shapes at odds
 * with each other, which is what makes the churn look like a fight rather than
 * like noise.
 */
export function readMode(hz: number): ModeReading {
  const f = Math.min(MAX_HZ, Math.max(MIN_HZ, hz));

  let index = 0;
  let best = Infinity;
  for (let i = 0; i < MODES.length; i++) {
    const d = Math.abs(Math.log(f / MODES[i].exactHz));
    if (d < best) {
      best = d;
      index = i;
    }
  }

  const lock = Math.max(0, 1 - best / LOCK_HALF_BANDWIDTH);

  // The neighbour is whichever mode lies on the far side of where we stand.
  let neighbourIndex: number | null = null;
  if (f > MODES[index].exactHz && index + 1 < MODES.length) neighbourIndex = index + 1;
  else if (f < MODES[index].exactHz && index - 1 >= 0) neighbourIndex = index - 1;

  return {
    index,
    mode: MODES[index],
    lock,
    churn: 1 - lock,
    locked: lock >= LOCK_THRESHOLD,
    neighbourIndex,
  };
}

// ---------------------------------------------------------------------------
// Spherical harmonics
// ---------------------------------------------------------------------------

/**
 * Associated Legendre P_l^m(x) by the standard upward recurrence.
 *
 * Written out rather than pulled from a library: it is fifteen lines, the repo
 * takes no maths dependency, and the recurrence is the thing being tested.
 */
export function legendre(l: number, m: number, x: number): number {
  if (m < 0 || m > l) return 0;

  // P_m^m = (-1)^m (2m-1)!! (1-x^2)^(m/2)
  let pmm = 1;
  if (m > 0) {
    const somx2 = Math.sqrt(Math.max(0, 1 - x * x));
    let fact = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }
  if (l === m) return pmm;

  // P_{m+1}^m = x (2m+1) P_m^m
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;

  // P_l^m = ((2l-1) x P_{l-1}^m - (l+m-1) P_{l-2}^m) / (l-m)
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

/**
 * The real spherical harmonic, unnormalised.
 *
 * theta is polar (0 at the top of the drop), phi runs around the equator.
 */
export function harmonicRaw(l: number, m: number, theta: number, phi: number): number {
  return legendre(l, m, Math.cos(theta)) * Math.cos(m * phi);
}

/**
 * Peak magnitude of each mode, found once by sampling and then cached.
 *
 * Legendre polynomials grow fast with l, so mode 6 raw is many times mode 2
 * raw. Without this the drop would barely move at the bottom of the slider and
 * turn inside out at the top. Dividing by the peak makes every mode reach the
 * same displacement, so what changes across the slider is the SHAPE, which is
 * the thing the game is about.
 */
const peakCache = new Map<string, number>();

export function harmonicPeak(l: number, m: number): number {
  const key = `${l}:${m}`;
  const hit = peakCache.get(key);
  if (hit !== undefined) return hit;

  let peak = 0;
  const latSteps = 96;
  const lonSteps = m === 0 ? 1 : 96;
  for (let i = 0; i <= latSteps; i++) {
    const theta = (i / latSteps) * Math.PI;
    for (let j = 0; j < lonSteps; j++) {
      const phi = (j / lonSteps) * 2 * Math.PI;
      const v = Math.abs(harmonicRaw(l, m, theta, phi));
      if (v > peak) peak = v;
    }
  }
  const safe = peak > 1e-9 ? peak : 1;
  peakCache.set(key, safe);
  return safe;
}

/** The harmonic scaled so its peak is 1. This is what the surface displaces by. */
export function harmonic(l: number, m: number, theta: number, phi: number): number {
  return harmonicRaw(l, m, theta, phi) / harmonicPeak(l, m);
}

// ---------------------------------------------------------------------------
// The palette
// ---------------------------------------------------------------------------

/**
 * Water reads teal, blue, cyan and white. BRAND.md bans hues 270-350, and a
 * water surface has no business anywhere near them, so the whole palette is
 * declared here as numbers and the ban is asserted by the test suite rather
 * than by a comment claiming compliance.
 */
export const BANNED_HUE_MIN = 270;
export const BANNED_HUE_MAX = 350;

export const WATER_HUES = {
  /** Deep space behind the drop. */
  voidFar: 205,
  voidNear: 192,
  /** The body of the water, lit and unlit. */
  bodyLit: 187,
  bodyDeep: 200,
  /** The bright grazing edge where water turns mirror. */
  rim: 184,
  /** The pool of focused light under the drop. */
  caustic: 180,
  /** Light blooming off a wave crest. */
  crest: 178,
  /** Drifting motes in the dark. */
  mote: 195,
} as const;

/** True when a hue is clear of the banned band. Used by the tests and by callers. */
export function hueIsAllowed(hue: number): boolean {
  const h = ((hue % 360) + 360) % 360;
  return h < BANNED_HUE_MIN || h > BANNED_HUE_MAX;
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

/**
 * A sentence for the live region when the surface settles.
 *
 * Deliberately descriptive rather than congratulatory: it tells a child who
 * cannot see the canvas what the canvas is doing, which is the same job the
 * picture does for everyone else. It is not the naming line and it is not
 * praise.
 */
export function describeReading(reading: ModeReading): string {
  const hz = Math.round(reading.mode.hz);
  if (!reading.locked) return 'The water is churning.';
  return `Steady shape, ${reading.mode.label}, ${hz} hertz.`;
}
