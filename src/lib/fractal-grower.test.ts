// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Fractal Grower: the branching rule, measured.
 *
 * Every sentence this activity says to a child is a claim about the module
 * under test here, so each one has a test that MEASURES it rather than a
 * comment that asserts it:
 *
 *   - "the small branches copy the big ones": the turn a child makes off its
 *     parent, and the length it keeps, are measured at every generation and
 *     asserted to be the same number all the way down.
 *   - "you moved one thing and the whole shape changed": the bounding box is
 *     swept across the angle range and asserted to widen and shorten.
 *   - "one rule made the tree, the fern and the lightning": the recursion is
 *     handed a rule that exists nowhere in the product, and it grows.
 *
 * Issue: #225 (wave 3, Fractal Grower)
 */
import { describe, expect, test } from 'bun:test';
import {
  ANGLE_MAX,
  ANGLE_MIN,
  CAMERA_DISTANCE,
  PRESETS,
  PRESET_IDS,
  RATIO_MAX,
  RATIO_MIN,
  SEGMENT_CAP,
  clampAngle,
  clampGrowth,
  cameraFor,
  clampRatio,
  depthFade,
  describeStructure,
  growStructure,
  growWithRule,
  hueIsAllowed,
  lengthIndex,
  paletteAt,
  projectPoint,
  safeHue,
  shapeIndex,
} from './fractal-grower';

const SEED = 20260825;

const base = (over = {}) => ({
  preset: 'tree',
  angle: 0.5,
  ratio: 0.72,
  growth: 1,
  seed: SEED,
  ...over,
});

/** Segments of one generation. */
const gen = (s, g) => s.segments.filter((seg) => seg.generation === g);

/** Length of a segment in model space, ignoring the painterly bow. */
const lengthOf = (seg) => Math.hypot(seg.x1 - seg.x0, seg.y1 - seg.y0, seg.z1 - seg.z0);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// ---------------------------------------------------------------------------

describe('a seed nobody has touched', () => {
  test('grows nothing at all', () => {
    const s = growStructure(base({ growth: 0 }));
    expect(s.segments).toEqual([]);
    expect(s.generations).toBe(0);
  });

  test('negative and non-finite growth are a seed, not a crash', () => {
    for (const growth of [-1, -0.001, Number.NaN, Number.POSITIVE_INFINITY]) {
      const s = growStructure(base({ growth }));
      expect(Number.isFinite(s.generations)).toBe(true);
      expect(s.generations).toBeGreaterThanOrEqual(0);
    }
    expect(growStructure(base({ growth: Number.NaN })).segments).toEqual([]);
  });

  test('the very first pull is a stem and nothing else', () => {
    // Half of one generation of a nine-deep seed.
    const s = growStructure(base({ growth: 0.5 / PRESETS.tree.maxDepth }));
    expect(s.generations).toBe(1);
    expect(s.segments.length).toBe(1);
    expect(s.segments[0].fade).toBeCloseTo(0.5, 10);
    expect(s.segments[0].tip).toBe(true);
  });
});

describe('determinism', () => {
  test('same parameters, same structure, forever', () => {
    expect(growStructure(base())).toEqual(growStructure(base()));
  });

  test('a different seed makes a different structure', () => {
    const a = growStructure(base());
    const b = growStructure(base({ seed: SEED + 1 }));
    expect(a.segments.length).toBe(b.segments.length);
    expect(a.segments).not.toEqual(b.segments);
  });

  test('nothing anywhere in the structure is NaN', () => {
    for (const preset of PRESET_IDS) {
      const s = growStructure(base({ preset }));
      for (const seg of s.segments) {
        for (const k of ['x0', 'y0', 'z0', 'x1', 'y1', 'z1', 'width', 'hueT', 'fade', 'bow']) {
          expect(Number.isFinite(seg[k]), `${preset}: ${k} is not finite`).toBe(true);
        }
      }
    }
  });
});

