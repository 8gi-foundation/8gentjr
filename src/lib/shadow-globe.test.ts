/**
 * Shadow Globe: the mathematics, measured.
 *
 * Stereographic projection is one of the few things a child can be handed where
 * the surprising claims are exactly the provable ones, so almost nothing in
 * this file is a tolerance chosen to make a test pass. The projection either
 * takes circles to circles or it does not, and the residual comes out at the
 * size of a rounding error or at the size of a bug, with nothing in between.
 *
 * Three rules the whole file is written to:
 *
 *   1. MEASURE THE DRAWN THING. `projectCircle` gives the analytic image of a
 *      circle and `circleSamples` gives the points the canvas actually strokes.
 *      A test that only ever checked the formula against itself would prove
 *      nothing about the picture, so the headline claim is checked against the
 *      samples, and a circle is INDEPENDENTLY fitted to those samples by least
 *      squares so that a shared bug in the two has somewhere to show up.
 *
 *   2. SCOPE EVERY CLAIM TO WHAT IT DRIVES. Where a bound holds only at the
 *      defaults, or only for two patterns out of three, the test comment says
 *      so. Light Bender lost four review points to sentences that were true of
 *      the run and not of the range.
 *
 *   3. PIN EVERY CHILD-FACING NUMBER WITH A MEANING. A threshold asserted as
 *      equal to itself is not pinned. The thresholds here are measured against
 *      what a child has to do to reach them and against what the opening scene
 *      already shows, because both of those are what a drifted constant breaks.
 *
 * Issue: #225 (wave 7, Shadow Globe)
 */

import { describe, expect, test } from 'bun:test';
import {
  AREA_CAP,
  BASE_HZ,
  CORE_HALF_W,
  DRAG_GAIN,
  FLOOR_AREA,
  FLOOR_R,
  IDENTITY,
  INK_MAX,
  KEY_TRAVEL,
  LAMP_MAX,
  LINE_EPS,
  MAG_CAP,
  MIN_CANVAS_PX,
  PARTIALS,
  PATTERNS,
  PATTERN_EXTENT,
  PATTERN_POLAR,
  PITCH_MAX,
  PITCH_MIN,
  POLE,
  SCENE_HALF_W,
  TALL_ASPECT,
  WIDE_ASPECT,
  add,
  anchorAtStart,
  applyDrag,
  applyKeyTurn,
  camera,
  cameraPitch,
  chordSpread,
  circleMagnify,
  circleNearestPolar,
  circleSamples,
  clampLampTilt,
  clampToFloor,
  coreHalfH,
  cross,
  describeShadow,
  dot,
  fitScene,
  floorFrame,
  floorHue,
  floorPoint,
  globeHue,
  holdAmpNext,
  inverseStereographic,
  lampDirection,
  lampHue,
  lampRotation,
  length,
  magnification,
  motionAmplitudes,
  normalize,
  partialHz,
  patternAnchor,
  patternCircles,
  patternLabel,
  project3,
  projectCircle,
  quatAngleBetween,
  quatConjugate,
  quatFromAxisAngle,
  quatMul,
  quatNormalize,
  readShadow,
  ringArea,
  rotate,
  scale,
  sceneHalfH,
  sceneRotation,
  shadowFootprint,
  shadowHue,
  shadowInk,
  shadowPolyline,
  shouldSchedule,
  stereographic,
  turnCircle,
  v3,
  type Floor,
  type PatternId,
  type Quat,
  type SphereCircle,
  type Vec3,
} from '@/lib/shadow-globe';
import { hueIsAllowed } from '@/lib/pattern-garden';

// ---------------------------------------------------------------------------
// Helpers used by the tests, deliberately independent of the module
// ---------------------------------------------------------------------------

/** A reproducible stream, so a failure can be re-run. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randomUnit(r: () => number): Vec3 {
  // Marsaglia, so the directions are uniform on the sphere rather than bunched
  // at the poles the way naive angle pairs are.
  const z = 2 * r() - 1;
  const t = 2 * Math.PI * r();
  const s = Math.sqrt(Math.max(0, 1 - z * z));
  return { x: s * Math.cos(t), y: s * Math.sin(t), z };
}

function randomQuat(r: () => number): Quat {
  return quatFromAxisAngle(randomUnit(r), (r() - 0.5) * 4 * Math.PI);
}

/**
 * A circle fitted to points, by least squares, with no reference to the module.
 *
 * The algebraic form: every point on a circle satisfies
 * u^2 + v^2 = 2 a u + 2 b v + c, which is LINEAR in (a, b, c), so the fit is
 * one 3x3 solve and has no starting guess to get wrong. Centre (a, b), radius
 * sqrt(c + a^2 + b^2).
 *
 * This exists so that "the drawn points lie on a circle" is established by
 * something that has never seen `projectCircle`. Comparing samples only to the
 * analytic image would leave a bug shared by both invisible.
 */
function fitCircle(points: Floor[]): { cx: number; cy: number; r: number } {
  const n = points.length;
  let Suu = 0;
  let Svv = 0;
  let Suv = 0;
  let Su = 0;
  let Sv = 0;
  let Sw = 0;
  let Swu = 0;
  let Swv = 0;
  for (const p of points) {
    const w = p.u * p.u + p.v * p.v;
    Suu += p.u * p.u;
    Svv += p.v * p.v;
    Suv += p.u * p.v;
    Su += p.u;
    Sv += p.v;
    Sw += w;
    Swu += w * p.u;
    Swv += w * p.v;
  }
  // Normal equations for [2a, 2b, c].
  const A = [
    [Suu, Suv, Su],
    [Suv, Svv, Sv],
    [Su, Sv, n],
  ];
  const b = [Swu, Swv, Sw];
  const x = solve3(A, b);
  const cx = x[0] / 2;
  const cy = x[1] / 2;
  return { cx, cy, r: Math.sqrt(Math.max(0, x[2] + cx * cx + cy * cy)) };
}

function solve3(A: number[][], b: number[]): number[] {
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const d = m[col][col];
    for (let c = col; c < 4; c++) m[col][c] /= d;
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = m[r][col];
      for (let c = col; c < 4; c++) m[r][c] -= f * m[col][c];
    }
  }
  return [m[0][3], m[1][3], m[2][3]];
}

/** The area a closed run of floor points encloses, by the shoelace formula. */
function polygonArea(points: Floor[]): number {
  let acc = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    acc += a.u * b.v - b.u * a.v;
  }
  return Math.abs(acc) / 2;
}

const circleAt = (axis: Vec3, radius: number): SphereCircle => ({
  axis: normalize(axis),
  radius,
  weight: 1,
});

/** A point on the sphere at a given angle from the lamp, on a given bearing. */
function atPolar(theta: number, bearing = 0): Vec3 {
  return {
    x: Math.sin(theta) * Math.cos(bearing),
    y: Math.sin(theta) * Math.sin(bearing),
    z: Math.cos(theta),
  };
}

// ---------------------------------------------------------------------------

