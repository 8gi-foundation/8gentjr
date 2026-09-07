// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the Skips lesson. Runs via `bun test`.
 *
 * What matters here:
 *   - nextInPattern:  works from what the child has found, in any order
 *   - judgeSkipTap:   a tap off the pattern is never treated as a failure
 *   - patternShape:   the 6 wide grid really does split 2, 3, 6 from 4, 5
 *   - bestStreak:     a run means consecutive multiples, not a total count
 */
import { describe, expect, test } from 'bun:test';
import {
  GRID_MAX,
  SKIPS,
  bestStreak,
  gridPosition,
  isMultiple,
  judgeSkipTap,
  multiples,
  nextInPattern,
  patternFraction,
  patternShape,
  shapeWords,
} from './skip-counting';

describe('multiples', () => {
  test('counts in steps up to the end of the grid', () => {
    expect(multiples(2, 12)).toEqual([2, 4, 6, 8, 10, 12]);
    expect(multiples(5, 24)).toEqual([5, 10, 15, 20]);
  });
  test('never runs past the grid', () => {
    for (const skip of SKIPS) {
      const m = multiples(skip);
      expect(Math.max(...m)).toBeLessThanOrEqual(GRID_MAX);
    }
  });
});

describe('isMultiple', () => {
  test('zero and negatives are not on the grid', () => {
    expect(isMultiple(0, 3)).toBe(false);
    expect(isMultiple(-3, 3)).toBe(false);
  });
  test('recognises the pattern', () => {
    expect(isMultiple(9, 3)).toBe(true);
    expect(isMultiple(10, 3)).toBe(false);
  });
});

describe('nextInPattern', () => {
  test('starts at the first multiple', () => {
    expect(nextInPattern([], 4)).toBe(4);
  });
  test('follows on from the highest found so far', () => {
    expect(nextInPattern([4, 8], 4)).toBe(12);
  });
  test('does not care what order they were found in', () => {
    expect(nextInPattern([8, 4], 4)).toBe(12);
  });
  test('a stray number off the pattern does not derail the next step', () => {
    expect(nextInPattern([4, 8, 9], 4)).toBe(12);
  });
  test('returns null once the pattern leaves the grid', () => {
    expect(nextInPattern([5, 10, 15, 20], 5)).toBeNull();
  });
});

describe('judgeSkipTap', () => {
  test('the next number in the pattern advances it', () => {
    expect(judgeSkipTap(3, [], 3)).toBe('next');
    expect(judgeSkipTap(6, [3], 3)).toBe('next');
  });
  test('a number already found is answered, not punished', () => {
    expect(judgeSkipTap(3, [3], 3)).toBe('already');
  });
  test('a number off the pattern is simply not in it', () => {
    expect(judgeSkipTap(7, [3], 3)).toBe('not-in-pattern');
  });
  test('a multiple out of order is not the next one', () => {
    expect(judgeSkipTap(12, [3], 3)).toBe('not-in-pattern');
  });
});

describe('gridPosition', () => {
  test('the first number is the top left square', () => {
    expect(gridPosition(1)).toEqual({ row: 0, column: 0 });
  });
  test('the row wraps every six', () => {
    expect(gridPosition(6)).toEqual({ row: 0, column: 5 });
    expect(gridPosition(7)).toEqual({ row: 1, column: 0 });
    expect(gridPosition(24)).toEqual({ row: 3, column: 5 });
  });
});

describe('patternShape', () => {
  test('2, 3 and 6 stack into columns on a six wide grid', () => {
    expect(patternShape(2)).toBe('columns');
    expect(patternShape(3)).toBe('columns');
    expect(patternShape(6)).toBe('columns');
  });
  test('4 and 5 lean across it', () => {
    expect(patternShape(4)).toBe('diagonal');
    expect(patternShape(5)).toBe('diagonal');
  });
  test('the shape claim holds against the actual grid positions', () => {
    // Straight up and down means every row holding a lit square holds the same
    // set of columns. Leaning across means the columns move from row to row.
    for (const skip of SKIPS) {
      const byRow = new Map<number, Set<number>>();
      for (const n of multiples(skip)) {
        const { row, column } = gridPosition(n);
        if (!byRow.has(row)) byRow.set(row, new Set());
        byRow.get(row)!.add(column);
      }
      const sets = [...byRow.values()].map((s) => [...s].sort().join(','));
      const everyRowMatches = sets.every((s) => s === sets[0]);
      expect(everyRowMatches).toBe(patternShape(skip) === 'columns');
    }
  });
  test('every skip has words for its shape', () => {
    for (const skip of SKIPS) expect(shapeWords(skip).length).toBeGreaterThan(0);
  });
});

describe('patternFraction', () => {
  test('empty is 0 and complete is 1', () => {
    expect(patternFraction([], 4)).toBe(0);
    expect(patternFraction(multiples(4), 4)).toBe(1);
  });
  test('numbers off the pattern do not count towards it', () => {
    expect(patternFraction([4, 5, 7], 4)).toBeCloseTo(1 / 6, 10);
  });
  test('cannot exceed 1 even with duplicates', () => {
    expect(patternFraction([4, 4, 4, 8], 4)).toBeLessThanOrEqual(1);
  });
});

describe('bestStreak', () => {
  test('counts consecutive multiples found in order', () => {
    expect(bestStreak([3, 6, 9], 3)).toBe(3);
  });
  test('a gap breaks the run', () => {
    expect(bestStreak([3, 6, 15, 18], 3)).toBe(2);
  });
  test('numbers off the pattern are ignored rather than breaking the run', () => {
    expect(bestStreak([3, 6, 7, 9], 3)).toBe(3);
  });
  test('nothing found is a streak of zero', () => {
    expect(bestStreak([], 3)).toBe(0);
  });
});
