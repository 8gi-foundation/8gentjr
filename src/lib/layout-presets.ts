/**
 * Shared layout tokens and types for the Talk Core surface.
 *
 * This module holds the small, shared vocabulary the layout system is built
 * from - card sizes, density, the settings bundle shape, and the card-size
 * tokens the Core grid renders with. It intentionally does NOT hold a registry
 * of layouts any more.
 *
 * There is now a SINGLE registry of selectable layouts, and it lives in
 * ./layout-primitives (see LAYOUT_PRIMITIVES). The classic density presets
 * (Core First / Big & Simple / Word Rich / Quick Chat) are DERIVED from that
 * one registry as LAYOUT_PRESETS, so there is one source of truth for the
 * layout bundles and no duplicated magic numbers.
 *
 * No banned hues (270-350) appear in any token here.
 */

/** Card size affects tap-target min-height and label font on the Core grid. */
export type CardSize = 'large' | 'medium' | 'small';

/** Visual density of the overall surface. Currently advisory metadata that
 *  pairs with cardSize/gridColumns; kept explicit so presets read clearly and
 *  future surfaces can branch on it without re-deriving from columns. */
export type LayoutDensity = 'relaxed' | 'balanced' | 'compact';

/** Identifier for the active classic preset. 'custom' = user-tuned, no match.
 *  Retained as the selection field the flag-OFF Layout picker writes, so the
 *  shipped-today behaviour is preserved byte-for-byte. */
export type LayoutPresetId =
  | 'core-first'
  | 'big-simple'
  | 'word-rich'
  | 'quick-chat'
  | 'custom';

/** The bundle of layout settings a preset applies. Mirrors the layout-related
 *  fields on AppSettings so a preset can be spread straight into updateSettings. */
export interface LayoutSettingsBundle {
  gridColumns: number;
  cardSize: CardSize;
  showPredictions: boolean;
  showPersonalVocab: boolean;
  density: LayoutDensity;
}

/** Card sizing tokens consumed by the Core grid buttons. minHeight in px,
 *  fontPx for the label, imgPx for the pictogram. Kept here so the layout
 *  system fully owns the look of card size. */
export const CARD_SIZE_TOKENS: Record<CardSize, { minHeight: number; fontPx: number; imgPx: number }> = {
  large:  { minHeight: 104, fontPx: 16, imgPx: 60 },
  medium: { minHeight: 80,  fontPx: 14, imgPx: 52 },
  small:  { minHeight: 64,  fontPx: 12, imgPx: 40 },
};
