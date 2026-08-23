// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for guided learning progress. Runs via `bun test`.
 *
 * The behaviours that matter to a child using this:
 *   - nextStepIndex:   steps are offered in order, finished lessons say so
 *   - markComplete:    completing twice does not duplicate or reorder
 *   - loadProgress:    stale or malformed saved data never strands a lesson
 *   - progressFraction: unknown ids cannot push a lesson past 100 percent
 *   - routeProgress:   the index bar counts steps, not lessons
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  clearProgress,
  countProgress,
  isLessonComplete,
  loadProgress,
  markComplete,
  nextStepIndex,
  progressFraction,
  routeProgress,
  saveProgress,
} from './guided-learning';

const STEPS = [
  { id: 'a', prompt: 'Do A' },
  { id: 'b', prompt: 'Do B' },
  { id: 'c', prompt: 'Do C' },
];

describe('nextStepIndex', () => {
  test('starts at the first step', () => {
    expect(nextStepIndex(STEPS, [])).toBe(0);
  });
  test('skips over completed steps', () => {
    expect(nextStepIndex(STEPS, ['a'])).toBe(1);
    expect(nextStepIndex(STEPS, ['a', 'b'])).toBe(2);
  });
  test('offers steps in order even when a later one is already done', () => {
    expect(nextStepIndex(STEPS, ['c'])).toBe(0);
  });
  test('returns the length when the lesson is finished', () => {
    expect(nextStepIndex(STEPS, ['a', 'b', 'c'])).toBe(3);
    expect(isLessonComplete(STEPS, ['a', 'b', 'c'])).toBe(true);
  });
  test('an empty lesson counts as finished', () => {
    expect(isLessonComplete([], [])).toBe(true);
  });
});

describe('markComplete', () => {
  test('appends in the order steps were reached', () => {
    expect(markComplete(['a'], 'b')).toEqual(['a', 'b']);
  });
  test('is idempotent, so a watcher firing twice is harmless', () => {
    expect(markComplete(['a', 'b'], 'a')).toEqual(['a', 'b']);
  });
  test('does not mutate the input', () => {
    const before = ['a'];
    markComplete(before, 'b');
    expect(before).toEqual(['a']);
  });
});

describe('progressFraction', () => {
  test('counts completed steps', () => {
    expect(progressFraction(STEPS, [])).toBe(0);
    expect(progressFraction(STEPS, ['a', 'b'])).toBeCloseTo(2 / 3, 10);
    expect(progressFraction(STEPS, ['a', 'b', 'c'])).toBe(1);
  });
  test('ignores ids the lesson no longer has', () => {
    expect(progressFraction(STEPS, ['a', 'gone', 'also-gone'])).toBeCloseTo(1 / 3, 10);
  });
  test('ignores duplicates', () => {
    expect(progressFraction(STEPS, ['a', 'a', 'a'])).toBeCloseTo(1 / 3, 10);
  });
});

describe('routeProgress', () => {
  const LESSONS = [
    { id: 'l1', title: 'One', stepCount: 4 },
    { id: 'l2', title: 'Two', stepCount: 6 },
  ];
  test('weights lessons by their step count', () => {
    expect(routeProgress(LESSONS, (id) => (id === 'l2' ? 6 : 0))).toBeCloseTo(0.6, 10);
  });
  test('is 0 with nothing done and 1 when everything is', () => {
    expect(routeProgress(LESSONS, () => 0)).toBe(0);
    expect(routeProgress(LESSONS, () => 10)).toBe(1);
  });
  test('a corrupt count cannot push the bar past full or below empty', () => {
    expect(routeProgress(LESSONS, () => -5)).toBe(0);
    expect(routeProgress(LESSONS, () => 999)).toBe(1);
  });
  test('an empty route reads as finished rather than dividing by zero', () => {
    expect(routeProgress([], () => 0)).toBe(1);
  });
});

describe('persistence', () => {
  const store: Record<string, string> = {};
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    globalThis.window = {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          for (const k of Object.keys(store)) delete store[k];
        },
        key: () => null,
        length: 0,
      },
    };
  });
  afterEach(() => {
    delete globalThis.window;
  });

  test('round trips completed ids', () => {
    saveProgress('lesson', ['a', 'b']);
    expect(loadProgress('lesson', STEPS)).toEqual(['a', 'b']);
  });
  test('de-duplicates on save', () => {
    saveProgress('lesson', ['a', 'a', 'b']);
    expect(loadProgress('lesson', STEPS)).toEqual(['a', 'b']);
  });
  test('drops ids for steps the lesson no longer has', () => {
    saveProgress('lesson', ['a', 'retired-step']);
    expect(loadProgress('lesson', STEPS)).toEqual(['a']);
  });
  test('returns [] for malformed JSON rather than throwing mid render', () => {
    store['8gentjr-guided-lesson'] = '{not json';
    expect(loadProgress('lesson', STEPS)).toEqual([]);
  });
  test('returns [] when the stored value is not an array', () => {
    store['8gentjr-guided-lesson'] = '{"a":1}';
    expect(loadProgress('lesson', STEPS)).toEqual([]);
  });
  test('returns [] when nothing is stored', () => {
    expect(loadProgress('never-opened', STEPS)).toEqual([]);
  });
  test('clearProgress wipes the lesson', () => {
    saveProgress('lesson', ['a', 'b']);
    clearProgress('lesson');
    expect(loadProgress('lesson', STEPS)).toEqual([]);
  });
  test('countProgress counts without needing the step list', () => {
    saveProgress('lesson', ['a', 'b', 'c']);
    expect(countProgress('lesson')).toBe(3);
    expect(countProgress('other-lesson')).toBe(0);
  });
  test('countProgress survives malformed storage', () => {
    store['8gentjr-guided-lesson'] = 'nonsense';
    expect(countProgress('lesson')).toBe(0);
  });
});

describe('without a browser', () => {
  test('load and count are safe on the server', () => {
    expect(loadProgress('lesson', STEPS)).toEqual([]);
    expect(countProgress('lesson')).toBe(0);
  });
});
