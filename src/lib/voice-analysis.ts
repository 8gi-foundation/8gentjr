/**
 * voice-analysis.ts - what a voice is doing, as pure functions.
 *
 * Voice Play (issue #238) draws six different pictures of a held sound, and
 * every one of them is a claim about the child's voice: the ring is steady
 * BECAUSE the pitch stopped wandering, the bump is soft BECAUSE the loudness
 * rose slowly, the blob went bright BECAUSE the energy moved up the spectrum.
 * A picture that says one of those things without measuring it is a lie told to
 * a child, and it is a lie no screenshot can catch, because a plausible-looking
 * ring is exactly what a broken detector also draws.
 *
 * So the measurement lives out here, with no React and no Web Audio in sight,
 * and the test suite drives synthesised buffers through it: a sine at a known
 * frequency, silence, a step, two timbres with the same fundamental. If the
 * detector drifts, a test fails rather than a child being told they held a note
 * they did not hold.
 *
 * The pitch detector is not the one in ChladniVisualizer. That one is a plain
 * autocorrelation whose peak-pick is biased toward short lags, which is fine
 * for "which of eight sand patterns" and wrong for "did this note wobble", and
 * it is also unbounded in lag so it costs more than it needs to. This is YIN
 * (difference function with cumulative mean normalisation), lag-bounded to a
 * human vocal range, which gives a clarity number as a by-product. The clarity
 * is what lets an unpitched breath be reported as unpitched instead of as some
 * arbitrary frequency.
 *
 * Nothing here records, stores or transmits anything. Every function takes a
 * buffer it was handed and returns a number.
 *
 * Issue: #238
 */

// ---------------------------------------------------------------------------
// Loudness
// ---------------------------------------------------------------------------

/**
 * Root mean square of a time-domain buffer, in the same 0..1 units the Web
 * Audio API hands out. Roughly "how loud", linear rather than perceptual.
 *
 * Returns 0 for an empty buffer rather than NaN, because this feeds a bar whose
 * width must always be a number.
 */
export function rms(buf: ArrayLike<number>): number {
  const n = buf.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / n);
}

// ---------------------------------------------------------------------------
// Pitch
// ---------------------------------------------------------------------------

export interface PitchOptions {
  /** Lowest fundamental worth looking for. Below a comfortable adult bass. */
  minHz?: number;
  /** Highest fundamental worth looking for. Above a child's excited squeal. */
  maxHz?: number;
  /** RMS below this is not a voice, it is a room. */
  noiseFloor?: number;
  /**
   * YIN's absolute threshold. A normalised difference below this counts as a
   * period. 0.15 is the value from the paper and it behaves well on voice.
   */
  threshold?: number;
}

export const DEFAULT_MIN_HZ = 70;
export const DEFAULT_MAX_HZ = 1100;
export const DEFAULT_NOISE_FLOOR = 0.006;
export const DEFAULT_YIN_THRESHOLD = 0.15;

export interface PitchReading {
  /** Fundamental in Hz, or -1 when the buffer holds no periodic sound. */
  hz: number;
  /**
   * 0..1. How periodic the buffer was at the chosen lag. Near 1 for a sung
   * vowel, near 0 for breath or a room. Used to reject, never displayed.
   */
  clarity: number;
  /** RMS of the buffer, returned so a caller need not walk it twice. */
  level: number;
}

/**
 * Full pitch reading for one buffer.
 *
 * Two rejections, in this order, and the order is the point:
 *
 *   1. Too quiet. A silent buffer has a perfectly periodic answer if you look
 *      hard enough at floating point noise, so the level gate comes first.
 *   2. Not periodic enough. Breath, a consonant, a chair scrape: the difference
 *      function never gets near zero at any lag and the reading is discarded
 *      rather than rounded to the nearest plausible note.
 */
