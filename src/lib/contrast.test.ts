import { describe, expect, it } from "bun:test";
import {
  INK_DARK,
  INK_LIGHT,
  accentSurface,
  contrastRatio,
  darkenUntilContrast,
  parseHex,
  relativeLuminance,
  toHex,
} from "./contrast";

/** Every accent colour painted as a filled surface in the games UI. */
const ACCENTS = [
  "#FF6B6B", // All / Numbers
  "#4ECDC4", // ABC
  "#FFE66D", // Colors
  "#95E1D3", // Shapes
  "#FFB347", // Patterns
  "#FF8C42", // Sensory
  "#686DE0", // Speech
  "#E8610A", // Creative
  "#22A6B3", // Music
  "#2ECC71", // Body
  "#F8B500", // Sunday banner
];

describe("parseHex / toHex", () => {
  it("parses long form with and without a hash", () => {
    expect(parseHex("#4ECDC4")).toEqual({ r: 78, g: 205, b: 196 });
    expect(parseHex("4ECDC4")).toEqual({ r: 78, g: 205, b: 196 });
  });

  it("expands short form", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("#0a0")).toEqual({ r: 0, g: 170, b: 0 });
  });

  it("rejects anything that is not a hex colour", () => {
    expect(() => parseHex("rebeccapurple")).toThrow();
    expect(() => parseHex("#12345")).toThrow();
  });

  it("round-trips through toHex", () => {
    expect(toHex(parseHex("#E8610A"))).toBe("#E8610A");
  });

  it("clamps out-of-range channels", () => {
    expect(toHex({ r: -20, g: 300, b: 128 })).toBe("#00FF80");
  });
});

describe("relativeLuminance", () => {
  it("anchors at the WCAG endpoints", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 6);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 6);
  });

  it("matches the published value for mid grey", () => {
    expect(relativeLuminance("#808080")).toBeCloseTo(0.2158, 3);
  });
});

describe("contrastRatio", () => {
  it("gives 21:1 for black on white and 1:1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 6);
    expect(contrastRatio("#4ECDC4", "#4ECDC4")).toBeCloseTo(1, 6);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#FF6B6B", INK_DARK)).toBeCloseTo(
      contrastRatio(INK_DARK, "#FF6B6B"),
      9,
    );
  });

  it("reproduces the failures measured in issue #230", () => {
    // Unselected pill label was the pill's own pastel on the cyan page.
    expect(contrastRatio("#FFE66D", "#FFFFFF")).toBeLessThan(1.5); // Colors
    expect(contrastRatio("#95E1D3", "#FFFFFF")).toBeLessThan(2.0); // Shapes
    // Daily banner: white on the teal accent.
    expect(contrastRatio("#4ECDC4", INK_LIGHT)).toBeLessThan(2.0);
  });
});

describe("darkenUntilContrast", () => {
  it("darkens a light accent until white text clears the bar", () => {
    const out = darkenUntilContrast("#4ECDC4", INK_LIGHT, 4.5);
    expect(contrastRatio(out, INK_LIGHT)).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves a colour that already passes untouched", () => {
    expect(darkenUntilContrast("#E8610A", INK_DARK, 3)).toBe("#E8610A");
  });

  it("preserves channel ordering, so the hue survives", () => {
    const before = parseHex("#4ECDC4");
    const after = parseHex(darkenUntilContrast("#4ECDC4", INK_LIGHT, 7));
    expect(after.g).toBeGreaterThan(after.r);
    expect(before.g).toBeGreaterThan(before.r);
    expect(after.g).toBeGreaterThanOrEqual(after.b);
  });

  it("never returns brighter than the input", () => {
    const out = parseHex(darkenUntilContrast("#FF6B6B", INK_LIGHT, 7));
    const src = parseHex("#FF6B6B");
    expect(out.r).toBeLessThanOrEqual(src.r);
    expect(out.g).toBeLessThanOrEqual(src.g);
    expect(out.b).toBeLessThanOrEqual(src.b);
  });
});

describe("accentSurface", () => {
  it("clears 4.5:1 for every accent shipped on /games", () => {
    for (const accent of ACCENTS) {
      const surface = accentSurface(accent);
      const measured = contrastRatio(surface.background, surface.text);
      expect(measured).toBeGreaterThanOrEqual(4.5);
      expect(surface.ratio).toBeCloseTo(measured, 6);
    }
  });

  it("keeps a bright accent bright by choosing dark ink", () => {
    const yellow = accentSurface("#FFE66D");
    expect(yellow.background).toBe("#FFE66D");
    expect(yellow.text).toBe(INK_DARK);
  });

  it("darkens only when neither ink works on the raw accent", () => {
    // #686DE0 is 3.77:1 with dark ink and 4.35:1 with white: both short of 4.5.
    expect(contrastRatio("#686DE0", INK_DARK)).toBeLessThan(4.5);
    expect(contrastRatio("#686DE0", INK_LIGHT)).toBeLessThan(4.5);
    const surface = accentSurface("#686DE0");
    expect(surface.background).not.toBe("#686DE0");
    expect(surface.text).toBe(INK_LIGHT);
    expect(surface.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("honours a stricter target", () => {
    for (const accent of ACCENTS) {
      expect(accentSurface(accent, 7).ratio).toBeGreaterThanOrEqual(7);
    }
  });

  it("is deterministic", () => {
    expect(accentSurface("#22A6B3")).toEqual(accentSurface("#22A6B3"));
  });
});
