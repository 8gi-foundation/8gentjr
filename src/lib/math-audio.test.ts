// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the /math sonification helpers. Runs via `bun test`.
 *
 * These are the parts that carry teaching meaning, so they are the parts worth
 * pinning down:
 *   - pentatonicAt:      any position lands on a real note, ends included
 *   - pitchForWiggles:   more wiggles is always a higher note, never silent
 *   - gainForAmplitude:  0 is silent, 1 is the ceiling, nothing exceeds it
 *   - consonance:        simple ratios score higher than awkward ones
 *   - harmonicGain:      later layers are quieter than earlier ones
 */
import { describe, expect, test } from 'bun:test';
import {
  PENTATONIC_HZ,
  clamp,
  consonance,
  gainForAmplitude,
  gcd,
  harmonicGain,
  pentatonicAt,
  pitchForWiggles,
  ratioFrequencies,
} from './math-audio';

describe('clamp', () => {
  test('bounds on both sides', () => {
    expect(clamp(-4, 0, 1)).toBe(0);
    expect(clamp(9, 0, 1)).toBe(1);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
  test('NaN falls back to the minimum rather than poisoning Web Audio', () => {
    expect(clamp(Number.NaN, 20, 90)).toBe(20);
  });
});

describe('pentatonicAt', () => {
  test('0 and 1 hit the first and last note', () => {
    expect(pentatonicAt(0)).toBe(PENTATONIC_HZ[0]);
    expect(pentatonicAt(1)).toBe(PENTATONIC_HZ[PENTATONIC_HZ.length - 1]);
  });
  test('out of range positions clamp instead of returning undefined', () => {
    expect(pentatonicAt(-2)).toBe(PENTATONIC_HZ[0]);
    expect(pentatonicAt(50)).toBe(PENTATONIC_HZ[PENTATONIC_HZ.length - 1]);
  });
  test('every position returns a note from the scale', () => {
    for (let i = 0; i <= 20; i++) {
      expect(PENTATONIC_HZ).toContain(pentatonicAt(i / 20));
    }
  });
});

describe('pitchForWiggles', () => {
  test('rises with the wiggle count, so the picture and the sound agree', () => {
    expect(pitchForWiggles(2)).toBeGreaterThan(pitchForWiggles(1));
    expect(pitchForWiggles(6)).toBeGreaterThan(pitchForWiggles(2));
  });
  test('stays audible at the bottom of the knob', () => {
    expect(pitchForWiggles(0)).toBeGreaterThan(20);
  });
  test('stays inside a comfortable range at the top of the knob', () => {
    expect(pitchForWiggles(999)).toBeLessThanOrEqual(220 * 8);
  });
});

describe('gainForAmplitude', () => {
  test('flat wave is silent', () => {
    expect(gainForAmplitude(0)).toBe(0);
  });
  test('full height hits the ceiling exactly', () => {
    expect(gainForAmplitude(1)).toBeCloseTo(0.16, 5);
  });
  test('never exceeds the ceiling, whatever it is handed', () => {
    expect(gainForAmplitude(12)).toBeCloseTo(0.16, 5);
    expect(gainForAmplitude(-3)).toBe(0);
  });
  test('is monotonic, so louder never means quieter', () => {
    let previous = -1;
    for (let i = 0; i <= 10; i++) {
      const g = gainForAmplitude(i / 10);
      expect(g).toBeGreaterThanOrEqual(previous);
      previous = g;
    }
  });
});

describe('gcd', () => {
  test('finds the shared factor', () => {
    expect(gcd(4, 6)).toBe(2);
    expect(gcd(3, 9)).toBe(3);
  });
  test('coprime pairs share only 1', () => {
    expect(gcd(5, 7)).toBe(1);
  });
  test('zero is handled', () => {
    expect(gcd(0, 5)).toBe(5);
  });
});

describe('consonance', () => {
  test('a unison is the most settled sound', () => {
    expect(consonance(1, 1)).toBe(1);
  });
  test('simple ratios beat awkward ones', () => {
    expect(consonance(3, 2)).toBeGreaterThan(consonance(7, 5));
    expect(consonance(2, 1)).toBeGreaterThan(consonance(8, 7));
  });
  test('a shared factor scores the same as the reduced pair', () => {
    expect(consonance(4, 6)).toBeCloseTo(consonance(2, 3), 10);
  });
  test('always lands in 0..1', () => {
    for (let a = 1; a <= 8; a++) {
      for (let b = 1; b <= 8; b++) {
        const v = consonance(a, b);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
  test('zero rules make no sound rather than dividing by zero', () => {
    expect(consonance(0, 3)).toBe(0);
  });
});

describe('ratioFrequencies', () => {
  test('the pair keeps the ratio of the rules', () => {
    const [a, b] = ratioFrequencies(3, 2);
    expect(a / b).toBeCloseTo(1.5, 10);
  });
  test('rules are bounded so a stray value cannot scream', () => {
    const [a, b] = ratioFrequencies(500, 0);
    expect(a).toBeLessThanOrEqual(220 * 6);
    expect(b).toBeGreaterThan(0);
  });
});

describe('harmonicGain', () => {
  test('higher layers sit further back in the mix', () => {
    expect(harmonicGain(1)).toBe(1);
    expect(harmonicGain(2)).toBeCloseTo(0.5, 10);
    expect(harmonicGain(3)).toBeGreaterThan(harmonicGain(4));
  });
  test('is never zero or negative', () => {
    expect(harmonicGain(0)).toBeGreaterThan(0);
    expect(harmonicGain(-5)).toBeGreaterThan(0);
  });
});
