// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Water Sphere physics and palette. Runs via `bun test`.
 *
 * These check the three things that would silently break the game rather than
 * crash it: that the mode ladder is the Rayleigh relation and not five numbers
 * somebody liked, that the lock windows leave real churn between them (without
 * churn there is no game, only a slider), and that nothing in the palette can
 * paint a banned hue.
 *
 * Issue: #225
 */
import { describe, expect, test } from 'bun:test';
import {
  BANNED_HUE_MAX,
  BANNED_HUE_MIN,
  BASE_MODE_HZ,
  CHURN_THRESHOLD,
  LOCK_HALF_BANDWIDTH,
  LOCK_THRESHOLD,
  MAX_HZ,
  MIN_HZ,
  MODES,
  WATER_HUES,
  describeReading,
  harmonic,
  harmonicPeak,
  harmonicRaw,
  hueIsAllowed,
  hzToPosition,
  legendre,
  positionToHz,
  rayleighFactor,
  readMode,
} from './water-sphere';

describe('the mode ladder', () => {
  test('mode 2 sits on 60 hertz, the frequency the source demo runs at', () => {
    expect(MODES[0].l).toBe(2);
    expect(MODES[0].hz).toBe(BASE_MODE_HZ);
  });

  test('every mode frequency follows Rayleigh, not taste', () => {
    for (const mode of MODES) {
      const expected = (BASE_MODE_HZ * rayleighFactor(mode.l)) / rayleighFactor(2);
      expect(Math.abs(mode.exactHz - expected)).toBeLessThan(1e-9);
    }
  });

  test('degree rises monotonically, so "higher is busier" is true', () => {
    for (let i = 1; i < MODES.length; i++) {
      expect(MODES[i].l).toBeGreaterThan(MODES[i - 1].l);
      expect(MODES[i].exactHz).toBeGreaterThan(MODES[i - 1].exactHz);
    }
  });

  test('every mode is reachable inside the slider range', () => {
    for (const mode of MODES) {
      expect(mode.exactHz).toBeGreaterThan(MIN_HZ);
      expect(mode.exactHz).toBeLessThan(MAX_HZ);
    }
  });

  test('order m never exceeds degree l, or the harmonic is identically zero', () => {
    for (const mode of MODES) {
      expect(mode.m).toBeLessThanOrEqual(mode.l);
      expect(mode.m).toBeGreaterThanOrEqual(0);
    }
  });

  test('mode labels are plain words with no numbers a child must decode', () => {
    for (const mode of MODES) {
      expect(mode.label.trim().length).toBeGreaterThan(0);
      expect(mode.label).not.toContain('—');
      expect(mode.label.toLowerCase()).toBe(mode.label);
    }
  });
});

describe('lock windows leave real churn between them', () => {
  test('no two lock windows overlap', () => {
    // If they overlapped there would be no churning stretch between two modes,
    // the "between is messy" discovery would be unreachable, and the game would
    // collapse into a slider that is always right.
    for (let i = 1; i < MODES.length; i++) {
      const gap = Math.log(MODES[i].exactHz / MODES[i - 1].exactHz);
      expect(gap).toBeGreaterThan(2 * LOCK_HALF_BANDWIDTH);
    }
  });

  test('there is a properly churning frequency between every pair of modes', () => {
    for (let i = 1; i < MODES.length; i++) {
      const mid = Math.sqrt(MODES[i].exactHz * MODES[i - 1].exactHz);
      const reading = readMode(mid);
      expect(reading.locked).toBe(false);
      expect(reading.lock).toBeLessThanOrEqual(CHURN_THRESHOLD);
    }
  });

  test('sitting on a mode centre locks completely', () => {
    for (let i = 0; i < MODES.length; i++) {
      const reading = readMode(MODES[i].exactHz);
      expect(reading.index).toBe(i);
      expect(reading.lock).toBeCloseTo(1, 6);
      expect(reading.locked).toBe(true);
      expect(reading.churn).toBeCloseTo(0, 6);
    }
  });

  test('lock and churn always sum to one and stay in range', () => {
    for (let hz = MIN_HZ; hz <= MAX_HZ; hz += 1) {
      const r = readMode(hz);
      expect(r.lock).toBeGreaterThanOrEqual(0);
      expect(r.lock).toBeLessThanOrEqual(1);
      expect(r.lock + r.churn).toBeCloseTo(1, 9);
    }
  });

  test('frequencies outside the range clamp instead of reading nonsense', () => {
    expect(readMode(-1000).index).toBe(0);
    expect(readMode(99999).index).toBe(MODES.length - 1);
    expect(Number.isFinite(readMode(-1000).lock)).toBe(true);
  });

  test('the neighbour is the mode on the far side of where we stand', () => {
    expect(readMode(MODES[0].exactHz * 1.05).neighbourIndex).toBe(1);
    expect(readMode(MODES[2].exactHz * 0.95).neighbourIndex).toBe(1);
    // Nothing beyond the ends to blend toward.
    expect(readMode(MIN_HZ).neighbourIndex).toBeNull();
    expect(readMode(MAX_HZ).neighbourIndex).toBeNull();
  });

  test('the lock threshold sits above the churn threshold', () => {
    expect(LOCK_THRESHOLD).toBeGreaterThan(CHURN_THRESHOLD);
  });
});

