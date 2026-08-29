// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the Voice Play measurement layer (issue #238).
 *
 * Every one of these drives a buffer whose answer is known before the detector
 * sees it: a sine at a frequency we chose, silence, a step, two timbres built
 * from the same fundamental with different harmonics. That is the only way a
 * feedback drawing can be honest, because a wrong detector draws a picture that
 * looks exactly as convincing as a right one.
 */
import { describe, expect, test } from 'bun:test';
import {
  centsBetween,
  detectOnsets,
  linearFromDecibels,
  magnitudeSpectrum,
  onsetSlope,
  pitchDetail,
  pitchFromBuffer,
  pitchStability,
  rangeOf,
  rms,
  spectralCentroid,
  stability,
} from './voice-analysis';

const SR = 48000;

function sine(hz: number, samples: number, amp = 0.3, sampleRate = SR): Float32Array {
  const buf = new Float32Array(samples);
  for (let i = 0; i < samples; i++) buf[i] = amp * Math.sin((2 * Math.PI * hz * i) / sampleRate);
  return buf;
}

/** A fundamental plus a chosen set of harmonics, for timbre tests. */
function harmonic(
  hz: number,
  weights: number[],
  samples: number,
  amp = 0.3,
  sampleRate = SR,
): Float32Array {
  const buf = new Float32Array(samples);
  const norm = weights.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < samples; i++) {
    let v = 0;
    for (let h = 0; h < weights.length; h++) {
      v += weights[h] * Math.sin((2 * Math.PI * hz * (h + 1) * i) / sampleRate);
    }
    buf[i] = (amp * v) / norm;
  }
  return buf;
}

// ---------------------------------------------------------------------------

describe('rms', () => {
  test('a full-scale sine reads its own amplitude over root two', () => {
    expect(rms(sine(220, 4096, 1))).toBeCloseTo(1 / Math.SQRT2, 2);
  });

  test('silence reads zero', () => {
    expect(rms(new Float32Array(2048))).toBe(0);
  });

  test('an empty buffer is 0, not NaN, because it drives a bar width', () => {
    expect(rms(new Float32Array(0))).toBe(0);
  });

  test('rms scales with amplitude', () => {
    const quiet = rms(sine(220, 4096, 0.05));
    const loud = rms(sine(220, 4096, 0.5));
    expect(loud / quiet).toBeCloseTo(10, 1);
  });
});

describe('pitchFromBuffer', () => {
  test('finds a 220 Hz sine to within a cent', () => {
    const hz = pitchFromBuffer(sine(220, 4096), SR);
    expect(Math.abs(centsBetween(hz, 220))).toBeLessThan(1);
  });

  test('finds notes across the whole vocal range', () => {
    for (const target of [90, 110, 147, 220, 330, 440, 660, 880]) {
      const hz = pitchFromBuffer(sine(target, 4096), SR);
      expect(Math.abs(centsBetween(hz, target)), `${target} Hz read as ${hz}`).toBeLessThan(5);
    }
  });

  test('does not answer an octave low, which is the classic failure', () => {
    // A rich tone is where naive autocorrelation lands on the second period.
    const hz = pitchFromBuffer(harmonic(220, [1, 0.8, 0.6, 0.4, 0.3], 4096), SR);
    expect(Math.abs(centsBetween(hz, 220))).toBeLessThan(15);
  });

  test('silence is reported as no pitch, never as some frequency', () => {
    expect(pitchFromBuffer(new Float32Array(4096), SR)).toBe(-1);
  });

  test('a sound under the noise floor is no pitch', () => {
    expect(pitchFromBuffer(sine(220, 4096, 0.001), SR)).toBe(-1);
  });

  test('white noise is reported as no pitch', () => {
    // Deterministic pseudo-noise: a seeded LCG, so this test cannot flake.
    const buf = new Float32Array(4096);
    let seed = 12345;
    for (let i = 0; i < buf.length; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      buf[i] = (seed / 2147483648) * 2 - 1;
    }
    expect(pitchFromBuffer(buf, SR)).toBe(-1);
  });

  test('a note outside the requested range is rejected rather than folded in', () => {
    expect(pitchFromBuffer(sine(220, 4096), SR, { minHz: 300, maxHz: 900 })).toBe(-1);
  });

  test('works at 44100 as well as 48000, since we do not choose the rate', () => {
    const hz = pitchFromBuffer(sine(196, 4096, 0.3, 44100), 44100);
    expect(Math.abs(centsBetween(hz, 196))).toBeLessThan(5);
  });

  test('clarity separates a sung tone from a room', () => {
    const tone = pitchDetail(sine(220, 4096), SR);
    expect(tone.clarity).toBeGreaterThan(0.9);
    expect(tone.level).toBeGreaterThan(0.1);
  });
});