describe('growing does not redraw what is already there', () => {
  test('the generations a child already had come back segment for segment', () => {
    // The counter bug, as a test. A per-node hash keyed on the path taken to
    // reach a branch survives this; a counter in traversal order does not,
    // because growing changes how many nodes exist before any given one.
    const half = growStructure(base({ growth: 0.5 }));
    const full = growStructure(base({ growth: 0.95 }));

    const completed = half.segments.filter((s) => s.fade >= 1);
    expect(completed.length).toBeGreaterThan(10);

    // Compared as sets, sorted, because two children of one split share a start
    // point and a lookup by position would happily match the wrong one.
    const key = (s) =>
      [s.generation, s.x0, s.y0, s.z0, s.x1, s.y1, s.z1, s.width, s.bow]
        .map((n) => (typeof n === 'number' ? n.toFixed(12) : n))
        .join('|');

    const before = completed.map(key).sort();
    const after = full.segments
      .filter((s) => s.generation < half.generations - 1 || s.fade >= 1)
      .map(key)
      .sort();

    for (const k of before) {
      expect(after.includes(k), 'a branch the child already had moved when they grew').toBe(true);
    }
  });

  test('growth advances one generation at a time and never skips', () => {
    let previous = 0;
    for (let i = 0; i <= 60; i++) {
      const g = growStructure(base({ growth: i / 60 })).generations;
      expect(g - previous).toBeLessThanOrEqual(1);
      expect(g).toBeGreaterThanOrEqual(previous);
      previous = g;
    }
    expect(previous).toBe(PRESETS.tree.maxDepth);
  });
});

describe('one rule, repeated', () => {
  test('every generation turns off its parent by the same angle', () => {
    // This IS "the small branches copy the big ones", measured. The turn is
    // recovered from the geometry rather than read back from the parameter,
    // and the tolerance is the seed's own wobble plus its droop.
    const angle = 0.6;
    const s = growStructure(base({ angle, ratio: 0.72 }));
    const rule = PRESETS.tree;

    const byStart = new Map();
    for (const seg of s.segments) {
      byStart.set(`${seg.x0.toFixed(9)},${seg.y0.toFixed(9)},${seg.z0.toFixed(9)}`, seg);
    }

    const turnsByGeneration = new Map();
    for (const seg of s.segments) {
      if (seg.generation === 0) continue;
      const parent = byStart.get(
        `${seg.x0.toFixed(9)},${seg.y0.toFixed(9)},${seg.z0.toFixed(9)}`,
      );
      // The map is keyed by START point, so the parent is found by its END.
      const p = s.segments.find(
        (o) =>
          o.generation === seg.generation - 1 &&
          Math.abs(o.x1 - seg.x0) < 1e-9 &&
          Math.abs(o.y1 - seg.y0) < 1e-9 &&
          Math.abs(o.z1 - seg.z0) < 1e-9,
      );
      expect(p, 'every branch hangs off a parent').toBeDefined();
      void parent;

      const pl = lengthOf(p);
      const cl = lengthOf(seg);
      const dot =
        ((p.x1 - p.x0) * (seg.x1 - seg.x0) +
          (p.y1 - p.y0) * (seg.y1 - seg.y0) +
          (p.z1 - p.z0) * (seg.z1 - seg.z0)) /
        (pl * cl);
      const turn = Math.acos(Math.min(1, Math.max(-1, dot)));
      const list = turnsByGeneration.get(seg.generation) ?? [];
      list.push(turn);
      turnsByGeneration.set(seg.generation, list);
    }

    const means = [...turnsByGeneration.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([g, list]) => [g, mean(list)]);

    expect(means.length).toBe(rule.maxDepth - 1);
    for (const [g, m] of means) {
      // Every generation turns by the angle the child is holding. The droop
      // grows with depth, which is why the tolerance is what it is and not
      // tighter.
      expect(Math.abs(m - angle), `generation ${g} turned ${m} instead of ${angle}`).toBeLessThan(
        0.1,
      );
    }
  });

  test('every generation keeps the same fraction of its parent length', () => {
    const ratio = 0.68;
    const s = growStructure(base({ ratio }));
    const rule = PRESETS.tree;

    const meanLen = [];
    for (let g = 0; g < rule.maxDepth; g++) meanLen.push(mean(gen(s, g).map(lengthOf)));

    for (let g = 1; g < meanLen.length; g++) {
      const got = meanLen[g] / meanLen[g - 1];
      // The tree's children both carry a ratio multiplier of 1, so the measured
      // shrink is the parameter itself, to floating point.
      expect(got, `generation ${g} shrank by ${got} instead of ${ratio}`).toBeCloseTo(ratio, 9);
    }
  });

  test('the trunk is one unit and generation n is ratio to the n', () => {
    const ratio = 0.6;
    const s = growStructure(base({ ratio }));
    expect(mean(gen(s, 0).map(lengthOf))).toBeCloseTo(1, 9);
    for (let g = 1; g < PRESETS.tree.maxDepth; g++) {
      expect(mean(gen(s, g).map(lengthOf))).toBeCloseTo(Math.pow(ratio, g), 9);
    }
  });

  test('thickness tapers by the same fraction every generation', () => {
    const s = growStructure(base());
    const rule = PRESETS.tree;
    for (let g = 1; g < rule.maxDepth; g++) {
      const got = mean(gen(s, g).map((x) => x.width)) / mean(gen(s, g - 1).map((x) => x.width));
      expect(got).toBeCloseTo(rule.taper, 9);
    }
  });

  test('a split really does make as many children as the seed says', () => {
    for (const preset of PRESET_IDS) {
      const rule = PRESETS[preset];
      const s = growStructure(base({ preset }));
      for (let g = 0; g < rule.maxDepth; g++) {
        expect(gen(s, g).length, `${preset} generation ${g}`).toBe(
          Math.pow(rule.children.length, g),
        );
      }
    }
  });
});