describe('the control is logarithmic so every mode is equally findable', () => {
  test('position and frequency round trip', () => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      expect(hzToPosition(positionToHz(p))).toBeCloseTo(Math.min(1, p), 6);
    }
  });

  test('the ends of the control are the ends of the range', () => {
    expect(positionToHz(0)).toBeCloseTo(MIN_HZ, 6);
    expect(positionToHz(1)).toBeCloseTo(MAX_HZ, 6);
  });

  test('out of range positions clamp', () => {
    expect(positionToHz(-5)).toBeCloseTo(MIN_HZ, 6);
    expect(positionToHz(5)).toBeCloseTo(MAX_HZ, 6);
  });

  test('every lock window is the same width on the control', () => {
    // The point of the log control. A child hunting for mode 6 gets the same
    // number of pixels of tolerance as a child hunting for mode 2.
    const widths = MODES.map((mode) => {
      const lo = hzToPosition(mode.exactHz * Math.exp(-LOCK_HALF_BANDWIDTH));
      const hi = hzToPosition(mode.exactHz * Math.exp(LOCK_HALF_BANDWIDTH));
      return hi - lo;
    });
    for (const w of widths) {
      expect(w).toBeCloseTo(widths[0], 6);
      expect(w).toBeGreaterThan(0.02);
    }
  });
});

describe('spherical harmonics', () => {
  test('legendre matches the closed forms for the low orders', () => {
    for (const x of [-0.9, -0.4, 0, 0.3, 0.77, 1]) {
      expect(legendre(0, 0, x)).toBeCloseTo(1, 9);
      expect(legendre(1, 0, x)).toBeCloseTo(x, 9);
      expect(legendre(2, 0, x)).toBeCloseTo(0.5 * (3 * x * x - 1), 9);
      expect(legendre(3, 0, x)).toBeCloseTo(0.5 * (5 * x ** 3 - 3 * x), 9);
      expect(legendre(1, 1, x)).toBeCloseTo(-Math.sqrt(1 - x * x), 9);
      expect(legendre(2, 1, x)).toBeCloseTo(-3 * x * Math.sqrt(1 - x * x), 9);
      expect(legendre(2, 2, x)).toBeCloseTo(3 * (1 - x * x), 9);
    }
  });

  test('legendre is zero when m exceeds l', () => {
    expect(legendre(2, 3, 0.5)).toBe(0);
    expect(legendre(0, 1, 0.5)).toBe(0);
  });

  test('every shipped mode is normalised to a peak of one', () => {
    for (const mode of MODES) {
      let peak = 0;
      for (let i = 0; i <= 120; i++) {
        const theta = (i / 120) * Math.PI;
        for (let j = 0; j < 120; j++) {
          const phi = (j / 120) * 2 * Math.PI;
          peak = Math.max(peak, Math.abs(harmonic(mode.l, mode.m, theta, phi)));
        }
      }
      // Sampled finer than the cache samples, so a hair over 1 is expected and
      // fine. What must not happen is a mode that barely moves or blows up.
      expect(peak).toBeGreaterThan(0.9);
      expect(peak).toBeLessThan(1.05);
    }
  });

  test('every mode actually deforms the surface', () => {
    // A mode whose harmonic is flat would render as a plain ball and the child
    // would have found nothing.
    for (const mode of MODES) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i <= 60; i++) {
        const theta = (i / 60) * Math.PI;
        for (let j = 0; j < 60; j++) {
          const v = harmonic(mode.l, mode.m, theta, (j / 60) * 2 * Math.PI);
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
      expect(hi - lo).toBeGreaterThan(1.2);
    }
  });

  test('each mode carries exactly l nodal lines, which is what "more petals" means', () => {
    // This is the test behind the naming line. A spherical harmonic of degree l
    // has l nodal lines in total: (l - m) circles of latitude, counted by
    // walking a meridian pole to pole, and m nodal meridians, counted by
    // walking once around at a latitude that crosses them. If this ever stopped
    // holding, "higher sounds made more petals" would be a claim rather than a
    // description, which is the one thing this activity may not ship.
    const signChanges = (samples: number[]): number => {
      let changes = 0;
      let prev = 0;
      for (const v of samples) {
        if (Math.abs(v) < 1e-9) continue;
        if (prev !== 0 && Math.sign(v) !== Math.sign(prev)) changes++;
        prev = Math.sign(v);
      }
      return changes;
    };

    for (const mode of MODES) {
      const meridian: number[] = [];
      for (let i = 1; i < 4000; i++) {
        meridian.push(harmonicRaw(mode.l, mode.m, (i / 4000) * Math.PI, 0.1));
      }
      const latitudes = signChanges(meridian);

      // Sampled at a latitude away from the poles and away from a nodal circle.
      const equator: number[] = [];
      for (let j = 0; j <= 4000; j++) {
        equator.push(harmonicRaw(mode.l, mode.m, Math.PI / 2 + 0.31, (j / 4000) * 2 * Math.PI));
      }
      const meridians = signChanges(equator) / 2;

      expect(latitudes, `mode l=${mode.l} m=${mode.m} nodal circles`).toBe(mode.l - mode.m);
      expect(meridians, `mode l=${mode.l} m=${mode.m} nodal meridians`).toBe(mode.m);
      expect(latitudes + meridians).toBe(mode.l);
    }
  });

  test('the peak cache returns a usable number for a degenerate mode', () => {
    // m > l makes the harmonic identically zero. Dividing by that peak would
    // give NaN on every vertex and paint nothing at all.
    expect(harmonicPeak(2, 5)).toBe(1);
    expect(Number.isFinite(harmonic(2, 5, 1, 1))).toBe(true);
  });
});

