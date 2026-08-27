/**
 * Shadow Globe: stereographic projection, as a thing you can push around with
 * one finger.
 *
 * A glass ball floats in a dark room with a lamp on its skin. A pattern of
 * rings is painted on the glass. The light from the lamp goes through the glass
 * and lands on a wide warm floor, and what it draws there is the stereographic
 * image of the pattern. Roll the ball and the shadow does things a shadow has
 * no business doing: it swings out, it swells, one side runs off the edge of
 * the floor while the other collapses to a speck. Nothing is ever torn. Every
 * ring is still a ring. Roll it back and the picture comes back exactly.
 *
 * WHAT THIS FILE IS
 *
 * The whole thing, with no idea a screen exists. Quaternions, the projection,
 * the analytic image of a circle on the sphere, the areas, the words, the two
 * motion amplitudes and the scheduling rule. `ShadowGlobe.tsx` draws it and
 * `shadow-globe-discovery.ts` decides when a sentence has been earned; neither
 * of them owns a number.
 *
 * THE PROJECTION
 *
 * From the north pole N = (0, 0, 1) onto the plane z = 0:
 *
 *     (x, y, z)  ->  ( x / (1 - z),  y / (1 - z) )
 *
 * That plane cuts the ball through its equator, which is a gift rather than an
 * awkwardness: the equator lands exactly on the unit circle, so the floor comes
 * with a ring painted on it that says WHERE THE BALL'S WAIST IS. Everything
 * below the waist falls inside that ring and shrinks; everything above it lands
 * outside and grows; and things very near the lamp are thrown out past the edge
 * of the floor entirely.
 *
 * The three facts this activity exists for are all theorems about that formula,
 * and all three are measured in `shadow-globe.test.ts` rather than asserted:
 *
 *   1. CIRCLES STAY CIRCLES. Every circle on the sphere lands on a circle in
 *      the plane, except the ones that pass through the lamp itself, which land
 *      on straight lines. This is checked against the points that are actually
 *      DRAWN, not against a formula talking to itself.
 *
 *   2. NOTHING IS LOST. The map is invertible. `inverseStereographic` takes the
 *      floor back to the ball, and the round trip is exact to twelve places.
 *      This is what makes the fourth naming line true.
 *
 *   3. ANGLES ARE KEPT. The map is conformal: its derivative at every point is
 *      a rotation times a number. Two rings that cross at a right angle on the
 *      glass cross at a right angle on the floor however wildly they have been
 *      stretched.
 *
 * THE LAMP
 *
 * The lamp slides along a meridian, and the floor tips with it, because the
 * floor has to stay square to the lamp for any of the three facts above to
 * hold. A lamp at angle L and a fixed floor would give conics, not circles, and
 * the activity would be quietly lying. So the lamp's travel is implemented the
 * only way it can be: the scene is turned until the lamp is back at the north
 * pole, and then the same one projection runs. `sceneRotation` is where that
 * happens, and `floorFrame` is the tipped floor the drawing puts under it.
 *
 * MAGNIFICATION
 *
 * The local scale factor at a point is 1 / (1 - z), which is 1/2 at the far
 * pole, 1 at the waist, and unbounded as a point approaches the lamp. That one
 * number is what "near the light grows huge" means, it is what the child feels
 * under their finger, and it is the reading the third naming line is gated on.
 *
 * Issue: #225 (wave 7, Shadow Globe)
 */

import { safeHue } from '@/lib/pattern-garden';

