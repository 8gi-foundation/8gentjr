/**
 * contrast.ts - WCAG 2.1 contrast maths for accent-coloured surfaces.
 *
 * 8gent Jr paints a lot of chrome from a per-item accent colour (topic pills,
 * the daily activity banner, game cards). Picking the label colour by eye is how
 * issue #230 shipped 1.19:1 pill labels. These helpers pick it arithmetically.
 *
 * Pure, dependency-free, deterministic: safe to call during render.
 */

/** Ink tokens used across the warm theme. */
export const INK_DARK = "#1A1612";
export const INK_LIGHT = "#FFFFFF";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse `#rgb` / `#rrggbb` (with or without the hash) into 0-255 channels. */
export function parseHex(hex: string): Rgb {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Serialise 0-255 channels back to `#rrggbb`. */
export function toHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/** WCAG 2.1 relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  );
}

/** WCAG 2.1 contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Darken `hex` toward black in small steps until it clears `minRatio`
 * against `against`. Hue is preserved because all three channels are scaled
 * by the same factor. Returns black if even that cannot reach the target
 * (impossible for any `against` lighter than mid-grey).
 */
export function darkenUntilContrast(
  hex: string,
  against: string,
  minRatio: number,
): string {
  const base = parseHex(hex);
  for (let step = 0; step <= 100; step++) {
    const factor = 1 - step / 100;
    const candidate = toHex({
      r: base.r * factor,
      g: base.g * factor,
      b: base.b * factor,
    });
    if (contrastRatio(candidate, against) >= minRatio) return candidate;
  }
  return "#000000";
}

export interface AccentSurface {
  /** Background to paint. Equals the input accent when it already works. */
  background: string;
  /** Label colour guaranteed to clear `minRatio` on that background. */
  text: string;
  /** The achieved ratio, for tests and audits. */
  ratio: number;
}

/**
 * Turn an accent colour into a filled surface whose label is readable.
 *
 * Preference order: keep the accent as-is with dark ink (the brightest,
 * most cheerful result), else keep it as-is with white ink, else darken the
 * accent until white ink clears the bar. The accent's hue always survives.
 */
export function accentSurface(hex: string, minRatio = 4.5): AccentSurface {
  const darkRatio = contrastRatio(hex, INK_DARK);
  if (darkRatio >= minRatio) {
    return { background: hex, text: INK_DARK, ratio: darkRatio };
  }

  const lightRatio = contrastRatio(hex, INK_LIGHT);
  if (lightRatio >= minRatio) {
    return { background: hex, text: INK_LIGHT, ratio: lightRatio };
  }

  const darkened = darkenUntilContrast(hex, INK_LIGHT, minRatio);
  return {
    background: darkened,
    text: INK_LIGHT,
    ratio: contrastRatio(darkened, INK_LIGHT),
  };
}
