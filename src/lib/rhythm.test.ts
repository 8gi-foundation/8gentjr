// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the Beat lesson's rhythm maths. Runs via `bun test`.
 *
 * The parts that decide whether tapping along feels fair:
 *   - ringPhase:    wraps cleanly, never returns a negative position
 *   - segmentAt:    a phase of exactly 1 does not fall off the end
 *   - tapOffset:    a tap just before the top counts as early, not very late
 *   - judgeTap:     generous by design, and more generous in calm mode
 *   - beatPitch:    the first beat is the low one, so the ring is audible
 */
import { describe, expect, test } from 'bun:test';
import {
  SPLITS,
  beatPitch,
  countPhrase,
  judgeTap,
  nearestBeat,
  ringPhase,
  ringSeconds,
  segmentAt,
  segmentSeconds,
  splitWords,
  tapOffset,
  tapTolerance,
} from './rhythm';

describe('ringSeconds', () => {
  test('slow end is slower than the quick end', () => {
    expect(ringSeconds(0)).toBeGreaterThan(ringSeconds(1));
  });
  test('stays in a range a child can tap along with', () => {
    for (let i = 0; i <= 10; i++) {
      const s = ringSeconds(i / 10);
      expect(s).toBeGreaterThanOrEqual(1.5);
      expect(s).toBeLessThanOrEqual(4.5);
    }
  });
  test('out of range and NaN tempo clamp instead of producing nonsense', () => {
    expect(ringSeconds(-4)).toBe(4.5);
    expect(ringSeconds(9)).toBe(1.5);
    expect(ringSeconds(Number.NaN)).toBe(4.5);
  });
});

describe('ringPhase', () => {
  test('starts at the top and wraps back to it', () => {
    expect(ringPhase(0, 0.5)).toBe(0);
    expect(ringPhase(ringSeconds(0.5), 0.5)).toBeCloseTo(0, 10);
  });
  test('is halfway round at half a period', () => {
    expect(ringPhase(ringSeconds(0.5) / 2, 0.5)).toBeCloseTo(0.5, 10);
  });
  test('is never negative, even for a clock that reads backwards', () => {
    expect(ringPhase(-0.4, 0.5)).toBeGreaterThanOrEqual(0);
    expect(ringPhase(-0.4, 0.5)).toBeLessThan(1);
  });
});

describe('segmentAt', () => {
  test('walks through every part exactly once', () => {
    for (const split of SPLITS) {
      const seen = new Set<number>();
      for (let i = 0; i < 400; i++) seen.add(segmentAt(i / 400, split));
      expect(seen.size).toBe(split);
    }
  });
  test('a phase of 1 wraps to the first part rather than overflowing', () => {
    expect(segmentAt(1, 4)).toBe(0);
  });
  test('never returns an index outside the split', () => {
    for (const split of SPLITS) {
      for (let i = 0; i <= 50; i++) {
        const s = segmentAt(i / 50, split);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(split);
      }
    }
  });
});

describe('segmentSeconds', () => {
  test('thirds arrive sooner than halves, which is the whole lesson', () => {
    expect(segmentSeconds(0.5, 3)).toBeLessThan(segmentSeconds(0.5, 2));
    expect(segmentSeconds(0.5, 6)).toBeLessThan(segmentSeconds(0.5, 4));
  });
  test('the parts add back up to one whole ring', () => {
    for (const split of SPLITS) {
      expect(segmentSeconds(0.5, split) * split).toBeCloseTo(ringSeconds(0.5), 10);
    }
  });
});

describe('tapOffset', () => {
  test('dead on a beat is zero', () => {
    expect(tapOffset(0, 4)).toBe(0);
    expect(tapOffset(0.25, 4)).toBeCloseTo(0, 10);
    expect(tapOffset(0.5, 4)).toBeCloseTo(0, 10);
  });
  test('exactly between two beats is the worst possible', () => {
    expect(tapOffset(0.125, 4)).toBeCloseTo(0.5, 10);
  });
  test('a tap just before the top is early for the top, not late for the last beat', () => {
    // 0.99 of the way round is 4 percent of a part before the top.
    expect(tapOffset(0.99, 4)).toBeCloseTo(0.04, 10);
    expect(nearestBeat(0.99, 4)).toBe(0);
  });
});

describe('judgeTap', () => {
  test('on the beat counts as on', () => {
    expect(judgeTap(0.5, 2)).toBe('on');
  });
  test('halfway between beats counts as off', () => {
    expect(judgeTap(0.25, 2)).toBe('off');
  });
  test('calm mode is more forgiving than lively mode', () => {
    expect(tapTolerance(true)).toBeGreaterThan(tapTolerance(false));
    const nearlyPhase = 0.5 + 0.28 / 2; // 28 percent of a part late, split of 2
    expect(judgeTap(nearlyPhase, 2, true)).not.toBe('off');
    expect(judgeTap(nearlyPhase, 2, false)).toBe('off');
  });
  test('every verdict is one of the three known values', () => {
    for (let i = 0; i <= 60; i++) {
      expect(['on', 'near', 'off']).toContain(judgeTap(i / 60, 3));
    }
  });
});

describe('beatPitch', () => {
  test('the first beat is the lowest, so the ring restarting is audible', () => {
    for (const split of SPLITS) {
      for (let b = 1; b < split; b++) {
        expect(beatPitch(0, split)).toBeLessThan(beatPitch(b, split));
      }
    }
  });
  test('later beats climb', () => {
    expect(beatPitch(2, 4)).toBeGreaterThan(beatPitch(1, 4));
  });
});

describe('words', () => {
  test('every split has plain words and a count in', () => {
    for (const split of SPLITS) {
      expect(splitWords(split).length).toBeGreaterThan(0);
      expect(countPhrase(split).split(' ').length).toBe(split);
      expect(countPhrase(split).startsWith('ONE')).toBe(true);
    }
  });
});