describe('a small change to the rule is a big change to the shape', () => {
  test('opening the angle widens the structure and shortens it, all the way', () => {
    // "You moved one thing and everything changed", measured across the whole
    // travel of the control rather than at two convenient points.
    const widths = [];
    const heights = [];
    for (let i = 0; i <= 20; i++) {
      const angle = ANGLE_MIN + ((ANGLE_MAX - ANGLE_MIN) * i) / 20;
      const s = growStructure(base({ angle }));
      widths.push(s.maxX - s.minX);
      heights.push(s.maxY - s.minY);
    }

    // Height falls at every single step of the sweep. Measured: the worst step
    // rises by 0.00 percent, which is to say never.
    for (let i = 1; i < heights.length; i++) {
      expect(
        heights[i],
        `height rose from ${heights[i - 1]} to ${heights[i]}`,
      ).toBeLessThan(heights[i - 1]);
    }

    // Width is strictly monotone for the first three quarters of the drag and
    // then eases back, and claiming otherwise would be false. The suite caught
    // it. Measured on this twenty-sample sweep: 0.668 wide at the tight end,
    // rising at every step to 3.083 at sample 15, then settling to 2.815 at the
    // open end as the outermost branches fold back over the ones inside them.
    // Both halves of that are asserted, because a test that only checked the
    // ends would pass over a control that did nothing in the middle.
    const peak = widths.indexOf(Math.max(...widths));
    expect(peak).toBeGreaterThanOrEqual(12);
    for (let i = 1; i <= peak; i++) {
      expect(
        widths[i],
        `width fell from ${widths[i - 1]} to ${widths[i]}`,
      ).toBeGreaterThan(widths[i - 1]);
    }
    // The easing back is small, so no part of the drag undoes what came before.
    expect(widths[widths.length - 1] / widths[peak]).toBeGreaterThan(0.85);

    // And the change is large, not a rounding difference: a tall narrow pine
    // becomes a wide low fan across the same drag. Measured at 4.61 times the
    // width at the peak, 4.21 times end to end, and 1.52 times shorter.
    expect(widths[peak] / widths[0]).toBeGreaterThan(4.5);
    expect(widths[widths.length - 1] / widths[0]).toBeGreaterThan(4);
    expect(heights[0] / heights[heights.length - 1]).toBeGreaterThan(1.5);
  });

  test('the ratio changes how dense the structure is, not how tall the trunk is', () => {
    const sparse = growStructure(base({ ratio: RATIO_MIN }));
    const dense = growStructure(base({ ratio: RATIO_MAX }));
    expect(mean(gen(sparse, 0).map(lengthOf))).toBeCloseTo(1, 9);
    expect(mean(gen(dense, 0).map(lengthOf))).toBeCloseTo(1, 9);
    // Total length of everything grown is what "dense" means here, and near 1
    // it is many times what it is at the bottom of the range.
    const total = (s) => s.segments.reduce((a, seg) => a + lengthOf(seg), 0);
    expect(total(dense) / total(sparse)).toBeGreaterThan(10);
  });
});

