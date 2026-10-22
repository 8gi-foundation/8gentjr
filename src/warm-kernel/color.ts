/**
 * Colour maths for the Warm Kernel checks: hue (for the banned 270-350 range)
 * and WCAG 2.x relative luminance and contrast ratio.
 */

export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a 6-digit hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Hue in degrees, 0-360. Pure greys return 0. */
export function hue(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** The 8GI ban: no purple, pink or violet. Hues 270-350 inclusive. */
export const BANNED_HUE = { from: 270, to: 350 } as const;

export function isBannedHue(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  if (r === g && g === b) return false;
  const h = hue(hex);
  return h >= BANNED_HUE.from && h <= BANNED_HUE.to;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