// ---------------------------------------------------------------------------
// Vectors
// ---------------------------------------------------------------------------

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function v3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function normalize(a: Vec3): Vec3 {
  const len = length(a) || 1;
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scale(a: Vec3, k: number): Vec3 {
  return { x: a.x * k, y: a.y * k, z: a.z * k };
}

// ---------------------------------------------------------------------------
// Quaternions
//
// The child's roll is a rotation, and a rotation is the one thing that must not
// drift over a long session. Euler angles gimbal-lock and matrices accumulate
// shear; a normalised quaternion does neither, and normalising it after every
// single drag step is what makes "roll it back to where you started" land back
// on the identity to fourteen places rather than somewhere near it.
// ---------------------------------------------------------------------------

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

export function quatNormalize(q: Quat): Quat {
  const len = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
}

/** Hamilton product. `a` is applied AFTER `b`. */
export function quatMul(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const a = normalize(axis);
  const h = angle / 2;
  const s = Math.sin(h);
  return { x: a.x * s, y: a.y * s, z: a.z * s, w: Math.cos(h) };
}

export function quatConjugate(q: Quat): Quat {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

/** Rotate a vector by a quaternion. */
export function rotate(q: Quat, v: Vec3): Vec3 {
  // The standard expansion, which costs two cross products rather than building
  // a matrix per point. Every pattern point goes through this on every frame.
  const u = v3(q.x, q.y, q.z);
  const t = scale(cross(u, v), 2);
  return add(add(v, scale(t, q.w)), cross(u, t));
}

/**
 * The angle of the rotation that takes `a` to `b`, in radians, in [0, PI].
 *
 * The absolute value on the dot product is not a tidy-up: q and -q are the SAME
 * rotation, and without it a child who rolled the globe the long way round
 * would be told they were 340 degrees from home when they were 20 degrees from
 * it. The whole fourth naming line rests on this being a metric on rotations
 * rather than on quaternions.
 */
export function quatAngleBetween(a: Quat, b: Quat): number {
  const d = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w);
  return 2 * Math.acos(Math.min(1, d));
}

// ---------------------------------------------------------------------------
// The projection
// ---------------------------------------------------------------------------

/** Where the lamp sits when the scene has been turned to put it there. */
export const POLE: Vec3 = { x: 0, y: 0, z: 1 };

/**
 * A point closer to the lamp than this is treated as being AT it.
 *
 * Not a fudge factor in the mathematics: the projection really is undefined at
 * the lamp, and a float can land exactly on it. Everything downstream of here
 * is either a drawn polyline, which simply drops the point, or a magnification,
 * which is capped.
 */
export const AT_THE_LAMP = 1e-12;

export interface Floor {
  u: number;
  v: number;
}

/**
 * The stereographic image of a point on the unit sphere.
 *
 * Null at the lamp itself, where the light never leaves and there is no shadow
 * to speak of.
 */
export function stereographic(p: Vec3): Floor | null {
  const k = 1 - p.z;
  if (k < AT_THE_LAMP) return null;
  return { u: p.x / k, v: p.y / k };
}

/**
 * The point on the sphere whose shadow is (u, v).
 *
 * The inverse exists everywhere on the floor, which is the whole of the fourth
 * naming line: the shadow is a complete record of the ball, so rolling back
 * cannot have lost anything.
 */
export function inverseStereographic(u: number, v: number): Vec3 {
  const s = u * u + v * v;
  const k = s + 1;
  return { x: (2 * u) / k, y: (2 * v) / k, z: (s - 1) / k };
}

/**
 * How many times bigger the shadow is than the thing casting it, at one point.
 *
 * The derivative of the map is a rotation times this number, everywhere, which
 * is the same statement as "angles are kept". Half at the far pole, one at the
 * waist, and it runs away as a point climbs toward the lamp.
 */
export function magnification(p: Vec3): number {
  const k = 1 - p.z;
  if (k < AT_THE_LAMP) return MAG_CAP;
  return Math.min(MAG_CAP, 1 / k);
}

/**
 * The largest magnification any single reading may report.
 *
 * A ring that touches the lamp is genuinely infinitely magnified, and infinity
 * is a poor thing to feed a naming reducer, a screen reader sentence or a gain
 * node. A thousand is far past every threshold in the activity and is still a
 * number, so the cap changes no behaviour a child can reach and removes a whole
 * class of NaN.
 */
export const MAG_CAP = 1000;

// ---------------------------------------------------------------------------
// Circles on the sphere, and their shadows
// ---------------------------------------------------------------------------

/**
 * A circle painted on the glass.
 *
 * `axis` is the unit vector its centre sits on and `radius` is its ANGULAR
 * radius in radians, so a radius of PI/2 is a great circle. Everything the
 * child sees is made of these, because the whole point of the activity is what
 * happens to a circle.
 */
export interface SphereCircle {
  axis: Vec3;
  radius: number;
  /** How heavy the line is drawn. Nothing structural depends on it. */
  weight: number;
}

/**
 * The image of a sphere circle on the floor.
 *
 * A circle whose plane misses the lamp gives a circle. A circle whose plane
 * contains the lamp gives a straight line, and there is no way to write that as
 * a circle with a finite centre, so `line` is populated instead and `cx`, `cy`,
 * `r` are left at zero. Callers must branch on `throughLamp`.
 */
export interface ShadowCircle {
  throughLamp: boolean;
  cx: number;
  cy: number;
  r: number;
  /** For the straight-line case: the image is { (u,v) : a u + b v = c }. */
  line: { a: number; b: number; c: number } | null;
  /** The largest magnification anywhere on the circle. */
  magnify: number;
  weight: number;
}

/**
 * A plane is within this of containing the lamp before its image is called a
 * line rather than a circle.
 *
 * Set at the scale where the circle's image has grown past any floor a child
 * will ever see: the image radius goes as 1/|A|, so at 1e-7 the "circle" is
 * millions of units across and every visible piece of it is straight to well
 * inside a pixel. The test suite pins both branches and the crossover.
 */
export const LINE_EPS = 1e-7;

/**
 * The analytic image of a circle, derived rather than fitted.
 *
 * A circle with axis `a` and angular radius `rho` is the set of p on the sphere
 * with a . p = cos rho. Substituting the inverse projection
 *
 *     p = ( 2u, 2v, s - 1 ) / ( s + 1 ),   s = u^2 + v^2
 *
 * and clearing the denominator gives
 *
 *     (a_z - cos rho) s + 2 a_x u + 2 a_y v - (a_z + cos rho) = 0
 *
 * which is a circle whenever A = a_z - cos rho is non zero, and the equation of
 * a straight line when it is. A is zero exactly when a_z = cos rho, which is
 * exactly the condition that the lamp (0, 0, 1) lies on the circle. So the one
 * exceptional case in the theorem falls out of the algebra rather than being
 * bolted on.
 */
export function projectCircle(c: SphereCircle): ShadowCircle {
  const a = c.axis;
  const cosRho = Math.cos(c.radius);
  const A = a.z - cosRho;
  const magnify = circleMagnify(c);

  if (Math.abs(A) < LINE_EPS) {
    return {
      throughLamp: true,
      cx: 0,
      cy: 0,
      r: 0,
      line: { a: 2 * a.x, b: 2 * a.y, c: a.z + cosRho },
      magnify,
      weight: c.weight,
    };
  }

  const cx = -a.x / A;
  const cy = -a.y / A;
  const rSq = cx * cx + cy * cy + (a.z + cosRho) / A;
  return {
    throughLamp: false,
    cx,
    cy,
    r: Math.sqrt(Math.max(0, rSq)),
    line: null,
    magnify,
    weight: c.weight,
  };
}

/**
 * How near the lamp a circle actually gets, in radians.
 *
 * The points of a circle with axis at polar angle `theta` and angular radius
 * `rho` run over polar angles from |theta - rho| to theta + rho, so the closest
 * approach is the absolute difference. Absolute, not a subtraction: a circle
 * that ENCLOSES the lamp has its axis nearer the lamp than its own radius, and
 * the naive difference would come out negative and hand back a magnification
 * below the far-pole minimum for the single most magnified shape on the screen.
 */
export function circleNearestPolar(c: SphereCircle): number {
  const theta = Math.acos(Math.max(-1, Math.min(1, c.axis.z)));
  return Math.abs(theta - c.radius);
}

/** The largest magnification anywhere on a circle: the value at its nearest point. */
export function circleMagnify(c: SphereCircle): number {
  const theta = circleNearestPolar(c);
  const k = 1 - Math.cos(theta);
  if (!(k > 0)) return MAG_CAP;
  return Math.min(MAG_CAP, 1 / k);
}

/**
 * Points around a circle, on the sphere.
 *
 * Built from an orthonormal frame around the axis, so the samples are exactly
 * on the circle to machine precision rather than approximately on it. This is
 * what the component draws, which is why `circles-stay-circles` is tested
 * against these points rather than against `projectCircle` alone: a theorem
 * about a formula the child never sees would prove nothing about the picture.
 */
export function circleSamples(c: SphereCircle, count: number): Vec3[] {
  const a = normalize(c.axis);
  // Any vector not parallel to the axis will do; picking the smallest component
  // to cross against keeps the frame well conditioned at every axis direction.
  const seed =
    Math.abs(a.x) < Math.abs(a.y) && Math.abs(a.x) < Math.abs(a.z)
      ? v3(1, 0, 0)
      : Math.abs(a.y) < Math.abs(a.z)
        ? v3(0, 1, 0)
        : v3(0, 0, 1);
  const e1 = normalize(cross(a, seed));
  const e2 = cross(a, e1);
  const cr = Math.cos(c.radius);
  const sr = Math.sin(c.radius);
  const out: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    out.push(add(scale(a, cr), scale(add(scale(e1, Math.cos(t)), scale(e2, Math.sin(t))), sr)));
  }
  return out;
}

