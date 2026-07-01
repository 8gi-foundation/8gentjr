// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the Layout Primitive SURFACES (Scene / Word Rail / Flow Board /
 * Orbit Core). Runs via `bun test`.
 *
 * The app has no DOM test renderer (all existing suites are pure-logic), so
 * these tests target the shared contract that guarantees every surface behaves
 * like the grid, rather than pixel output (pixels are covered by `next build`
 * + the headless screenshots in the PR):
 *
 *   - VOCABULARY SOURCE: all surfaces read the single Supercore 50 list, which
 *     is frozen (immutable) and internally consistent.
 *   - SHARED PIPELINE: the one tap action every surface uses (performCoreTap)
 *     speaks the word, appends a chip to the SHARED sentence store, and logs -
 *     in that order.
 *   - SCENE HOTSPOTS resolve to real Supercore words (never invented vocab).
 *   - NON-DESTRUCTIVE: tapping through a surface never mutates vocabulary,
 *     categories, personal words or phrase folders.
 *   - EXPORTS: the four surface kinds map to four distinct real components (no
 *     longer the placeholder / grid).
 */
import { describe, expect, test, beforeEach } from 'bun:test';
import {
  SUPERCORE_50,
  SUPERCORE_BY_LABEL,
  CORE_CATEGORY_ORDER,
  FITZGERALD_CLASSES,
  coreWordChip,
  performCoreTap,
  sceneHotspotWords,
  wordsInCategory,
  SCENE_HOTSPOTS,
} from '@/lib/core-vocab';
import { sentenceStore } from '@/lib/sentence-store';
import { loadFolders } from '@/lib/phrase-folders';

const CATEGORIES = CORE_CATEGORY_ORDER.map((c) => c.category);

describe('core vocabulary source', () => {
  test('is the Supercore 50 and never fewer', () => {
    expect(SUPERCORE_50.length).toBe(50);
  });

  test('every word has a valid category and unique id', () => {
    const ids = new Set<string>();
    for (const w of SUPERCORE_50) {
      expect(CATEGORIES).toContain(w.category);
      expect(ids.has(w.id)).toBe(false);
      ids.add(w.id);
      expect(w.label.length).toBeGreaterThan(0);
    }
  });

  test('is frozen - a surface cannot reorder or mutate the vocabulary', () => {
    expect(Object.isFrozen(SUPERCORE_50)).toBe(true);
    expect(() => {
      // @ts-expect-error - deliberate illegal mutation
      SUPERCORE_50.push({ id: 'x', label: 'x', category: 'people' });
    }).toThrow();
    expect(SUPERCORE_50.length).toBe(50);
  });

  test('label lookup covers every word', () => {
    for (const w of SUPERCORE_50) {
      expect(SUPERCORE_BY_LABEL.get(w.label.toLowerCase())?.id).toBe(w.id);
    }
  });

  test('wordsInCategory returns a fresh array of only that category', () => {
    for (const { category } of CORE_CATEGORY_ORDER) {
      const words = wordsInCategory(category);
      expect(words.length).toBeGreaterThan(0);
      expect(words.every((w) => w.category === category)).toBe(true);
    }
    // Every word belongs to exactly one category bucket.
    const total = CORE_CATEGORY_ORDER.reduce((n, c) => n + wordsInCategory(c.category).length, 0);
    expect(total).toBe(50);
  });
});

describe('scene hotspots (Gamma / SceneField)', () => {
  test('are a handful of large targets (8-12)', () => {
    expect(SCENE_HOTSPOTS.length).toBeGreaterThanOrEqual(8);
    expect(SCENE_HOTSPOTS.length).toBeLessThanOrEqual(12);
  });

  test('every hotspot resolves to a real Supercore word within bounds', () => {
    const resolved = sceneHotspotWords();
    expect(resolved.length).toBe(SCENE_HOTSPOTS.length);
    for (const { word, x, y } of resolved) {
      expect(SUPERCORE_50.some((w) => w.id === word.id)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });
});

describe('shared chip + tap pipeline', () => {
  test('coreWordChip carries the Fitzgerald class + label + pictogram', () => {
    const want = SUPERCORE_50.find((w) => w.label === 'want')!;
    const chip = coreWordChip(want);
    const cls = FITZGERALD_CLASSES[want.category];
    expect(chip.label).toBe('want');
    expect(chip.className).toBe(`${cls.bg} ${cls.text} ${cls.border}`);
    expect(chip.imageUrl).toContain(String(want.arasaacId));
  });

  test('performCoreTap speaks, then adds the chip, then logs - in order', () => {
    const calls: string[] = [];
    const word = SUPERCORE_50[2];
    performCoreTap(word, {
      speak: (t) => calls.push(`speak:${t}`),
      add: (chip) => calls.push(`add:${chip.label}`),
      log: (w) => calls.push(`log:${w}`),
    });
    expect(calls).toEqual([`speak:${word.label}`, `add:${word.label}`, `log:${word.label}`]);
  });
});

describe('writes to the SAME shared sentence store', () => {
  beforeEach(() => sentenceStore.clear());

  test('a surface tap appends a chip to the shared sentence strip', () => {
    const word = SUPERCORE_50.find((w) => w.label === 'help')!;
    let spoken = '';
    performCoreTap(word, {
      speak: (t) => (spoken = t), // speak pipeline exercised, TTS stubbed
      add: (chip) => sentenceStore.addWord(chip),
      log: () => {},
    });
    const words = sentenceStore.getWords();
    expect(spoken).toBe('help');
    expect(words.length).toBe(1);
    expect(words[0].label).toBe('help');
    expect(words[0].className).toContain('fitzgerald');
  });
});

describe('non-destructive contract', () => {
  beforeEach(() => sentenceStore.clear());

  test('tapping never mutates vocabulary or phrase folders', () => {
    const vocabBefore = JSON.stringify(SUPERCORE_50);
    const foldersBefore = JSON.stringify(loadFolders());

    // Tap a handful of words through the shared pipeline.
    for (const label of ['I', 'want', 'more']) {
      const w = SUPERCORE_50.find((x) => x.label === label)!;
      performCoreTap(w, {
        speak: () => {},
        add: (chip) => sentenceStore.addWord(chip),
        log: () => {},
      });
    }

    expect(JSON.stringify(SUPERCORE_50)).toBe(vocabBefore);
    expect(JSON.stringify(loadFolders())).toBe(foldersBefore);
    // The only thing that changed is the shared sentence strip.
    expect(sentenceStore.getWords().length).toBe(3);
  });
});

describe('surface router exports real surfaces', () => {
  test('the four structural kinds map to four distinct components', async () => {
    const { SURFACE_BY_KIND } = await import('./index');
    const { SupercoreGrid } = await import('@/components/SupercoreGrid');
    const kinds = ['sceneField', 'textRail', 'flowBoard', 'orbitCore'] as const;
    const comps = kinds.map((k) => SURFACE_BY_KIND[k]);
    // Each is a defined function component...
    for (const c of comps) expect(typeof c).toBe('function');
    // ...distinct from each other...
    expect(new Set(comps).size).toBe(4);
    // ...and none is the raw grid (they are the real surfaces now).
    for (const c of comps) expect(c).not.toBe(SupercoreGrid);
  });
});