describe('vectors and rotations', () => {
  test('rotating a point never changes how long it is', () => {
    const r = rng(11);
    for (let i = 0; i < 400; i++) {
      const p = randomUnit(r);
      const q = randomQuat(r);
      expect(Math.abs(length(rotate(q, p)) - 1)).toBeLessThan(1e-14);
    }
  });

  test('a rotation undone by its conjugate is no rotation at all', () => {
    const r = rng(12);
    for (let i = 0; i < 200; i++) {
      const p = randomUnit(r);
      const q = randomQuat(r);
      const back = rotate(quatConjugate(q), rotate(q, p));
      expect(Math.hypot(back.x - p.x, back.y - p.y, back.z - p.z)).toBeLessThan(1e-13);
    }
  });

  test('rotations compose in the order the product says', () => {
    const r = rng(13);
    for (let i = 0; i < 200; i++) {
      const a = randomQuat(r);
      const b = randomQuat(r);
      const p = randomUnit(r);
      const viaProduct = rotate(quatMul(a, b), p);
      const inTurn = rotate(a, rotate(b, p));
      expect(
        Math.hypot(
          viaProduct.x - inTurn.x,
          viaProduct.y - inTurn.y,
          viaProduct.z - inTurn.z,
        ),
      ).toBeLessThan(1e-13);
    }
  });

  test('the angle between two orientations does not care which sign the quaternion has', () => {
    // Not tidiness. q and -q are the same rotation, and without the absolute
    // value a child who rolled the globe the long way home would be told they
    // were 340 degrees away when the picture in front of them was 20 degrees
    // from where it started. This is the guard on the fourth naming line.
    const r = rng(14);
    for (let i = 0; i < 300; i++) {
      const a = randomQuat(r);
      const b = randomQuat(r);
      const negB: Quat = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
      expect(Math.abs(quatAngleBetween(a, b) - quatAngleBetween(a, negB))).toBeLessThan(1e-12);
      expect(quatAngleBetween(a, b)).toBeLessThanOrEqual(Math.PI + 1e-12);
    }
  });

  test('the angle really is the angle: a known turn reports its own size', () => {
    for (const angle of [0, 0.3, 1, 2, 3, Math.PI]) {
      const q = quatFromAxisAngle(v3(0.3, -0.5, 0.81), angle);
      expect(quatAngleBetween(q, IDENTITY)).toBeCloseTo(angle, 12);
    }
  });

  test('and it never exceeds a half turn, however far round the quaternion went', () => {
    // A rotation of 5 radians about an axis is a rotation of 2 * PI - 5 about
    // the other way, and 2 * PI - 5 is what a child sees.
    const q = quatFromAxisAngle(v3(0, 0, 1), 5);
    expect(quatAngleBetween(q, IDENTITY)).toBeCloseTo(2 * Math.PI - 5, 12);
  });
});

// ---------------------------------------------------------------------------

describe('the projection', () => {
  test('the far pole lands dead centre and the lamp has no image at all', () => {
    expect(stereographic(v3(0, 0, -1))).toEqual({ u: 0, v: 0 });
    expect(stereographic(POLE)).toBeNull();
  });

  test('the waist of the ball lands exactly on the unit circle', () => {
    // The gift that pays for the floor being the plane through the middle: the
    // child gets a ring painted on the floor that says where the ball's waist
    // is, and it costs nothing to draw because it is the equator's own shadow.
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      const p = stereographic(v3(Math.cos(t), Math.sin(t), 0))!;
      expect(Math.hypot(p.u, p.v)).toBeCloseTo(1, 14);
    }
  });

  test('a point at angle theta from the lamp lands at exactly cot(theta / 2)', () => {
    // THE law of the whole activity, and everything else is a consequence of
    // it: the shadow's distance from the middle of the floor depends on nothing
    // but how far round the ball the point is. Below the waist it is inside the
    // ring, above it outside, and it runs away as the point nears the lamp.
    // Measured relative to the value, because near the lamp the value itself is
    // in the hundreds and an absolute bound there would be a bound on nothing.
    let worst = 0;
    for (let i = 1; i < 400; i++) {
      const theta = (i / 400) * Math.PI;
      const p = stereographic(atPolar(theta, 0.7))!;
      const expected = 1 / Math.tan(theta / 2);
      worst = Math.max(worst, Math.abs(Math.hypot(p.u, p.v) - expected) / expected);
    }
    expect(worst).toBeLessThan(5e-12);
  });

  test('nothing is lost: sphere to floor and back is exact to twelve places', () => {
    // The fourth naming line, as arithmetic. The map has an inverse everywhere
    // except at the lamp, so the shape is recoverable from its shadow at every
    // moment however mangled the shadow looks.
    const r = rng(21);
    let worst = 0;
    for (let i = 0; i < 4000; i++) {
      const p = randomUnit(r);
      if (1 - p.z < 1e-6) continue;
      const f = stereographic(p)!;
      const back = inverseStereographic(f.u, f.v);
      worst = Math.max(worst, Math.hypot(back.x - p.x, back.y - p.y, back.z - p.z));
    }
    expect(worst).toBeLessThan(1e-12);
  });

  test('and floor to sphere and back is exact too, right out to the edge', () => {
    const r = rng(22);
    let worst = 0;
    for (let i = 0; i < 4000; i++) {
      const u = (r() - 0.5) * 2 * FLOOR_R;
      const v = (r() - 0.5) * 2 * FLOOR_R;
      const p = inverseStereographic(u, v);
      expect(Math.abs(length(p) - 1)).toBeLessThan(1e-14);
      const f = stereographic(p)!;
      worst = Math.max(worst, Math.hypot(f.u - u, f.v - v));
    }
    expect(worst).toBeLessThan(1e-12);
  });

  test('the magnification is one over one minus z, and nothing else', () => {
    const r = rng(23);
    for (let i = 0; i < 500; i++) {
      const p = randomUnit(r);
      if (1 - p.z < 1e-3) continue;
      expect(magnification(p)).toBeCloseTo(1 / (1 - p.z), 10);
    }
    // The three readings a child can be shown, pinned. Half at the far pole,
    // one at the waist, and it runs away toward the lamp.
    expect(magnification(v3(0, 0, -1))).toBeCloseTo(0.5, 14);
    expect(magnification(v3(1, 0, 0))).toBeCloseTo(1, 14);
    expect(magnification(atPolar(0.1))).toBeCloseTo(1 / (1 - Math.cos(0.1)), 10);
  });

  test('magnification rises without a single step back as a point climbs to the lamp', () => {
    // "Near the light grows huge" is a claim of MONOTONICITY, not only of
    // largeness. A map that were merely big near the lamp and lumpy on the way
    // would not teach a child anything they could act on with a finger.
    // SCOPE: from the far pole up to the angle at which the cap takes over,
    // which is where 1 / (1 - cos theta) reaches MAG_CAP. Past that the reading
    // is deliberately flat and the next test is the one that covers it.
    const capAngle = Math.acos(1 - 1 / MAG_CAP);
    let last = Number.POSITIVE_INFINITY;
    for (let i = 0; i <= 900; i++) {
      const theta = capAngle + (Math.PI - capAngle) * (i / 900);
      const m = magnification(atPolar(theta));
      expect(m).toBeLessThan(last);
      last = m;
    }
    expect(last).toBeCloseTo(0.5, 12);
    expect(magnification(atPolar(capAngle * 0.5))).toBe(MAG_CAP);
  });

  test('it never returns infinity, however hard a point is pushed at the lamp', () => {
    // A gain node, a screen reader sentence and a naming reducer all read this,
    // and a division by zero in any of them is a session over.
    expect(magnification(POLE)).toBe(MAG_CAP);
    expect(magnification(atPolar(1e-300))).toBe(MAG_CAP);
    expect(Number.isFinite(magnification(atPolar(1e-9)))).toBe(true);
  });

  test('angles are kept: the map stretches equally in every direction, everywhere', () => {
    // Conformality, measured rather than cited. The derivative is taken by
    // central differences along two perpendicular tangent directions; if the
    // map were not conformal the two images would differ in length or stop
    // being perpendicular. The error floor is the h^2 of the difference, which
    // is why the bound is 1e-7 and not machine epsilon.
    const r = rng(24);
    const h = 1e-5;
    let worstScale = 0;
    let worstRight = 0;
    for (let i = 0; i < 300; i++) {
      const p = randomUnit(r);
      if (1 - p.z < 0.02) continue;
      const t1 = normalize(cross(p, randomUnit(r)));
      const t2 = cross(p, t1);

      const derivative = (t: Vec3) => {
        const plus = stereographic(normalize(add(p, scale(t, h))))!;
        const minus = stereographic(normalize(add(p, scale(t, -h))))!;
        return { u: (plus.u - minus.u) / (2 * h), v: (plus.v - minus.v) / (2 * h) };
      };
      const d1 = derivative(t1);
      const d2 = derivative(t2);
      const l1 = Math.hypot(d1.u, d1.v);
      const l2 = Math.hypot(d2.u, d2.v);

      worstScale = Math.max(worstScale, Math.abs(l1 - l2) / l1);
      worstRight = Math.max(worstRight, Math.abs(d1.u * d2.u + d1.v * d2.v) / (l1 * l2));
      // And the common scale is the magnification, which is what makes that one
      // number mean what the third naming line says it means.
      expect(Math.abs(l1 - magnification(p)) / l1).toBeLessThan(1e-7);
    }
    expect(worstScale).toBeLessThan(1e-7);
    expect(worstRight).toBeLessThan(1e-7);
  });
});