/** Turn a circle by a rotation. Only the axis moves; the angular radius is invariant. */
export function turnCircle(c: SphereCircle, q: Quat): SphereCircle {
  return { axis: rotate(q, c.axis), radius: c.radius, weight: c.weight };
}

// ---------------------------------------------------------------------------
// The lamp
// ---------------------------------------------------------------------------

/**
 * How far round the meridian the lamp can be pushed, in radians.
 *
 * Fifty seven degrees, and the bound is a PICTURE rather than a piece of
 * mathematics. The floor has to stay square to the lamp for the projection to
 * be stereographic at all, so the floor tips as the lamp travels, and its
 * screen outline both narrows and swings its long axis up into the short side
 * of the canvas. The observed pass drove it to a hundred and twenty six degrees
 * and its own screenshot shows what that costs: the lit ground reads as a
 * diagonal shaft across a black room, because its far corners have gone off the
 * top and bottom of the frame.
 *
 * At fifty seven degrees the ground is a tilted plane and still reads as one,
 * the picture visibly swings out and stretches as the lamp comes over, and a
 * child who only ever finds the lamp still earns the activity's first line.
 * What the lamp alone does NOT reach is measured rather than glossed in
 * `shadow-globe-discovery.test.ts`.
 */
export const LAMP_MAX = 1;

export function clampLampTilt(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.min(LAMP_MAX, t));
}

/** Where the lamp actually sits on the glass, for drawing. */
export function lampDirection(tilt: number): Vec3 {
  const t = clampLampTilt(tilt);
  return { x: Math.sin(t), y: 0, z: Math.cos(t) };
}

/**
 * The turn that puts the lamp back on the north pole.
 *
 * Rotating about y by `alpha` takes (0,0,1) to (sin alpha, 0, cos alpha), so
 * the turn that brings the lamp home is by minus the tilt.
 */
export function lampRotation(tilt: number): Quat {
  return quatFromAxisAngle(v3(0, 1, 0), -clampLampTilt(tilt));
}

/**
 * The single rotation the projection is taken through.
 *
 * The child's roll first, then the lamp's turn. Order matters and this is the
 * one that means what it says: the pattern is painted on the glass, so a roll
 * moves it on the ball, and the lamp's travel is a fact about the room, applied
 * to the whole ball afterwards.
 */
export function sceneRotation(orient: Quat, lampTilt: number): Quat {
  return quatMul(lampRotation(lampTilt), orient);
}

/**
 * The floor, as three vectors in the room.
 *
 * The floor is the plane through the ball's centre at right angles to the lamp.
 * It has to be: the projection is only stereographic onto a plane square to the
 * light, and onto any other plane a circle becomes an ellipse or a hyperbola.
 * So when the child slides the lamp, the floor tips. `origin` is the ball's
 * centre and (e1, e2) carry the floor's own u and v.
 */
export function floorFrame(lampTilt: number): { normal: Vec3; e1: Vec3; e2: Vec3 } {
  const t = clampLampTilt(lampTilt);
  return {
    normal: { x: Math.sin(t), y: 0, z: Math.cos(t) },
    e1: { x: Math.cos(t), y: 0, z: -Math.sin(t) },
    e2: { x: 0, y: 1, z: 0 },
  };
}

/** A point of the floor, placed in the room. */
export function floorPoint(f: { e1: Vec3; e2: Vec3 }, u: number, v: number): Vec3 {
  return add(scale(f.e1, u), scale(f.e2, v));
}

// ---------------------------------------------------------------------------
// The child's control
// ---------------------------------------------------------------------------

/**
 * How much roll one globe-radius of finger travel is worth, in radians.
 *
 * A drag right across the ball, which is two radii, turns it by 3.2 radians:
 * more than half a turn, so the whole globe is reachable in two comfortable
 * swipes and no part of the pattern is behind a marathon. Below about one this
 * activity feels like pushing furniture; above about three the pattern skids
 * away from the finger.
 */
export const DRAG_GAIN = 1.6;

