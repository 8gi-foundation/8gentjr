// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the consolidated Layout registry. Runs via `bun test`.
 *
 * After consolidation there is ONE source of truth (LAYOUT_PRIMITIVES). The
 * classic density presets (LAYOUT_PRESETS) are DERIVED from it. These tests
 * prove:
 *   - the eight primitives exist, are unique, and map to the right kinds
 *   - every primitive carries BOTH a structural kind AND a full settings bundle
 *   - the four classic presets are derived and reuse the primitive bundles
 *     (no duplicated data)
 *   - NO primitive colour lands in the banned purple/pink hue band (270-350)
 *   - flag OFF === current behaviour: the active primitive always resolves to
 *     'alpha' (fixedGrid) regardless of what is stored
 *   - selecting a preset writes kind + bundle; switching and back is
 *     non-destructive (never touches vocabulary / categories / personal words /
 *     phrase folders / any other setting)
 *   - Custom state is detected when the layout no longer matches any preset
 */
import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_PRIMITIVE_ID,
  LAYOUT_PRIMITIVES,
  LAYOUT_PRESETS,
  applyPrimitive,
  bundlesMatch,
  getPrimitive,
  resolveActivePrimitiveId,
  activePrimitiveIdForSettings,
  type LayoutKind,
} from './layout-primitives';

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

