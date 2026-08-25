// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Pattern Garden: the chemistry, and the promise that it is always alive.
 *
 * The load-bearing test in this file is the last one. Everything else here is
 * ordinary unit testing; ALIVENESS is the one that makes a design promise
 * mechanical.
 *
 * The promise is this. Pattern Garden has no scores, no timers and no way to
 * lose, and the reason a pattern cannot be wrong is that every setting of the
 * control grows something. That is not automatic. The Gray-Scott rule has a
 * large dead region where the growth cannot sustain itself at all and the bed
 * returns to bare soil no matter what the child paints, and it has a flooded
 * region where the growth drowns the whole bed in a flat sheet. A control laid
 * carelessly over that space hands a child a failure state in an activity that
 * promised them there was none, and it would look exactly like the activity
 * being broken.
 *
 * So the suite grows real gardens. It runs the same `stepField` the component
 * runs, at a grid of positions across the whole control, and asserts that each
 * one comes out with pattern in it: not blank, not flooded, and with real
 * structure rather than a smooth wash. Move FEED_MIN, FEED_MAX, BAND_DEPTH or
 * BAND_TOP_INSET somewhere the chemistry dies and this fails.
 *
 * Issue: #225 (wave 3, Pattern Garden)
 */
import { describe, expect, test } from 'bun:test';
import {
  BANNED_HUE_MAX,
  BANNED_HUE_MIN,
  DEPTH_MAX,
  DEPTH_MIN,
  DIFFUSE_U,
  DT,
  FEED_MAX,
  FEED_MIN,
  THIRD,
  TWO_THIRDS,
  characterAt,
  clearField,
  coverage,
  createField,
  describeGarden,
  edgeDensity,
  hueIsAllowed,
  killCeiling,
  paletteAt,
  ruleAt,
  safeHue,
  seedDisc,
  setUniformRule,
  stepField,
  structure,
} from './pattern-garden';

describe('the field', () => {
  test('starts as bare soil: feeder full, nothing growing', () => {
    const f = createField(8, 8);
    expect(Array.from(f.u).every((x) => x === 1)).toBe(true);
    expect(Array.from(f.v).every((x) => x === 0)).toBe(true);
    expect(coverage(f)).toBe(0);
  });

  test('bare soil left alone stays bare, however long it runs', () => {
    // Nothing grows out of nothing. If this ever fails, the rule has picked up
    // a source term and the garden would start patterning before it is touched,
    // which is the mount bug wave 1 shipped, in chemical form.
    const f = createField(24, 24);
    const { feed, kill } = ruleAt(0.5, 0.5);
    setUniformRule(f, feed, kill);
    stepField(f, 600);
    expect(coverage(f)).toBe(0);
  });

  test('the scheme is inside its stability limit, so a bed cannot blow up', () => {
    // Explicit Euler on the nine-point stencil. The sharpest mode has
    // eigenvalue -1.6, and the update stays a contraction while
    // DIFFUSE_U * DT * 1.6 <= 2. Stated as a test because raising DIFFUSE_U to
    // make the growth spread faster is the obvious next tuning move and it is
    // the one that would put a bed of NaNs in a child's hands.
    expect(DIFFUSE_U * DT * 1.6).toBeLessThanOrEqual(2);
  });

  test('a step allocates no new buffers: it swaps the two it was given', () => {
    // A 40,000 cell field stepped four times a frame would otherwise hand the
    // collector 5 MB a second, which on an iPad is a stutter every few seconds.
    const f = createField(16, 16);
    const buffers = new Set([f.u.buffer, f.v.buffer, f.uNext.buffer, f.vNext.buffer]);
    setUniformRule(f, 0.03, 0.06);
    stepField(f, 7);
    expect(buffers.has(f.u.buffer)).toBe(true);
    expect(buffers.has(f.v.buffer)).toBe(true);
    expect(new Set([f.u.buffer, f.v.buffer]).size).toBe(2);
  });

  test('is deterministic: same seed, same rule, same garden', () => {
    const grow = () => {
      const f = createField(28, 28);
      setUniformRule(f, 0.03, 0.057);
      seedDisc(f, 14, 14, 4);
      stepField(f, 400);
      return Array.from(f.v);
    };
    expect(grow()).toEqual(grow());
  });

  test('stays inside 0..1 for every cell, so nothing can run away', () => {
    const f = createField(24, 24);
    const { feed, kill } = ruleAt(1, 1);
    setUniformRule(f, feed, kill);
    seedDisc(f, 12, 12, 6);
    stepField(f, 900);
    for (let i = 0; i < f.v.length; i++) {
      expect(f.v[i]).toBeGreaterThanOrEqual(0);
      expect(f.v[i]).toBeLessThanOrEqual(1);
      expect(f.u[i]).toBeGreaterThanOrEqual(0);
      expect(f.u[i]).toBeLessThanOrEqual(1);
    }
  });

  test('clearing returns the bed to soil', () => {
    const f = createField(16, 16);
    seedDisc(f, 8, 8, 3);
    expect(coverage(f)).toBeGreaterThan(0);
    clearField(f);
    expect(coverage(f)).toBe(0);
  });
});