/**
 * Roll the globe by a finger movement, measured in globe radii.
 *
 * A trackball, and the axis derivation is worth writing down because the sign
 * errors here are invisible until a child has it in their hands. The room is
 * x to the right, y out of the screen toward the child, z up. A drag of (dx,
 * dy) in screen pixels, with dy counted DOWNWARD as the browser does, moves the
 * front of the ball along dx * x - dy * z, and the axis that does that is the
 * view direction crossed into it:
 *
 *     axis = y x (dx * x - dy * z) = -dx * z - dy * x
 *
 * so a drag to the right turns the ball about minus z, and a drag downward
 * turns it about minus x, bringing the underside of the ball up the front and
 * over the top toward the lamp. That last one is the whole activity.
 *
 * Pre-multiplied, not post-multiplied. The child's hand is in the room, not on
 * the ball: after a hundred rolls a downward drag must still bring what is at
 * the bottom of the SCREEN up the front, and post-multiplying would apply it in
 * the ball's own drifted frame instead.
 */
export function applyDrag(q: Quat, dx: number, dy: number): Quat {
  const travel = Math.hypot(dx, dy);
  if (!(travel > 0) || !Number.isFinite(travel)) return q;
  const axis = v3(-dy, 0, -dx);
  return quatNormalize(quatMul(quatFromAxisAngle(axis, travel * DRAG_GAIN), q));
}

/**
 * How far one arrow key rolls the globe, in globe radii of pretend travel.
 *
 * Deliberately expressed as travel and pushed through `applyDrag` rather than
 * as its own rotation. Two control paths that both build a quaternion is two
 * places for a sign to go wrong, and the keyboard is the path that gets tested
 * by hand least often. This way the key lattice test in
 * `shadow-globe-discovery.test.ts` is driving the same code a finger drives.
 *
 * 0.11 radii is 0.176 radians a press, so twelve presses passes the two radians
 * the fourth naming line asks for and twelve back land on the identity again.
 */
export const KEY_TRAVEL = 0.11;

/** How far one key press slides the lamp, in radians. */
export const LAMP_KEY_STEP = 0.12;

export type TurnKey = 'up' | 'down' | 'left' | 'right';

/** One arrow key, as a drag. */
export function applyKeyTurn(q: Quat, key: TurnKey): Quat {
  switch (key) {
    case 'left':
      return applyDrag(q, -KEY_TRAVEL, 0);
    case 'right':
      return applyDrag(q, KEY_TRAVEL, 0);
    case 'up':
      return applyDrag(q, 0, -KEY_TRAVEL);
    case 'down':
      return applyDrag(q, 0, KEY_TRAVEL);
  }
}

// ---------------------------------------------------------------------------
// The patterns
// ---------------------------------------------------------------------------

export type PatternId = 'beetle' | 'star' | 'face';

export const PATTERNS: readonly PatternId[] = ['beetle', 'star', 'face'];

/**
 * Where the middle of the pattern sits at the start, as a polar angle from the
 * lamp.
 *
 * 2.1 radians is 120 degrees: below the waist, and tipped toward the child so
 * the pattern is facing them through the glass on the very first frame rather
 * than hiding underneath. It is also the number that makes the opening scene
 * quiet, and that is not decoration. Every threshold in the naming reducer is a
 * high-water mark, so a pattern that started out already magnified or already
 * stretched would hand a child two sentences for their first touch. The suite
 * measures the opening state against every threshold and requires daylight.
 */
export const PATTERN_POLAR = 2.1;

/**
 * How far from its own middle any pattern is allowed to reach, in radians.
 *
 * A compact pattern is not a stylistic choice. Distortion is the ratio of the
 * biggest magnification in the picture to the smallest, and a pattern spread
 * over a wide band of latitudes carries a large ratio around with it before the
 * child has done anything at all. `shadow-globe.test.ts` measures each pattern
 * against this and then measures the opening distortion against the naming
 * threshold, so a pattern edit that quietly hands a child a sentence for their
 * first touch fails there instead of in front of them.
 */
export const PATTERN_EXTENT = 0.7;

/** The turn that carries a pattern built round the far pole to where it starts. */
export function patternPlacement(): Quat {
  return quatFromAxisAngle(v3(1, 0, 0), -(Math.PI - PATTERN_POLAR));
}

/** The middle of the pattern, in the room, before the child has touched anything. */
export function patternAnchor(): Vec3 {
  return rotate(patternPlacement(), v3(0, 0, -1));
}

/**
 * A circle built round the far pole, given a tilt away from it and a bearing.
 *
 * Every pattern is authored in this frame, where the far pole is the middle of
 * the picture and a tilt of zero is dead centre, and then the whole pattern is
 * carried into place by `patternPlacement`. Authoring in the final frame would
 * mean every hand-written number carrying `PATTERN_POLAR` around inside it, and
 * moving the opening view would mean rewriting all three patterns.
 */
function capCircle(tilt: number, bearing: number, radius: number, weight: number): SphereCircle {
  const st = Math.sin(tilt);
  return {
    axis: normalize(v3(st * Math.cos(bearing), st * Math.sin(bearing), -Math.cos(tilt))),
    radius,
    weight,
  };
}

/**
 * The three patterns.
 *
 * All rings, and that is the point rather than a shortcut. The one thing a
 * child can check with their own eyes, at any moment, however mangled the
 * shadow has become, is whether a ring is still a ring. A pattern of straight
 * strokes would throw that away, because a straight stroke on a sphere is an
 * arc of a great circle and its shadow is an arc of a circle, which does not
 * look like anything in particular.
 *
 * Every pattern is kept inside PATTERN_EXTENT of its own middle, which with the
 * opening tilt leaves the whole picture well over a radian clear of the lamp.
 * That is what buys the opening scene its daylight against every threshold, and
 * `shadow-globe.test.ts` measures the extent of all three rather than trusting
 * the arithmetic in these numbers.
 */
export function patternCircles(id: PatternId): SphereCircle[] {
  const place = patternPlacement();
  return rawPattern(id).map((c) => turnCircle(c, place));
}