describe('magnitudeSpectrum and spectralCentroid', () => {
  test('a pure sine puts its energy at its own frequency', () => {
    const mags = magnitudeSpectrum(sine(1000, 4096));
    let peak = 0;
    for (let i = 1; i < mags.length; i++) if (mags[i] > mags[peak]) peak = i;
    const binHz = SR / (2 * mags.length);
    expect(peak * binHz).toBeCloseTo(1000, -2);
  });

  test('the centroid of a pure sine is its own frequency', () => {
    const c = spectralCentroid(magnitudeSpectrum(sine(1000, 4096)), SR);
    expect(Math.abs(c - 1000)).toBeLessThan(60);
  });

  test('two timbres on the same note have clearly different centroids', () => {
    // Same 220 Hz fundamental either way. Only the harmonic mix differs, which
    // is exactly the claim exercise 5 makes on screen.
    const dark = harmonic(220, [1, 0.5, 0.2, 0.05], 8192);
    const bright = harmonic(220, [1, 0.9, 0.9, 0.9, 0.8, 0.8, 0.7, 0.6], 8192);

    const cDark = spectralCentroid(magnitudeSpectrum(dark), SR);
    const cBright = spectralCentroid(magnitudeSpectrum(bright), SR);

    expect(cBright).toBeGreaterThan(cDark * 1.5);

    // And the pitch is unchanged, which is the other half of the claim.
    expect(Math.abs(centsBetween(pitchFromBuffer(dark, SR), 220))).toBeLessThan(15);
    expect(Math.abs(centsBetween(pitchFromBuffer(bright, SR), 220))).toBeLessThan(15);
  });

  test('an empty or silent spectrum reads 0, meaning no reading', () => {
    expect(spectralCentroid(new Float32Array(0), SR)).toBe(0);
    expect(spectralCentroid(new Float32Array(1024), SR)).toBe(0);
  });

  test('out-of-band energy is ignored, so rumble cannot drag the colour', () => {
    const mags = new Float32Array(1024);
    const binHz = SR / (2 * mags.length);
    mags[Math.round(30 / binHz)] = 10; // sub-audible rumble
    mags[Math.round(2000 / binHz)] = 1;
    const c = spectralCentroid(mags, SR);
    expect(Math.abs(c - 2000)).toBeLessThan(binHz * 2);
  });

  test('decibel bins convert back to linear magnitudes', () => {
    const lin = linearFromDecibels(new Float32Array([0, -20, -40]));
    expect(lin[0]).toBeCloseTo(1, 6);
    expect(lin[1]).toBeCloseTo(0.1, 6);
    expect(lin[2]).toBeCloseTo(0.01, 6);
  });
});

describe('onsets', () => {
  test('a step has a slope of the step height over one sample interval', () => {
    const env = [0, 0, 0, 0.5, 0.5, 0.5];
    expect(onsetSlope(env, 0.02)).toBeCloseTo(0.5 / 0.02, 6);
  });

  test('a slow swell has a far gentler slope than a step of the same height', () => {
    const step = [0, 0, 0.5, 0.5, 0.5, 0.5];
    const swell = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
    expect(onsetSlope(step, 0.02)).toBeGreaterThan(onsetSlope(swell, 0.02) * 4);
  });

  test('a flat envelope has no rise at all', () => {
    expect(onsetSlope([0.3, 0.3, 0.3], 0.02)).toBe(0);
  });

  test('three ah sounds are found as three onsets', () => {
    // Leading silence on purpose: an envelope that is already sounding at
    // sample zero has no crossing there, and inventing one would report an
    // onset the child never made.
    const env: number[] = [0, 0, 0];
    for (let burst = 0; burst < 3; burst++) {
      for (let i = 0; i < 5; i++) env.push(0.02 * i + 0.02);
      for (let i = 0; i < 5; i++) env.push(0.1);
      for (let i = 0; i < 10; i++) env.push(0);
    }
    const onsets = detectOnsets(env, 0.02, { floor: 0.01 });
    expect(onsets.length).toBe(3);
  });

  test('hard onsets measure steeper than soft ones on the same bursts', () => {
    const soft: number[] = [0, 0, 0];
    const hard: number[] = [0, 0, 0];
    for (let burst = 0; burst < 3; burst++) {
      for (let i = 1; i <= 8; i++) soft.push((0.12 * i) / 8);
      for (let i = 0; i < 6; i++) soft.push(0.12);
      for (let i = 0; i < 10; i++) soft.push(0);

      hard.push(0.12);
      for (let i = 0; i < 13; i++) hard.push(0.12);
      for (let i = 0; i < 10; i++) hard.push(0);
    }
    const softOnsets = detectOnsets(soft, 0.02, { floor: 0.01 });
    const hardOnsets = detectOnsets(hard, 0.02, { floor: 0.01 });
    expect(softOnsets.length).toBe(3);
    expect(hardOnsets.length).toBe(3);

    const meanSlope = (list: { slope: number }[]) =>
      list.reduce((a, o) => a + o.slope, 0) / list.length;
    expect(meanSlope(hardOnsets)).toBeGreaterThan(meanSlope(softOnsets) * 3);
  });

  test('two blips inside the minimum gap count as one onset', () => {
    const env = [0, 0.2, 0, 0.2, 0, 0, 0, 0, 0, 0, 0.2];
    const onsets = detectOnsets(env, 0.02, { floor: 0.01, minGapSeconds: 0.1 });
    expect(onsets.length).toBe(2);
  });

  test('an envelope that starts already sounding does not invent an onset', () => {
    expect(detectOnsets([0.3, 0.3, 0.3], 0.02).length).toBe(0);
  });
});

