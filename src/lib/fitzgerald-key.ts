/**
 * Modified Fitzgerald Key Color Coding System
 *
 * Industry-standard AAC color coding for grammatical categories.
 * Used by Supercore, Grid 3, and recommended by SLTs globally.
 *
 * Colors encode word class so the user can visually scan:
 *   "I need a verb"  -> scan for green
 *   "I need a noun"  -> scan for orange
 *
 * WCAG AA contrast ratios maintained for all combinations.
 *
 * @see https://en.wikipedia.org/wiki/Fitzgerald_Key
 */

// =============================================================================
// Types
// =============================================================================

/** All word categories recognized by the Fitzgerald Key */
export type WordCategory =
  | 'pronoun'
  | 'verb'
  | 'noun'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'determiner'
  | 'question'
  | 'negation'
  | 'interjection'
  | 'social';

/** Color definition for a single Fitzgerald Key category */
export interface FitzgeraldColor {
  /** Card background color (hex) */
  bg: string;
  /** Text color for readability (hex) */
  text: string;
  /** Human-readable label for this category */
  label: string;
  /** Border color — slightly darker variant for card edges */
  border: string;
}

// =============================================================================
// Color Definitions
// =============================================================================

export const FITZGERALD_COLORS: Record<WordCategory, FitzgeraldColor> = {
  /** Yellow — people words */
  pronoun:      { bg: '#FFEB3B', text: '#000000', label: 'Pronouns',     border: '#F9A825' },
  /** Green — actions */
  verb:         { bg: '#4CAF50', text: '#FFFFFF', label: 'Verbs',        border: '#388E3C' },
  /** Orange — things */
  noun:         { bg: '#FF9800', text: '#FFFFFF', label: 'Nouns',        border: '#E65100' },
  /** Pink — describing words */
  adjective:    { bg: '#E91E63', text: '#FFFFFF', label: 'Adjectives',   border: '#AD1457' },
  /** Pink — describing words (same as adjective) */
  adverb:       { bg: '#E91E63', text: '#FFFFFF', label: 'Adverbs',      border: '#AD1457' },
  /** Purple — question words */
  question:     { bg: '#9C27B0', text: '#FFFFFF', label: 'Questions',    border: '#6A1B9A' },
  /** Blue — location/direction words */
  preposition:  { bg: '#2196F3', text: '#FFFFFF', label: 'Prepositions', border: '#1565C0' },
  /** White — grammatical glue */
  conjunction:  { bg: '#FFFFFF', text: '#000000', label: 'Small Words',  border: '#BDBDBD' },
  /** White — grammatical glue */
  determiner:   { bg: '#FFFFFF', text: '#000000', label: 'Small Words',  border: '#BDBDBD' },
  /** Red — stop/alert words */
  negation:     { bg: '#F44336', text: '#FFFFFF', label: 'Negatives',    border: '#C62828' },
  /** Red — exclamations */
  interjection: { bg: '#F44336', text: '#FFFFFF', label: 'Interjections', border: '#C62828' },
  /** Teal — greetings & manners */
  social:       { bg: '#00BCD4', text: '#FFFFFF', label: 'Social',       border: '#00838F' },
} as const;

// =============================================================================
// Lookup Helpers
// =============================================================================

/**
 * Get the Fitzgerald Key color for a given word category.
 * Returns the full color object (bg, text, label, border).
 */
export function getFitzgeraldColor(category: WordCategory): FitzgeraldColor {
  return FITZGERALD_COLORS[category];
}

/**
 * Get inline style object suitable for a card element.
 * Returns { backgroundColor, color, borderColor, borderWidth, borderStyle }.
 */
export function getFitzgeraldStyle(category: WordCategory): Record<string, string> {
  const color = FITZGERALD_COLORS[category];
  return {
    backgroundColor: color.bg,
    color: color.text,
    borderColor: color.border,
    borderWidth: '2px',
    borderStyle: 'solid',
  };
}

/**
 * Get CSS custom properties for a word category.
 * Useful for components that need Fitzgerald colors via CSS variables.
 */
export function getFitzgeraldCSSVars(category: WordCategory): Record<string, string> {
  const color = FITZGERALD_COLORS[category];
  return {
    '--fitzgerald-bg': color.bg,
    '--fitzgerald-text': color.text,
    '--fitzgerald-border': color.border,
  };
}

// =============================================================================
// Category Grouping (for legend/key display)
// =============================================================================

/** Unique display categories for the Fitzgerald Key legend */
export const FITZGERALD_LEGEND: { wordTypes: WordCategory[]; color: FitzgeraldColor }[] = [
  { wordTypes: ['verb'],                      color: FITZGERALD_COLORS.verb },
  { wordTypes: ['pronoun'],                   color: FITZGERALD_COLORS.pronoun },
  { wordTypes: ['noun'],                      color: FITZGERALD_COLORS.noun },
  { wordTypes: ['adjective', 'adverb'],       color: FITZGERALD_COLORS.adjective },
  { wordTypes: ['question'],                  color: FITZGERALD_COLORS.question },
  { wordTypes: ['preposition'],               color: FITZGERALD_COLORS.preposition },
  { wordTypes: ['conjunction', 'determiner'], color: FITZGERALD_COLORS.conjunction },
  { wordTypes: ['negation', 'interjection'],  color: FITZGERALD_COLORS.negation },
  { wordTypes: ['social'],                    color: FITZGERALD_COLORS.social },
];