function rawPattern(id: PatternId): SphereCircle[] {
  switch (id) {
    case 'beetle': {
      // A beetle: a round body, a smaller head in front of it, six feet down
      // the sides. Eight of them, and most are small, which makes this the
      // pattern where a magnified ring is most obviously the SAME ring.
      const out: SphereCircle[] = [
        capCircle(0.14, Math.PI / 2, 0.3, 1.5),
        capCircle(0.5, Math.PI / 2, 0.17, 1.3),
      ];
      for (let i = 0; i < 3; i++) {
        const t = 0.22 + i * 0.14;
        out.push(capCircle(t, 0, 0.07, 1));
        out.push(capCircle(t, Math.PI, 0.07, 1));
      }
      return out;
    }
    case 'star': {
      // Three rings round the middle and five small ones set out around them
      // like points. Eight circles, all different sizes, which is what makes
      // this the pattern where a roll is most obviously doing something to each
      // ring separately rather than to the picture as a whole.
      //
      // FIVE POINTS, NOT SIX, AND THEY DO NOT MEET IN THE MIDDLE, and that is
      // deliberate. Six equal circles through a common centre is the seed of
      // life, which is the exact motif issue #225's LEAVE list is about, and
      // this repo carries an executable fence against that material in
      // `guided-naming.ts`. The fence covers the words a child is told; it
      // cannot cover a shape. Putting the shape on the screen anyway would let
      // the picture say what the copy is forbidden to.
      const out: SphereCircle[] = [
        capCircle(0, 0, 0.2, 1.2),
        capCircle(0, 0, 0.4, 1.2),
        capCircle(0, 0, 0.54, 1.4),
      ];
      for (let i = 0; i < 5; i++) {
        const bearing = (i / 5) * Math.PI * 2;
        out.push(capCircle(0.46, bearing, 0.15, 1));
      }
      return out;
    }
    case 'face': {
      // A face. Two eyes high, a small nose, a mouth low, inside a head. Not a
      // cartoon: it is here because a face is the shape a child notices being
      // distorted, and a face that has swung near the lamp and become enormous
      // and lopsided is still, unmistakably, made of the same rings.
      return [
        capCircle(0, 0, 0.62, 1.5),
        capCircle(0.26, 1.15, 0.08, 1.2),
        capCircle(0.26, Math.PI - 1.15, 0.08, 1.2),
        capCircle(0.08, -Math.PI / 2, 0.06, 1),
        capCircle(0.36, -Math.PI / 2, 0.19, 1.3),
      ];
    }
  }
}

/** The child-facing name of a pattern. */
export function patternLabel(id: PatternId): string {
  switch (id) {
    case 'beetle':
      return 'Beetle';
    case 'star':
      return 'Star';
    case 'face':
      return 'Face';
  }
}

// ---------------------------------------------------------------------------
// The shadow on the floor
// ---------------------------------------------------------------------------

/**
 * How far out the floor is drawn, in projection units.
 *
 * Three, which is three times the waist ring. A ring reaches the edge when its
 * nearest point is about 37 degrees from the lamp, so the whole of the third
 * naming line's territory is on the floor and visible, and past it the shadow
 * really does run off the edge, which is true and is worth seeing.
 */
export const FLOOR_R = 3;

export const FLOOR_AREA = Math.PI * FLOOR_R * FLOOR_R;

/**
 * How much floor the shadow may be said to cover before the number stops
 * growing.
 *
 * Three floorfuls. Rings overlap and rings run off the edge, so this is a
 * measure of spread rather than of coverage, and past three floorfuls the
 * picture is a few enormous arcs and sounds no different for being larger.
 */
export const AREA_CAP = 3;

export interface Footprint {
  /** Every ring's image, in the order the pattern authored them. */
  circles: ShadowCircle[];
  /**
   * How much floor the shadow covers, in floorfuls, capped at AREA_CAP.
   *
   * THE one number. The drawing takes the shadow's weight from it and the chord
   * takes its spread from it, and `shadow-globe.test.ts` measures it back off
   * the drawn polylines so that the sound is provably the sound of the picture.
   */
  area: number;
  /** The most magnified ring in the picture. */
  magnify: number;
  /** The most magnified ring over the least magnified one. */
  distortion: number;
  /** Where the middle of the pattern landed, held inside the floor. */
  anchor: Floor;
  /** How many rings have any part of themselves on the floor. */
  onFloor: number;
}

/** Hold a floor point inside the drawn floor, so a reading can never run away. */
export function clampToFloor(p: Floor): Floor {
  const r = Math.hypot(p.u, p.v);
  if (!(r > FLOOR_R)) return { u: p.u, v: p.v };
  return { u: (p.u / r) * FLOOR_R, v: (p.v / r) * FLOOR_R };
}

/** The area one ring's shadow covers, in floorfuls, never more than one. */
export function ringArea(c: ShadowCircle): number {
  if (c.throughLamp) return 1;
  return Math.min(1, (Math.PI * c.r * c.r) / FLOOR_AREA);
}

/**
 * The whole shadow, from the pattern and the two things the child holds.
 *
 * Called once per frame and read by everything: the drawing, the sound, the
 * screen reader sentence and the naming reducer all take their numbers from the
 * SAME return value. Water Sphere shipped a sound and a picture that disagreed
 * because the same quantity was worked out in two places, and this is the
 * shape of the answer to that.
 */
