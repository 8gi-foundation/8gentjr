/**
 * Layout Presets for the Talk Core surface.
 *
 * A layout preset bundles the handful of settings that change how the Talk
 * Core *looks and feels* - grid density, card size, and which helper rows are
 * shown. Picking a preset writes its whole bundle at once via updateSettings.
 *
 * Presets are inspired by real-world AAC layout philosophies:
 *  - "Core First" mirrors motor-planning-first systems (fixed, calm, few big
 *    targets, no moving prediction row) used for early/emerging communicators.
 *  - "Big & Simple" is a low-density, high-contrast layout for learners who
 *    need large tap targets and minimal visual load.
 *  - "Word Rich" is a high-density vocabulary layout for fluent communicators
 *    who benefit from more words on screen plus predictions.
 *  - "Quick Chat" foregrounds the child's own most-used words and predictions
 *    for fast everyday conversation.
 *  - "Custom" represents any hand-tuned combination the user has set.
 *
 * Each preset is intentionally small and declarative - it is just data. The
 * Settings UI renders them as selectable cards; SupercoreGrid honours the
 * resulting settings. No banned hues (270-350) appear in any hint colour.
 */

/** Card size affects tap-target min-height and label font on the Core grid. */
export type CardSize = 'large' | 'medium' | 'small';

/** Visual density of the overall surface. Currently advisory metadata that
 *  pairs with cardSize/gridColumns; kept explicit so presets read clearly and
 *  future surfaces can branch on it without re-deriving from columns. */
export type LayoutDensity = 'relaxed' | 'balanced' | 'compact';

/** Identifier for the active preset. 'custom' = user-tuned, no preset match. */
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

export interface LayoutPreset extends LayoutSettingsBundle {
  id: LayoutPresetId;
  /** Friendly, child-facing name. */
  name: string;
  /** One-line description of who the layout suits. */
  description: string;
  /** Tiny visual hint for the picker card: a small grid preview. */
  hint: {
    /** Columns to render in the mini grid preview. */
    cols: number;
    /** Number of filled cells to render (visual density cue). */
    cells: number;
    /** Accent colour for the preview (NO hues 270-350). */
    color: string;
  };
}

/**
 * The selectable presets, in display order. 'custom' is intentionally NOT in
 * this list - it is a state the surface falls into when a user hand-tunes a
 * setting, not something you pick directly.
 */
export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'core-first',
    name: 'Core First',
    description: 'Fewer, bigger core words. Calm and steady - no moving rows.',
    gridColumns: 4,
    cardSize: 'large',
    showPredictions: false,
    showPersonalVocab: false,
    density: 'relaxed',
    hint: { cols: 4, cells: 8, color: '#4CAF50' },
  },
  {
    id: 'big-simple',
    name: 'Big & Simple',
    description: 'Three big columns with the fewest helper rows. Easy to aim at.',
    gridColumns: 3,
    cardSize: 'large',
    showPredictions: false,
    showPersonalVocab: true,
    density: 'relaxed',
    hint: { cols: 3, cells: 6, color: '#2196F3' },
  },
  {
    id: 'word-rich',
    name: 'Word Rich',
    description: 'Six columns of smaller cards with next-word predictions on.',
    gridColumns: 6,
    cardSize: 'small',
    showPredictions: true,
    showPersonalVocab: true,
    density: 'compact',
    hint: { cols: 6, cells: 18, color: '#E8610A' },
  },
  {
    id: 'quick-chat',
    name: 'Quick Chat',
    description: 'Your words and predictions up front for fast everyday talking.',
    gridColumns: 4,
    cardSize: 'medium',
    showPredictions: true,
    showPersonalVocab: true,
    density: 'balanced',
    hint: { cols: 4, cells: 12, color: '#009688' },
  },
];

/** Card sizing tokens consumed by the Core grid buttons. minHeight in px,
 *  fontPx for the label, imgPx for the pictogram. Kept here so the preset
 *  system fully owns the look of card size. */
export const CARD_SIZE_TOKENS: Record<CardSize, { minHeight: number; fontPx: number; imgPx: number }> = {
  large:  { minHeight: 104, fontPx: 16, imgPx: 60 },
  medium: { minHeight: 80,  fontPx: 14, imgPx: 52 },
  small:  { minHeight: 64,  fontPx: 12, imgPx: 40 },
};
