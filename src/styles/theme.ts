/**
 * 8gent Jr — Shared Design Tokens
 *
 * Child-first visual design: warm colors, rounded shapes, large touch targets.
 * All components should reference these tokens instead of hardcoding values.
 *
 * @see https://github.com/8gi-foundation/8gentjr/issues/11
 */

export const colors = {
  /** Warm cream background — never pure white */
  background: '#FFF8F0',
  /** Slightly warmer surface for cards, panels */
  surface: '#FFF1E6',
  /** Primary brand orange */
  primary: '#E8610A',
  /** Lighter primary for hover/active states */
  primaryLight: 'rgba(232, 97, 10, 0.12)',
  /** Dark text on light backgrounds */
  text: '#1a1a2e',
  /** Secondary/muted text */
  textMuted: '#6B7280',
  /** Subtle text (timestamps, hints) */
  textSubtle: '#9CA3AF',
  /** Card border */
  border: '#F0DECA',
  /** Divider lines */
  divider: '#F0DECA',
  /** Success green */
  success: '#059669',
  /** Error/danger red */
  danger: '#DC2626',

  /** AAC card category tints — warm, child-friendly */
  cardGreen: '#E8F5E9',
  cardBlue: '#E3F2FD',
  cardOrange: '#FFF3E0',
  cardPink: '#FCE4EC',
  cardRed: '#FFEBEE',
  cardPurple: '#F3E5F5',
} as const;

export const borderRadius = {
  /** Default rounded corners — friendly, not clinical */
  default: 16,
  /** Slightly smaller for inline elements */
  small: 12,
  /** Pill shape for chips/badges */
  pill: 9999,
  /** Circle for icon buttons */
  circle: '50%',
} as const;

export const shadows = {
  /** Soft card shadow — warm, not sharp */
  card: '0 2px 12px rgba(232, 97, 10, 0.08)',
  /** Elevated panel (modals, popovers) */
  panel: '0 8px 32px rgba(232, 97, 10, 0.12)',
  /** Subtle inner glow for active states */
  glow: '0 0 0 3px rgba(232, 97, 10, 0.2)',
} as const;

export const fonts = {
  /** System font stack — fast, accessible, familiar */
  family: 'Inter, system-ui, -apple-system, sans-serif',
  /** Body text — larger than typical for arm's-length readability */
  sizeBody: 16,
  /** Headings */
  sizeHeading: 20,
  /** Small labels (dock labels, badges) */
  sizeSmall: 13,
  /** Card labels — meets AAC readability guidelines */
  sizeCard: 16,
  /** Weight: normal */
  weightNormal: 400,
  /** Weight: medium */
  weightMedium: 500,
  /** Weight: semibold */
  weightSemibold: 600,
  /** Weight: bold */
  weightBold: 700,
  /** Weight: extra-bold (page titles) */
  weightExtrabold: 800,
} as const;

export const spacing = {
  /** Base unit — 8px grid system */
  unit: 8,
  /** Shorthand helpers */
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const touchTarget = {
  /** Minimum interactive element size (WCAG 2.5.5 / 2.5.8) */
  min: 48,
  /** Comfortable size for primary actions */
  comfortable: 56,
  /** Minimum gap between interactive elements */
  gap: 8,
} as const;

export const animation = {
  /** Default transition duration */
  duration: '200ms',
  /** Smooth deceleration curve */
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Quick press feedback */
  pressDuration: '100ms',
} as const;

/** Convenience: CSS transition shorthand using default duration + easing */
export function transition(...properties: string[]): string {
  return properties
    .map((prop) => `${prop} ${animation.duration} ${animation.easing}`)
    .join(', ');
}

const theme = {
  colors,
  borderRadius,
  shadows,
  fonts,
  spacing,
  touchTarget,
  animation,
  transition,
} as const;

export default theme;