describe('stability', () => {
  test('a flat series is perfectly steady', () => {
    expect(stability([0.2, 0.2, 0.2, 0.2])).toBe(1);
  });

  test('a wandering series is less steady than a nearly flat one', () => {
    const nearlyFlat = stability([0.2, 0.205, 0.198, 0.202]);
    const wandering = stability([0.05, 0.4, 0.1, 0.35]);
    expect(nearlyFlat).toBeGreaterThan(0.9);
    expect(wandering).toBeLessThan(0.3);
  });

  test('one sample is not yet an opinion', () => {
    expect(stability([0.2])).toBe(0);
    expect(stability([])).toBe(0);
  });

  test('steadiness is relative, so a quiet steady voice scores like a loud one', () => {
    const quiet = stability([0.02, 0.021, 0.019, 0.02]);
    const loud = stability([0.4, 0.42, 0.38, 0.4]);
    expect(Math.abs(quiet - loud)).toBeLessThan(0.05);
  });
});

describe('pitchStability', () => {
  test('a held note is steady', () => {
    expect(pitchStability([220, 220.4, 219.6, 220.1])).toBeGreaterThan(0.95);
  });

  test('a semitone of wander scores far below a held note', () => {
    // Alternating by a semitone is a spread of about 49 cents, so it lands near
    // the middle of the scale rather than at the bottom. That is correct and it
    // is worth pinning: the ring should visibly loosen for this, not collapse.
    const held = pitchStability([220, 220.4, 219.6, 220.1]);
    const wobble = pitchStability([220, 233, 220, 233, 220]);
    expect(wobble).toBeLessThan(0.6);
    expect(wobble).toBeLessThan(held - 0.3);
  });

  test('wandering by a fourth is not steady at all', () => {
    expect(pitchStability([220, 293, 220, 293])).toBe(0);
  });

  test('measured in cents, so the same wobble scores the same at any octave', () => {
    const low = pitchStability([110, 113, 110, 113]);
    const high = pitchStability([440, 452, 440, 452]);
    expect(Math.abs(low - high)).toBeLessThan(0.05);
  });

  test('frames with no pitch are skipped, not counted as zero', () => {
    expect(pitchStability([220, -1, 220.2, -1, 219.9])).toBeGreaterThan(0.95);
  });

  test('fewer than two real readings is not yet an opinion', () => {
    expect(pitchStability([-1, -1, 220])).toBe(0);
  });
});

describe('rangeOf', () => {
  test('reports the span of real readings only', () => {
    const r = rangeOf([150, -1, 400, -1, 200]);
    expect(r.min).toBe(150);
    expect(r.max).toBe(400);
    expect(r.span).toBe(250);
  });

  test('all-empty is a zero span rather than an infinity', () => {
    expect(rangeOf([-1, -1]).span).toBe(0);
  });
});

describe('centsBetween', () => {
  test('an octave is 1200 cents', () => {
    expect(centsBetween(440, 220)).toBeCloseTo(1200, 6);
  });
  test('a missing reading is 0, not NaN', () => {
    expect(centsBetween(-1, 220)).toBe(0);
    expect(centsBetween(220, 0)).toBe(0);
  });
});
