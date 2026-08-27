/**
 * Shape Ladder: one rule, applied five times.
 *
 * A point, swept, leaves a line. The line, swept, leaves a square. The square,
 * swept, leaves a cube. The cube, swept once more, leaves a shape whose shadow
 * is all a screen can hold. That is the whole content of the activity, and this
 * module is the whole of the mathematics: pure, screenless, and with no idea a
 * canvas exists.
 *
 * WHAT MAKES IT ONE RULE AND NOT FIVE
 *
 * `buildFigure` has a single loop. Every rung is the same three lines: copy
 * every vertex, push the copy along a new axis, and join each vertex to its own
 * copy. Nothing anywhere in this file special-cases a square or a cube.
 * `dimensions.test.ts` proves that structurally rather than taking the comment's
 * word for it: it asserts that the figure at every rung contains two exact
 * copies of the figure at the rung below, joined one-to-one. That assertion is
 * the naming line "Same rule again and again", made mechanical.
 *
 * The counts fall out of the rule rather than being written down:
 *
 *   rung      0    1    2     3      4
 *   corners   1    2    4     8     16
 *   edges     0    1    4    12     32
 *
 * and the suite checks the builder against the closed forms 2^k and k*2^(k-1)
 * at every rung, so a builder that drifted would fail rather than draw a wrong
 * shape quietly.
 *
 * THE CLIMB IS CONTINUOUS
 *
 * `climb` is a real number, not an integer, because the child's finger is what
 * moves it. At climb 2.4 the figure is a square, a second square pushed four
 * tenths of the way along a new axis, and the eight edges each vertex swept on
 * the way. That partly-swept figure is the point of the activity: the joining
 * edges ARE the paths the corners travelled, which is why the sweep can be
 * drawn as ink trailing the finger and still be exactly the finished object.
 *
 * TWO PERSPECTIVE DIVIDES
 *
 * A 4D point is divided down to 3D by its distance along w, and the 3D point is
 * divided down to the screen by its distance along z. Same rule twice, which is
 * the same joke the whole activity is built on. Both denominators are proved to
 * stay strictly positive across the entire reachable control space in the suite,
 * with a measured margin, because a perspective divide that can reach zero is a
 * shape that can explode in a child's hands.
 *
 * WHAT IS NOT IN HERE
 *
 * No clock. Nothing in this file takes a time argument. Every shape the child
 * can see is a function of what their finger has done, which is what lets the
 * activity hold still under reduced motion without losing anything.
 *
 * Issue: #225 (wave 5, Shape Ladder)
 */

import { safeHue } from '@/lib/pattern-garden';

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------

/** The top of the ladder. Four sweeps from a point. */
export const FULL_CLIMB = 4;

/**
 * The rung at which a cube stands finished, and therefore the rung at which the
 * shadow control appears. Below it there is no solid to turn.
 */
export const CUBE_CLIMB = 3;

/** Edge length of a fully swept axis, in model units. */
export const SPAN = 1;

/** A point in the four axes the ladder sweeps along, in order. */
export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * One edge, and the sweep that made it.
 *
 * `axis` is the rung whose sweep created this edge, counting from zero. It is
 * carried because the drawing colours each direction differently, and because
 * the edges of the sweep currently under the child's finger are exactly those
 * with the highest axis: the renderer needs to know which lines are ink still
 * being drawn and which have already settled into the object.
 */
export interface Edge {
  a: number;
  b: number;
  axis: number;
}

export interface Figure {
  vertices: Vec4[];
  edges: Edge[];
  /** The climb this was built at, after clamping. */
  climb: number;
  /** Whole rungs standing. */
  whole: number;
  /** How far through the next sweep the child's finger is, 0 to 1. */
  partial: number;
}

/** Keep the climb on the ladder. */
export function clampClimb(climb: number): number {
  if (!Number.isFinite(climb)) return 0;
  return Math.min(FULL_CLIMB, Math.max(0, climb));
}