describe('the palette cannot paint a banned hue', () => {
  test('hueIsAllowed brackets the banned band', () => {
    expect(hueIsAllowed(BANNED_HUE_MIN)).toBe(false);
    expect(hueIsAllowed(BANNED_HUE_MAX)).toBe(false);
    expect(hueIsAllowed(300)).toBe(false);
    expect(hueIsAllowed(BANNED_HUE_MIN - 1)).toBe(true);
    expect(hueIsAllowed(BANNED_HUE_MAX + 1)).toBe(true);
    // Wrapping is part of the guard, not an afterthought: a hue arriving as
    // -60 or 660 is 300 on the wheel and must be caught as such.
    expect(hueIsAllowed(-60)).toBe(false);
    expect(hueIsAllowed(660)).toBe(false);
    expect(hueIsAllowed(-170)).toBe(true);
  });

  test('every declared water hue is outside 270-350', () => {
    for (const [name, hue] of Object.entries(WATER_HUES)) {
      expect(hueIsAllowed(hue), `${name} is hue ${hue}, inside the banned band`).toBe(true);
    }
  });

  test('every declared water hue reads as water, not as fire or grass', () => {
    // Teal through blue. A hue that drifted out of this band would still pass
    // the ban and still be wrong for a drop of water.
    for (const [name, hue] of Object.entries(WATER_HUES)) {
      expect(hue, `${name} is hue ${hue}, not a water hue`).toBeGreaterThanOrEqual(170);
      expect(hue, `${name} is hue ${hue}, not a water hue`).toBeLessThanOrEqual(230);
    }
  });
});

describe('the spoken description', () => {
  test('names the shape and the frequency when the surface holds', () => {
    const line = describeReading(readMode(MODES[1].exactHz));
    expect(line).toContain('Steady shape');
    expect(line).toContain(String(MODES[1].hz));
    expect(line).toContain(MODES[1].label);
  });

  test('says it is churning when it is churning, and does not praise', () => {
    const mid = Math.sqrt(MODES[0].exactHz * MODES[1].exactHz);
    expect(describeReading(readMode(mid))).toBe('The water is churning.');
  });

  test('never shouts and never uses an em dash', () => {
    for (const mode of MODES) {
      const line = describeReading(readMode(mode.exactHz));
      expect(line).not.toContain('!');
      expect(line).not.toContain('—');
    }
  });
});