describe('one recursion, four natures', () => {
  test('the named seeds are the same function with different data', () => {
    for (const preset of PRESET_IDS) {
      expect(growWithRule(PRESETS[preset], base())).toEqual(growStructure(base({ preset })));
    }
  });

  test('a rule that exists nowhere in the product grows anyway', () => {
    // If any seed had a code path of its own, this would not grow: the rule is
    // not one of the four and is not named anywhere.
    const invented = {
      id: 'tree',
      label: 'Invented',
      children: [
        { angle: 0.8, roll: 0.3, ratio: 0.9, width: 0.8 },
        { angle: -0.4, roll: 1.9, ratio: 0.7, width: 0.6 },
        { angle: 1.7, roll: 3.4, ratio: 0.5, width: 0.4 },
        { angle: -1.9, roll: 5.1, ratio: 0.45, width: 0.3 },
      ],
      maxDepth: 4,
      taper: 0.7,
      gravity: 0.05,
      curve: 0.1,
      jitter: 0.1,
      rollStep: 1,
      hueBase: 60,
      hueSpan: 20,
      tipSize: 0.2,
    };
    const s = growWithRule(invented, { angle: 0.5, ratio: 0.7, growth: 1, seed: SEED });
    expect(s.generations).toBe(4);
    expect(s.segments.length).toBe(1 + 4 + 16 + 64);
  });

  test('the four seeds really do make four different shapes', () => {
    const shapes = PRESET_IDS.map((preset) => {
      const s = growStructure(base({ preset }));
      return `${s.segments.length}:${(s.maxX - s.minX).toFixed(3)}:${(s.maxY - s.minY).toFixed(3)}`;
    });
    expect(new Set(shapes).size).toBe(PRESET_IDS.length);
  });

  test('every seed grows something at every setting of both controls', () => {
    // The child cannot drag either control to a place where nothing appears.
    for (const preset of PRESET_IDS) {
      for (let i = 0; i <= 6; i++) {
        for (let j = 0; j <= 6; j++) {
          const angle = ANGLE_MIN + ((ANGLE_MAX - ANGLE_MIN) * i) / 6;
          const ratio = RATIO_MIN + ((RATIO_MAX - RATIO_MIN) * j) / 6;
          const s = growStructure(base({ preset, angle, ratio }));
          expect(s.generations, `${preset} at ${angle},${ratio}`).toBe(PRESETS[preset].maxDepth);
          expect(s.maxY - s.minY).toBeGreaterThan(0.2);
          expect(s.maxX - s.minX).toBeGreaterThan(0.05);
        }
      }
    }
  });
});