// ---------------------------------------------------------------------------

describe('circles stay circles', () => {
  test('the points that are actually DRAWN lie on the analytic circle', () => {
    // The headline claim, checked against the polyline the canvas strokes.
    // Circles whose nearest point to the lamp is inside 0.05 radians are left
    // out and get their own test below: their images are millions of units
    // across and the residual there is measured against a different scale.
    const r = rng(31);
    let worst = 0;
    let checked = 0;
    for (let i = 0; i < 600; i++) {
      const c = circleAt(randomUnit(r), 0.05 + r() * (Math.PI - 0.1));
      if (circleNearestPolar(c) < 0.05) continue;
      const image = projectCircle(c);
      if (image.throughLamp) continue;
      checked++;
      for (const p of circleSamples(c, 64)) {
        const f = stereographic(p)!;
        const d = Math.hypot(f.u - image.cx, f.v - image.cy);
        worst = Math.max(worst, Math.abs(d - image.r) / image.r);
      }
    }
    expect(checked).toBeGreaterThan(400);
    expect(worst).toBeLessThan(1e-9);
  });

  test('and a circle fitted to those points, by something that has never seen the formula, agrees', () => {
    // The independent half. `fitCircle` is a plain least squares living in this
    // file, so a bug shared by `projectCircle` and `circleSamples` has
    // somewhere to show up. Without this the test above is two halves of the
    // same idea agreeing with each other.
    const r = rng(32);
    let worstCentre = 0;
    let worstRadius = 0;
    let checked = 0;
    for (let i = 0; i < 300; i++) {
      const c = circleAt(randomUnit(r), 0.1 + r() * 2.9);
      if (circleNearestPolar(c) < 0.3) continue;
      const image = projectCircle(c);
      if (image.throughLamp) continue;
      const points = circleSamples(c, 128).map((p) => stereographic(p)!);
      const fitted = fitCircle(points);
      checked++;
      worstCentre = Math.max(
        worstCentre,
        Math.hypot(fitted.cx - image.cx, fitted.cy - image.cy) / image.r,
      );
      worstRadius = Math.max(worstRadius, Math.abs(fitted.r - image.r) / image.r);
    }
    expect(checked).toBeGreaterThan(150);
    expect(worstCentre).toBeLessThan(1e-9);
    expect(worstRadius).toBeLessThan(1e-9);
  });

  test('a circle that passes through the lamp becomes a straight line', () => {
    // The one exception in the theorem, and the activity draws it rather than
    // hiding it: as a ring sweeps over the lamp its shadow straightens out,
    // flips inside out, and closes up again on the other side.
    const r = rng(33);
    let worst = 0;
    for (let i = 0; i < 200; i++) {
      const axis = randomUnit(r);
      // A circle through the lamp is exactly one whose angular radius equals
      // the angle from its axis to the lamp.
      const c = circleAt(axis, Math.acos(Math.max(-1, Math.min(1, axis.z))));
      const image = projectCircle(c);
      expect(image.throughLamp).toBe(true);
      const line = image.line!;
      const norm = Math.hypot(line.a, line.b);
      for (const p of circleSamples(c, 96)) {
        const f = stereographic(p);
        if (!f) continue;
        const residual = Math.abs(line.a * f.u + line.b * f.v - line.c);
        worst = Math.max(worst, residual / (norm * (1 + Math.hypot(f.u, f.v))));
      }
    }
    expect(worst).toBeLessThan(1e-9);
  });

  test('the two branches meet: a circle a hair off the lamp is a circle a hair too big to see the curve of', () => {
    // The crossover is not arbitrary. The image radius goes as one over the
    // distance from the lamp plane, so at LINE_EPS the "circle" is already
    // millions of floor units across and every piece of it inside the drawn
    // floor is straight to far under a pixel.
    // Built by choosing the distance from the lamp plane directly: a circle
    // with axis at polar angle t and angular radius acos(cos t - A) misses the
    // lamp's plane by exactly A.
    const t = 1;
    const withGap = (A: number) => circleAt(atPolar(t), Math.acos(Math.cos(t) - A));

    expect(projectCircle(withGap(LINE_EPS * 0.4)).throughLamp).toBe(true);

    const image = projectCircle(withGap(LINE_EPS * 4));
    expect(image.throughLamp).toBe(false);
    expect(image.r).toBeGreaterThan(1e6);
    // How far that enormous circle bows away from its own tangent line across
    // the whole width of the drawn floor: r - sqrt(r^2 - FLOOR_R^2), which at
    // this radius is far below any pixel a child will ever look at.
    const sagitta = image.r - Math.sqrt(image.r * image.r - FLOOR_R * FLOOR_R);
    expect(sagitta).toBeLessThan(1e-5);
  });

  test('the waist ring is its own shadow, exactly', () => {
    const image = projectCircle(circleAt(v3(0, 0, 1), Math.PI / 2));
    // The equator's plane misses the lamp by the whole radius of the ball, so
    // this is firmly on the circle branch and comes out as the unit circle.
    expect(image.throughLamp).toBe(false);
    expect(image.cx).toBeCloseTo(0, 14);
    expect(image.cy).toBeCloseTo(0, 14);
    expect(image.r).toBeCloseTo(1, 14);
  });

  test('a ring that has the lamp inside it is measured by how near it gets, not how far past', () => {
    // The absolute value in `circleNearestPolar`, as a test. A ring whose axis
    // is nearer the lamp than its own angular radius encircles the lamp, and
    // the naive difference goes negative and hands back a magnification BELOW
    // the far pole's for the single most blown up shape on the screen.
    const enclosing = circleAt(atPolar(0.2), 0.5);
    expect(circleNearestPolar(enclosing)).toBeCloseTo(0.3, 12);
    expect(circleMagnify(enclosing)).toBeCloseTo(1 / (1 - Math.cos(0.3)), 8);
    expect(circleMagnify(enclosing)).toBeGreaterThan(20);
  });

  test('turning a ring moves where it is and never what size it is', () => {
    const r = rng(34);
    for (let i = 0; i < 200; i++) {
      const c = circleAt(randomUnit(r), 0.2 + r() * 2.5);
      const turned = turnCircle(c, randomQuat(r));
      expect(turned.radius).toBe(c.radius);
      expect(Math.abs(length(turned.axis) - 1)).toBeLessThan(1e-13);
    }
  });

  test('a run of drawn points is dropped only where it truly runs off to nowhere', () => {
    const through = circleAt(v3(0.6, 0, Math.sqrt(1 - 0.36)), Math.acos(Math.sqrt(1 - 0.36)));
    const run = shadowPolyline(through, 512);
    expect(run.length).toBe(512);
    // At most a couple of samples can land inside the lamp's own epsilon, and
    // everything else has a place on the floor to be drawn at.
    expect(run.filter((p) => p === null).length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------

describe('near the light grows huge', () => {
  test('a magnification of four is a ring eight times the size it had under the ball', () => {
    // The meaning of POLE_HUGE, measured. The reading the naming line is gated
    // on is a local scale, and this turns it into the thing a child sees: the
    // same ring, at the far pole and at the place where the reading reaches
    // four, and how many times bigger its drawn shadow has become.
    const ring: SphereCircle = { axis: v3(0, 0, -1), radius: 0.12, weight: 1 };
    const atRest = projectCircle(ring);

    // The polar angle at which the reading is exactly four.
    const theta = Math.acos(1 - 1 / 4);
    const lifted = circleAt(atPolar(theta + 0.12), 0.12);
    expect(circleMagnify(lifted)).toBeCloseTo(4, 9);
    const blown = projectCircle(lifted);

    expect(blown.r / atRest.r).toBeGreaterThan(6);
    // And it is out past the waist ring, on the floor rather than off it, which
    // is what makes it the shot worth taking.
    const centreDistance = Math.hypot(blown.cx, blown.cy);
    expect(centreDistance).toBeGreaterThan(1);
    expect(centreDistance + blown.r).toBeLessThan(FLOOR_R);
  });

  test('a ring creeping toward the lamp grows without a single step back', () => {
    const radius = 0.15;
    let last = 0;
    for (let i = 0; i < 300; i++) {
      // From well under the ball up to a fifth of a radian off the lamp.
      const theta = 3.0 - (i / 300) * 2.6;
      const m = circleMagnify(circleAt(atPolar(theta), radius));
      expect(m).toBeGreaterThan(last);
      last = m;
    }
  });

  test('and the drawn ring grows with it, monotonically, over the same run', () => {
    // The reading is a local scale at one point; the thing the child sees is
    // the whole ring. They could in principle disagree, so this drives the
    // drawn image rather than the reading.
    const radius = 0.15;
    let last = 0;
    for (let i = 0; i < 300; i++) {
      const theta = 3.0 - (i / 300) * 2.6;
      const image = projectCircle(circleAt(atPolar(theta), radius));
      expect(image.throughLamp).toBe(false);
      expect(image.r).toBeGreaterThan(last);
      last = image.r;
    }
  });
});

// ---------------------------------------------------------------------------

describe('the patterns', () => {
  test('every pattern is a real set of rings with a label', () => {
    for (const id of PATTERNS) {
      const circles = patternCircles(id);
      expect(circles.length).toBeGreaterThanOrEqual(5);
      for (const c of circles) {
        expect(Math.abs(length(c.axis) - 1)).toBeLessThan(1e-13);
        expect(c.radius).toBeGreaterThan(0);
        expect(c.radius).toBeLessThan(Math.PI / 2);
      }
      expect(patternLabel(id).length).toBeGreaterThan(2);
    }
  });

  test('no pattern reaches further from its own middle than the extent allows', () => {
    // Distortion is a ratio of magnifications across the picture, and a pattern
    // spread over a wide band of latitudes carries a big ratio around with it
    // before the child has touched anything. This is the guard on that.
    const anchor = patternAnchor();
    for (const id of PATTERNS) {
      let worst = 0;
      for (const c of patternCircles(id)) {
        const separation = Math.acos(Math.max(-1, Math.min(1, dot(c.axis, anchor))));
        worst = Math.max(worst, separation + c.radius);
      }
      expect(worst, `${id} reaches ${worst.toFixed(3)} from its middle`).toBeLessThanOrEqual(
        PATTERN_EXTENT,
      );
    }
  });

  test('the pattern starts below the waist and facing the child', () => {
    const anchor = patternAnchor();
    // Below the waist: its shadow is inside the waist ring at the start, which
    // is what makes rolling it up over the top a discovery rather than a start.
    expect(anchor.z).toBeLessThan(0);
    expect(Math.acos(anchor.z)).toBeCloseTo(PATTERN_POLAR, 12);
    // Toward the child: the camera's toward-axis has a negative y, and the
    // pattern's middle sits on the negative y side of the ball.
    expect(anchor.y).toBeLessThan(-0.5);
    // Dead centre left to right, so the opening picture is not lopsided before
    // anybody has done anything.
    expect(Math.abs(anchor.x)).toBeLessThan(1e-15);
  });

  test('the shadow at the start is a tidy little picture inside the waist ring', () => {
    for (const id of PATTERNS) {
      const fp = shadowFootprint({ pattern: id, orient: IDENTITY, lampTilt: 0 });
      for (const c of fp.circles) {
        expect(c.throughLamp).toBe(false);
        expect(Math.hypot(c.cx, c.cy) + c.r).toBeLessThan(FLOOR_R);
      }
      // Every ring on the floor, so nothing about the opening picture is
      // hidden off the edge.
      expect(fp.onFloor).toBe(fp.circles.length);
    }
  });
});

// ---------------------------------------------------------------------------

describe('the child holds the globe', () => {
  test('a drag downward brings the underside of the ball up toward the lamp', () => {
    // The gesture the whole activity turns on, and the sign that is invisible
    // until a child has it in their hands. The pattern starts below the waist;
    // pulling down has to carry it up the front and over the top.
    const before = Math.acos(patternAnchor().z);
    const after = Math.acos(rotate(applyDrag(IDENTITY, 0, 0.5), patternAnchor()).z);
    expect(after).toBeLessThan(before);
  });

  test('a drag upward pushes it further under, which is the other half of the same sign', () => {
    const before = Math.acos(patternAnchor().z);
    const after = Math.acos(rotate(applyDrag(IDENTITY, 0, -0.5), patternAnchor()).z);
    expect(after).toBeGreaterThan(before);
  });

  test('a drag sideways spins the picture and does not lift it', () => {
    // Sideways is a turn about the lamp's own axis, so it moves the shadow
    // round the floor without changing how magnified anything is. That is not a
    // dead gesture: it is the one that shows a child the shadow moving while
    // nothing about its size changes.
    const q = applyDrag(IDENTITY, 0.5, 0);
    const anchor = patternAnchor();
    expect(rotate(q, anchor).z).toBeCloseTo(anchor.z, 12);
    const spun = shadowFootprint({ pattern: 'beetle', orient: q, lampTilt: 0 });
    const still = shadowFootprint({ pattern: 'beetle', orient: IDENTITY, lampTilt: 0 });
    expect(spun.magnify).toBeCloseTo(still.magnify, 10);
    expect(spun.anchor.u).not.toBeCloseTo(still.anchor.u, 3);
  });

  test('the gain is what it says: a drag of one globe radius turns it by DRAG_GAIN radians', () => {
    // SCOPE: up to a half turn, which is where the angle between two
    // orientations stops growing because going further round is a shorter way
    // back. The last case checks that fold rather than pretending it is not
    // there: a drag of two radii is 3.2 radians, which a child sees as 3.08 the
    // other way.
    for (const travel of [0.1, 0.35, 1, Math.PI / DRAG_GAIN]) {
      expect(quatAngleBetween(applyDrag(IDENTITY, travel, 0), IDENTITY)).toBeCloseTo(
        travel * DRAG_GAIN,
        11,
      );
    }
    expect(quatAngleBetween(applyDrag(IDENTITY, 2, 0), IDENTITY)).toBeCloseTo(
      2 * Math.PI - 2 * DRAG_GAIN,
      11,
    );
  });

  test('a drag of nothing is not a drag', () => {
    expect(applyDrag(IDENTITY, 0, 0)).toEqual(IDENTITY);
    expect(applyDrag(IDENTITY, Number.NaN, 0)).toEqual(IDENTITY);
  });

  test('the orientation stays a rotation over thousands of drags', () => {
    // The reason this is a quaternion and is normalised after every step. A
    // matrix accumulating the same drags shears visibly inside a long session,
    // and a sheared globe stops being able to come home.
    const r = rng(41);
    let q = IDENTITY;
    for (let i = 0; i < 5000; i++) q = applyDrag(q, (r() - 0.5) * 0.2, (r() - 0.5) * 0.2);
    expect(Math.abs(Math.hypot(q.x, q.y, q.z, q.w) - 1)).toBeLessThan(1e-12);
    expect(Math.abs(length(rotate(q, v3(0, 0, 1))) - 1)).toBeLessThan(1e-12);
  });

  test('a drag is applied in the room and not in the ball, however far the ball has drifted', () => {
    // Post-multiplying instead would apply the drag in the ball's own turned
    // frame, so after a big roll a downward drag would send the pattern
    // sideways and the control would feel broken exactly when a child was
    // getting somewhere.
    const drifted = quatFromAxisAngle(v3(0, 0, 1), 2.4);
    const probe = v3(0, -1, 0);
    const straight = rotate(applyDrag(IDENTITY, 0, 0.4), probe);
    const afterDrift = rotate(applyDrag(drifted, 0, 0.4), rotate(quatConjugate(drifted), probe));
    // A point that LOOKS like it is at the front goes to the same place on the
    // screen whichever way the ball happens to be turned underneath.
    expect(Math.hypot(straight.x - afterDrift.x, straight.y - afterDrift.y, straight.z - afterDrift.z)).toBeLessThan(1e-12);
  });

  test('the keys are the drag, so there is only one control to get wrong', () => {
    expect(applyKeyTurn(IDENTITY, 'down')).toEqual(applyDrag(IDENTITY, 0, KEY_TRAVEL));
    expect(applyKeyTurn(IDENTITY, 'up')).toEqual(applyDrag(IDENTITY, 0, -KEY_TRAVEL));
    expect(applyKeyTurn(IDENTITY, 'right')).toEqual(applyDrag(IDENTITY, KEY_TRAVEL, 0));
    expect(applyKeyTurn(IDENTITY, 'left')).toEqual(applyDrag(IDENTITY, -KEY_TRAVEL, 0));
  });

  test('twelve presses out and twelve back land on exactly where it started', () => {
    // The fourth naming line has to be reachable from the keyboard, and it is
    // gated on getting back inside a small angle of home. Same axis both ways,
    // so this is exact rather than nearly.
    let q = IDENTITY;
    for (let i = 0; i < 12; i++) q = applyKeyTurn(q, 'down');
    expect(quatAngleBetween(q, IDENTITY)).toBeCloseTo(12 * KEY_TRAVEL * DRAG_GAIN, 10);
    for (let i = 0; i < 12; i++) q = applyKeyTurn(q, 'up');
    expect(quatAngleBetween(q, IDENTITY)).toBeLessThan(1e-9);
  });
});

// ---------------------------------------------------------------------------

describe('the lamp', () => {
  test('the lamp sits on the ball and starts on top', () => {
    expect(lampDirection(0)).toEqual({ x: 0, y: 0, z: 1 });
    for (const t of [0, 0.4, 1, LAMP_MAX]) {
      expect(Math.abs(length(lampDirection(t)) - 1)).toBeLessThan(1e-14);
    }
  });

  test('the lamp travel is clamped, and rubbish clamps to the top', () => {
    expect(clampLampTilt(-3)).toBe(0);
    expect(clampLampTilt(99)).toBe(LAMP_MAX);
    expect(clampLampTilt(Number.NaN)).toBe(0);
  });

  test('turning the scene by the lamp rotation puts the lamp back on the pole', () => {
    // This is what makes the lamp control honest. The projection is only
    // stereographic from the north pole onto the plane square to it, so the
    // lamp moving is implemented as the scene turning, and the floor turns with
    // it. If this were wrong the child would be shown ellipses and told they
    // were circles.
    for (let i = 0; i <= 20; i++) {
      const tilt = (i / 20) * LAMP_MAX;
      const home = rotate(lampRotation(tilt), lampDirection(tilt));
      expect(Math.hypot(home.x, home.y, home.z - 1)).toBeLessThan(1e-13);
    }
  });

  test('the floor stays square to the lamp at every tilt', () => {
    for (let i = 0; i <= 20; i++) {
      const tilt = (i / 20) * LAMP_MAX;
      const f = floorFrame(tilt);
      expect(Math.abs(dot(f.normal, f.e1))).toBeLessThan(1e-14);
      expect(Math.abs(dot(f.normal, f.e2))).toBeLessThan(1e-14);
      expect(Math.abs(dot(f.e1, f.e2))).toBeLessThan(1e-14);
      expect(Math.abs(length(f.normal) - 1)).toBeLessThan(1e-14);
      // And the floor's normal IS the lamp, which is the whole constraint.
      const lamp = lampDirection(tilt);
      expect(Math.hypot(f.normal.x - lamp.x, f.normal.y - lamp.y, f.normal.z - lamp.z)).toBeLessThan(
        1e-14,
      );
    }
  });

  test('a shadow placed on the tipped floor is on the line from the lamp through the point', () => {
    // The rays the component draws are not decoration: this proves the drawn
    // geometry is the projection rather than a picture of it. For a point p on
    // the ball, the floor position of its shadow has to be collinear with the
    // lamp and p.
    const r = rng(51);
    let worst = 0;
    for (let i = 0; i < 400; i++) {
      const tilt = r() * LAMP_MAX;
      const p = randomUnit(r);
      const turned = rotate(lampRotation(tilt), p);
      const image = stereographic(turned);
      if (!image || Math.hypot(image.u, image.v) > 50) continue;
      const f = floorFrame(tilt);
      const placed = floorPoint(f, image.u, image.v);
      const lamp = lampDirection(tilt);
      // Collinear: (placed - lamp) parallel to (p - lamp).
      const a = add(placed, scale(lamp, -1));
      const b = add(p, scale(lamp, -1));
      const perp = length(cross(normalize(a), normalize(b)));
      worst = Math.max(worst, perp);
    }
    expect(worst).toBeLessThan(1e-9);
  });

  test('the scene rotation is the child first and the lamp second', () => {
    const r = rng(52);
    for (let i = 0; i < 100; i++) {
      const orient = randomQuat(r);
      const tilt = r() * LAMP_MAX;
      expect(sceneRotation(orient, tilt)).toEqual(quatMul(lampRotation(tilt), orient));
    }
  });
});

// ---------------------------------------------------------------------------

describe('the footprint, which the picture and the sound both come from', () => {
  test('the area reported is the area of the polylines that are drawn', () => {
    // THE pin the brief asks for: the number the chord is built from is
    // measured back off the shape on the floor, by the shoelace formula, with
    // no reference to `ringArea` or to `projectCircle`. If the sound and the
    // picture ever came apart, this is where it would show.
    //
    // The residual is a POLYGON DEFICIT and not a disagreement, so the test
    // proves that rather than asserting it: the same measurement is taken at
    // two sample counts and required to shrink like one over the count squared,
    // which is what a discretisation does and what a wrong area does not. The
    // deficit is bigger than the textbook (pi/n)^2 / 3 because the samples are
    // evenly spaced round the ring on the GLASS and the projection does not
    // keep them evenly spaced round the ring on the FLOOR.
    const measure = (samples: number) => {
      const r = rng(61);
      let checked = 0;
      let worst = 0;
      for (let i = 0; i < 240; i++) {
        const pattern = PATTERNS[Math.floor(r() * PATTERNS.length)];
        const orient = randomQuat(r);
        const lampTilt = r() * LAMP_MAX;
        const fp = shadowFootprint({ pattern, orient, lampTilt });
        // Only the states where nothing has run off to infinity, because a
        // polygon that leaves the plane has no shoelace area to compare
        // against. The capped states get their own test below.
        if (fp.circles.some((c) => c.throughLamp || Math.hypot(c.cx, c.cy) + c.r > 20)) continue;
        checked++;

        const turn = sceneRotation(orient, lampTilt);
        let drawn = 0;
        for (const c of patternCircles(pattern)) {
          const run = shadowPolyline(turnCircle(c, turn), samples).filter(
            (p): p is Floor => p !== null,
          );
          drawn += Math.min(1, polygonArea(run) / FLOOR_AREA);
        }
        // Capped the same way the footprint caps it, so this is a comparison of
        // two ways of measuring the same shape rather than of the cap.
        const capped = Math.min(AREA_CAP, drawn);
        worst = Math.max(worst, Math.abs(capped - fp.area) / Math.max(1e-6, fp.area));
      }
      return { checked, worst };
    };

    const coarse = measure(360);
    const fine = measure(1440);
    expect(coarse.checked).toBeGreaterThan(60);
    expect(fine.checked).toBe(coarse.checked);
    // Four times the samples, so a deficit that is really a deficit falls by
    // about sixteen. Anything that did not fall is a real disagreement.
    expect(fine.worst).toBeLessThan(coarse.worst / 8);
    expect(fine.worst).toBeLessThan(3e-5);
  });

  test('a ring never claims more than the whole floor, and a ring across the lamp claims all of it', () => {
    expect(ringArea({ throughLamp: true, cx: 0, cy: 0, r: 0, line: null, magnify: 1, weight: 1 })).toBe(
      1,
    );
    expect(
      ringArea({ throughLamp: false, cx: 0, cy: 0, r: 1e6, line: null, magnify: 1, weight: 1 }),
    ).toBe(1);
    expect(
      ringArea({ throughLamp: false, cx: 0, cy: 0, r: FLOOR_R, line: null, magnify: 1, weight: 1 }),
    ).toBeCloseTo(1, 12);
  });

  test('the area is capped, so a picture in ruins is still a number', () => {
    const r = rng(62);
    for (let i = 0; i < 2000; i++) {
      const fp = shadowFootprint({
        pattern: PATTERNS[Math.floor(r() * PATTERNS.length)],
        orient: randomQuat(r),
        lampTilt: r() * LAMP_MAX,
      });
      expect(Number.isFinite(fp.area)).toBe(true);
      expect(fp.area).toBeGreaterThanOrEqual(0);
      expect(fp.area).toBeLessThanOrEqual(AREA_CAP);
      expect(Number.isFinite(fp.magnify)).toBe(true);
      expect(fp.magnify).toBeLessThanOrEqual(MAG_CAP);
      expect(Number.isFinite(fp.distortion)).toBe(true);
      expect(fp.distortion).toBeGreaterThan(0);
      expect(Number.isFinite(fp.anchor.u)).toBe(true);
      expect(Math.hypot(fp.anchor.u, fp.anchor.v)).toBeLessThanOrEqual(FLOOR_R + 1e-9);
    }
  });

  test('the anchor is held inside the floor, so a reading can never run away', () => {
    expect(clampToFloor({ u: 1, v: 0 })).toEqual({ u: 1, v: 0 });
    const held = clampToFloor({ u: 900, v: 0 });
    expect(held.u).toBeCloseTo(FLOOR_R, 12);
    // And a pattern rolled to sit exactly under the lamp reports the edge
    // rather than a NaN, which is where its shadow has in fact gone.
    // Driven through the real control: a drag straight down of exactly the
    // travel that carries the middle of the pattern onto the lamp.
    const turn = applyDrag(IDENTITY, 0, PATTERN_POLAR / DRAG_GAIN);
    expect(rotate(turn, patternAnchor()).z).toBeCloseTo(1, 12);
    const fp = shadowFootprint({ pattern: 'beetle', orient: turn, lampTilt: 0 });
    expect(Number.isFinite(fp.anchor.u)).toBe(true);
    expect(Math.hypot(fp.anchor.u, fp.anchor.v)).toBeCloseTo(FLOOR_R, 9);
  });

  test('the reading is taken off the footprint and the orientation, and nothing else', () => {
    const start = anchorAtStart('star');
    const fp = shadowFootprint({ pattern: 'star', orient: IDENTITY, lampTilt: 0 });
    const reading = readShadow({ footprint: fp, anchorAtStart: start, orient: IDENTITY });
    expect(reading.shift).toBe(0);
    expect(reading.departure).toBe(0);
    expect(reading.magnify).toBe(fp.magnify);
    expect(reading.distortion).toBe(fp.distortion);
  });

  test('switching pattern is not a shift, because the shift is measured per pattern', () => {
    // Each pattern's shadow starts somewhere slightly different, and measuring
    // one against another's starting place would hand a child the first naming
    // line for pressing a button.
    for (const id of PATTERNS) {
      const fp = shadowFootprint({ pattern: id, orient: IDENTITY, lampTilt: 0 });
      const reading = readShadow({
        footprint: fp,
        anchorAtStart: anchorAtStart(id),
        orient: IDENTITY,
      });
      expect(reading.shift).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------

describe('the sound is the sound of the picture', () => {
  test('the chord opens as the shadow spreads, and stops when the area does', () => {
    let last = -1;
    for (let i = 0; i <= 100; i++) {
      const area = (i / 100) * AREA_CAP;
      const s = chordSpread(area);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
    expect(chordSpread(0)).toBe(0);
    expect(chordSpread(AREA_CAP)).toBe(1);
    expect(chordSpread(AREA_CAP * 40)).toBe(1);
    expect(chordSpread(Number.NaN)).toBe(1);
    expect(chordSpread(-5)).toBe(0);
  });

  test('every partial is built from that same spread and from nothing else', () => {
    // The pin the brief asks for. Both the ear and the eye take the SAME area:
    // there is no second copy of it anywhere, so the sound cannot describe a
    // floor that is not on the screen.
    for (let i = 0; i < PARTIALS.length; i++) {
      expect(partialHz(i, 0)).toBeCloseTo(BASE_HZ * PARTIALS[i], 9);
      const wide = partialHz(i, AREA_CAP);
      const half = partialHz(i, AREA_CAP / 2);
      // The lean is linear in the spread, which is linear in the area up to the
      // cap, so the halfway point is halfway.
      expect(half).toBeCloseTo((partialHz(i, 0) + wide) / 2, 9);
    }
  });

  test('the partials move apart rather than all sliding together', () => {
    // A chord whose notes all moved by the same ratio is a chord transposed,
    // which sounds like a pitch change and not like a shape spreading. The
    // spacings have to change.
    const tight = PARTIALS.map((_, i) => partialHz(i, 0));
    const wide = PARTIALS.map((_, i) => partialHz(i, AREA_CAP));
    const tightGaps = tight.slice(1).map((hz, i) => hz / tight[i]);
    const wideGaps = wide.slice(1).map((hz, i) => hz / wide[i]);
    let moved = 0;
    for (let i = 0; i < tightGaps.length; i++) {
      if (Math.abs(wideGaps[i] / tightGaps[i] - 1) > 0.02) moved++;
    }
    expect(moved).toBe(tightGaps.length);
    // And nothing leaves the range a small speaker can reproduce.
    for (const hz of [...tight, ...wide]) {
      expect(hz).toBeGreaterThan(100);
      expect(hz).toBeLessThan(600);
    }
  });

  test('a partial index outside the chord is folded in rather than returning nothing', () => {
    expect(partialHz(-3, 1)).toBe(partialHz(0, 1));
    expect(partialHz(99, 1)).toBe(partialHz(PARTIALS.length - 1, 1));
  });

  test('the ink and the chord are two readings of one number', () => {
    // Same input, opposite directions: as the picture spreads it gets fainter,
    // because the same lamp is lighting more floor, and the chord opens out.
    //
    // STRICTLY in both directions, and the strictness is the whole test. The
    // first version of this used non-strict comparisons, and the mutation sweep
    // showed what that is worth: replacing the whole falloff with a constant
    // left it green, because a constant is non-strictly decreasing.
    let lastInk = Number.POSITIVE_INFINITY;
    let lastSpread = -1;
    for (let i = 0; i <= 60; i++) {
      const area = (i / 60) * AREA_CAP;
      const ink = shadowInk(area);
      const spread = chordSpread(area);
      if (i > 0) {
        expect(ink).toBeLessThan(lastInk);
        expect(spread).toBeGreaterThan(lastSpread);
      }
      expect(ink).toBeGreaterThan(0);
      expect(ink).toBeLessThanOrEqual(INK_MAX);
      lastInk = ink;
      lastSpread = spread;
    }
    expect(shadowInk(0)).toBeCloseTo(INK_MAX, 12);
    // And the fall is a fall a child can see rather than a rounding error: a
    // picture spread over the whole cap is under half the weight of the same
    // picture gathered into the middle of the floor.
    expect(shadowInk(AREA_CAP) / shadowInk(0)).toBeLessThan(0.5);
  });
});

// ---------------------------------------------------------------------------

describe('motion', () => {
  test('the hold and the glow are two different things and are kept apart', () => {
    // Fractal Grower shipped these collapsed into one, and its time-driven
    // motion then ran at full amplitude under reduced motion for as long as a
    // finger was held down. This is the test written to kill that revert.
    for (const holdAmp of [0, 0.2, 0.5, 0.9, 1]) {
      const calm = motionAmplitudes({ reduceMotion: true, holdAmp });
      const free = motionAmplitudes({ reduceMotion: false, holdAmp });
      expect(calm.glow).toBe(0);
      expect(free.glow).toBe(holdAmp);
      // The hold is the child's own touch shown back to them, so it is kept.
      expect(calm.hold).toBe(holdAmp);
      expect(free.hold).toBe(holdAmp);
    }
  });

  test('under reduced motion the glow is zero at EVERY moment, held or not', () => {
    // The distinction that matters and that a lazier test misses: not "zero
    // after the finger lifts" but zero while it is still down. That is the
    // state the observed pass samples.
    let amp = 0;
    for (let i = 0; i < 200; i++) {
      amp = holdAmpNext({ reduceMotion: true, holding: true, amp, dt: 1 / 60 });
      expect(motionAmplitudes({ reduceMotion: true, holdAmp: amp }).glow).toBe(0);
    }
    expect(amp).toBe(1);
  });

  test('the hold snaps under reduced motion and ramps otherwise', () => {
    expect(holdAmpNext({ reduceMotion: true, holding: true, amp: 0, dt: 1 / 60 })).toBe(1);
    expect(holdAmpNext({ reduceMotion: true, holding: false, amp: 1, dt: 1 / 60 })).toBe(0);
    const ramped = holdAmpNext({ reduceMotion: false, holding: true, amp: 0, dt: 1 / 60 });
    expect(ramped).toBeGreaterThan(0);
    expect(ramped).toBeLessThan(1);
  });

  test('the hold settles all the way to nothing rather than to a crumb', () => {
    // A hold that decayed asymptotically would keep `dirty` true forever and
    // the frame loop would never stop, which is the whole point of the floor.
    let amp = 1;
    for (let i = 0; i < 400; i++) {
      amp = holdAmpNext({ reduceMotion: false, holding: false, amp, dt: 1 / 60 });
    }
    expect(amp).toBe(0);
  });

  test('a canvas with no size gets no frame, and both sides are checked', () => {
    const busy = { dirty: true, holding: true, queued: true, animating: true };
    expect(shouldSchedule({ cssW: 0, cssH: 400, ...busy })).toBe(false);
    expect(shouldSchedule({ cssW: 400, cssH: 0, ...busy })).toBe(false);
    expect(shouldSchedule({ cssW: 1, cssH: 400, ...busy })).toBe(false);
    expect(shouldSchedule({ cssW: 400, cssH: 1, ...busy })).toBe(false);
    expect(shouldSchedule({ cssW: MIN_CANVAS_PX, cssH: MIN_CANVAS_PX, ...busy })).toBe(true);
    expect(shouldSchedule({ cssW: Number.NaN, cssH: 400, ...busy })).toBe(false);
  });

  test('a still, untouched scene gets no frame at all', () => {
    const still = { cssW: 900, cssH: 500, dirty: false, holding: false, queued: false };
    expect(shouldSchedule({ ...still, animating: false })).toBe(false);
    expect(shouldSchedule({ ...still, animating: true })).toBe(true);
    expect(shouldSchedule({ ...still, animating: false, dirty: true })).toBe(true);
    expect(shouldSchedule({ ...still, animating: false, holding: true })).toBe(true);
    expect(shouldSchedule({ ...still, animating: false, queued: true })).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('the camera and the fit', () => {
  test('the camera is an orthonormal frame at every pitch it can take', () => {
    for (let i = 0; i <= 20; i++) {
      const cam = camera(PITCH_MIN + (i / 20) * (PITCH_MAX - PITCH_MIN));
      for (const axis of [cam.right, cam.up, cam.toward]) {
        expect(Math.abs(length(axis) - 1)).toBeLessThan(1e-14);
      }
      expect(Math.abs(dot(cam.right, cam.up))).toBeLessThan(1e-14);
      expect(Math.abs(dot(cam.right, cam.toward))).toBeLessThan(1e-14);
      expect(Math.abs(dot(cam.up, cam.toward))).toBeLessThan(1e-14);
    }
  });

  test('further away is higher up the screen, and the top of the ball is above its middle', () => {
    const cam = camera(0.6);
    expect(project3(cam, v3(0, 3, 0)).y).toBeLessThan(project3(cam, v3(0, -3, 0)).y);
    expect(project3(cam, v3(0, 0, 1)).y).toBeLessThan(project3(cam, v3(0, 0, 0)).y);
    // And the front of the ball is toward the child.
    expect(project3(cam, v3(0, -1, 0)).depth).toBeGreaterThan(0);
    expect(project3(cam, v3(0, 1, 0)).depth).toBeLessThan(0);
  });

  test('a tall canvas gets a camera looking further down, and it is clamped at both ends', () => {
    expect(cameraPitch({ cssW: 1600, cssH: 400 })).toBe(PITCH_MIN);
    expect(cameraPitch({ cssW: 300, cssH: 1200 })).toBe(PITCH_MAX);
    expect(cameraPitch({ cssW: 2 * WIDE_ASPECT * 100, cssH: 200 })).toBe(PITCH_MIN);
    expect(cameraPitch({ cssW: TALL_ASPECT * 200, cssH: 200 })).toBeCloseTo(PITCH_MAX, 12);
    // Monotone in between, so a device turning through its own aspect does not
    // lurch.
    let last = -1;
    for (let i = 0; i <= 40; i++) {
      const p = cameraPitch({ cssW: 1200 - i * 25, cssH: 800 });
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
  });

  test('the scene fills the canvas it is given, on a laptop and on a phone', () => {
    // Light Bender shipped a fit that used 62 per cent of the height and the
    // observed pass caught two thirds of a laptop screen doing nothing. These
    // are measured fractions at four real canvas shapes, and they are what a
    // fit edit has to keep true.
    //
    // The extents are worked out HERE, from the geometry, rather than taken
    // from the module's own idea of its bounding box. The mutation sweep showed
    // why: swelling `sceneHalfH` into a box a quarter taller than anything the
    // scene draws makes the fit shrink everything into a letterbox, and a test
    // that measured coverage against that same swollen box stayed green through
    // it, because both halves moved together.
    const drawnHalfH = (pitch: number) =>
      Math.max(FLOOR_R * Math.sin(pitch), Math.cos(pitch));
    const drawnHalfW = FLOOR_R;

    const shapes: [number, number, number][] = [
      // width, height, the smallest fraction of one axis the drawn scene must
      // cover on that canvas.
      [900, 443, 0.9],
      [1280, 800, 0.9],
      [768, 1024, 0.72],
      [390, 700, 0.6],
    ];
    for (const [cssW, cssH, floor] of shapes) {
      const fit = fitScene({ cssW, cssH });
      const wFrac = (2 * drawnHalfW * fit.scale) / cssW;
      const hFrac = (2 * drawnHalfH(fit.pitch) * fit.scale) / cssH;
      expect(
        Math.max(wFrac, hFrac),
        `${cssW}x${cssH} covers ${wFrac.toFixed(2)}w ${hFrac.toFixed(2)}h`,
      ).toBeGreaterThan(floor);
      // Nothing is ever blown up past the crop ceiling on both axes at once.
      expect(Math.min(wFrac, hFrac)).toBeLessThanOrEqual(1.0001);
    }
  });

  test('the ball and the waist ring survive every crop', () => {
    // The crop is allowed to eat the outer floor and nothing else. This drives
    // a wide sweep of canvas shapes rather than the four above, because the
    // shape that breaks a crop rule is never one of the shapes anybody listed.
    for (let w = 200; w <= 1600; w += 37) {
      for (let h = 200; h <= 1400; h += 53) {
        const fit = fitScene({ cssW: w, cssH: h });
        expect(2 * CORE_HALF_W * fit.scale).toBeLessThanOrEqual(w + 1e-9);
        expect(2 * coreHalfH(fit.pitch) * fit.scale).toBeLessThanOrEqual(h + 1e-9);
        expect(fit.scale).toBeGreaterThan(0);
        expect(Number.isFinite(fit.scale)).toBe(true);
      }
    }
  });

  test('the crop never eats more than a third of either axis', () => {
    // An ABSOLUTE bound, written as a number rather than in terms of CROP_MAX.
    // The mutation sweep killed the version that compared the scale against
    // `plain * CROP_MAX`: raising CROP_MAX to 2.4, which crops well over half
    // the floor away on a phone, left that test green because the thing being
    // asserted moved with the thing being tested.
    let worst = 0;
    for (let w = 120; w <= 1600; w += 71) {
      for (let h = 120; h <= 1400; h += 67) {
        const fit = fitScene({ cssW: w, cssH: h });
        const wFrac = (2 * SCENE_HALF_W * fit.scale) / w;
        const hFrac = (2 * sceneHalfH(fit.pitch) * fit.scale) / h;
        worst = Math.max(worst, wFrac, hFrac);
      }
    }
    // At the defaults the worst case is a portrait canvas covering 1.30 of its
    // own width, which is the floor's outer thirtieth of a turn leaving the
    // frame on each side.
    expect(worst).toBeLessThanOrEqual(1.3);
    // And it really does crop somewhere, so this is a bound on a live rule
    // rather than on a rule that has been switched off.
    expect(worst).toBeGreaterThan(1.1);
  });

  test('a canvas with no size still returns a usable fit rather than a NaN', () => {
    for (const [w, h] of [
      [0, 0],
      [0, 500],
      [500, 0],
      [1, 1],
    ]) {
      const fit = fitScene({ cssW: w, cssH: h });
      expect(Number.isFinite(fit.scale)).toBe(true);
      expect(Number.isFinite(fit.cx)).toBe(true);
      expect(Number.isFinite(fit.pitch)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------

describe('what it says about itself', () => {
  const say = (pattern: PatternId, orient: Quat, lampTilt: number) =>
    describeShadow({
      pattern,
      footprint: shadowFootprint({ pattern, orient, lampTilt }),
      orient,
      lampTilt,
    });

  test('it names the pattern, the roll and the lamp', () => {
    const opening = say('beetle', IDENTITY, 0);
    expect(opening).toContain('beetle');
    expect(opening).toContain('rolled the globe 0 degrees');
    expect(opening).toContain('lamp is 0 degrees');
  });

  test('the numbers are the ones the child has actually made', () => {
    const rolled = say('star', quatFromAxisAngle(v3(1, 0, 0), 1), 0.5);
    expect(rolled).toContain(`rolled the globe ${Math.round((180 / Math.PI))} degrees`);
    expect(rolled).toContain(`lamp is ${Math.round((0.5 * 180) / Math.PI)} degrees`);
  });

  test('the sentence changes when the picture changes, and not otherwise', () => {
    const a = say('beetle', IDENTITY, 0);
    const b = say('beetle', IDENTITY, 0);
    expect(a).toBe(b);
    expect(say('beetle', applyKeyTurn(IDENTITY, 'down'), 0)).not.toBe(a);
    expect(say('face', IDENTITY, 0)).not.toBe(a);
  });

  test('it says something different once the picture is wrecked', () => {
    let q = IDENTITY;
    for (let i = 0; i < 9; i++) q = applyKeyTurn(q, 'down');
    const wrecked = say('face', q, 0);
    expect(wrecked).toContain('stretched right out');
    expect(say('face', IDENTITY, 0)).toContain('even little picture');
  });

  test('house style: no em dashes and nothing shouted, at any state', () => {
    const r = rng(71);
    for (let i = 0; i < 400; i++) {
      const said = say(
        PATTERNS[Math.floor(r() * PATTERNS.length)],
        randomQuat(r),
        r() * LAMP_MAX,
      );
      expect(said).not.toContain('—');
      expect(said).not.toContain('!');
      expect(said).not.toContain('NaN');
      expect(said).not.toContain('Infinity');
      expect(said).not.toContain('undefined');
    }
  });
});

// ---------------------------------------------------------------------------

describe('colour', () => {
  test('every hue the activity can paint is outside the banned band', () => {
    for (const hue of [lampHue(), globeHue(), floorHue(), shadowHue()]) {
      expect(hueIsAllowed(hue), `hue ${hue.toFixed(1)} is inside the banned band`).toBe(true);
    }
  });

  test('the hues are distinct enough to read as different things', () => {
    const hues = [lampHue(), globeHue(), shadowHue()];
    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        expect(Math.abs(hues[i] - hues[j])).toBeGreaterThan(20);
      }
    }
  });
});
