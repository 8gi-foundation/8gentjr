/**
 * Layout Primitives - a STRUCTURAL layout dimension for the Talk Core surface.
 *
 * The existing layout-presets system (see ./layout-presets) changes the
 * DENSITY and CARD SIZE of the SAME grid. Presets answer "how tightly packed
 * and how big are the cards?". Primitives answer a different, orthogonal
 * question: "what SHAPE of surface renders the vocabulary at all?" - a fixed
 * grid, an adaptive grid, a scene field, a text rail, a flowing board, or a
 * radial orbit core.
 *
 * This file is ADDITIVE. It imports the existing bundle type and reuses the
 * existing preset bundles where the task calls for it, so nothing about the
 * current grid changes. Selecting a primitive is presentation-only: it never
 * touches vocabulary, categories, personal words or phrase folders (those live
 * in their own localStorage keys, independent of AppSettings).
 *
 * Feature-flagged OFF by default (see ./feature-flags). When the flag is off,
 * the active primitive always resolves to 'alpha' (fixedGrid) and the app
 * behaves exactly as it does today.
 *
 * No banned hues (270-350, purple/pink) appear in any primitive colour.
 */

import {
  LAYOUT_PRESETS,
  type LayoutSettingsBundle,
} from './layout-presets';

/**
 * The structural kind of a Talk Core surface. Each kind is a distinct way of
 * arranging the vocabulary on screen. In THIS framework PR every kind renders
 * the existing SupercoreGrid; the scene/text/flow/orbit surfaces are a later
 * PR. The kind is what a surface-router switches on.
 */
export type LayoutKind =
  | 'fixedGrid'
  | 'adaptiveGrid'
  | 'sceneField'
  | 'textRail'
  | 'flowBoard'
  | 'orbitCore';

/** Stable identifier for a primitive. Greek-letter series, alpha = default. */
export type LayoutPrimitiveId =
  | 'alpha'
  | 'beta'
  | 'gamma'
  | 'delta'
  | 'epsilon'
  | 'zeta';

/** The child-facing glyph shown on each primitive card. */
export type LayoutPrimitiveGlyph = 'Α' | 'Β' | 'Γ' | 'Δ' | 'Ε' | 'Ζ';

export interface LayoutPrimitive {
  id: LayoutPrimitiveId;
  /** Greek capital glyph rendered on the picker card. */
  glyph: LayoutPrimitiveGlyph;
  /** Friendly, child-facing name. */
  name: string;
  /** Which structural surface this primitive renders. */
  kind: LayoutKind;
  /** Layout settings applied when this primitive is chosen (reuses the preset
   *  bundle shape so it spreads straight into updateSettings). */
  bundle: LayoutSettingsBundle;
  /** One-line description of the shape and who it suits. */
  description: string;
  /** Tiny visual hint for the picker card: a small grid preview. */
  hint: {
    /** Columns to render in the mini preview. */
    cols: number;
    /** Number of filled cells to render (visual density cue). */
    cells: number;
    /** Accent colour for the preview (NO hues 270-350). */
    color: string;
  };
}

/** The default primitive. Reused in several places so it is named once. */
export const DEFAULT_PRIMITIVE_ID: LayoutPrimitiveId = 'alpha';

/** Look up an existing preset bundle by id, stripped to the bundle fields.
 *  Keeps alpha/beta genuinely reusing the shipped preset values rather than
 *  copying magic numbers, so the default surface stays identical to today. */
function bundleFromPreset(presetId: string): LayoutSettingsBundle {
  const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    // Should never happen - the preset ids are compile-time constants. Fall
    // back to the calmest possible bundle rather than throwing in the UI path.
    return {
      gridColumns: 4,
      cardSize: 'large',
      showPredictions: false,
      showPersonalVocab: false,
      density: 'relaxed',
    };
  }
  return {
    gridColumns: preset.gridColumns,
    cardSize: preset.cardSize,
    showPredictions: preset.showPredictions,
    showPersonalVocab: preset.showPersonalVocab,
    density: preset.density,
  };
}

/**
 * The six structural primitives, in display order.
 *
 * Mapping (per spec):
 *   alpha   Α -> fixedGrid    (reuses core-first bundle - THE DEFAULT)
 *   beta    Β -> adaptiveGrid (reuses word-rich bundle - more columns)
 *   gamma   Γ -> sceneField   (few big cards, calm scene)
 *   delta   Δ -> textRail     (text-forward, predictions on)
 *   epsilon Ε -> flowBoard    (medium cards, flowing board)
 *   zeta    Ζ -> orbitCore    (core-forward radial arrangement)
 */
