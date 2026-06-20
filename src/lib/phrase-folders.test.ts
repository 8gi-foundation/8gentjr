// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the user-created phrase folders helpers. Runs via `bun test`.
 *
 * Covers the edge-cases the folder logic must get right:
 *   - normaliseFolder: trim + internal-whitespace collapse
 *   - addFolder:       case-insensitive de-dup, canonical name return, order
 *   - removeFolder:    exact-match removal only
 *   - isAutoFolder:    auto names protected from custom-folder treatment
 *   - loadFolders:     defensive parsing of malformed localStorage
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  AUTO_FOLDERS,
  addFolder,
  isAutoFolder,
  loadFolders,
  normaliseFolder,
  removeFolder,
} from './phrase-folders';

describe('normaliseFolder', () => {
  test('trims leading/trailing whitespace', () => {
    expect(normaliseFolder('  Toys  ')).toBe('Toys');
  });
  test('collapses internal whitespace runs to single spaces', () => {
    expect(normaliseFolder('My   Favourite\tThings')).toBe('My Favourite Things');
  });
  test('returns empty string for whitespace-only input', () => {
    expect(normaliseFolder('   ')).toBe('');
  });
});

describe('addFolder', () => {
  test('appends a new folder preserving order', () => {
    const { folders, name } = addFolder(['A', 'B'], 'C');
    expect(folders).toEqual(['A', 'B', 'C']);
    expect(name).toBe('C');
  });
  test('normalises the stored name on add', () => {
    const { folders, name } = addFolder([], '  Snack  Time  ');
    expect(folders).toEqual(['Snack Time']);
    expect(name).toBe('Snack Time');
  });
  test('de-dups case-insensitively and returns the canonical existing name', () => {
    const original = ['Toys'];
    const { folders, name } = addFolder(original, 'toys');
    expect(folders).toBe(original); // unchanged reference -> caller skips persist
    expect(name).toBe('Toys');
  });
  test('empty/whitespace name is a no-op returning empty name', () => {
    const original = ['Toys'];
    const { folders, name } = addFolder(original, '   ');
    expect(folders).toBe(original);
    expect(name).toBe('');
  });
  test('does not mutate the input array when adding', () => {
    const original = ['A'];
    addFolder(original, 'B');
    expect(original).toEqual(['A']);
  });
});

describe('removeFolder', () => {
  test('removes an exact match', () => {
    expect(removeFolder(['A', 'B', 'C'], 'B')).toEqual(['A', 'C']);
  });
  test('is case-sensitive (only removes exact name)', () => {
    expect(removeFolder(['Toys'], 'toys')).toEqual(['Toys']);
  });
  test('returns a list unchanged when name is absent', () => {
    expect(removeFolder(['A'], 'Z')).toEqual(['A']);
  });
});

describe('isAutoFolder', () => {
  test('recognises every auto folder name', () => {
    for (const name of AUTO_FOLDERS) expect(isAutoFolder(name)).toBe(true);
  });
  test('rejects custom names', () => {
    expect(isAutoFolder('Toys')).toBe(false);
  });
  test('is case-sensitive', () => {
    expect(isAutoFolder('food')).toBe(false);
  });
});

describe('loadFolders', () => {
  const store: Record<string, string> = {};
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    globalThis.localStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      key: () => null,
      length: 0,
    } as Storage;
  });
  afterEach(() => {
    // @ts-expect-error - tearing down the test shim
    delete globalThis.localStorage;
  });

  test('returns [] when key is unset', () => {
    expect(loadFolders()).toEqual([]);
  });
  test('returns [] for malformed JSON', () => {
    store['8gentjr_phrase_folders'] = '{not json';
    expect(loadFolders()).toEqual([]);
  });
  test('returns [] when stored value is not an array', () => {
    store['8gentjr_phrase_folders'] = '{"a":1}';
    expect(loadFolders()).toEqual([]);
  });
  test('filters out non-string and blank entries', () => {
    store['8gentjr_phrase_folders'] = JSON.stringify(['Toys', 7, '', '  ', 'Snacks', null]);
    expect(loadFolders()).toEqual(['Toys', 'Snacks']);
  });
});