/** Corners at a whole rung. The closed form, for the suite to check against. */
export function vertexCountFor(rung: number): number {
  return 2 ** rung;
}

/** Edges at a whole rung. The closed form, for the suite to check against. */
export function edgeCountFor(rung: number): number {
  return rung * 2 ** (rung - 1);
}

/**
 * The figure at a climb.
 *
 * ONE loop, one rule. Each turn of it:
 *
 *   1. copies every vertex there is,
 *   2. pushes the original copy back and the new copy forward along a fresh
 *      axis, so the figure grows out of its own middle rather than wandering
 *      off it,
 *   3. keeps the edges the old figure had, once for each copy,
 *   4. and adds one edge per vertex: the path that vertex just swept.
 *
 * Step 4 is the whole idea. The new edges are not drawn in afterwards to make
 * the shape look right; they are the trails of the corners, and there is one
 * because each corner went to exactly one place.
 *
 * Growing symmetrically about the middle is a deliberate choice and not a
 * detail. An extrusion that left the original where it was would walk the whole
 * object off the screen by the fourth rung, and the child's finger would be
 * dragging the object rather than dragging a NEW DIRECTION out of it.
 */
export function buildFigure(climb: number): Figure {
  const c = clampClimb(climb);
  const whole = Math.min(FULL_CLIMB, Math.floor(c));
  const partial = c - whole;

  const spans: number[] = [];
  for (let i = 0; i < whole; i++) spans.push(SPAN);
  if (partial > 0 && whole < FULL_CLIMB) spans.push(partial * SPAN);

  // Vertices as flat quadruples while the sweep runs, so an axis is an index
  // and the loop does not have to know the names of the four fields.
  let coords: number[][] = [[0, 0, 0, 0]];
  let edges: Edge[] = [];

  for (let axis = 0; axis < spans.length; axis++) {
    const half = spans[axis] / 2;
    const n = coords.length;

    const copy = coords.map((v) => {
      const u = v.slice();
      u[axis] = half;
      return u;
    });
    for (const v of coords) v[axis] = -half;

    const carried: Edge[] = edges.map((e) => ({ a: e.a + n, b: e.b + n, axis: e.axis }));
    const swept: Edge[] = [];
    for (let i = 0; i < n; i++) swept.push({ a: i, b: n + i, axis });

    coords = coords.concat(copy);
    edges = edges.concat(carried, swept);
  }

  return {
    vertices: coords.map(([x, y, z, w]) => ({ x, y, z, w })),
    edges,
    climb: c,
    whole,
    partial,
  };
}

// ---------------------------------------------------------------------------
// Turning
// ---------------------------------------------------------------------------

/**
 * Three angles, and one of them is not like the other two.
 *
 * `yaw` and `pitch` turn the object in planes that contain the screen: a child
 * dragging sideways walks around it, and dragging up and down tips it. Ordinary
 * handling, and it is the same gesture at every rung.
 *
 * `shadow` turns it in the plane containing the fourth axis. Nothing on the
 * screen turns; what changes is which parts of the object are nearer along a
 * direction the screen has no room for, and therefore how big each part of the
 * shadow is. The cube nested inside the shadow slides out through the one
 * around it as this angle passes a quarter turn, and that is not an effect
 * layered on top: it is what the same perspective divide does when the object
 * is turned in a plane the screen cannot show.
 *
 * All three are rotations of a two-dimensional plane inside four-dimensional
 * space, so all three preserve every length in 4D. The suite measures that on
 * the real figure rather than asserting it about the matrices.
 */
export interface Turn {
  /** Turns the x axis towards z. Sideways drag. */
  yaw: number;
  /** Turns the y axis towards z. Up and down drag. */
  pitch: number;
  /** Turns the x axis towards w. The shadow control. */
  shadow: number;
}