export const LAYOUT_PRIMITIVES: LayoutPrimitive[] = [
  {
    id: 'alpha',
    glyph: 'Α',
    name: 'Steady Grid',
    kind: 'fixedGrid',
    bundle: bundleFromPreset('core-first'),
    description: 'The classic fixed grid. Words never move - calm and reliable.',
    hint: { cols: 4, cells: 8, color: '#4CAF50' },
  },
  {
    id: 'beta',
    glyph: 'Β',
    name: 'Busy Grid',
    kind: 'adaptiveGrid',
    bundle: bundleFromPreset('word-rich'),
    description: 'More words on screen with next-word helpers for fluent talkers.',
    hint: { cols: 6, cells: 18, color: '#E8610A' },
  },
  {
    id: 'gamma',
    glyph: 'Γ',
    name: 'Scene',
    kind: 'sceneField',
    bundle: {
      gridColumns: 3,
      cardSize: 'large',
      showPredictions: false,
      showPersonalVocab: true,
      density: 'relaxed',
    },
    description: 'Big picture cards arranged like a scene. Coming soon.',
    hint: { cols: 3, cells: 6, color: '#2196F3' },
  },
  {
    id: 'delta',
    glyph: 'Δ',
    name: 'Word Rail',
    kind: 'textRail',
    bundle: {
      gridColumns: 4,
      cardSize: 'medium',
      showPredictions: true,
      showPersonalVocab: true,
      density: 'balanced',
    },
    description: 'A text-forward rail with predictions up front. Coming soon.',
    hint: { cols: 4, cells: 12, color: '#009688' },
  },
  {
    id: 'epsilon',
    glyph: 'Ε',
    name: 'Flow Board',
    kind: 'flowBoard',
    bundle: {
      gridColumns: 5,
      cardSize: 'medium',
      showPredictions: true,
      showPersonalVocab: true,
      density: 'balanced',
    },
    description: 'Cards flow to fit the screen at any size. Coming soon.',
    hint: { cols: 5, cells: 15, color: '#F4A100' },
  },
  {
    id: 'zeta',
    glyph: 'Ζ',
    name: 'Orbit Core',
    kind: 'orbitCore',
    bundle: {
      gridColumns: 4,
      cardSize: 'large',
      showPredictions: false,
      showPersonalVocab: true,
      density: 'relaxed',
    },
    description: 'Core words held close in a radial arrangement. Coming soon.',
    hint: { cols: 4, cells: 8, color: '#F44336' },
  },
];

/** Fast id -> primitive lookup, built once. */
const PRIMITIVE_BY_ID: Record<LayoutPrimitiveId, LayoutPrimitive> =
  LAYOUT_PRIMITIVES.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as Record<LayoutPrimitiveId, LayoutPrimitive>);

/** Get a primitive by id, always falling back to the default. Never throws. */
export function getPrimitive(id: string | null | undefined): LayoutPrimitive {
  if (id && id in PRIMITIVE_BY_ID) {
    return PRIMITIVE_BY_ID[id as LayoutPrimitiveId];
  }
  return PRIMITIVE_BY_ID[DEFAULT_PRIMITIVE_ID];
}

/**
 * Resolve which primitive id is actually active given the feature flag.
 *
 * This is the single choke-point that guarantees flag-off === today: when the
 * flag is off, the active primitive is ALWAYS 'alpha' (fixedGrid), no matter
 * what is stored in settings. Callers must route surface selection through
 * this function.
 */
export function resolveActivePrimitiveId(
  flagEnabled: boolean,
  storedId: string | null | undefined,
): LayoutPrimitiveId {
  if (!flagEnabled) return DEFAULT_PRIMITIVE_ID;
  return getPrimitive(storedId).id;
}

/**
 * Purely apply a primitive's layout bundle onto an existing settings-like
 * object, returning a NEW object. Only the five bundle fields plus
 * activeLayoutPrimitive change; every other field (childName, voice, consent,
 * etc.) is preserved untouched. Used by the Settings picker and covered by the
 * switch-and-back test that proves data is never lost.
 */
export function applyPrimitive<T extends LayoutSettingsBundle & Record<string, unknown>>(
  base: T,
  id: LayoutPrimitiveId,
): T & { activeLayoutPrimitive: LayoutPrimitiveId } {
  const primitive = getPrimitive(id);
  return {
    ...base,
    ...primitive.bundle,
    activeLayoutPrimitive: primitive.id,
  };
}