export function pitchDetail(
  buf: ArrayLike<number>,
  sampleRate: number,
  options: PitchOptions = {},
): PitchReading {
  const {
    minHz = DEFAULT_MIN_HZ,
    maxHz = DEFAULT_MAX_HZ,
    noiseFloor = DEFAULT_NOISE_FLOOR,
    threshold = DEFAULT_YIN_THRESHOLD,
  } = options;

  const level = rms(buf);
  if (level < noiseFloor) return { hz: -1, clarity: 0, level };

  const n = buf.length;
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(Math.floor(n / 2), Math.ceil(sampleRate / minHz));
  if (maxLag <= minLag) return { hz: -1, clarity: 0, level };

  // Step 1: the difference function, over the lags that could be a human voice.
  // Half the buffer is the comparison window, which is what bounds the cost.
  const window = Math.floor(n / 2);
  const diff = new Float64Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < window; i++) {
      const d = buf[i] - buf[i + lag];
      sum += d * d;
    }
    diff[lag] = sum;
  }

  // Step 2: cumulative mean normalisation. This is what stops the detector
  // answering "lag 0" forever: without it the difference function is smallest
  // at the shortest lag and every voice reads as a very high note.
  const norm = new Float64Array(maxLag + 1);
  let running = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    running += diff[lag];
    norm[lag] = running === 0 ? 1 : (diff[lag] * (lag - minLag + 1)) / running;
  }

  // Step 3: the first dip below threshold, not the deepest one. Taking the
  // deepest is how a detector lands an octave low: the second period is just as
  // good a match as the first and often marginally better.
  let chosen = -1;
  for (let lag = minLag; lag < maxLag; lag++) {
    if (norm[lag] < threshold) {
      while (lag + 1 <= maxLag && norm[lag + 1] < norm[lag]) lag++;
      chosen = lag;
      break;
    }
  }
  if (chosen < 0) {
    // Nothing crossed the threshold. Fall back to the global minimum so a
    // slightly breathy but real note is not thrown away, and let clarity decide.
    let best = minLag;
    for (let lag = minLag; lag <= maxLag; lag++) if (norm[lag] < norm[best]) best = lag;
    chosen = best;
  }

  const clarity = Math.max(0, Math.min(1, 1 - norm[chosen]));
  // Half-periodic is not periodic. Breath and room tone sit well under this.
  if (clarity < 0.5) return { hz: -1, clarity, level };

  // Sub-sample refinement: the true minimum rarely lands exactly on a sample.
  const refined = parabolicMinimum(norm, chosen, minLag, maxLag);
  if (refined <= 0) return { hz: -1, clarity, level };

  const hz = sampleRate / refined;
  if (hz < minHz || hz > maxHz) return { hz: -1, clarity, level };
  return { hz, clarity, level };
}

/** Fundamental in Hz, or -1 when the buffer holds no periodic sound. */
export function pitchFromBuffer(
  buf: ArrayLike<number>,
  sampleRate: number,
  options: PitchOptions = {},
): number {
  return pitchDetail(buf, sampleRate, options).hz;
}

/** Vertex of the parabola through three consecutive samples around `at`. */
function parabolicMinimum(
  values: Float64Array,
  at: number,
  lo: number,
  hi: number,
): number {
  if (at <= lo || at >= hi) return at;
  const y1 = values[at - 1];
  const y2 = values[at];
  const y3 = values[at + 1];
  const denom = y1 + y3 - 2 * y2;
  if (denom === 0) return at;
  return at + (y1 - y3) / (2 * denom);
}

/** Distance between two frequencies in cents. Positive when `hz` is higher. */
export function centsBetween(hz: number, referenceHz: number): number {
  if (hz <= 0 || referenceHz <= 0) return 0;
  return 1200 * Math.log2(hz / referenceHz);
}

// ---------------------------------------------------------------------------
// Spectrum
// ---------------------------------------------------------------------------

/**
 * Magnitude spectrum of a time-domain buffer: Hann window, radix-2 FFT, the
 * lower half of the bins.
 *
 * Used by the test suite to prove the centroid separates two timbres. In the
 * browser the same numbers arrive free from an AnalyserNode, so this is not on
 * the hot path, but it is the same definition of "spectrum" either way and
 * that is the point of having it.
 *
 * The buffer is truncated to the largest power of two it contains, so an
 * awkward length degrades resolution rather than throwing.
 */
