/**
 * Warm Kernel: the shared design tokens for the 8gent family of sites.
 *
 * One source of truth. `tokens.css` is generated from this file by
 * `bun run wk:css` and a test fails if the two drift. Every colour here is
 * checked in tests against the banned hue range (270-350) and every text
 * token against 7:1 contrast on the surfaces text is allowed to sit on.
 *
 * Source: 8DO site review, 9 Oct 2026 ("Proposed shared direction").
 * First consumer: 8gentjr.com home page. Designed to lift into a shared
 * package for 8gent.world, 8gentos.com, 8gent.dev and 8gent.games.
 */

export type ColorSet = {
  /** Page background. Text may sit here. */
  bg0: string;
  /** Raised surface (cards, header). Text may sit here. */
  bg1: string;
  /** Inset or tinted surface. Text may sit here. */
  bg2: string;
  /** Pressed or decorative fill. No text on this surface. */
  bg3: string;
  /** Headings and body text. */
  text1: string;
  /** Secondary text. Still 7:1. */
  text2: string;
  /** Captions and meta. Still 7:1. */
  text3: string;
  /** Hairline dividers. Decorative only. */
  border: string;
  /** Borders that carry meaning (inputs, cards a user acts on). 3:1 or better. */
  borderStrong: string;
  /** Brand orange. Large display marks and decoration only, never body text. */
  accent: string;
  /** Orange for links, button fills and text. 7:1 on bg0-bg2. */
  accentInk: string;
  /** Text on an accentInk fill. */
  onAccent: string;
  /** Keyboard focus ring. 3:1 or better on every surface. */
  focus: string;
  /** Success messages. Hue 90-180. */
  success: string;
  /** Alerts and warnings. Amber, hue under 60. */
  alert: string;
};

/** Light set. 8gent Jr uses only this one. */
export const light: ColorSet = {
  bg0: '#FFFDF9',
  bg1: '#FFF8F0',
  bg2: '#FFF1E6',
  bg3: '#F7EBDD',
  text1: '#1A1612',
  text2: '#4A4238',
  text3: '#524A40',
  border: '#E8E0D6',
  borderStrong: '#7D7266',
  accent: '#E8610A',
  accentInk: '#7F3307',
  onAccent: '#FFFDF9',
  focus: '#7F3307',
  success: '#155B2B',
  alert: '#6E4300',
};

/** Dark set. Default for world, os, dev and games; never used on Jr. */
export const dark: ColorSet = {
  bg0: '#14110E',
  bg1: '#1C1814',
  bg2: '#25201A',
  bg3: '#2E2820',
  text1: '#F5EFE8',
  text2: '#D6CCC0',
  text3: '#C4B9AC',
  border: '#2E2820',
  borderStrong: '#857869',
  accent: '#F07A28',
  accentInk: '#F7A866',
  onAccent: '#14110E',
  focus: '#F7A866',
  success: '#6FD08C',
  alert: '#E8B04A',
};

/** Surfaces that may carry text, and the tokens that count as text. */
export const TEXT_SURFACES = ['bg0', 'bg1', 'bg2'] as const;
export const TEXT_TOKENS = ['text1', 'text2', 'text3', 'accentInk', 'success', 'alert'] as const;
/** WCAG AAA body text. The Warm Kernel floor for every text token. */
export const MIN_TEXT_CONTRAST = 7;
/** WCAG 1.4.11 non-text contrast, for focus rings and meaningful borders. */
export const MIN_UI_CONTRAST = 3;