/**
 * The view the activity opens at.
 *
 * Off-square on both axes, because a cube seen exactly face on is a square and
 * a child who has just swept one deserves to see that it is not. Small enough
 * that the line at rung one is still visibly a line.
 */
export const DEFAULT_TURN: Turn = { yaw: 0.62, pitch: -0.42, shadow: 0 };

/** How far the shadow angle may be turned each way. A full half turn, and back. */
export const SHADOW_LIMIT = Math.PI;

export function clampShadowTurn(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.min(SHADOW_LIMIT, Math.max(-SHADOW_LIMIT, t));
}

/**
 * Apply the three plane rotations, shadow first.
 *
 * Shadow first so that the fourth axis is folded into x before the two ordinary
 * turns carry x around the screen. The other order also works and looks nearly
 * the same; this one keeps the shadow control's meaning stable as the child
 * turns the object, which is what a control has to do.
 */
export function rotate4(v: Vec4, turn: Turn): Vec4 {
  const cs = Math.cos(turn.shadow);
  const ss = Math.sin(turn.shadow);
  let x = v.x * cs - v.w * ss;
  const w = v.x * ss + v.w * cs;

  const cy = Math.cos(turn.yaw);
  const sy = Math.sin(turn.yaw);
  let z = x * sy + v.z * cy;
  x = x * cy - v.z * sy;

  const cp = Math.cos(turn.pitch);
  const sp = Math.sin(turn.pitch);
  const y = v.y * cp - z * sp;
  z = v.y * sp + z * cp;

  return { x, y, z, w };
}

// ---------------------------------------------------------------------------
// The two perspective divides
// ---------------------------------------------------------------------------

/**
 * Where the eye stands along the fourth axis.
 *
 * Chosen against what the object can actually reach rather than picked for
 * looking right. The furthest any corner can be pushed along w is half a span
 * on each of two axes once the shadow turn has folded x into w, which is
 * `sqrt(2)/2`, about 0.708. This leaves a clear margin under that at every
 * reachable state, and `dimensions.test.ts` sweeps the whole control space and
 * asserts the measured margin rather than trusting this paragraph.
 */
export const W_EYE = 1.6;

/** Where the eye stands along z, after the fourth axis has been divided out. */
export const EYE_Z = 3.4;

/** Screen scale of the 3D divide. Sets how strong the near-far taper reads. */
export const FOCAL = 2.2;

export interface Projected {
  /** Screen position, in model units, before the canvas fit. */
  x: number;
  y: number;
  /** Distance from the eye along z after the 4D divide. Drives the depth fade. */
  depth: number;
  /** The 4D divide's scale. Above one means nearer along the fourth axis. */
  shadowScale: number;
}

/**
 * One corner, all the way to the screen.
 *
 * Two divides, in order: how near the corner is along the fourth axis, then how
 * near the result is along z. Neither denominator can reach zero anywhere the
 * child can drive the controls, which the suite measures.
 */
export function projectVertex(v: Vec4, turn: Turn): Projected {
  const r = rotate4(v, turn);
  const shadowScale = W_EYE / (W_EYE - r.w);
  const X = r.x * shadowScale;
  const Y = r.y * shadowScale;
  const Z = r.z * shadowScale;
  const depth = EYE_Z - Z;
  const s3 = FOCAL / depth;
  return { x: X * s3, y: Y * s3, depth, shadowScale };
}

/** Every corner of a figure, projected. Convenience for the renderer and suite. */
export function projectFigure(figure: Figure, turn: Turn): Projected[] {
  return figure.vertices.map((v) => projectVertex(v, turn));
}

/**
 * The radius the canvas is fitted to.
 *
 * A FIXED number, not a bounding box measured per frame, and that is the whole
 * reason it exists. A fit that followed the object would make it breathe in and
 * out as the child turned it and would shrink the cube back to the size of the
 * point they started from, so a child sweeping a new direction would see the
 * object get no bigger. Fitting once to the largest the object can ever be
 * means a sweep looks like growth, because it is.
 *
 * `dimensions.test.ts` sweeps the entire reachable control space, measures the
 * largest projected radius, and asserts this bounds it and is not wastefully
 * larger than it.
 */