export function magnitudeSpectrum(buf: ArrayLike<number>): Float32Array {
  const n = largestPowerOfTwo(buf.length);
  if (n < 2) return new Float32Array(0);

  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // Hann. Without a window, a sine that is not exactly bin-centred smears
    // across the whole spectrum and drags the centroid with it.
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    re[i] = buf[i] * w;
  }

  fftInPlace(re, im);

  const half = n / 2;
  const mags = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    mags[i] = Math.hypot(re[i], im[i]) / half;
  }
  return mags;
}

function largestPowerOfTwo(n: number): number {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

/** Iterative in-place radix-2 Cooley-Tukey. Length must be a power of two. */
function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/** Decibel bins, as an AnalyserNode reports them, back to linear magnitude. */
export function linearFromDecibels(db: ArrayLike<number>): Float32Array {
  const out = new Float32Array(db.length);
  for (let i = 0; i < db.length; i++) out[i] = Math.pow(10, db[i] / 20);
  return out;
}

export interface CentroidOptions {
  /** Ignore rumble below this. Room noise and handling live down here. */
  minHz?: number;
  /** Ignore hiss above this. */
  maxHz?: number;
}

export const CENTROID_MIN_HZ = 80;
export const CENTROID_MAX_HZ = 6000;

/**
 * Spectral centroid in Hz: the magnitude-weighted mean frequency, which is the
 * standard measure of "brightness".
 *
 * `mags` is half a spectrum, exactly as `AnalyserNode.frequencyBinCount` gives
 * it, so bin i sits at i * sampleRate / (2 * mags.length).
 *
 * Returns 0 when there is no energy in band, which the caller must treat as
 * "no reading" rather than as "very dark".
 */
export function spectralCentroid(
  mags: ArrayLike<number>,
  sampleRate: number,
  options: CentroidOptions = {},
): number {
  const { minHz = CENTROID_MIN_HZ, maxHz = CENTROID_MAX_HZ } = options;
  const bins = mags.length;
  if (bins === 0) return 0;
  const binHz = sampleRate / (2 * bins);

  let weighted = 0;
  let total = 0;
  for (let i = 0; i < bins; i++) {
    const hz = i * binHz;
    if (hz < minHz || hz > maxHz) continue;
    const m = Math.max(0, mags[i]);
    weighted += hz * m;
    total += m;
  }
  if (total <= 0) return 0;
  return weighted / total;
}

// ---------------------------------------------------------------------------
// Onsets
// ---------------------------------------------------------------------------

export interface Onset {
  /** Index in the envelope where the sound started. */
  index: number;
  /** Seconds from the start of the envelope. */
  timeSeconds: number;
  /**
   * Rise rate in loudness units per second, from the crossing to the peak.
   * A gentle "ah" is a few units per second. A glottal slam is tens.
   */
  slope: number;
  /** Loudness at the top of the rise. */
  peak: number;
}

export interface OnsetOptions {
  /** Loudness above this counts as sounding. */
  floor?: number;
  /** Two onsets closer together than this are one onset. */
  minGapSeconds?: number;
}

export const DEFAULT_ONSET_FLOOR = 0.01;

/**
 * The steepest single-step rise anywhere in the envelope, in units per second.
 *
 * This is the blunt version, and it is the one the Soft Start drawing uses per
 * frame, because it needs one number now rather than a list later.
 */
export function onsetSlope(envelope: ArrayLike<number>, dtSeconds: number): number {
  if (envelope.length < 2 || dtSeconds <= 0) return 0;
  let best = 0;
  for (let i = 1; i < envelope.length; i++) {
    const rise = (envelope[i] - envelope[i - 1]) / dtSeconds;
    if (rise > best) best = rise;
  }
  return best;
}

/**
 * Every onset in a loudness envelope, with how sharply each one started.
 *
 * An onset is a crossing from below the floor to above it; its slope is
 * measured from the crossing to the following peak, which is what makes a slow
 * swell measurably different from a slam even when both end up equally loud.
 */
export function detectOnsets(
  envelope: ArrayLike<number>,
  dtSeconds: number,
  options: OnsetOptions = {},
): Onset[] {
  const { floor = DEFAULT_ONSET_FLOOR, minGapSeconds = 0.08 } = options;
  const out: Onset[] = [];
  if (envelope.length < 2 || dtSeconds <= 0) return out;

  let sounding = envelope[0] >= floor;
  let lastOnsetTime = -Infinity;

  for (let i = 1; i < envelope.length; i++) {
    const above = envelope[i] >= floor;
    if (above && !sounding) {
      const timeSeconds = i * dtSeconds;
      if (timeSeconds - lastOnsetTime >= minGapSeconds) {
        // Walk to the top of this rise, stopping when it turns over or ends.
        let j = i;
        while (j + 1 < envelope.length && envelope[j + 1] > envelope[j]) j++;
        const rise = envelope[j] - envelope[i - 1];
        const seconds = Math.max(dtSeconds, (j - (i - 1)) * dtSeconds);
        out.push({
          index: i,
          timeSeconds,
          slope: rise / seconds,
          peak: envelope[j],
        });
        lastOnsetTime = timeSeconds;
      }
    }
    sounding = above;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Steadiness
// ---------------------------------------------------------------------------

/**
 * How steady a series is, 0 (all over the place) to 1 (flat).
 *
 * Relative, not absolute, so it means the same thing for a loud voice and a
 * quiet one: it is one minus the coefficient of variation, scaled so that a
 * spread of `tolerance` of the mean reads as 0.
 *
 * Fewer than two samples is not yet an opinion, so it returns 0 rather than
 * claiming perfect steadiness for a single frame.
 */
export function stability(values: ArrayLike<number>, tolerance = 0.35): number {
  const n = values.length;
  if (n < 2 || tolerance <= 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i];
  const mean = sum / n;
  if (mean === 0) return 0;

  let variance = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i] - mean;
    variance += d * d;
  }
  const sd = Math.sqrt(variance / n);
  const cv = Math.abs(sd / mean);
  return Math.max(0, Math.min(1, 1 - cv / tolerance));
}

/** A semitone of wander. Past this, nobody would call the note held. */
export const STEADY_CENTS_SPAN = 100;

/**
 * How steady a run of pitches is, 0 to 1, measured in cents rather than Hz.
 *
 * Hz is the wrong unit for this: a 5 Hz wobble on a 110 Hz note is a quarter of
 * a semitone and plainly audible, while the same 5 Hz on a 440 Hz note is a
 * fifth of that and nobody would notice. Cents is the unit the ear uses, so it
 * is the unit the steadying ring uses.
 *
 * Values of -1 (no pitch that frame) are skipped, not counted as zero.
 */
export function pitchStability(hzValues: ArrayLike<number>, spanCents = STEADY_CENTS_SPAN): number {
  const kept: number[] = [];
  for (let i = 0; i < hzValues.length; i++) {
    if (hzValues[i] > 0) kept.push(hzValues[i]);
  }
  if (kept.length < 2 || spanCents <= 0) return 0;

  let logSum = 0;
  for (const hz of kept) logSum += Math.log2(hz);
  const geoMean = Math.pow(2, logSum / kept.length);

  let variance = 0;
  for (const hz of kept) {
    const c = centsBetween(hz, geoMean);
    variance += c * c;
  }
  const sdCents = Math.sqrt(variance / kept.length);
  return Math.max(0, Math.min(1, 1 - sdCents / spanCents));
}

/** Highest minus lowest, ignoring the -1 that means "no reading". */
export function rangeOf(values: ArrayLike<number>): { min: number; max: number; span: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v <= 0) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) return { min: 0, max: 0, span: 0 };
  return { min, max, span: max - min };
}