describe('LAYOUT_PRIMITIVES shape (single unified registry)', () => {
  test('has exactly eight primitives', () => {
    expect(LAYOUT_PRIMITIVES).toHaveLength(8);
  });

  test('ids are the expected series and are unique', () => {
    const ids = LAYOUT_PRIMITIVES.map((p) => p.id);
    expect(ids).toEqual(['alpha', 'eta', 'beta', 'theta', 'gamma', 'delta', 'epsilon', 'zeta']);
    expect(new Set(ids).size).toBe(8);
  });

  test('glyphs are unique Greek capitals', () => {
    const glyphs = LAYOUT_PRIMITIVES.map((p) => p.glyph);
    expect(glyphs).toEqual(['Α', 'Η', 'Β', 'Θ', 'Γ', 'Δ', 'Ε', 'Ζ']);
    expect(new Set(glyphs).size).toBe(8);
  });

  test('kinds cover the structural surfaces', () => {
    const byId = Object.fromEntries(LAYOUT_PRIMITIVES.map((p) => [p.id, p.kind]));
    const expected: Record<string, LayoutKind> = {
      alpha: 'fixedGrid',
      eta: 'fixedGrid',
      beta: 'adaptiveGrid',
      theta: 'fixedGrid',
      gamma: 'sceneField',
      delta: 'textRail',
      epsilon: 'flowBoard',
      zeta: 'orbitCore',
    };
    expect(byId).toEqual(expected);
  });

  test('every primitive carries a complete bundle, a kind and a hint', () => {
    for (const p of LAYOUT_PRIMITIVES) {
      expect(typeof p.kind).toBe('string');
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

describe('classic presets are derived from the single registry', () => {
  test('LAYOUT_PRESETS derives the four classic density presets in order', () => {
    expect(LAYOUT_PRESETS.map((p) => p.id)).toEqual([
      'core-first',
      'big-simple',
      'word-rich',
      'quick-chat',
    ]);
  });

  test('each classic preset reuses its backing primitive bundle (no duplicated data)', () => {
    for (const preset of LAYOUT_PRESETS) {
      const backing = LAYOUT_PRIMITIVES.find((p) => p.classic?.id === preset.id)!;
      expect(bundlesMatch(preset, backing.bundle)).toBe(true);
      // flat bundle fields on the derived preset equal the primitive bundle
      expect(preset.gridColumns).toBe(backing.bundle.gridColumns);
      expect(preset.cardSize).toBe(backing.bundle.cardSize);
      expect(preset.showPredictions).toBe(backing.bundle.showPredictions);
      expect(preset.showPersonalVocab).toBe(backing.bundle.showPersonalVocab);
      expect(preset.density).toBe(backing.bundle.density);
    }
  });

  test('classic preset copy matches the shipped-today values (flag-off parity)', () => {
    const byId = Object.fromEntries(LAYOUT_PRESETS.map((p) => [p.id, p]));
    expect(byId['core-first'].name).toBe('Core First');
    expect(byId['big-simple'].name).toBe('Big & Simple');
    expect(byId['word-rich'].name).toBe('Word Rich');
    expect(byId['quick-chat'].name).toBe('Quick Chat');
    // Bundle values preserved exactly.
    expect(byId['core-first']).toMatchObject({ gridColumns: 4, cardSize: 'large', showPredictions: false, showPersonalVocab: false, density: 'relaxed' });
    expect(byId['big-simple']).toMatchObject({ gridColumns: 3, cardSize: 'large', showPredictions: false, showPersonalVocab: true, density: 'relaxed' });
    expect(byId['word-rich']).toMatchObject({ gridColumns: 6, cardSize: 'small', showPredictions: true, showPersonalVocab: true, density: 'compact' });
    expect(byId['quick-chat']).toMatchObject({ gridColumns: 4, cardSize: 'medium', showPredictions: true, showPersonalVocab: true, density: 'balanced' });
  });
});

describe('alpha is the safe default / fallback', () => {
  test('DEFAULT_PRIMITIVE_ID is alpha', () => {
    expect(DEFAULT_PRIMITIVE_ID).toBe('alpha');
  });

  test('alpha maps to fixedGrid', () => {
    expect(getPrimitive('alpha').kind).toBe('fixedGrid');
  });

  test("alpha's bundle equals the classic core-first bundle", () => {
    const coreFirst = LAYOUT_PRESETS.find((p) => p.id === 'core-first')!;
    expect(bundlesMatch(getPrimitive('alpha').bundle, coreFirst)).toBe(true);
  });

  test("beta's bundle equals the classic word-rich bundle", () => {
    const wordRich = LAYOUT_PRESETS.find((p) => p.id === 'word-rich')!;
    expect(bundlesMatch(getPrimitive('beta').bundle, wordRich)).toBe(true);
  });

  test("eta reuses big-simple and theta reuses quick-chat", () => {
    const bigSimple = LAYOUT_PRESETS.find((p) => p.id === 'big-simple')!;
    const quickChat = LAYOUT_PRESETS.find((p) => p.id === 'quick-chat')!;
    expect(bundlesMatch(getPrimitive('eta').bundle, bigSimple)).toBe(true);
    expect(bundlesMatch(getPrimitive('theta').bundle, quickChat)).toBe(true);
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
    expect(resolveActivePrimitiveId(false, 'eta')).toBe('alpha');
    expect(resolveActivePrimitiveId(false, null)).toBe('alpha');
  });

  test('flag on honours a valid stored id and falls back for garbage', () => {
    expect(resolveActivePrimitiveId(true, 'zeta')).toBe('zeta');
    expect(resolveActivePrimitiveId(true, 'theta')).toBe('theta');
    expect(resolveActivePrimitiveId(true, 'garbage')).toBe('alpha');
    expect(resolveActivePrimitiveId(true, null)).toBe('alpha');
  });
});

describe('selecting a preset applies kind + bundle in one action', () => {
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

  test('applyPrimitive spreads the whole bundle and records the selection', () => {
    for (const p of LAYOUT_PRIMITIVES) {
      const after = applyPrimitive(baseSettings, p.id);
      expect(after.activeLayoutPrimitive).toBe(p.id);
      expect(after.gridColumns).toBe(p.bundle.gridColumns);
      expect(after.cardSize).toBe(p.bundle.cardSize);
      expect(after.showPredictions).toBe(p.bundle.showPredictions);
      expect(after.showPersonalVocab).toBe(p.bundle.showPersonalVocab);
      expect(after.density).toBe(p.bundle.density);
    }
  });

  test('switching to beta only changes bundle + selection', () => {
    const afterBeta = applyPrimitive(baseSettings, 'beta');
    const beta = getPrimitive('beta');
    expect(afterBeta.activeLayoutPrimitive).toBe('beta');
    expect(afterBeta.gridColumns).toBe(beta.bundle.gridColumns);
    expect(afterBeta.cardSize).toBe(beta.bundle.cardSize);
    // Unrelated data untouched (vocabulary/categories/personal words/phrase
    // folders live in separate storage; these stand-ins prove nothing else moves).
    expect(afterBeta.childName).toBe('Robin');
    expect(afterBeta.selectedVoiceId).toBe('voice-123');
    expect(afterBeta.glpStage).toBe(2);
    expect(afterBeta.guardianConfirmed).toBe(true);
    expect(afterBeta.parentEmailConfirmed).toBe(true);
  });

  test('switching to a preset and back to alpha restores the bundle exactly', () => {
    const afterZeta = applyPrimitive(baseSettings, 'zeta');
    const backToAlpha = applyPrimitive(afterZeta, 'alpha');
    expect(backToAlpha.gridColumns).toBe(baseSettings.gridColumns);
    expect(backToAlpha.cardSize).toBe(baseSettings.cardSize);
    expect(backToAlpha.showPredictions).toBe(baseSettings.showPredictions);
    expect(backToAlpha.showPersonalVocab).toBe(baseSettings.showPersonalVocab);
    expect(backToAlpha.density).toBe(baseSettings.density);
    expect(backToAlpha.activeLayoutPrimitive).toBe('alpha');
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

describe('Custom state detection', () => {
  test('a settings bundle that matches a preset resolves to that preset id', () => {
    const eta = getPrimitive('eta');
    const settings = { ...eta.bundle, activeLayoutPrimitive: 'eta' as const };
    expect(activePrimitiveIdForSettings(settings)).toBe('eta');
  });

  test('the stored selection wins when two presets share a bundle', () => {
    // eta (Big & Simple) and gamma (Scene) share an identical bundle; the
    // explicit stored selection disambiguates.
    const gamma = getPrimitive('gamma');
    expect(bundlesMatch(gamma.bundle, getPrimitive('eta').bundle)).toBe(true);
    const settings = { ...gamma.bundle, activeLayoutPrimitive: 'gamma' as const };
    expect(activePrimitiveIdForSettings(settings)).toBe('gamma');
  });

  test('hand-tuning a knob away from every preset yields custom', () => {
    const eta = getPrimitive('eta');
    // Bump grid columns to a value no preset uses.
    const settings = { ...eta.bundle, gridColumns: 9, activeLayoutPrimitive: 'eta' as const };
    expect(activePrimitiveIdForSettings(settings)).toBe('custom');
  });

  test('the shipped default (Big & Simple bundle, eta) is not custom', () => {
    // Mirrors DEFAULT_SETTINGS: big-simple bundle + activeLayoutPrimitive 'eta'.
    const settings = {
      gridColumns: 3,
      cardSize: 'large' as const,
      showPredictions: false,
      showPersonalVocab: true,
      density: 'relaxed' as const,
      activeLayoutPrimitive: 'eta' as const,
    };
    expect(activePrimitiveIdForSettings(settings)).toBe('eta');
  });
});
