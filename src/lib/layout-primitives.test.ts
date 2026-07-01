// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the Layout Primitives framework. Runs via `bun test`.
 *
 * Proves the hard constraints from the framework PR:
 *   - the six primitives exist, are unique, and map to the right kinds
 *   - alpha is the default and reuses the shipped core-first bundle
 *   - NO primitive colour lands in the banned purple/pink hue band (270-350)
 *   - flag OFF === current behaviour: the active primitive always resolves to
 *     'alpha' (fixedGrid) regardless of what is stored
 *   - switching primitive and back is non-destructive: it only changes the
 *     layout bundle + selection, never vocabulary / categories / personal
 *     words / phrase folders / any other setting
 */
import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_PRIMITIVE_ID,
  LAYOUT_PRIMITIVES,
  applyPrimitive,
  getPrimitive,
  resolveActivePrimitiveId,
  type LayoutKind,
} from './layout-primitives';
import { LAYOUT_PRESETS } from './layout-presets';

/** Convert a #RRGGBB hex to an HSL hue in [0,360). */
function hexToHue(hex: string): number {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

describe('LAYOUT_PRIMITIVES shape', () => {
  test('has exactly six primitives', () => {
    expect(LAYOUT_PRIMITIVES).toHaveLength(6);
  });

  test('ids are the expected Greek series and are unique', () => {
    const ids = LAYOUT_PRIMITIVES.map((p) => p.id);
    expect(ids).toEqual(['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']);
    expect(new Set(ids).size).toBe(6);
  });

  test('glyphs are unique Greek capitals', () => {
    const glyphs = LAYOUT_PRIMITIVES.map((p) => p.glyph);
    expect(glyphs).toEqual(['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ']);
    expect(new Set(glyphs).size).toBe(6);
  });

  test('kinds cover the six structural surfaces', () => {
    const byId = Object.fromEntries(LAYOUT_PRIMITIVES.map((p) => [p.id, p.kind]));
    const expected: Record<string, LayoutKind> = {
      alpha: 'fixedGrid',
      beta: 'adaptiveGrid',
      gamma: 'sceneField',
      delta: 'textRail',
      epsilon: 'flowBoard',
      zeta: 'orbitCore',
    };
    expect(byId).toEqual(expected);
  });

  test('every primitive carries a complete bundle and hint', () => {
    for (const p of LAYOUT_PRIMITIVES) {
      expect(typeof p.bundle.gridColumns).toBe('number');
      expect(['large', 'medium', 'small']).toContain(p.bundle.cardSize);
      expect(typeof p.bundle.showPredictions).toBe('boolean');
      expect(typeof p.bundle.showPersonalVocab).toBe('boolean');
      expect(['relaxed', 'balanced', 'compact']).toContain(p.bundle.density);
      expect(p.hint.cols).toBeGreaterThan(0);
      expect(p.hint.cells).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });
});

describe('brand safety: no banned purple/pink hues (270-350)', () => {
  test('no primitive hint colour falls in the banned band', () => {
    for (const p of LAYOUT_PRIMITIVES) {
      const hue = hexToHue(p.hint.color);
      expect(hue >= 270 && hue <= 350).toBe(false);
    }
  });
});

describe('alpha is the default and reuses core-first', () => {
  test('DEFAULT_PRIMITIVE_ID is alpha', () => {
    expect(DEFAULT_PRIMITIVE_ID).toBe('alpha');
  });

  test('alpha maps to fixedGrid', () => {
    expect(getPrimitive('alpha').kind).toBe('fixedGrid');
  });

  test("alpha's bundle equals the shipped core-first preset bundle", () => {
    const coreFirst = LAYOUT_PRESETS.find((p) => p.id === 'core-first')!;
    const alpha = getPrimitive('alpha');
    expect(alpha.bundle).toEqual({
      gridColumns: coreFirst.gridColumns,
      cardSize: coreFirst.cardSize,
      showPredictions: coreFirst.showPredictions,
      showPersonalVocab: coreFirst.showPersonalVocab,
      density: coreFirst.density,
    });
  });

  test("beta's bundle equals the shipped word-rich preset bundle", () => {
    const wordRich = LAYOUT_PRESETS.find((p) => p.id === 'word-rich')!;
    const beta = getPrimitive('beta');
    expect(beta.bundle).toEqual({
      gridColumns: wordRich.gridColumns,
      cardSize: wordRich.cardSize,
      showPredictions: wordRich.showPredictions,
      showPersonalVocab: wordRich.showPersonalVocab,
      density: wordRich.density,
    });
  });
});

describe('getPrimitive fallbacks', () => {
  test('unknown / null / undefined all fall back to the default', () => {
    expect(getPrimitive('nope').id).toBe('alpha');
    expect(getPrimitive(null).id).toBe('alpha');
    expect(getPrimitive(undefined).id).toBe('alpha');
  });
});

describe('flag OFF === current behaviour', () => {
  test('flag off always resolves to alpha regardless of stored id', () => {
    expect(resolveActivePrimitiveId(false, 'zeta')).toBe('alpha');
    expect(resolveActivePrimitiveId(false, 'beta')).toBe('alpha');
    expect(resolveActivePrimitiveId(false, null)).toBe('alpha');
  });

  test('flag on honours a valid stored id and falls back for garbage', () => {
    expect(resolveActivePrimitiveId(true, 'zeta')).toBe('zeta');
    expect(resolveActivePrimitiveId(true, 'garbage')).toBe('alpha');
    expect(resolveActivePrimitiveId(true, null)).toBe('alpha');
  });
});

describe('non-destructive switch-and-back', () => {
  // A settings-like object carrying BOTH layout fields and unrelated data that
  // must survive any primitive switch untouched.
  const baseSettings = {
    // layout bundle fields (alpha / core-first values)
    gridColumns: 4,
    cardSize: 'large' as const,
    showPredictions: false,
    showPersonalVocab: false,
    density: 'relaxed' as const,
    activeLayoutPrimitive: 'alpha' as const,
    // unrelated data that must never change
    childName: 'Robin',
    selectedVoiceId: 'voice-123',
    glpStage: 2,
    guardianConfirmed: true,
    parentEmailConfirmed: true,
  };

  test('switching to beta only changes bundle + selection', () => {
    const afterBeta = applyPrimitive(baseSettings, 'beta');
    const beta = getPrimitive('beta');
    // Bundle applied + selection recorded.
    expect(afterBeta.activeLayoutPrimitive).toBe('beta');
    expect(afterBeta.gridColumns).toBe(beta.bundle.gridColumns);
    expect(afterBeta.cardSize).toBe(beta.bundle.cardSize);
    expect(afterBeta.showPredictions).toBe(beta.bundle.showPredictions);
    // Unrelated data untouched.
    expect(afterBeta.childName).toBe('Robin');
    expect(afterBeta.selectedVoiceId).toBe('voice-123');
    expect(afterBeta.glpStage).toBe(2);
    expect(afterBeta.guardianConfirmed).toBe(true);
    expect(afterBeta.parentEmailConfirmed).toBe(true);
  });

  test('switching to a primitive and back to alpha restores the bundle exactly', () => {
    const afterBeta = applyPrimitive(baseSettings, 'beta');
    const backToAlpha = applyPrimitive(afterBeta, 'alpha');
    // Layout bundle is byte-for-byte the original alpha bundle again.
    expect(backToAlpha.gridColumns).toBe(baseSettings.gridColumns);
    expect(backToAlpha.cardSize).toBe(baseSettings.cardSize);
    expect(backToAlpha.showPredictions).toBe(baseSettings.showPredictions);
    expect(backToAlpha.showPersonalVocab).toBe(baseSettings.showPersonalVocab);
    expect(backToAlpha.density).toBe(baseSettings.density);
    expect(backToAlpha.activeLayoutPrimitive).toBe('alpha');
    // And all unrelated data is still exactly as it started.
    expect(backToAlpha.childName).toBe(baseSettings.childName);
    expect(backToAlpha.selectedVoiceId).toBe(baseSettings.selectedVoiceId);
    expect(backToAlpha.glpStage).toBe(baseSettings.glpStage);
    expect(backToAlpha.guardianConfirmed).toBe(baseSettings.guardianConfirmed);
    expect(backToAlpha.parentEmailConfirmed).toBe(baseSettings.parentEmailConfirmed);
  });

  test('applyPrimitive does not mutate its input', () => {
    const snapshot = JSON.stringify(baseSettings);
    applyPrimitive(baseSettings, 'zeta');
    expect(JSON.stringify(baseSettings)).toBe(snapshot);
  });
});
