/**
 * Layout Primitives - the SINGLE registry of selectable Talk Core layouts.
 *
 * Before consolidation the app had two competing lists: a set of DENSITY
 * presets (Core First / Big & Simple / Word Rich / Quick Chat) and a separate
 * set of STRUCTURAL primitives (Steady Grid / Busy Grid / Scene / ...). That
 * meant two Layout choosers in Settings. This file is now the ONE source of
 * truth: every selectable layout is a primitive that carries BOTH a structural
 * `kind` (which surface renders it) AND the full settings `bundle` (grid,
 * card size, helper rows, density). Selecting one is a single theme-like action:
 * write `activeLayoutPrimitive` and spread the bundle via updateSettings.
 *
 * The classic density presets are DERIVED from this registry (see
 * LAYOUT_PRESETS below), so their bundle values are never duplicated. Four of
 * the primitives carry a `classic` descriptor so the flag-OFF Layout picker
 * renders exactly as it did before consolidation.
 *
 * Selecting a primitive is presentation-only: it never touches vocabulary,
 * categories, personal words or phrase folders (those live in their own
 * localStorage keys, independent of AppSettings).
 *
 * Feature-flagged OFF by default (see ./feature-flags). When the flag is off,
 * the active primitive always resolves to 'alpha' (fixedGrid) and the app
 * behaves exactly as it does today.
 *
 * No banned hues (270-350, purple/pink) appear in any primitive colour.
 */