export const FIT_RADIUS = 0.95;

// ---------------------------------------------------------------------------
// The handles
// ---------------------------------------------------------------------------

/**
 * How far past the leading face the sweep handle floats.
 *
 * It has to stand off the object, because at a whole rung the next axis has no
 * extent at all and a handle drawn at its true position would be buried in the
 * middle of the shape the child is trying to pull out of.
 */
export const HANDLE_STANDOFF = 0.42;

/**
 * The direction the fourth sweep's bead is drawn in, and how far out it starts.
 *
 * THE FOURTH BEAD IS NOT AT ITS OWN POSITION, and that is the honest thing to
 * do rather than a shortcut. A point lying purely on the fourth axis has no x,
 * y or z at all, so it projects to the exact middle of the screen: a handle
 * drawn where the fourth direction really is would sit buried in the centre of
 * the cube the child is trying to pull it out of, and it would not move as they
 * pulled. The other three beads can be drawn where they are because the screen
 * has room for those directions. This one is drawn off to the side on a lead,
 * because the screen has run out of room, which is exactly the fact the rest of
 * the rung is about.
 */
export const W_BEAD_ANGLE = 0.876;
export const W_BEAD_DIR = { x: Math.sin(W_BEAD_ANGLE), y: -Math.cos(W_BEAD_ANGLE) };
export const W_BEAD_NEAR = 0.62;
export const W_BEAD_TRAVEL = 0.46;

export interface SweepHandle {
  /** Which direction is about to be swept, counting from zero. */
  axis: number;
  /** Where the bead is, in model space. Null when the axis has no screen direction. */
  point: Vec4 | null;
  /** Where the bead is, in projected screen units. Null when `point` is set. */
  screen: { x: number; y: number } | null;
}

/**
 * The sweep bead for the direction the child is about to pull out.
 *
 * On the next axis, past the leading face, and it travels outwards as the sweep
 * goes on, so the bead stays under the finger pulling it. Null at the top of the
 * ladder: there is no next direction, and a handle for a sweep that cannot
 * happen is a control that lies.
 */
export function sweepHandleFor(climb: number): SweepHandle | null {
  const f = buildFigure(climb);
  // The axis being swept and the axis about to be swept are the same index:
  // mid-sweep it is the partial one, and at a whole rung it is the next.
  const axis = f.whole;
  if (axis >= FULL_CLIMB) return null;

  const out = (f.partial * SPAN) / 2 + HANDLE_STANDOFF;
  if (axis === 3) {
    const d = FIT_RADIUS * (W_BEAD_NEAR + f.partial * W_BEAD_TRAVEL);
    return { axis, point: null, screen: { x: W_BEAD_DIR.x * d, y: W_BEAD_DIR.y * d } };
  }

  const p: Vec4 = { x: 0, y: 0, z: 0, w: 0 };
  if (axis === 0) p.x = out;
  else if (axis === 1) p.y = out;
  else p.z = out;
  return { axis, point: p, screen: null };
}

/** Whether the shadow control is available yet. */
export function shadowHandleShown(climb: number): boolean {
  return clampClimb(climb) >= CUBE_CLIMB;
}

/**
 * How much of the shadow turn is in force at a climb, 0 to 1.
 *
 * The shadow control only exists once there is a cube, so the angle it holds
 * has to go when the cube does. It unwinds across the sweep below the cube
 * rather than snapping off at the boundary, so a child collapsing their cube
 * back down sees the turn ease out under their own finger instead of the shape
 * jumping.
 *
 * IT IS ALSO A SAFETY RULE, and this is the reason it is a function rather than
 * a conditional at the call site. Turned a quarter turn, the fourth axis stands
 * exactly where the first one did, so a LINE turned that far lies entirely along
 * a direction the screen projects to a single point, and the child's shape
 * vanishes. That state was reachable by turning the shadow at the top of the
 * ladder and then collapsing back down, and it was measured before it was
 * described: `dimensions.test.ts` sweeps the whole reachable space and asserts a
 * positive minimum projected edge length, which fails without this.
 */