export function shadowFootprint(args: {
  pattern: PatternId;
  orient: Quat;
  lampTilt: number;
}): Footprint {
  const turn = sceneRotation(args.orient, args.lampTilt);
  const circles = patternCircles(args.pattern).map((c) => projectCircle(turnCircle(c, turn)));

  let area = 0;
  let magnify = 0;
  let least = Number.POSITIVE_INFINITY;
  let onFloor = 0;
  for (const c of circles) {
    area += ringArea(c);
    if (c.magnify > magnify) magnify = c.magnify;
    if (c.magnify < least) least = c.magnify;
    if (c.throughLamp) onFloor++;
    else if (Math.hypot(c.cx, c.cy) - c.r < FLOOR_R) onFloor++;
  }

  const anchorPoint = rotate(turn, patternAnchor());
  const projected = stereographic(anchorPoint);

  return {
    circles,
    area: Math.min(AREA_CAP, area),
    magnify,
    distortion: least > 0 && Number.isFinite(least) ? magnify / least : 1,
    // A pattern whose middle is exactly under the lamp has no image at all; the
    // edge of the floor is where its shadow has gone, which is what the clamp
    // says everywhere else too.
    anchor: projected ? clampToFloor(projected) : { u: FLOOR_R, v: 0 },
    onFloor,
  };
}

/**
 * The drawn shadow of one ring, as a run of floor points.
 *
 * The component draws THIS, not the analytic circle, and the difference is the
 * whole evidential value of the activity: `shadow-globe.test.ts` fits a circle
 * to these points and requires the residual to be within a part in a billion of
 * the radius. So the claim "circles stay circles" is a measurement of the line
 * on the screen rather than a restatement of the formula that drew it.
 *
 * Points at the lamp are dropped, which breaks the run into pieces; the caller
 * gets nulls at the breaks and starts a new stroke.
 */
export function shadowPolyline(c: SphereCircle, count: number): (Floor | null)[] {
  return circleSamples(c, count).map((p) => stereographic(p));
}

// ---------------------------------------------------------------------------
// Sound
// ---------------------------------------------------------------------------

/** The chord, as ratios against the root. A fifth, an octave, a twelfth. */
export const PARTIALS: readonly number[] = [1, 1.5, 2, 3];

/** The root, in hertz. Low D, well under a child's speaking range. */
export const BASE_HZ = 146.83;

/**
 * How far the chord opens out, from the area of the shadow, in [0, 1].
 *
 * Takes the footprint's area and nothing else, so the sound cannot describe a
 * picture that is not on the floor.
 */
export function chordSpread(area: number): number {
  if (!Number.isFinite(area)) return 1;
  return Math.max(0, Math.min(1, area / AREA_CAP));
}

/** How far each partial leans as the chord opens. */
const LEAN: readonly number[] = [0, 0.055, -0.035, 0.085];

/**
 * Where a partial sits, in hertz.
 *
 * With the shadow small and tidy the four notes are a plain chord. As it
 * spreads they lean apart and the chord goes wide and airy. It is information
 * and not applause: nothing about it goes up when the child does well, because
 * there is no doing well.
 */
export function partialHz(index: number, area: number): number {
  const i = Math.max(0, Math.min(PARTIALS.length - 1, Math.floor(index)));
  return BASE_HZ * PARTIALS[i] * (1 + chordSpread(area) * LEAN[i]);
}

// ---------------------------------------------------------------------------
// Drawing weights
// ---------------------------------------------------------------------------

export const INK_MAX = 0.92;
export const INK_FALL = 0.55;

/**
 * How strongly the cast picture is drawn, from the area it covers.
 *
 * The rings on the glass GLOW, so what lands on the floor is a picture in
 * light rather than a silhouette. That is not a rendering flourish, it is what
 * a coloured window casts, and it is the only version of this that a child can
 * see: the first cut drew the projection as dark ink, and the observed pass
 * caught the money shot, a ring blown up eight times over and thrown right
 * across the floor, as a barely visible smudge, because near black on a dark
 * warm ground is nothing at all.
 *
 * It fades as it spreads, and that IS physics rather than mood: the same lamp
 * is lighting it however far it has been thrown, so a picture spread over three
 * floorfuls is thinner than the same picture gathered into a fist. It takes the
 * SAME area the chord takes.
 */