import type {
  LayoutSettingsBundle,
  LayoutPresetId,
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

/** Stable identifier for a primitive. Greek-letter series, alpha = default.
 *  eta/theta are the two extra calm grids carried over from the classic
 *  Big & Simple and Quick Chat presets so no useful tuning is lost. */
export type LayoutPrimitiveId =
  | 'alpha'
  | 'eta'
  | 'beta'
  | 'theta'
  | 'gamma'
  | 'delta'
  | 'epsilon'
  | 'zeta';

/** The child-facing glyph shown on each primitive card. */
export type LayoutPrimitiveGlyph = 'Α' | 'Η' | 'Β' | 'Θ' | 'Γ' | 'Δ' | 'Ε' | 'Ζ';

/** A small grid preview shown on a picker card. */
export interface LayoutHint {
  /** Columns to render in the mini preview. */
  cols: number;
  /** Number of filled cells to render (visual density cue). */
  cells: number;
  /** Accent colour for the preview (NO hues 270-350). */
  color: string;
}

/**
 * The classic-preset descriptor. Present on the four primitives that correspond
 * to a density preset shipped before consolidation. It carries the classic id,
 * name, copy and hint so the flag-OFF Layout picker (LAYOUT_PRESETS, derived
 * below) renders byte-identically to what shipped. Absent on the four
 * structural-only surfaces (scene / rail / flow / orbit).
 */
export interface ClassicPresetMeta {
  id: Exclude<LayoutPresetId, 'custom'>;
  name: string;
  description: string;
  hint: LayoutHint;
}

export interface LayoutPrimitive {
  id: LayoutPrimitiveId;
  /** Greek capital glyph rendered on the picker card. */
  glyph: LayoutPrimitiveGlyph;
  /** Friendly, child-facing name (unified theme name). */
  name: string;
  /** Which structural surface this primitive renders. */
  kind: LayoutKind;
  /** Layout settings applied when this primitive is chosen (spreads straight
   *  into updateSettings). */
  bundle: LayoutSettingsBundle;
  /** One-line description of the shape and who it suits. */
  description: string;
  /** Tiny visual hint for the picker card: a small grid preview. */
  hint: LayoutHint;
  /** Present when this primitive doubles as a classic density preset. */
  classic?: ClassicPresetMeta;
}

/** The default primitive used as a safe fallback for unknown/garbage ids and as
 *  the flag-OFF resolution constant. Reused in several places so it is named
 *  once. */
export const DEFAULT_PRIMITIVE_ID: LayoutPrimitiveId = 'alpha';

/**
 * The canonical layout bundles, defined once here (single source of truth).
 * The classic presets reuse these exact values, so there are no duplicated
 * magic numbers anywhere in the layout system.
 */
const CORE_FIRST_BUNDLE: LayoutSettingsBundle = {
  gridColumns: 4,
  cardSize: 'large',
  showPredictions: false,
  showPersonalVocab: false,
  density: 'relaxed',
};
const BIG_SIMPLE_BUNDLE: LayoutSettingsBundle = {
  gridColumns: 3,
  cardSize: 'large',
  showPredictions: false,
  showPersonalVocab: true,
  density: 'relaxed',
};
const WORD_RICH_BUNDLE: LayoutSettingsBundle = {
  gridColumns: 6,
  cardSize: 'small',
  showPredictions: true,
  showPersonalVocab: true,
  density: 'compact',
};
const QUICK_CHAT_BUNDLE: LayoutSettingsBundle = {
  gridColumns: 4,
  cardSize: 'medium',
  showPredictions: true,
  showPersonalVocab: true,
  density: 'balanced',
};

/**
 * The eight selectable layouts, in display order.
 *
 * The first four are calm/working grids (they also back the classic presets);
 * the last four are the experimental structural surfaces (grid-backed for now).
 *
 *   alpha   Α -> fixedGrid    (Core First bundle - the classic default calm grid)
 *   eta     Η -> fixedGrid    (Big & Simple bundle - the shipped default)
 *   beta    Β -> adaptiveGrid (Word Rich bundle - dense, predictions on)
 *   theta   Θ -> fixedGrid    (Quick Chat bundle - your words + predictions)
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
    bundle: CORE_FIRST_BUNDLE,
    description: 'The classic fixed grid. Words never move - calm and reliable.',
    hint: { cols: 4, cells: 8, color: '#4CAF50' },
    classic: {
      id: 'core-first',
      name: 'Core First',
      description: 'Fewer, bigger core words. Calm and steady - no moving rows.',
      hint: { cols: 4, cells: 8, color: '#4CAF50' },
    },
  },
  {
    id: 'eta',
    glyph: 'Η',
    name: 'Big & Simple',
    kind: 'fixedGrid',
    bundle: BIG_SIMPLE_BUNDLE,
    description: 'Three big columns with the fewest helper rows. Easy to aim at.',
    hint: { cols: 3, cells: 6, color: '#2196F3' },
    classic: {
      id: 'big-simple',
      name: 'Big & Simple',
      description: 'Three big columns with the fewest helper rows. Easy to aim at.',
      hint: { cols: 3, cells: 6, color: '#2196F3' },
    },
  },
  {
    id: 'beta',
    glyph: 'Β',
    name: 'Busy Grid',
    kind: 'adaptiveGrid',
    bundle: WORD_RICH_BUNDLE,
    description: 'More words on screen with next-word helpers for fluent talkers.',
    hint: { cols: 6, cells: 18, color: '#E8610A' },
    classic: {
      id: 'word-rich',
      name: 'Word Rich',
      description: 'Six columns of smaller cards with next-word predictions on.',
      hint: { cols: 6, cells: 18, color: '#E8610A' },
    },
  },
  {
    id: 'theta',
    glyph: 'Θ',
    name: 'Quick Chat',
    kind: 'fixedGrid',
    bundle: QUICK_CHAT_BUNDLE,
    description: 'Your words and predictions up front for fast everyday talking.',
    hint: { cols: 4, cells: 12, color: '#009688' },
    classic: {
      id: 'quick-chat',
      name: 'Quick Chat',
      description: 'Your words and predictions up front for fast everyday talking.',
      hint: { cols: 4, cells: 12, color: '#009688' },
    },
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

/** True when two bundles carry identical layout values. */
export function bundlesMatch(a: LayoutSettingsBundle, b: LayoutSettingsBundle): boolean {
  return (
    a.gridColumns === b.gridColumns &&
    a.cardSize === b.cardSize &&
    a.showPredictions === b.showPredictions &&
    a.showPersonalVocab === b.showPersonalVocab &&
    a.density === b.density
  );
}

/**
 * Resolve the selected unified-picker id for a settings object, or 'custom'
 * when the current layout no longer matches any preset (i.e. the user
 * hand-tuned a knob away from every preset).
 *
 * The stored `activeLayoutPrimitive` is trusted first: if its bundle still
 * matches the current settings, that id wins (this disambiguates presets that
 * happen to share a bundle, e.g. Big & Simple vs Scene). Only if the stored
 * selection no longer matches do we look for any other preset with the same
 * bundle before falling back to 'custom'.
 */
export function activePrimitiveIdForSettings(
  s: LayoutSettingsBundle & { activeLayoutPrimitive?: string | null },
): LayoutPrimitiveId | 'custom' {
  const stored = getPrimitive(s.activeLayoutPrimitive);
  if (bundlesMatch(stored.bundle, s)) return stored.id;
  const match = LAYOUT_PRIMITIVES.find((p) => bundlesMatch(p.bundle, s));
  return match ? match.id : 'custom';
}

// ---------------------------------------------------------------------------
// Derived classic presets (flag-OFF Layout picker)
// ---------------------------------------------------------------------------

/**
 * A classic density preset, in the flat shape the flag-OFF Layout picker
 * renders (bundle fields at the top level, plus a hint). DERIVED from the
 * primitives that carry a `classic` descriptor - never authored twice.
 */
export interface LayoutPreset extends LayoutSettingsBundle {
  id: Exclude<LayoutPresetId, 'custom'>;
  name: string;
  description: string;
  hint: LayoutHint;
}

/**
 * The four classic density presets (Core First / Big & Simple / Word Rich /
 * Quick Chat), derived from the single registry so the flag-OFF picker keeps
 * working exactly as it shipped, with no duplicated data.
 */
export const LAYOUT_PRESETS: LayoutPreset[] = LAYOUT_PRIMITIVES.filter(
  (p): p is LayoutPrimitive & { classic: ClassicPresetMeta } => p.classic !== undefined,
).map((p) => ({
  id: p.classic.id,
  name: p.classic.name,
  description: p.classic.description,
  gridColumns: p.bundle.gridColumns,
  cardSize: p.bundle.cardSize,
  showPredictions: p.bundle.showPredictions,
  showPersonalVocab: p.bundle.showPersonalVocab,
  density: p.bundle.density,
  hint: p.classic.hint,
}));