export function shadowAuthority(climb: number): number {
  return Math.min(1, Math.max(0, clampClimb(climb) - (CUBE_CLIMB - 1)));
}

/**
 * The view actually used to draw, given what the child has climbed to.
 *
 * Everything that projects goes through this: the renderer, the handles and the
 * suite. One place, so a shape drawn at one view and hit-tested at another is
 * not a bug this activity can have.
 */
export function viewFor(turn: Turn, climb: number): Turn {
  return { yaw: turn.yaw, pitch: turn.pitch, shadow: turn.shadow * shadowAuthority(climb) };
}

/**
 * Radius of the shadow ring, as a fraction of the fitted radius.
 *
 * One, so the ring sits exactly on the circle the whole object is fitted
 * inside. The object's furthest reachable corner lands just inside that circle,
 * which the suite measures, so the dial never cuts through the shape it turns.
 */
export const SHADOW_RING = 1;

/**
 * Where the bead sits on the shadow ring, as a unit vector in SCREEN space,
 * with y running downwards as it does on a canvas.
 *
 * The ring is a dial, and the angle on it IS the angle of the turn, so a child
 * who drags the bead a quarter of the way round has turned the object a quarter
 * turn in the plane they cannot see. Straight up is no turn.
 */
export function shadowBeadDirection(shadowTurn: number): { x: number; y: number } {
  const t = clampShadowTurn(shadowTurn);
  return { x: Math.sin(t), y: -Math.cos(t) };
}

// ---------------------------------------------------------------------------
// Finger travel
// ---------------------------------------------------------------------------

/** Finger travel, in CSS pixels, that sweeps one whole new direction. */
export const CLIMB_TRAVEL_PX = 150;

/** How far one key press turns the dial, in radians. */
export const SHADOW_KEY_STEP = 0.22;

/**
 * The climb after a drag.
 *
 * Travel, not time. The ladder moves exactly as far as the finger did, in every
 * motion setting, which is what makes the sweep the child's rather than the
 * screen's.
 */
export function climbAfterTravel(climb: number, travelPx: number): number {
  if (!Number.isFinite(travelPx)) return clampClimb(climb);
  return clampClimb(clampClimb(climb) + travelPx / CLIMB_TRAVEL_PX);
}

/**
 * Keep a sweep inside the direction it started on. ONE PULL, ONE DIRECTION.
 *
 * Found by the observed pass. The bead for the NEXT direction stands at right
 * angles to the one being pulled, so the moment a sweep completes, the bead
 * jumps to its new place and the direction the finger is travelling in stops
 * meaning what it meant. Without this, a finger still moving after a rung
 * completed was read against the new direction, came out negative, and pulled
 * the shape back down again; the climb then chattered around the rung and the
 * bead flickered between two places under a finger that was doing one steady
 * thing.
 *
 * Latching the sweep to its own rung answers that and is the better rule
 * anyway: one pull adds one direction, so a careless flick cannot take a child
 * from a point to the top of the ladder and skip everything the activity is
 * for, and nothing can overshoot a rung it has just finished.
 */
export function clampToRung(climb: number, axis: number): number {
  const c = clampClimb(climb);
  return Math.min(axis + 1, Math.max(axis, c));
}

/**
 * The dial angle a finger is pointing at, given where it is relative to the
 * middle of the shape, in screen pixels with y running downwards.
 *
 * THE DIAL IS DRIVEN BY THE FINGER'S ANGLE, NOT BY HOW FAR IT TRAVELLED, and
 * that is the difference between a control and a nuisance. A travel rule needs
 * a number of pixels per radian, and the ring is drawn at a radius that depends
 * on the size of the canvas, so on any screen where those two disagree the bead
 * runs ahead of or behind the finger holding it. Reading the angle means the
 * bead is under the finger on every screen, by construction.
 */