describe('seeding', () => {
  test('reports how many cells a stroke touched, so a dab reads smaller than a smear', () => {
    const f = createField(64, 64);
    const dab = seedDisc(f, 10, 10, 2);
    const smear = seedDisc(f, 40, 40, 8);
    expect(smear).toBeGreaterThan(dab * 4);
  });

  test('wraps at the edges rather than clipping, so the bed has no corners to avoid', () => {
    const f = createField(32, 32);
    seedDisc(f, 0, 0, 3);
    // The opposite corner is a neighbour of the origin on a wrapped bed.
    expect(f.v[31 * 32 + 31]).toBeGreaterThan(0);
  });

  test('a zero radius does nothing rather than throwing', () => {
    const f = createField(8, 8);
    expect(seedDisc(f, 4, 4, 0)).toBe(0);
    expect(coverage(f)).toBe(0);
  });
});

describe('the control never reaches dead ground', () => {
  test('the kill ceiling is where the growth stops being sustainable', () => {
    // feed = 4 (feed + kill)^2 at the ceiling. Checked directly rather than
    // trusted, because the whole band is placed relative to it.
    for (const feed of [0.016, 0.03, 0.045, 0.062]) {
      const k = killCeiling(feed);
      expect(feed).toBeCloseTo(4 * (feed + k) * (feed + k), 10);
    }
  });

  test('every control position sits strictly inside the measured rectangle', () => {
    for (let i = 0; i <= 20; i++) {
      for (let j = 0; j <= 20; j++) {
        const { feed, kill } = ruleAt(i / 20, j / 20);
        expect(feed).toBeGreaterThanOrEqual(FEED_MIN);
        expect(feed).toBeLessThanOrEqual(FEED_MAX);
        const depth = killCeiling(feed) - kill;
        expect(depth).toBeGreaterThanOrEqual(DEPTH_MIN - 1e-12);
        expect(depth).toBeLessThanOrEqual(DEPTH_MAX + 1e-12);
        // Always under the ceiling: above it nothing can grow at all.
        expect(kill).toBeLessThan(killCeiling(feed));
      }
    }
  });

  test('positions outside 0..1 clamp rather than escaping the rectangle', () => {
    expect(ruleAt(-4, -4)).toEqual(ruleAt(0, 0));
    expect(ruleAt(9, 9)).toEqual(ruleAt(1, 1));
  });
});

describe('describing the garden for a screen reader', () => {
  test('all nine characters are reachable', () => {
    const seen = new Set();
    for (let i = 0; i <= 30; i++) {
      for (let j = 0; j <= 30; j++) {
        const c = characterAt(i / 30, j / 30);
        seen.add(`${c.scale}/${c.weave}`);
      }
    }
    expect(seen.size).toBe(9);
  });

  test('scale comes from the sideways axis and weave from the up axis', () => {
    for (let j = 0; j <= 10; j++) {
      expect(characterAt(0.1, j / 10).scale).toBe('broad');
      expect(characterAt(0.5, j / 10).scale).toBe('medium');
      expect(characterAt(0.9, j / 10).scale).toBe('fine');
    }
    for (let i = 0; i <= 10; i++) {
      expect(characterAt(i / 10, 0.1).weave).toBe('open');
      expect(characterAt(i / 10, 0.5).weave).toBe('medium');
      expect(characterAt(i / 10, 0.9).weave).toBe('dense');
    }
  });

  test('the boundaries are where they say they are', () => {
    expect(characterAt(THIRD - 0.001, 0.5).scale).toBe('broad');
    expect(characterAt(THIRD, 0.5).scale).toBe('medium');
    expect(characterAt(TWO_THIRDS - 0.001, 0.5).scale).toBe('medium');
    expect(characterAt(TWO_THIRDS, 0.5).scale).toBe('fine');
  });

  test('every position has a plain sentence, and none of them praise the child', () => {
    for (let i = 0; i <= 12; i++) {
      for (let j = 0; j <= 12; j++) {
        const line = describeGarden(i / 12, j / 12);
        expect(line.length).toBeGreaterThan(20);
        expect(line.endsWith('.')).toBe(true);
        // Anti-engagement: this activity never tells a child they did well,
        // because there is nothing here that can be done badly.
        expect(line.toLowerCase()).not.toMatch(
          /well done|great|good job|nice|amazing|perfect|correct/,
        );
        // No em dashes anywhere in shipped copy.
        expect(line).not.toContain('—');
      }
    }
  });
});