describe('the segment ceiling', () => {
  test('no seed in the product comes anywhere near it', () => {
    for (const preset of PRESET_IDS) {
      const s = growStructure(base({ preset }));
      expect(s.segments.length).toBeLessThan(SEGMENT_CAP);
      expect(s.capped, `${preset} hit the cap`).toBe(false);
    }
  });

  test('a rule that would run away is stopped, and says so', () => {
    const runaway = {
      ...PRESETS.tree,
      children: [
        { angle: 1, roll: 0, ratio: 1, width: 1 },
        { angle: -1, roll: 0, ratio: 1, width: 1 },
        { angle: 1, roll: 2, ratio: 1, width: 1 },
        { angle: -1, roll: 2, ratio: 1, width: 1 },
      ],
      maxDepth: 14,
    };
    const s = growWithRule(runaway, { angle: 0.5, ratio: 0.7, growth: 1, seed: SEED });
    expect(s.capped).toBe(true);
    expect(s.segments.length).toBeLessThanOrEqual(SEGMENT_CAP);
  });
});

describe('the controls clamp rather than escape', () => {
  test('angle', () => {
    expect(clampAngle(-5)).toBe(ANGLE_MIN);
    expect(clampAngle(99)).toBe(ANGLE_MAX);
    expect(clampAngle(Number.NaN)).toBe(ANGLE_MIN);
    expect(clampAngle(0.4)).toBe(0.4);
  });
  test('ratio', () => {
    expect(clampRatio(0)).toBe(RATIO_MIN);
    expect(clampRatio(2)).toBe(RATIO_MAX);
    expect(clampRatio(Number.NaN)).toBe(RATIO_MIN);
  });
  test('growth', () => {
    expect(clampGrowth(-1)).toBe(0);
    expect(clampGrowth(4)).toBe(1);
    expect(clampGrowth(Number.NaN)).toBe(0);
  });
  test('a structure grown past the ends is the structure at the ends', () => {
    expect(growStructure(base({ angle: 40 }))).toEqual(growStructure(base({ angle: ANGLE_MAX })));
    expect(growStructure(base({ ratio: -3 }))).toEqual(growStructure(base({ ratio: RATIO_MIN })));
  });
});

