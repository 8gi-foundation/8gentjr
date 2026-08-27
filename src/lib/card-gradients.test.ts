import { describe, expect, test } from "bun:test";
import {
  BANNED_HUE_MAX,
  BANNED_HUE_MIN,
  CARD_THUMBNAILS,
  FALLBACK_FROM,
  FALLBACK_TO,
  bannedHueSamples,
  cardStyleForId,
  hueOf,
  isBannedHue,
  sampleGradient,
} from "./card-gradients";
import { parseHex } from "./contrast";

/** Sample density. 32 steps = 33 samples, ~3% of the ramp apart. */
const STEPS = 32;

describe("hueOf", () => {
  test("reads the primaries", () => {
    expect(hueOf(parseHex("#ff0000"))).toBeCloseTo(0, 5);
    expect(hueOf(parseHex("#00ff00"))).toBeCloseTo(120, 5);
    expect(hueOf(parseHex("#0000ff"))).toBeCloseTo(240, 5);
    expect(hueOf(parseHex("#ffff00"))).toBeCloseTo(60, 5);
    expect(hueOf(parseHex("#00ffff"))).toBeCloseTo(180, 5);
    expect(hueOf(parseHex("#ff00ff"))).toBeCloseTo(300, 5);
  });

  test("achromatic colours have no hue", () => {
    expect(hueOf(parseHex("#000000"))).toBeNull();
    expect(hueOf(parseHex("#ffffff"))).toBeNull();
    expect(hueOf(parseHex("#7f7f7f"))).toBeNull();
  });
});

describe("isBannedHue", () => {
  test("brackets 270-350 inclusive", () => {
    expect(isBannedHue(BANNED_HUE_MIN - 0.1)).toBe(false);
    expect(isBannedHue(BANNED_HUE_MIN)).toBe(true);
    expect(isBannedHue(300)).toBe(true);
    expect(isBannedHue(BANNED_HUE_MAX)).toBe(true);
    expect(isBannedHue(BANNED_HUE_MAX + 0.1)).toBe(false);
    expect(isBannedHue(null)).toBe(false);
  });
});

describe("sampleGradient", () => {
  test("hits both stops and walks sRGB in between", () => {
    const samples = sampleGradient("#000000", "#ffffff", 4);
    expect(samples).toHaveLength(5);
    expect(samples[0]).toEqual({ r: 0, g: 0, b: 0 });
    expect(samples[4]).toEqual({ r: 255, g: 255, b: 255 });
    expect(samples[2]).toEqual({ r: 127.5, g: 127.5, b: 127.5 });
  });
});

describe("card gradients stay outside the banned 270-350 hue band", () => {
  const entries = Object.entries(CARD_THUMBNAILS);

  test("the table is not empty (guards against an import that resolves to {})", () => {
    expect(entries.length).toBeGreaterThan(40);
  });

  test.each(entries)("card %s (%o) never crosses the band", (id, thumb) => {
    const offenders = bannedHueSamples(thumb.from, thumb.to, STEPS);
    expect({
      id,
      ramp: `${thumb.from} -> ${thumb.to}`,
      offenders: offenders.map((o) => `t=${o.t.toFixed(3)} hue=${o.hue.toFixed(1)}`),
    }).toEqual({
      id,
      ramp: `${thumb.from} -> ${thumb.to}`,
      offenders: [],
    });
  });

  test("both declared stops of every card are themselves legal", () => {
    for (const [id, thumb] of entries) {
      for (const stop of [thumb.from, thumb.to]) {
        expect({ id, stop, banned: isBannedHue(hueOf(parseHex(stop))) }).toEqual({
          id,
          stop,
          banned: false,
        });
      }
    }
  });

  test("the fallback ramp is clean too", () => {
    expect(bannedHueSamples(FALLBACK_FROM, FALLBACK_TO, STEPS)).toEqual([]);
  });

  /**
   * Mutation guard. These are the exact ramps that shipped on Alphabet Dance
   * Party / Ball Rain / Ball Run / Build Sentences and on Match the Shapes /
   * Musical Balls: two legal stops whose sRGB midpoint is violet. If the check
   * above ever stops catching these, it has stopped working.
   */
  test("catches the two ramps that actually shipped violet pixels", () => {
    const indigoToCoral = bannedHueSamples("#6366f1", "#ff6b6b", STEPS);
    const skyToCoral = bannedHueSamples("#0ea5e9", "#ff6b6b", STEPS);
    expect(indigoToCoral.length).toBeGreaterThan(0);
    expect(skyToCoral.length).toBeGreaterThan(0);
    // ...even though every one of those four stops is legal on its own.
    for (const stop of ["#6366f1", "#ff6b6b", "#0ea5e9"]) {
      expect(isBannedHue(hueOf(parseHex(stop)))).toBe(false);
    }
  });
});

describe("cardStyleForId", () => {
  test("returns the declared ramp for a known card", () => {
    expect(cardStyleForId(6)).toEqual({
      gradient: `linear-gradient(135deg, ${CARD_THUMBNAILS[6].from}, ${CARD_THUMBNAILS[6].to})`,
      emoji: CARD_THUMBNAILS[6].emoji,
    });
  });

  test("falls back for an unknown card", () => {
    const style = cardStyleForId(999999);
    expect(style.gradient).toContain(FALLBACK_FROM);
    expect(style.gradient).toContain(FALLBACK_TO);
  });
});
