/**
 * card-gradients.ts - the /games reel card art table, plus the hue maths that
 * proves it stays inside the brand.
 *
 * Hues 270-350 are banned brand-wide (CLAUDE.md). Checking the two declared
 * stops is not enough: a CSS `linear-gradient` interpolates in sRGB, so a ramp
 * between a legal cool stop and a legal warm stop can walk straight through the
 * banned band in the middle. That is exactly how six cards shipped violet and
 * magenta pixels with no banned token anywhere in the file (#230, gate round 2):
 * `#6366f1 -> #ff6b6b` spent 52% of its ramp in the band, `#0ea5e9 -> #ff6b6b`
 * 23%.
 *
 * So the table lives here, in a pure module with no React, and
 * `card-gradients.test.ts` samples every pair across the whole ramp. Pure,
 * dependency-free, deterministic.
 */

import { parseHex, type Rgb } from "./contrast";

export interface CardThumbnail {
  emoji: string;
  from: string;
  to: string;
}

/** Per-card emoji + gradient - matches the NickOS vibrant card style. */
export const CARD_THUMBNAILS: Record<number, CardThumbnail> = {
  // Videos
  1: { emoji: "🔢", from: "#f97316", to: "#ff6b6b" },
  5: { emoji: "🔢", from: "#ef4444", to: "#f59e0b" },
  2: { emoji: "🔤", from: "#0ea5e9", to: "#3b82f6" },
  6: { emoji: "🔤", from: "#6366f1", to: "#0ea5e9" },
  3: { emoji: "🌈", from: "#ef4444", to: "#eab308" },
  7: { emoji: "🌈", from: "#f97316", to: "#eab308" },
  4: { emoji: "🔷", from: "#06b6d4", to: "#0ea5e9" },
  9: { emoji: "🔷", from: "#3b82f6", to: "#0ea5e9" },
  // Academic games
  10: { emoji: "🎯", from: "#f97316", to: "#ef4444" },
  11: { emoji: "🫧", from: "#3b82f6", to: "#06b6d4" },
  12: { emoji: "✏️", from: "#f59e0b", to: "#ef4444" },
  13: { emoji: "🔢", from: "#22c55e", to: "#06b6d4" },
  20: { emoji: "🔶", from: "#0ea5e9", to: "#14b8a6" },
  21: { emoji: "🎴", from: "#6366f1", to: "#3b82f6" },
  22: { emoji: "📏", from: "#f97316", to: "#eab308" },
  30: { emoji: "🎨", from: "#10b981", to: "#3b82f6" },
  31: { emoji: "🎨", from: "#ef4444", to: "#f59e0b" },
  40: { emoji: "✏️", from: "#f59e0b", to: "#ef4444" },
  50: { emoji: "🧩", from: "#14b8a6", to: "#ff6b6b" },
  // Sensory games
  100: { emoji: "🌧️", from: "#6366f1", to: "#06b6d4" },
  101: { emoji: "🍦", from: "#ff6b6b", to: "#f59e0b" },
  102: { emoji: "🧴", from: "#3b82f6", to: "#6366f1" },
  103: { emoji: "🏗️", from: "#f97316", to: "#ef4444" },
  104: { emoji: "🎆", from: "#eab308", to: "#ef4444" },
  105: { emoji: "🎵", from: "#0ea5e9", to: "#22c55e" },
  106: { emoji: "🖌️", from: "#22c55e", to: "#06b6d4" },
  107: { emoji: "🫧", from: "#14b8a6", to: "#06b6d4" },
  108: { emoji: "💧", from: "#3b82f6", to: "#22c55e" },
  109: { emoji: "🌀", from: "#06b6d4", to: "#6366f1" },
  110: { emoji: "🔮", from: "#14b8a6", to: "#3b82f6" },
  // Sensory 3D games
  120: { emoji: "✨", from: "#6366f1", to: "#14b8a6" },
  121: { emoji: "🫁", from: "#0ea5e9", to: "#6366f1" },
  122: { emoji: "💎", from: "#14b8a6", to: "#ff6b6b" },
  123: { emoji: "⭐", from: "#1e1b4b", to: "#312e81" },
  124: { emoji: "💥", from: "#ef4444", to: "#f97316" },
  125: { emoji: "🏗️", from: "#6366f1", to: "#10b981" },
  126: { emoji: "🔮", from: "#7c3aed", to: "#4f46e5" },
  127: { emoji: "🎲", from: "#f59e0b", to: "#ef4444" },
  128: { emoji: "🎵", from: "#0f172a", to: "#1e1b4b" },
  129: { emoji: "🧲", from: "#f59e0b", to: "#06b6d4" },
  // Speech games
  200: { emoji: "🐾", from: "#22c55e", to: "#10b981" },
  201: { emoji: "😊", from: "#f59e0b", to: "#f97316" },
  202: { emoji: "🗣️", from: "#3b82f6", to: "#0ea5e9" },
  203: { emoji: "🤸", from: "#22c55e", to: "#f59e0b" },
  204: { emoji: "📝", from: "#6366f1", to: "#22c55e" },
  205: { emoji: "🎶", from: "#f59e0b", to: "#ef4444" },
  206: { emoji: "🌿", from: "#22c55e", to: "#06b6d4" },
  207: { emoji: "🦘", from: "#f97316", to: "#22c55e" },
};

export const FALLBACK_FROM = "#FFB347";
export const FALLBACK_TO = "#4ECDC4";
export const FALLBACK_EMOJI = "🎮";
export const FALLBACK_GRADIENT = `linear-gradient(135deg, ${FALLBACK_FROM}, ${FALLBACK_TO})`;

/** Inclusive hue band banned brand-wide: purple / violet / pink / magenta. */
export const BANNED_HUE_MIN = 270;
export const BANNED_HUE_MAX = 350;

/** Card art for a reel id, falling back to the neutral warm/teal ramp. */
export function cardStyleForId(id: number): { gradient: string; emoji: string } {
  const thumb = CARD_THUMBNAILS[id];
  if (!thumb) return { gradient: FALLBACK_GRADIENT, emoji: FALLBACK_EMOJI };
  return {
    gradient: `linear-gradient(135deg, ${thumb.from}, ${thumb.to})`,
    emoji: thumb.emoji,
  };
}

/**
 * HSL hue in degrees, or `null` for an achromatic colour (which has no hue and
 * therefore cannot be a brand violation).
 */
export function hueOf({ r, g, b }: Rgb): number | null {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return null;

  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h *= 60;
  return h < 0 ? h + 360 : h;
}

export function isBannedHue(hue: number | null): boolean {
  return hue !== null && hue >= BANNED_HUE_MIN && hue <= BANNED_HUE_MAX;
}

/**
 * Sample a two-stop sRGB gradient, the way the browser paints `linear-gradient`
 * with no interpolation hint: straight lerp of the 0-255 channels.
 */
export function sampleGradient(from: string, to: string, steps: number): Rgb[] {
  const a = parseHex(from);
  const b = parseHex(to);
  const out: Rgb[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t,
    });
  }
  return out;
}

/** Every sampled position along `from -> to` whose hue lands in the banned band. */
export function bannedHueSamples(
  from: string,
  to: string,
  steps: number,
): { t: number; hue: number }[] {
  return sampleGradient(from, to, steps).flatMap((rgb, i) => {
    const hue = hueOf(rgb);
    return isBannedHue(hue) ? [{ t: i / steps, hue: hue as number }] : [];
  });
}
