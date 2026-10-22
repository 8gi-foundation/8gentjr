import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, hue, isBannedHue } from './color';
import {
  dark,
  light,
  MIN_TEXT_CONTRAST,
  MIN_UI_CONTRAST,
  motionReduced,
  space,
  TEXT_SURFACES,
  TEXT_TOKENS,
  tokensToCss,
  typeScale,
  type ColorSet,
} from './tokens';

const sets: Array<[string, ColorSet]> = [
  ['light', light],
  ['dark', dark],
];

describe('colour maths', () => {
  test('hue of known colours', () => {
    expect(Math.round(hue('#FF0000'))).toBe(0);
    expect(Math.round(hue('#00FF00'))).toBe(120);
    expect(Math.round(hue('#8000FF'))).toBe(270);
  });
  test('banned range catches purple, pink and violet, not orange or grey', () => {
    expect(isBannedHue('#C026D3')).toBe(true); // fuchsia
    expect(isBannedHue('#EC4899')).toBe(true); // pink
    expect(isBannedHue('#A855F7')).toBe(true); // purple
    expect(isBannedHue('#E8610A')).toBe(false);
    expect(isBannedHue('#808080')).toBe(false);
  });
  test('contrast matches WCAG reference values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });
});

describe.each(sets)('%s colour set', (_name, set) => {
  test('no token falls in the banned hue range 270-350', () => {
    const banned = Object.entries(set).filter(([, v]) => isBannedHue(v));
    expect(banned).toEqual([]);
  });

  for (const t of TEXT_TOKENS) {
    for (const s of TEXT_SURFACES) {
      test(`${t} on ${s} is 7:1 or better`, () => {
        expect(contrast(set[t], set[s])).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      });
    }
  }

  test('button label on its fill is 7:1 or better', () => {
    expect(contrast(set.onAccent, set.accentInk)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  for (const s of ['bg0', 'bg1', 'bg2', 'bg3'] as const) {
    test(`focus ring and strong border are 3:1 or better on ${s}`, () => {
      expect(contrast(set.focus, set[s])).toBeGreaterThanOrEqual(MIN_UI_CONTRAST);
      expect(contrast(set.borderStrong, set[s])).toBeGreaterThanOrEqual(MIN_UI_CONTRAST);
    });
  }

  test('success is green (90-180) and alert is amber (under 60)', () => {
    const g = hue(set.success);
    expect(g).toBeGreaterThanOrEqual(90);
    expect(g).toBeLessThanOrEqual(180);
    expect(hue(set.alert)).toBeLessThan(60);
  });
});

describe('scales', () => {
  test('type scale steps by 1.25 from 16px, within rounding', () => {
    const px = typeScale.map(([, v]) => v);
    expect(px[2]).toBe(16);
    for (let i = 1; i < px.length; i++) {
      expect(px[i] / px[i - 1]).toBeGreaterThan(1.12);
      expect(px[i] / px[i - 1]).toBeLessThan(1.3);
    }
  });
  test('spacing sits on a 4px half-step of the 8px base', () => {
    for (const [, v] of space) expect(v % 4).toBe(0);
  });
  test('reduced motion removes every duration', () => {
    expect(Object.values(motionReduced).every((d) => d === '0ms')).toBe(true);
  });
});

describe('generated CSS', () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'tokens.css'), 'utf8');
  test('tokens.css matches tokens.ts (run `bun run wk:css` if this fails)', () => {
    expect(css).toBe(tokensToCss());
  });
  test('no colour literal in the CSS falls in the banned hue range', () => {
    const hexes = css.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.filter(isBannedHue)).toEqual([]);
  });
  test('reduced-motion and data-wk-motion=none both zero the durations', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('[data-wk-motion="none"]');
  });
});