export function dialAngleAt(dx: number, dy: number): number {
  return Math.atan2(dx, -dy);
}

/**
 * The shortest way round from one dial angle to another.
 *
 * Angles come back from `dialAngleAt` wrapped into a half turn either side of
 * straight up, so a finger crossing the bottom of the ring jumps from one end
 * of that range to the other. Taking the short way round turns that jump back
 * into the small movement it really was.
 */
export function angleDelta(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  let d = to - from;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** The shadow angle after the dial is moved by some radians, clamped at the ends. */
export function shadowTurnBy(shadowTurn: number, delta: number): number {
  if (!Number.isFinite(delta)) return clampShadowTurn(shadowTurn);
  return clampShadowTurn(clampShadowTurn(shadowTurn) + delta);
}

/** Radians of yaw and pitch per CSS pixel of drag. */
export const TURN_PER_PX = 0.0075;

/**
 * The view after a drag.
 *
 * A pure function of where the finger went. There is no momentum term and there
 * is nowhere for one to hide: nothing in this signature knows what time it is,
 * so the object cannot keep turning after the finger stops.
 */
export function turnAfterDrag(turn: Turn, dxPx: number, dyPx: number): Turn {
  const yaw = Number.isFinite(dxPx) ? turn.yaw + dxPx * TURN_PER_PX : turn.yaw;
  const pitch = Number.isFinite(dyPx) ? turn.pitch + dyPx * TURN_PER_PX : turn.pitch;
  // Pitch is bounded so the object cannot be tipped over onto its own head,
  // which loses a child their sense of which way up the thing was. Yaw is free.
  return {
    yaw,
    pitch: Math.min(1.2, Math.max(-1.2, pitch)),
    shadow: turn.shadow,
  };
}

// ---------------------------------------------------------------------------
// Sound, and the one table it comes from
// ---------------------------------------------------------------------------

/**
 * The ladder, as sound.
 *
 * One multiple of the base note per rung, and they stack rather than replace,
 * so climbing is audibly adding rather than changing. The point is a plain
 * sine; the line adds the octave above it; the square adds the fifth above
 * that; the cube adds the next octave; the last sweep adds the fifth above
 * that. Two, three, four and six against one: the same alternation carried on
 * for as long as the ladder does, which is the same sentence as the shapes.
 *
 * THIS IS THE ONLY PLACE THESE NUMBERS EXIST. The rungs drawn beside the object
 * are drawn from this table and from `harmonicLevels` below, so a child looking
 * at the fourth rung lighting up and a child hearing the fourth harmonic arrive
 * are looking at and listening to the same array. Water Sphere shipped a sound
 * whose pitches had drifted away from its picture because they were written
 * down twice, and the suite pins these values so that cannot happen here.
 */
export const HARMONIC_MULTIPLES: readonly number[] = [1, 2, 3, 4, 6];

/** Where the lowest note sits. Low enough to be a hum rather than a whistle. */
export const BASE_HZ = 174;

/**
 * How loudly each rung's harmonic is present at a given climb, 0 to 1.
 *
 * Rung zero is the point, and it is there from the first frame, because a point
 * is what the child starts with. Every rung above it fades in across its own
 * sweep, so the harmonic arrives at exactly the pace the finger is pulling the
 * new direction out, and lands full at the moment the shape does.
 */
export function harmonicLevels(climb: number): number[] {
  const c = clampClimb(climb);
  return HARMONIC_MULTIPLES.map((_, i) => {
    if (i === 0) return 1;
    return Math.min(1, Math.max(0, c - (i - 1)));
  });
}

/** The frequency of one rung's harmonic. The single source for pitch. */
export function harmonicHz(rung: number): number {
  const m = HARMONIC_MULTIPLES[rung];
  return m === undefined ? 0 : BASE_HZ * m;
}

// ---------------------------------------------------------------------------
// Ink
// ---------------------------------------------------------------------------

/**
 * How brightly the sweep currently under the finger burns, 0 to 1.
 *
 * A pure function of how far through the sweep the child is, and of nothing
 * else. Zero at both ends, so the ink lights as the new direction opens and has
 * already settled into an ordinary edge by the time the sweep completes and the
 * next one begins. There is no decay term because there is no clock: a child
 * who holds still half way through a sweep sees the trail hold still too.
 */
export function sweepGlow(partial: number): number {
  if (!Number.isFinite(partial)) return 0;
  const p = Math.min(1, Math.max(0, partial));
  return Math.sin(Math.PI * p);
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

/**
 * Where each direction sits on the safe arc.
 *
 * Four positions on one narrow walk from green through teal to cyan, so the
 * four directions are told apart without any of them meaning anything. A
 * rainbow would say the fourth direction is special in a way the first is not,
 * and it is not: that is the entire lesson.
 *
 * Everything folds through `safeHue`, imported from the garden rather than
 * copied, and `dimensions.test.ts` sweeps the real function to prove the banned
 * 270 to 350 band is unreachable from any of these.
 */
export const AXIS_HUE_T: readonly number[] = [0.6, 0.645, 0.69, 0.735];

export function axisHue(axis: number): number {
  const t = AXIS_HUE_T[Math.min(AXIS_HUE_T.length - 1, Math.max(0, Math.floor(axis)))];
  return safeHue(t);
}

/** The sweep handle. Warm amber, so the thing to pull is not the thing to look at. */
export const HANDLE_HUE_T = 0.22;
export function handleHue(): number {
  return safeHue(HANDLE_HUE_T);
}

/** The shadow bead. Warmer still, and a different warm from the sweep handle. */
export const SHADOW_HUE_T = 0.1;
export function shadowHue(): number {
  return safeHue(SHADOW_HUE_T);
}

// ---------------------------------------------------------------------------
// The frame loop
// ---------------------------------------------------------------------------

/**
 * How wound up the object is under the child's hand.
 *
 * Rises while a finger is down, settles after it lifts. Under reduced motion it
 * SNAPS rather than ramping, because a ramp is an animation that outlives the
 * input that started it: a child who taps once would otherwise watch the object
 * ease its glow up and down on its own.
 */
export const HOLD_RISE = 3.4;
export const HOLD_DECAY = 1.7;
export const HOLD_FLOOR = 0.004;

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
   * How strongly the object is lit while it is being handled. POSITION driven:
   * a function of whether a finger is down and of nothing else, so it changes
   * when and only when the hand does. Kept under reduced motion, because it is
   * the child's own touch shown back to them.
   */
  hold: number;
  /**
   * The glint that travels along the edges. TIME driven: a wall-clock walk, so
   * it keeps going under a finger resting perfectly still. That is autonomous
   * motion however it got started, so it is zero under reduced motion at every
   * moment, held or not, and the edges are lit at one fixed phase instead.
   */
  glint: number;
}

/**
 * The two amplitudes, kept apart.
 *
 * Separated here, in a pure function with a test written to kill the
 * one-character change that collapses them, because Fractal Grower shipped with
 * exactly that collapse: its time-driven motion ran at full amplitude under
 * reduced motion for as long as a finger was held on the screen, and the only
 * reason it was ever found is that the observed pass sampled the canvas DURING
 * a held-still touch rather than only after the release.
 */
export function motionAmplitudes(args: {
  reduceMotion: boolean;
  holdAmp: number;
}): MotionAmplitudes {
  return {
    hold: args.holdAmp,
    glint: args.reduceMotion ? 0 : args.holdAmp,
  };
}

/** Under this many CSS pixels on a side there is nothing to paint into. */
export const MIN_CANVAS_PX = 2;

/**
 * Whether the render loop should run another frame.
 *
 * Two separate rules, in one place, because they are the two ways this kind of
 * loop goes wrong and both have already cost a fix round in this repo:
 *
 *   1. A canvas with no size gets NO frame. A component whose subtree is hidden,
 *      or which has not been laid out yet, would otherwise spin the loop for as
 *      long as it stays hidden, painting nothing. BOTH SIDES are checked: a
 *      collapsing subtree usually loses its height first and keeps its width,
 *      so a width-only rule would let a canvas two pixels wide and zero tall
 *      keep asking for frames. Sound Drawing's fix round added the height.
 *
 *   2. A still, unhandled object gets NO frame. Nothing is dirty, no finger is
 *      down, no pointer events are queued and nothing is animating, so a tablet
 *      left open on this activity has no callback scheduled at all rather than
 *      thirty a second that return early.
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
// Words
// ---------------------------------------------------------------------------

/**
 * How near a rung counts as standing on it, when saying what is on the screen.
 *
 * A finger stops where it stops, so a child who has just finished a sweep is
 * almost never at a whole number. Two hundredths of a sweep is a couple of
 * pixels of finger travel against `CLIMB_TRAVEL_PX`: below that the shape they
 * are looking at is the finished one, and calling it half made would be wrong.
 */
export const SETTLED_CLIMB = 0.02;

/**
 * What the child would call the shape standing at a whole rung.
 *
 * The top rung has no everyday name and is not given an invented one. What is
 * on the screen is the shadow of the shape, so that is what it is called.
 */
export function rungName(rung: number): string {
  if (rung <= 0) return 'point';
  if (rung === 1) return 'line';
  if (rung === 2) return 'square';
  if (rung === 3) return 'cube';
  return "cube's shadow";
}

/**
 * What is standing on the screen, for a child using a screen reader.
 *
 * The picture tells a sighted child how many corners there are by showing them.
 * This says the same thing, counted from the figure that is actually built
 * rather than from a table written alongside it, so the sentence cannot drift
 * away from the shape.
 */
export function describeLadder(climb: number, shadowTurn: number): string {
  const c = clampClimb(climb);
  const nearest = Math.round(c);
  const settled = Math.abs(c - nearest) <= SETTLED_CLIMB;

  // BUILT AT THE RUNG WHEN IT IS AT ONE, not at the raw climb, and the observed
  // pass is what found this. A finger that stops a thousandth of a sweep past a
  // rung leaves a figure that already carries the corners of the rung above, so
  // describing it at the raw climb read out a cube with sixteen corners. Naming
  // the shape and counting its parts have to come from the same figure.
  const f = buildFigure(settled ? nearest : c);
  const corners = `${f.vertices.length} ${f.vertices.length === 1 ? 'corner' : 'corners'}`;
  const edges = `${f.edges.length} ${f.edges.length === 1 ? 'edge' : 'edges'}`;

  if (!settled) {
    const from = rungName(f.whole);
    const to = rungName(f.whole + 1);
    return `A ${from} sweeping out into a ${to}. ${corners}, ${edges} so far. Keep dragging the bead.`;
  }

  if (f.whole === 0) {
    return 'A point. One corner, no edges. Drag the bead to sweep it into a line.';
  }

  const name = rungName(f.whole);
  if (f.whole < CUBE_CLIMB) {
    return `A ${name}. ${corners}, ${edges}. Drag the bead to sweep it again.`;
  }

  const turned = Math.abs(clampShadowTurn(shadowTurn)) > 0.05;
  const shadow = turned
    ? ' It is turned in a direction the screen cannot show, so the inner shape has slid.'
    : ' Drag the ring bead to turn it in a direction the screen cannot show.';
  return `A ${name}. ${corners}, ${edges}.${shadow}`;
}