describe('the camera', () => {
  const flat = { minZ: -1, maxZ: 1 };
  const cam = cameraFor(flat);

  test('nearer is bigger and further is smaller', () => {
    expect(projectPoint(1, 1, -1, cam).k).toBeGreaterThan(1);
    expect(projectPoint(1, 1, 0, cam).k).toBeCloseTo(1, 12);
    expect(projectPoint(1, 1, 1, cam).k).toBeLessThan(1);
  });

  test('the perspective is the same strength whatever size the structure is', () => {
    // The point of placing the camera from the structure's own depth: a sparse
    // pine half a unit deep and a dense coral nine units deep get the SAME
    // amount of perspective, so the child's drag changes the shape and not the
    // lens. Measured as the near-to-far scale ratio.
    const spread = (minZ, maxZ) => {
      const c = cameraFor({ minZ, maxZ });
      return projectPoint(0, 0, minZ, c).k / projectPoint(0, 0, maxZ, c).k;
    };
    const tight = spread(-0.4, 0.4);
    const wide = spread(-4.6, 4.6);
    expect(tight).toBeCloseTo(wide, 9);
    // And it is the gentle amount the module's comment claims: 1.5 over 0.75.
    expect(tight).toBeCloseTo(2, 9);
  });

  test('a camera placed for the structure never comes near the safety floor', () => {
    // The floor exists for a caller that hands over the wrong camera. A camera
    // placed by cameraFor cannot reach it, at any seed, at any setting.
    for (const preset of PRESET_IDS) {
      for (let i = 0; i <= 5; i++) {
        for (let j = 0; j <= 5; j++) {
          const s = growStructure(
            base({
              preset,
              angle: ANGLE_MIN + ((ANGLE_MAX - ANGLE_MIN) * i) / 5,
              ratio: RATIO_MIN + ((RATIO_MAX - RATIO_MIN) * j) / 5,
            }),
          );
          const c = cameraFor(s);
          for (const seg of s.segments) {
            for (const z of [seg.z0, seg.z1]) {
              const k = projectPoint(0, 0, z, c).k;
              expect(k, `${preset} projected at ${k}`).toBeGreaterThan(0.6);
              expect(k).toBeLessThan(1.8);
            }
          }
        }
      }
    }
  });

  test('a point behind the camera cannot invert the picture', () => {
    expect(projectPoint(1, 1, -100, cam).k).toBeGreaterThan(0);
    expect(Number.isFinite(projectPoint(1, 1, -CAMERA_DISTANCE * 40, cam).k)).toBe(true);
  });

  test('the haze runs 0 to 1 and never leaves it', () => {
    expect(depthFade(-99, cam)).toBe(0);
    expect(depthFade(0, cam)).toBeCloseTo(0.5, 12);
    expect(depthFade(99, cam)).toBe(1);
    for (let z = -6; z <= 6; z += 0.05) {
      const f = depthFade(z, cam);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  test('every structure the child can grow fills the haze rather than saturating it', () => {
    for (const preset of PRESET_IDS) {
      const s = growStructure(base({ preset, angle: ANGLE_MAX, ratio: RATIO_MAX }));
      const c = cameraFor(s);
      let lo = 1;
      let hi = 0;
      for (const seg of s.segments) {
        for (const z of [seg.z0, seg.z1]) {
          const f = depthFade(z, c);
          if (f < lo) lo = f;
          if (f > hi) hi = f;
        }
      }
      expect(lo, `${preset} never reached the near end of the haze`).toBeLessThan(0.02);
      expect(hi, `${preset} never reached the far end of the haze`).toBeGreaterThan(0.98);
    }
  });
});

describe('the colour fence', () => {
  test('safeHue never lands in the banned band, anywhere on the circle', () => {
    for (let i = 0; i <= 20000; i++) {
      expect(hueIsAllowed(safeHue(i / 20000))).toBe(true);
    }
  });

  test('safeHue folds inputs outside 0..1 too', () => {
    for (const t of [-7.3, -1, 2.5, 41]) {
      expect(hueIsAllowed(safeHue(t))).toBe(true);
    }
  });

  test('every colour every seed can produce is outside the banned band', () => {
    // The palette walks a hue arc as the generations deepen, and this samples
    // the whole arc for every seed at fine spacing.
    for (const preset of PRESET_IDS) {
      for (let i = 0; i <= 500; i++) {
        const p = paletteAt(preset, i / 500);
        expect(hueIsAllowed(p.stemHue), `${preset} stem at ${i}`).toBe(true);
        expect(hueIsAllowed(p.litHue), `${preset} lit at ${i}`).toBe(true);
        expect(hueIsAllowed(p.skyHue), `${preset} sky at ${i}`).toBe(true);
      }
    }
  });

  test('every colour the segments themselves ask for is outside the banned band', () => {
    // The other direction: not the arc, but the hueT values a real structure
    // actually carries.
    for (const preset of PRESET_IDS) {
      const s = growStructure(base({ preset }));
      for (const seg of s.segments) {
        expect(seg.hueT).toBeGreaterThanOrEqual(0);
        expect(seg.hueT).toBeLessThanOrEqual(1);
        const p = paletteAt(preset, seg.hueT);
        expect(hueIsAllowed(p.stemHue)).toBe(true);
        expect(hueIsAllowed(p.litHue)).toBe(true);
      }
    }
  });

  test('a colour blended between any two colours of one seed is also outside the band', () => {
    // The renderer fades a branch toward the sky colour as it recedes, and it
    // does that by blending in RGB. A blend between two allowed hues is only
    // itself allowed if the two sit on the same side of the banned band and are
    // close enough together that the short way round does not cross it. That is
    // a property of the arcs authored in PRESETS, so it is asserted here rather
    // than assumed by the component: every hue a seed can produce lands in one
    // window under 180 degrees wide with no banned hue in it.
    for (const preset of PRESET_IDS) {
      const hues = [];
      for (let i = 0; i <= 200; i++) {
        const p = paletteAt(preset, i / 200);
        hues.push(p.stemHue, p.litHue, p.skyHue);
      }

      // Measured on the circle, not on the number line. Lightning's sky hue
      // folds to 359.7 and its stems sit near 55, which is a 92 degree arc
      // across zero and reads as a 334 degree span if you subtract naively.
      // The first version of this test did exactly that and failed on a palette
      // that was never in any danger.
      hues.sort((a, b) => a - b);
      let gapAt = 0;
      let gap = hues[0] + 360 - hues[hues.length - 1];
      for (let i = 1; i < hues.length; i++) {
        if (hues[i] - hues[i - 1] > gap) {
          gap = hues[i] - hues[i - 1];
          gapAt = i;
        }
      }
      const arcStart = hues[gapAt];
      const arcSpan = 360 - gap;

      expect(arcSpan, `${preset} spans ${arcSpan} degrees of hue`).toBeLessThan(180);
      for (let d = 0; d <= arcSpan; d += 0.25) {
        const h = (arcStart + d) % 360;
        expect(hueIsAllowed(h), `${preset} can blend through hue ${h}`).toBe(true);
      }
    }
  });

  test('the palette clamps rather than escaping its arc', () => {
    for (const preset of PRESET_IDS) {
      expect(paletteAt(preset, -4)).toEqual(paletteAt(preset, 0));
      expect(paletteAt(preset, 9)).toEqual(paletteAt(preset, 1));
    }
  });
});

describe('saying it out loud', () => {
  test('a bare seed says what to do, and nothing else does', () => {
    expect(describeStructure('tree', 0.5, 0.7, 0)).toContain('Drag up');
    expect(describeStructure('tree', 0.5, 0.7, 3)).not.toContain('Drag up');
  });

  test('every shape and length band is reachable and named', () => {
    const shapes = new Set();
    const lengths = new Set();
    for (let i = 0; i <= 60; i++) {
      shapes.add(shapeIndex(ANGLE_MIN + ((ANGLE_MAX - ANGLE_MIN) * i) / 60));
      lengths.add(lengthIndex(RATIO_MIN + ((RATIO_MAX - RATIO_MIN) * i) / 60));
    }
    expect(shapes.size).toBe(4);
    expect(lengths.size).toBe(3);
  });

  test('every description is a plain sentence, and none of them praise the child', () => {
    const praise = ['great', 'well done', 'amazing', 'perfect', 'good job', 'wow', 'clever'];
    for (const preset of PRESET_IDS) {
      for (let i = 0; i <= 8; i++) {
        for (let j = 0; j <= 8; j++) {
          for (const g of [0, 1, 2, 5]) {
            const line = describeStructure(
              preset,
              ANGLE_MIN + ((ANGLE_MAX - ANGLE_MIN) * i) / 8,
              RATIO_MIN + ((RATIO_MAX - RATIO_MIN) * j) / 8,
              g,
            );
            expect(line.trim()).toBe(line);
            expect(line.endsWith('.')).toBe(true);
            expect(line).not.toContain('!');
            expect(line).not.toContain('—');
            for (const word of praise) expect(line.toLowerCase()).not.toContain(word);
          }
        }
      }
    }
  });

  test('it counts the splits it can actually see', () => {
    expect(describeStructure('tree', 0.5, 0.7, 2)).toContain('split 1 time');
    expect(describeStructure('tree', 0.5, 0.7, 4)).toContain('split 3 times');
  });
});