export function shadowInk(area: number): number {
  return INK_MAX / (1 + Math.max(0, area) * INK_FALL);
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

/**
 * Every hue in the activity goes through `safeHue`, imported rather than
 * copied, so the banned band is fenced off in exactly one place in the repo.
 */
export function lampHue(): number {
  return safeHue(0.11);
}
export function globeHue(): number {
  return safeHue(0.52);
}
export function floorHue(): number {
  return safeHue(0.06);
}
export function shadowHue(): number {
  return safeHue(0.44);
}

// ---------------------------------------------------------------------------
// The camera
// ---------------------------------------------------------------------------

/**
 * How far the camera may look down, in radians.
 *
 * Twenty six degrees to fifty nine. Flat on would make the floor a line and
 * there would be no shadow to see; straight down would lose the ball behind its
 * own silhouette.
 */
export const PITCH_MIN = 0.46;
export const PITCH_MAX = 1.02;

/** The canvas shapes the two ends of the pitch range are set against. */
export const WIDE_ASPECT = 2.2;
export const TALL_ASPECT = 0.55;

/**
 * How far down the camera looks, from the shape of the canvas.
 *
 * The scene is a wide flat disc with a small ball in the middle of it, so seen
 * from a low angle it is about two parts wide to one tall, and there is no
 * angle at which that fills a phone held upright. Tipping the camera further
 * over opens the floor out toward a plan view and the picture grows downward
 * into the space a portrait canvas actually has. A laptop gets the low, roomy
 * view; a phone gets something nearer a map. Both are the same scene and the
 * same numbers; only where the eye is has moved.
 *
 * Interpolated in the log of the aspect ratio, so that halving the width and
 * doubling the height move the camera by the same amount, which is what makes
 * a device rotating through its own aspect feel smooth rather than lurching.
 */
export function cameraPitch(args: { cssW: number; cssH: number }): number {
  const w = Math.max(1, args.cssW);
  const h = Math.max(1, args.cssH);
  const span = Math.log(WIDE_ASPECT) - Math.log(TALL_ASPECT);
  const t = (Math.log(WIDE_ASPECT) - Math.log(w / h)) / span;
  return PITCH_MIN + Math.max(0, Math.min(1, t)) * (PITCH_MAX - PITCH_MIN);
}

export interface Camera {
  right: Vec3;
  up: Vec3;
  toward: Vec3;
}

export function camera(pitch: number): Camera {
  const s = Math.sin(pitch);
  const c = Math.cos(pitch);
  return {
    right: v3(1, 0, 0),
    up: v3(0, s, c),
    toward: v3(0, -c, s),
  };
}

export interface ScreenPoint {
  x: number;
  y: number;
  /** Positive toward the child. Used only to decide what is drawn faintly. */
  depth: number;
}

/** A point of the room, on the screen, in scene units before the fit is applied. */
export function project3(cam: Camera, p: Vec3): ScreenPoint {
  return { x: dot(p, cam.right), y: -dot(p, cam.up), depth: dot(p, cam.toward) };
}

// ---------------------------------------------------------------------------
// Fitting the scene to the canvas
// ---------------------------------------------------------------------------

/**
 * The scene's own bounding box on the screen, worked out from the geometry
 * rather than measured from a frame.
 *
 * Fitted to the LARGEST the scene can ever be, so sliding the lamp or rolling
 * the globe never makes the picture jump.
 *
 * SCOPED TO THE LAMP ON TOP. As the lamp travels the floor tips, and its screen
 * outline swings its long axis up into the short side of the canvas, so at full
 * lamp travel the floor's far corners do leave the frame. That is deliberate
 * and is why LAMP_MAX is where it is: fitting to the worst case over the lamp's
 * whole travel would shrink the resting scene, which is the view a child spends
 * almost all their time in, to pay for one they visit briefly. The ball and the
 * waist ring are inside the frame at every lamp angle, which is what the crop
 * rule below actually guarantees.
 *
 * The half height is a MAXIMUM of two things and not a sum of them, and the
 * difference is a quarter of the screen. The floor's far edge is at the top of
 * the picture and its near edge at the bottom, plus or minus
 * FLOOR_R sin(pitch); the ball's own silhouette is a unit circle about the
 * middle, so it reaches cos(pitch) above and below the centre at most. Those
 * two extremes are not in the same place, so adding them describes a box a
 * quarter taller than any frame this scene can draw, and everything would be
 * fitted into a letterbox to leave room for nothing.
 */
export const SCENE_HALF_W = FLOOR_R + 0.14;

export function sceneHalfH(pitch: number): number {
  return Math.max(FLOOR_R * Math.sin(pitch), Math.cos(pitch)) + 0.16;
}

/**
 * The part that must never leave the canvas: the ball and the waist ring.
 *
 * The floor's outer edge is scenery. The ball, and the ring on the floor that
 * the ball's waist casts, are the two things the whole activity is read
 * against, so they are what the crop below is not allowed to eat.
 */
export const CORE_HALF_W = 1.25;

export function coreHalfH(pitch: number): number {
  return Math.max(1.25 * Math.sin(pitch), Math.cos(pitch)) + 0.14;
}

export const FIT_WIDTH = 0.96;
export const FIT_HEIGHT = 0.94;
export const CORE_FIT = 0.92;

/**
 * How far past a plain fit the scene may be pushed when the canvas is the wrong
 * shape for it.
 *
 * The scene is about five parts wide to four parts tall. On a phone held
 * upright the canvas is roughly one part wide to two tall, and a plain fit
 * there puts the whole picture in a band across the middle with half the screen
 * doing nothing, which is exactly the defect the observed pass found in Light
 * Bender. So the scale is allowed to run up to a third past the plain fit and
 * let the far edges of the floor leave the frame. A ground plane whose edge is
 * off screen still reads as a ground plane; a picture in a letterbox does not
 * read as a room.
 */
export const CROP_MAX = 1.35;

export interface SceneFit {
  scale: number;
  cx: number;
  cy: number;
  /** The camera this fit was worked out for. The painter uses the same one. */
  pitch: number;
}

/**
 * Where the ball's centre goes and how many pixels a scene unit is worth.
 *
 * Fitted to the largest the scene can ever be, once per size, so sliding the
 * lamp or rolling the globe never makes the picture jump. The suite drives this
 * at four real canvas shapes, phone and tablet and laptop, and asserts how much
 * of each one the scene comes out covering AND that the core survives every
 * crop, because both halves of that are easy to lose in a one-character edit.
 */
export function fitScene(args: { cssW: number; cssH: number }): SceneFit {
  const w = Math.max(1, args.cssW);
  const h = Math.max(1, args.cssH);
  const pitch = cameraPitch({ cssW: w, cssH: h });

  const byW = (w * FIT_WIDTH) / (2 * SCENE_HALF_W);
  const byH = (h * FIT_HEIGHT) / (2 * sceneHalfH(pitch));
  const plain = Math.min(byW, byH);

  // Take up some of the slack on whichever axis has it, but never so much that
  // the ball and the waist ring are cropped.
  const boosted = Math.min(Math.max(byW, byH), plain * CROP_MAX);
  const coreLimit = Math.min(
    (w * CORE_FIT) / (2 * CORE_HALF_W),
    (h * CORE_FIT) / (2 * coreHalfH(pitch)),
  );

  return { scale: Math.min(boosted, coreLimit), cx: w / 2, cy: h / 2, pitch };
}

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export const HOLD_RISE = 3.6;
export const HOLD_DECAY = 1.8;
export const HOLD_FLOOR = 0.004;

/**
 * How lit the scene is under the child's hand.
 *
 * Rises while a finger is down and settles after it lifts. Under reduced motion
 * it SNAPS, because a ramp is an animation that outlives the input that started
 * it, and a child who taps once should not then watch the room breathe at them.
 */
export function holdAmpNext(args: {
  reduceMotion: boolean;
  holding: boolean;
  amp: number;
  dt: number;
}): number {
  if (args.reduceMotion) return args.holding ? 1 : 0;
  if (args.holding) return Math.min(1, args.amp + args.dt * HOLD_RISE);
  const next = Math.max(0, args.amp - args.dt * HOLD_DECAY);
  return next < HOLD_FLOOR ? 0 : next;
}

export interface MotionAmplitudes {
  /**
   * How lit the scene is while it is being handled. POSITION driven: a function
   * of whether a finger is down and of nothing else, so it moves when and only
   * when the hand does. Kept under reduced motion, because it is the child's
   * own touch shown back to them.
   */
  hold: number;
  /**
   * How much the lamp breathes and the floor's light ring drifts. TIME driven:
   * a wall-clock walk, which keeps going under a finger resting perfectly
   * still. That is autonomous motion however it got started, so it is ZERO
   * under reduced motion at every moment, held or not.
   */
  glow: number;
}

/**
 * The two amplitudes, kept apart.
 *
 * Out here in a pure function with a test written to kill the one-character
 * change that collapses them, because Fractal Grower shipped with exactly that
 * collapse: its time-driven motion ran at full amplitude under reduced motion
 * for as long as a finger was held on the screen, and the only reason it was
 * ever found is that the observed pass sampled the canvas DURING a held-still
 * touch rather than only after the release.
 */
export function motionAmplitudes(args: {
  reduceMotion: boolean;
  holdAmp: number;
}): MotionAmplitudes {
  return {
    hold: args.holdAmp,
    glow: args.reduceMotion ? 0 : args.holdAmp,
  };
}

/** Under this many CSS pixels on a side there is nothing to paint into. */
export const MIN_CANVAS_PX = 2;

/**
 * Whether the render loop should run another frame.
 *
 * Two separate rules in one place, because they are the two ways this kind of
 * loop goes wrong and both have already cost a fix round in this repo:
 *
 *   1. A canvas with no size gets NO frame. BOTH SIDES are checked: a
 *      collapsing subtree usually loses its height first and keeps its width,
 *      so a width-only rule would let a canvas two pixels wide and zero tall
 *      keep asking for frames.
 *
 *   2. A still, unhandled scene gets NO frame, so a tablet left open on this
 *      activity has no callback scheduled at all rather than thirty a second
 *      that return early.
 */
export function shouldSchedule(args: {
  cssW: number;
  cssH: number;
  dirty: boolean;
  holding: boolean;
  queued: boolean;
  animating: boolean;
}): boolean {
  if (!(args.cssW >= MIN_CANVAS_PX)) return false;
  if (!(args.cssH >= MIN_CANVAS_PX)) return false;
  return args.dirty || args.holding || args.queued || args.animating;
}

// ---------------------------------------------------------------------------
// What the child has just been shown
// ---------------------------------------------------------------------------

export interface Reading {
  /** How far the middle of the shadow has moved since the start, in floor units. */
  shift: number;
  /** The biggest ring in the shadow over the smallest, as a ratio. */
  distortion: number;
  /** How many times over the most magnified ring is being blown up. */
  magnify: number;
  /**
   * How far the globe is turned from where it started, in radians.
   *
   * A CURRENT value, not a high-water mark, and the only current value in the
   * reading. The fourth naming line needs to know both that the child went a
   * long way and that they are back, and the reducer is where those two are put
   * together.
   */
  departure: number;
}

/**
 * The reading, taken ONCE, off the footprint the picture was drawn from.
 *
 * `anchorAtStart` is passed in rather than recomputed because it depends on the
 * pattern the child has chosen: switching pattern moves the middle of the
 * picture, and a shift measured against the wrong pattern's starting point
 * would hand out the first sentence for a button press.
 */
export function readShadow(args: {
  footprint: Footprint;
  anchorAtStart: Floor;
  orient: Quat;
}): Reading {
  const fp = args.footprint;
  return {
    shift: Math.hypot(fp.anchor.u - args.anchorAtStart.u, fp.anchor.v - args.anchorAtStart.v),
    distortion: fp.distortion,
    magnify: fp.magnify,
    departure: quatAngleBetween(args.orient, IDENTITY),
  };
}

/** Where the middle of a pattern's shadow sits before the child touches anything. */
export function anchorAtStart(pattern: PatternId): Floor {
  return shadowFootprint({ pattern, orient: IDENTITY, lampTilt: 0 }).anchor;
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

const DEG = 180 / Math.PI;

/**
 * The picture, as a sentence, for a child using a screen reader.
 *
 * Every number in it is measured off the same footprint the canvas was painted
 * from. The shape of the sentence is fixed so that a screen reader announcing a
 * change reads the same clause in the same place each time; only the numbers
 * and the one middle clause move.
 */
export function describeShadow(args: {
  pattern: PatternId;
  footprint: Footprint;
  orient: Quat;
  lampTilt: number;
}): string {
  const roll = Math.round(quatAngleBetween(args.orient, IDENTITY) * DEG);
  const lamp = Math.round(clampLampTilt(args.lampTilt) * DEG);
  const fp = args.footprint;

  const spread =
    fp.distortion < 1.8
      ? 'The shadow is an even little picture near the middle of the floor'
      : fp.distortion < 4
        ? 'The shadow is leaning out, with one side bigger than the other'
        : 'The shadow is stretched right out, with the near side enormous';

  const ring =
    fp.magnify >= MAG_CAP
      ? 'One ring is passing right under the lamp, so its shadow is a straight line'
      : `The biggest ring is ${fp.distortion.toFixed(1)} times the smallest`;

  return (
    `The ${patternLabel(args.pattern).toLowerCase()} pattern is painted on the glass. ` +
    `You have rolled the globe ${roll} degrees from where it started, ` +
    `and the lamp is ${lamp} degrees round from the top. ` +
    `${spread}. ${ring}. ` +
    `Drag the globe to roll it. Drag the lamp to slide it round.`
  );
}