describe('the colour fence', () => {
  test('safeHue never lands in the banned band, anywhere on the circle', () => {
    for (let i = 0; i <= 5000; i++) {
      const h = safeHue(i / 5000);
      expect(hueIsAllowed(h)).toBe(true);
    }
  });

  test('safeHue also folds inputs outside 0..1, since it takes a ratio', () => {
    for (const t of [-3.7, -1, -0.25, 1, 2.5, 11]) {
      expect(hueIsAllowed(safeHue(t))).toBe(true);
    }
  });

  test('safeHue is continuous across the arc, so no colour snaps as the child drags', () => {
    // A jump would read as a broken patch of the control. Wrapping through 360
    // is not a jump in colour, so the check is on the shorter way round. The
    // open interval is deliberate: the fold is periodic, so 1 lands back on 0,
    // and that seam is a property rather than a defect. Nothing in the palette
    // goes near it - see the ranges in paletteAt.
    let prev = safeHue(0);
    for (let i = 1; i < 2000; i++) {
      const h = safeHue(i / 2000);
      const raw = Math.abs(h - prev);
      const gap = Math.min(raw, 360 - raw);
      expect(gap, `snap of ${gap} degrees at t=${i / 2000}`).toBeLessThan(1);
      prev = h;
    }
  });

  test('safeHue is periodic, which is what makes it safe for any input at all', () => {
    expect(safeHue(1)).toBe(safeHue(0));
    expect(safeHue(2.25)).toBeCloseTo(safeHue(0.25), 10);
  });

  test('every colour the whole control can produce is outside the banned band', () => {
    for (let i = 0; i <= 60; i++) {
      for (let j = 0; j <= 60; j++) {
        const p = paletteAt(i / 60, j / 60);
        for (const hue of [p.soilHue, p.growthHue, p.rimHue]) {
          expect(
            hueIsAllowed(hue),
            `hue ${hue} at (${i / 60}, ${j / 60}) is inside ${BANNED_HUE_MIN}-${BANNED_HUE_MAX}`,
          ).toBe(true);
        }
      }
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
 * ALIVENESS
 *
 * The one that matters. See the file header.
 * ───────────────────────────────────────────────────────────────────────── */

describe('every setting of the control grows a pattern', () => {
  /**
   * Grow a real garden at one control position and report what came up.
   *
   * One small central dab, which is a child's first touch, on a bed wide enough
   * to hold a dozen features across. Both of those matter. Seeding the whole
   * bed would hide a rule that cannot spread from a single touch, and a bed
   * only two features wide cannot show the difference between a pattern and a
   * splodge.
   */
  function grow(x, y, steps = 9000) {
    const f = createField(96, 64);
    const { feed, kill } = ruleAt(x, y);
    setUniformRule(f, feed, kill);
    seedDisc(f, 48, 32, 3);
    stepField(f, steps);
    return { cover: coverage(f), edges: edgeDensity(f), spread: structure(f), feed, kill };
  }

  const POSITIONS = [];
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) POSITIONS.push([i / 4, j / 4]);

  test.each(POSITIONS)('a garden grows at control position (%p, %p)', (x, y) => {
    const { cover, edges, feed, kill } = grow(x, y);
    const where = `feed ${feed.toFixed(4)} kill ${kill.toFixed(5)}`;

    // Not dead: the dab did not simply fade back to bare soil.
    expect(cover, `nothing grew at ${where}`).toBeGreaterThan(0.1);
    // Not flooded: the growth did not drown the whole bed in a flat sheet.
    expect(cover, `the bed flooded at ${where}`).toBeLessThan(0.9);
    // Actual shapes rather than a smooth wash. A uniform field, at any level,
    // has no edges at all, so this is the check that a splodge cannot pass.
    expect(edges, `no shapes at ${where}`).toBeGreaterThan(0.03);
  });

  test('the pattern picks its own size: a dab and a smear settle at one scale', () => {
    // This is the deepest of the four naming lines and the only one that makes
    // a claim about a comparison, so it is the one worth proving rather than
    // asserting. Two beds, same rule, seeds nine times apart in area. If the
    // feature size came from the finger, the settled bed would differ. It does
    // not: the rule sets the size, and the two beds land on the same density
    // with the same amount of edge in them.
    const run = (radius) => {
      const f = createField(96, 64);
      const { feed, kill } = ruleAt(0.55, 0.45);
      setUniformRule(f, feed, kill);
      seedDisc(f, 48, 32, radius);
      stepField(f, 14000);
      return { cover: coverage(f), edges: edgeDensity(f) };
    };
    const dab = run(2);
    const smear = run(6);
    expect(dab.cover).toBeGreaterThan(0.1);
    expect(smear.cover).toBeGreaterThan(0.1);
    expect(Math.abs(dab.cover - smear.cover)).toBeLessThan(0.1);
    // Same amount of edge per unit of bed means the same feature width, which
    // is the actual claim: the size is the rule's, not the finger's.
    expect(Math.abs(dab.edges - smear.edges)).toBeLessThan(0.02);
  });

  test('the two axes of the control really do change the garden', () => {
    // "You made a different shape" claims a visible difference. Edge density
    // is a real, mechanical proxy for feature size: fine growth packs far more
    // edge into the same bed than broad growth does. Corner against corner.
    const broad = grow(0, 0.5);
    const fine = grow(1, 0.5);
    expect(fine.edges).toBeGreaterThan(broad.edges * 1.3);

    const open = grow(0.5, 0);
    const dense = grow(0.5, 1);
    expect(dense.cover).toBeGreaterThan(open.cover + 0.05);
  });
});