export const font = {
  display: "var(--font-fraunces), 'Fraunces', Georgia, serif",
  body: "var(--font-inter), 'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

/**
 * 1.25 ratio from 16px, in px, rounded. Named by step from the base:
 * n2 = two steps down, 0 = base, 6 = six steps up. Ordered smallest first.
 */
export const typeScale: ReadonlyArray<readonly [string, number]> = [
  ['n2', 12],
  ['n1', 14],
  ['0', 16],
  ['1', 20],
  ['2', 25],
  ['3', 31],
  ['4', 39],
  ['5', 49],
  ['6', 61],
];

export const type = {
  /** Jr reads at arm's length; other sites may use 16. */
  bodySize: 18,
  bodyLineHeight: 1.6,
  headingLineHeight: 1.15,
  /** Longest comfortable line. */
  measure: '68ch',
  weightBody: 400,
  weightStrong: 600,
  weightHeading: 700,
  weightDisplay: 800,
} as const;

/** 8px base. Names are multiples of 8 (0_5 = 4px). Ordered smallest first. */
export const space: ReadonlyArray<readonly [string, number]> = [
  ['0_5', 4],
  ['1', 8],
  ['1_5', 12],
  ['2', 16],
  ['3', 24],
  ['4', 32],
  ['5', 40],
  ['6', 48],
  ['8', 64],
  ['12', 96],
];

export const layout = {
  container: 1200,
  /** Section padding: desktop / tablet / phone. */
  sectionDesktop: 96,
  sectionTablet: 64,
  sectionPhone: 40,
  /** Header collapses to a menu below this width. */
  menuBreakpoint: 720,
  /** Minimum touch target. Jr uses 48, above the 44 floor. */
  target: 48,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 9999,
} as const;

/** 0.3s transitions, 0.4s entrances, 0.5s hero. One entrance per section, no loops. */
export const motion = {
  fast: '300ms',
  base: '400ms',
  slow: '500ms',
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

/** Under prefers-reduced-motion, and on Jr by default: nothing moves. */
export const motionReduced = {
  fast: '0ms',
  base: '0ms',
  slow: '0ms',
} as const;

export const focusRing = {
  width: 2,
  offset: 2,
} as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function colorVars(set: ColorSet, indent: string): string {
  return (Object.keys(set) as (keyof ColorSet)[])
    .map((k) => `${indent}--wk-${kebab(k)}: ${set[k]};`)
    .join('\n');
}

/** Renders the CSS custom properties. `tokens.css` is this function's output. */
export function tokensToCss(): string {
  const i = '  ';
  const lines: string[] = [];
  lines.push('/* Generated from tokens.ts by `bun run wk:css`. Do not edit by hand. */');
  lines.push('');
  lines.push(':root {');
  lines.push(colorVars(light, i));
  lines.push('');
  lines.push(`${i}--wk-font-display: ${font.display};`);
  lines.push(`${i}--wk-font-body: ${font.body};`);
  lines.push(`${i}--wk-font-mono: ${font.mono};`);
  for (const [k, v] of typeScale) {
    lines.push(`${i}--wk-size-${k}: ${v / 16}rem;`);
  }
  lines.push(`${i}--wk-body-size: ${type.bodySize / 16}rem;`);
  lines.push(`${i}--wk-body-line: ${type.bodyLineHeight};`);
  lines.push(`${i}--wk-heading-line: ${type.headingLineHeight};`);
  lines.push(`${i}--wk-measure: ${type.measure};`);
  lines.push('');
  for (const [k, v] of space) {
    lines.push(`${i}--wk-space-${k}: ${v / 16}rem;`);
  }
  lines.push(`${i}--wk-container: ${layout.container / 16}rem;`);
  lines.push(`${i}--wk-section: ${layout.sectionDesktop / 16}rem;`);
  lines.push(`${i}--wk-target: ${layout.target / 16}rem;`);
  for (const [k, v] of Object.entries(radius)) {
    lines.push(`${i}--wk-radius-${k}: ${v}px;`);
  }
  lines.push('');
  lines.push(`${i}--wk-motion-fast: ${motion.fast};`);
  lines.push(`${i}--wk-motion-base: ${motion.base};`);
  lines.push(`${i}--wk-motion-slow: ${motion.slow};`);
  lines.push(`${i}--wk-ease: ${motion.ease};`);
  lines.push(`${i}--wk-focus-width: ${focusRing.width}px;`);
  lines.push(`${i}--wk-focus-offset: ${focusRing.offset}px;`);
  lines.push('}');
  lines.push('');
  lines.push(`@media (max-width: ${(layout.container - 1) / 16}rem) {`);
  lines.push(`${i}:root { --wk-section: ${layout.sectionTablet / 16}rem; }`);
  lines.push('}');
  lines.push(`@media (max-width: ${layout.menuBreakpoint / 16}rem) {`);
  lines.push(`${i}:root { --wk-section: ${layout.sectionPhone / 16}rem; }`);
  lines.push('}');
  lines.push('');
  lines.push('[data-wk-theme="dark"] {');
  lines.push(colorVars(dark, i));
  lines.push('}');
  lines.push('');
  const still = [
    `${i}${i}--wk-motion-fast: ${motionReduced.fast};`,
    `${i}${i}--wk-motion-base: ${motionReduced.base};`,
    `${i}${i}--wk-motion-slow: ${motionReduced.slow};`,
  ].join('\n');
  lines.push('@media (prefers-reduced-motion: reduce) {');
  lines.push(`${i}:root {`);
  lines.push(still);
  lines.push(`${i}}`);
  lines.push('}');
  lines.push('');
  lines.push('/* Jr sets this on its root: no movement by default. */');
  lines.push('[data-wk-motion="none"] {');
  lines.push(still.replace(new RegExp(`^${i}${i}`, 'gm'), i));
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}
