/**
 * Light Bender: the physics, as one pure module with no idea a screen exists.
 *
 * A torch under the water of a glass tank. The child swings it, and the beam
 * that leaves the water bends away from straight up as they swing. Keep going
 * and, over about half a degree of swing, the escaping beam dims and then is
 * simply not there any more: the surface has turned into a mirror and the light
 * is running along inside the water instead. That is total internal reflection,
 * and the child causes it with their own hand before anybody names it.
 *
 * Then a slot opens in the side of the tank, water arcs out, and the same beam
 * aimed into the slot rides the falling water down, bouncing between its two
 * sides, because it is the same rule in a different place. That is the fibre
 * optic, done with a jug of water, and it is a lecture theatre demonstration
 * that has been run for a hundred and fifty years.
 *
 * WHAT IS EXACT HERE AND WHAT IS NOT
 *
 * Exact, in the sense that it is the textbook expression evaluated rather than
 * a curve fitted to look right:
 *
 *   - Snell's law at every interface, including the ones inside the falling
 *     stream, which are not horizontal and whose normals are computed from the
 *     stream's own shape.
 *   - The critical angle, as asin(n2 / n1), not a tuned threshold.
 *   - The Fresnel reflectance for UNPOLARISED light, which is the average of
 *     the s and p reflectances. This is the real expression, not Schlick's
 *     approximation to it. `interfaceSplit` is the single place it lives and it
 *     is what both the drawing and the sound read.
 *   - The shape of the falling stream. Torricelli gives the exit speed as
 *     sqrt(2 g h) and the fall is a projectile, and when the two are put
 *     together g cancels: the arc is y = -x^2 / (4h), fixed entirely by how
 *     deep the slot is under the surface. `streamCentreDrop` is that expression
 *     and `light-bender.test.ts` checks it against the closed form.
 *   - The narrowing of the stream as it falls, from continuity for a sheet.
 *     g cancels there too.
 *
 * The assumptions, stated because they are assumptions and not because they are
 * small:
 *
 *   1. UNPOLARISED LIGHT. Real torch light is unpolarised, so the average is
 *      the right thing to draw, but a real beam becomes partially polarised
 *      after a bounce and this model does not track that. Near Brewster's angle
 *      a real second bounce would behave differently from this one.
 *   2. NO ABSORPTION. Water over these distances absorbs a little; here it
 *      absorbs nothing, so the only ways light leaves the trace are through an
 *      interface, into a side wall, or out of the end of the stream.
 *   3. ONE WAVELENGTH. n is a single number, so there is no dispersion and
 *      therefore no rainbow anywhere in this activity.
 *   4. THE GLASS IS NOT MODELLED. The tank walls and floor are treated as
 *      water against air with nothing in between. Real glass shifts the
 *      Fresnel numbers slightly and shifts the critical angle not at all,
 *      because the critical angle for water against air through a parallel
 *      slab of anything is still set by water against air.
 *   5. THE STREAM IS A SHEET, not a round jet, because the drawing is flat.
 *      A round jet narrows as v^(-1/2) and a sheet as v^(-1), and the sheet is
 *      the one that matches the picture.
 *
 * NO CLOCK LIVES HERE. Every function is a function of the child's three
 * numbers and of nothing else, so a torch let go of is a torch that has
 * stopped. The one place a clock could get in is the ripple that makes the
 * caustic move, and that arrives as an argument whose amplitude the caller is
 * required to zero under reduced motion. See `motionAmplitudes`.
 *
 * Issue: #225 (wave 6, Light Bender)
 */

import { safeHue } from '@/lib/pattern-garden';

// ---------------------------------------------------------------------------
// Refraction
// ---------------------------------------------------------------------------

/**
 * Refractive index of water, and of air.
 *
 * 1.333 is the ordinary room-temperature figure for visible light. It is here
 * as a constant rather than inline because the critical angle, the Fresnel
 * split, the caustic and the naming thresholds all have to be talking about the
 * same water, and the suite pins the angle it produces.
 */
export const N_WATER = 1.333;
export const N_AIR = 1;

/**
 * The angle past which no light gets out, as asin(n2 / n1).
 *
 * Returns null when there is no such angle, which is the case going INTO the
 * denser material: a ray entering water from air bends towards the normal and
 * can never be trapped on the way in. That null is the reason the torch is
 * under the water rather than above it.
 */
export function criticalAngle(n1: number, n2: number): number | null {
  if (!(n1 > 0) || !(n2 > 0)) return null;
  if (n2 >= n1) return null;
  return Math.asin(n2 / n1);
}

/** Water against air. About 48.6 degrees, and the suite pins the number. */
export const CRITICAL = criticalAngle(N_WATER, N_AIR) as number;

export interface InterfaceSplit {
  /** True when nothing at all gets through. */
  tir: boolean;
  /** Fraction of the arriving light that leaves through the interface. */
  transmitted: number;
  /** Fraction that stays inside. Always exactly one minus the transmitted. */
  reflected: number;
  /** Angle of the departing ray from the normal, or null under total reflection. */
  refracted: number | null;
}

/**
 * What happens to a ray meeting an interface: how much goes through, how much
 * comes back, and which way the part that goes through leaves.
 *
 * ONE FUNCTION, and that is the point of it. The beam drawn on the screen, the
 * brightness of the escaping ray, the caustic on the tank floor, the light
 * inside the falling stream and the tone the child hears are all this same
 * expression evaluated at different angles. Water Sphere shipped a sound whose
 * pitches had drifted away from its own picture because the two were written
 * down twice, and this is the answer to that.
 *
 * `incidence` is measured from the interface NORMAL, so zero is straight
 * through and a right angle is a graze.
 */
export function interfaceSplit(args: {
  incidence: number;
  n1: number;
  n2: number;
}): InterfaceSplit {
  const i = Math.min(Math.PI / 2, Math.max(0, args.incidence));
  const { n1, n2 } = args;
  const sinT = (n1 / n2) * Math.sin(i);

  if (!(sinT < 1)) {
    return { tir: true, transmitted: 0, reflected: 1, refracted: null };
  }

  const t = Math.asin(sinT);
  const ci = Math.cos(i);
  const ct = Math.cos(t);

  // The two polarisations, then their average, because torch light has no
  // preferred polarisation. Written out rather than approximated: Schlick is
  // two lines shorter and is wrong by a fifth of the total near the critical
  // angle, which is precisely the part of the swing this activity is about.
  const rs = ((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct)) ** 2;
  const rp = ((n1 * ct - n2 * ci) / (n1 * ct + n2 * ci)) ** 2;
  const reflected = (rs + rp) / 2;

  return { tir: false, transmitted: 1 - reflected, reflected, refracted: t };
}

// ---------------------------------------------------------------------------
// The tank
// ---------------------------------------------------------------------------

/** Inside of the glass box, in tank units. One unit is one tank height. */
export const TANK_W = 1.4;
export const TANK_H = 0.82;

/**
 * How full the child can make it.
 *
 * The floor of the range is above the highest the torch head can ever swing,
 * so the lamp is under water in every state the child can reach. That is not a
 * detail: a lamp poking into the air would be shining air into water, where
 * there is no critical angle at all and the whole activity has no second half.
 * `light-bender.test.ts` checks the two numbers against each other rather than
 * trusting this comment.
 */
export const LEVEL_MIN = 0.16;
export const LEVEL_MAX = 0.72;

export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return LEVEL_MIN;
  return Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, level));
}

/** Where the lamp is hinged, and how long its arm is. */
export const TORCH_PIVOT = { x: 0.15, y: 0.035 } as const;
export const TORCH_ARM = 0.085;

/**
 * How far round the child can swing it.
 *
 * Zero is straight up. The top of the range is past the critical angle by a
 * long way, so there is a whole stretch of trapped light to explore rather than
 * a single edge to balance on, and it stops short of a right angle because a
 * beam laid flat along the surface never reaches it.
 */
export const AIM_MIN = 0;
export const AIM_MAX = 1.42;

export function clampAim(aim: number): number {
  if (!Number.isFinite(aim)) return AIM_MIN;
  return Math.min(AIM_MAX, Math.max(AIM_MIN, aim));
}

/** Where the lamp head is sitting, for a given swing. */
export function torchHead(aim: number): { x: number; y: number } {
  const a = clampAim(aim);
  return {
    x: TORCH_PIVOT.x + Math.sin(a) * TORCH_ARM,
    y: TORCH_PIVOT.y + Math.cos(a) * TORCH_ARM,
  };
}

/** Which way the beam leaves the lamp. A unit vector, zero being straight up. */
export function beamDirection(aim: number): { x: number; y: number } {
  const a = clampAim(aim);
  return { x: Math.sin(a), y: Math.cos(a) };
}

/** How far the slot in the side of the tank opens. */
export const SLOT_MAX = 0.05;

export function clampOpen(open: number): number {
  if (!Number.isFinite(open)) return 0;
  return Math.min(1, Math.max(0, open));
}

/** Height of the top of the slot above the tank floor. Zero when it is shut. */
export function slotTop(open: number): number {
  return clampOpen(open) * SLOT_MAX;
}

/** Middle of the slot, which is where the stream is measured from. */
export function slotMid(open: number): number {
  return slotTop(open) / 2;
}

// ---------------------------------------------------------------------------
// Tracing the beam inside the tank
// ---------------------------------------------------------------------------

/** Below this much light left in the beam there is nothing to draw. */
export const INTENSITY_FLOOR = 0.004;

/** A ceiling on the trace, so a grazing beam cannot run forever. */
export const MAX_TANK_BOUNCES = 24;

export interface BeamSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Fraction of the torch's light travelling along this piece. */
  intensity: number;
}

export interface EscapingRay {
  x: number;
  y: number;
  /** Unit direction in the air. */
  dx: number;
  dy: number;
  intensity: number;
  face: 'top' | 'floor';
  /** Angle from the vertical inside the water, and outside it. */
  incidence: number;
  refracted: number;
}

export interface InterfaceHit {
  x: number;
  y: number;
  face: 'top' | 'floor';
  incidence: number;
  transmitted: number;
  reflected: number;
  tir: boolean;
}

export interface TankTrace {
  segments: BeamSegment[];
  escapes: EscapingRay[];
  hits: InterfaceHit[];
  /** Fraction of the torch's light that left the water through an interface. */
  escaped: number;
  /** Fraction that ran into a side wall and was soaked up by it. */
  intoWall: number;
  /** Fraction that went out through the open slot and into the stream. */
  intoSlot: number;
  /** Fraction still bouncing when the trace ran out of budget. */
  left: number;
  /** The ray that entered the slot, or null. Position, direction, brightness. */
  slotRay: { x: number; y: number; dx: number; dy: number; intensity: number } | null;
  /** Angle from the vertical at every interface, which is the swing itself. */
  incidence: number;
  /** True when the first interface the beam met sent all of it back. */
  tir: boolean;
}

const EPS = 1e-9;

/**
 * Follow the beam from the lamp until it has nowhere left to go.
 *
 * The top of the water and the floor of the tank are PARALLEL, which is what
 * makes this exactly tractable: a reflection off either one flips the vertical
 * part of the direction and leaves the horizontal part alone, so the angle from
 * the vertical is the same at every interface the beam ever meets, and it is
 * equal to the swing of the lamp. The suite asserts that rather than assuming
 * it, because it is the property the whole activity rests on: one number the
 * child holds decides everything.
 *
 * Everything the light can do is accounted for. `escaped`, `intoWall`,
 * `intoSlot` and `left` sum to one, and the suite sweeps the control space
 * proving it, so a beam cannot quietly gain or lose brightness in here.
 */
export function traceTank(args: {
  aim: number;
  level: number;
  open: number;
}): TankTrace {
  const aim = clampAim(args.aim);
  const level = clampLevel(args.level);
  const top = slotTop(args.open);

  const head = torchHead(aim);
  const dir = beamDirection(aim);

  const segments: BeamSegment[] = [];
  const escapes: EscapingRay[] = [];
  const hits: InterfaceHit[] = [];

  let x = head.x;
  let y = head.y;
  let dx = dir.x;
  let dy = dir.y;
  let intensity = 1;

  let escaped = 0;
  let intoWall = 0;
  let intoSlot = 0;
  let slotRay: TankTrace['slotRay'] = null;

  for (let bounce = 0; bounce < MAX_TANK_BOUNCES; bounce++) {
    let travel = Infinity;
    let face: 'top' | 'floor' | 'left' | 'right' | null = null;

    if (dy > EPS) {
      const t = (level - y) / dy;
      if (t > EPS && t < travel) {
        travel = t;
        face = 'top';
      }
    }
    if (dy < -EPS) {
      const t = -y / dy;
      if (t > EPS && t < travel) {
        travel = t;
        face = 'floor';
      }
    }
    if (dx > EPS) {
      const t = (TANK_W - x) / dx;
      if (t > EPS && t < travel) {
        travel = t;
        face = 'right';
      }
    }
    if (dx < -EPS) {
      const t = -x / dx;
      if (t > EPS && t < travel) {
        travel = t;
        face = 'left';
      }
    }

    if (face === null) break;

    const nx = x + dx * travel;
    const ny = y + dy * travel;
    segments.push({ x0: x, y0: y, x1: nx, y1: ny, intensity });

    if (face === 'left') {
      intoWall += intensity;
      intensity = 0;
      break;
    }

    if (face === 'right') {
      // The slot is a hole, and water is continuous through a hole, so light
      // arriving inside it carries straight on into the falling stream rather
      // than meeting an interface at all. Above the slot there is glass, and
      // the far wall of this tank is painted, so it stops there.
      if (top > 0 && ny <= top) {
        intoSlot += intensity;
        slotRay = { x: nx, y: ny, dx, dy, intensity };
      } else {
        intoWall += intensity;
      }
      intensity = 0;
      break;
    }

    // Top of the water, or the floor. Both have a vertical normal, so the angle
    // from that normal is the angle from the vertical.
    const incidence = Math.acos(Math.min(1, Math.abs(dy)));
    const split = interfaceSplit({ incidence, n1: N_WATER, n2: N_AIR });

    hits.push({
      x: nx,
      y: ny,
      face,
      incidence,
      transmitted: split.transmitted,
      reflected: split.reflected,
      tir: split.tir,
    });

    if (split.transmitted > 0 && split.refracted !== null) {
      // Bent AWAY from the normal on the way out, because it is leaving the
      // denser material. Same horizontal sense as the beam that arrived.
      const sign = dx >= 0 ? 1 : -1;
      const out = split.refracted;
      escapes.push({
        x: nx,
        y: ny,
        dx: sign * Math.sin(out),
        dy: face === 'top' ? Math.cos(out) : -Math.cos(out),
        intensity: intensity * split.transmitted,
        face,
        incidence,
        refracted: out,
      });
      escaped += intensity * split.transmitted;
    }

    intensity *= split.reflected;
    dy = -dy;
    x = nx;
    y = ny;

    if (intensity < INTENSITY_FLOOR) break;
  }

  return {
    segments,
    escapes,
    hits,
    escaped,
    intoWall,
    intoSlot,
    left: intensity,
    slotRay,
    incidence: aim,
    tir: hits.length > 0 ? hits[0].tir : false,
  };
}

/**
 * How much of the torch's light got out of the water.
 *
 * THE ONE NUMBER. The escaping rays are drawn at this brightness, the bar in
 * the corner is this number, and the tone the child hears is built from it, so
 * a bright sound and a bright picture cannot come apart.
 */
export function escapedFraction(trace: TankTrace): number {
  return trace.escaped;
}

// ---------------------------------------------------------------------------
// The falling stream
// ---------------------------------------------------------------------------

/** How far the stream falls before it reaches the basin. */
export const STREAM_DROP = 1.0;

/** How many pieces the stream is cut into for tracing and drawing. */
export const STREAM_STEPS = 88;

/**
 * How far the stream has fallen, `u` along from the slot.
 *
 * Torricelli says the water leaves at sqrt(2 g h), where h is the depth of the
 * slot under the surface. After that it is a projectile, so the drop after a
 * horizontal run u is (1/2) g (u / v)^2, and putting the two together kills g:
 *
 *     drop = (1/2) g u^2 / (2 g h) = u^2 / (4 h)
 *
 * So the arc a child sees is decided by ONE thing, the depth of water above the
 * slot, which is the thing under their finger. Nothing here depends on how
 * strong gravity is, and the suite checks this against the closed form rather
 * than against a recorded curve.
 */
export function streamCentreDrop(u: number, depth: number): number {
  if (!(depth > 0)) return 0;
  return (u * u) / (4 * depth);
}

/** How long the stream is before it has fallen STREAM_DROP. */
export function streamLength(depth: number): number {
  if (!(depth > 0)) return 0;
  return 2 * Math.sqrt(depth * STREAM_DROP);
}

/**
 * How wide the stream is, `u` along.
 *
 * The sheet carries the same water past every point, so width times speed is
 * fixed. The speed at u is sqrt(v0^2 + (g u / v0)^2), and with v0^2 = 2 g h
 * that is v0 sqrt(1 + (u / 2h)^2), which is g-free in the same way the arc is.
 * The stream therefore thins as it falls, which is what a tap does and which
 * the child can watch happen when they change the level.
 */
export function streamHalfWidth(u: number, depth: number, mouth: number): number {
  if (!(depth > 0)) return 0;
  const r = u / (2 * depth);
  return mouth / Math.sqrt(1 + r * r);
}

export interface StreamShape {
  /** Empty when the slot is shut or the water is below it. */
  points: { x: number; y: number; w: number }[];
  depth: number;
  mouth: number;
  length: number;
}

/**
 * The stream itself: a centre line with a half width at every point.
 *
 * Drawn in the same tank coordinates as everything else, starting at the middle
 * of the slot in the right hand wall.
 */
export function streamShape(args: { level: number; open: number }): StreamShape {
  const open = clampOpen(args.open);
  const level = clampLevel(args.level);
  const mid = slotMid(open);
  const mouth = slotTop(open) / 2;
  const depth = level - mid;

  if (!(open > 0) || !(depth > 0) || !(mouth > 0)) {
    return { points: [], depth: 0, mouth: 0, length: 0 };
  }

  const length = streamLength(depth);
  const points: { x: number; y: number; w: number }[] = [];
  for (let i = 0; i <= STREAM_STEPS; i++) {
    const u = (length * i) / STREAM_STEPS;
    points.push({
      x: TANK_W + u,
      y: mid - streamCentreDrop(u, depth),
      w: streamHalfWidth(u, depth, mouth),
    });
  }
  return { points, depth, mouth, length };
}

/**
 * How sharply the stream is bending as it leaves the slot, in inverse units.
 *
 * The arc is drop = u^2 / (4h), so its second derivative is 1 / (2h) and at the
 * slot, where the centre line is level, that second derivative IS the
 * curvature. Shallow water above the slot means a slow jet and a tight bend;
 * deep water means a fast one that leaves almost flat. This is the number the
 * suite uses when it asks how the bouncing inside the stream changes with the
 * bend, so that claim is about a measured quantity and not about a slider.
 */
export function streamCurvature(depth: number): number {
  if (!(depth > 0)) return 0;
  return 1 / (2 * depth);
}

export interface StreamTrace {
  segments: BeamSegment[];
  /** Light that got out through the side of the stream, with where and how much. */
  leaks: { x: number; y: number; dx: number; dy: number; intensity: number }[];
  /** How many times the light bounced off the inside of the stream. */
  bounces: number;
  /**
   * How many of those bounces let NOTHING out.
   *
   * The one that matters, and it is not the same as `bounces`. A stream that is
   * bending hard turns its own walls under the light, so a ray safely past the
   * critical angle at one bounce can be under it at the next and leak away
   * there. That is bend loss and it is a real property of a real light guide,
   * so it is counted rather than smoothed over: light going round three corners
   * while losing nothing is the claim the naming line makes, and this is the
   * number that supports it.
   */
  tirBounces: number;
  /** How much of the light that entered was still inside at the basin. */
  delivered: number;
  /** How much leaked out on the way down. */
  leaked: number;
  /** The angle from the local normal at each bounce, in order. */
  incidences: number[];
}

export const MAX_STREAM_BOUNCES = 140;

/**
 * Follow the light down the inside of the falling water.
 *
 * The stream is cut into short straight pieces and each piece has two sides.
 * The normal at a bounce is the real normal of the piece that was hit, which is
 * turning as the stream falls, so this is not the flat-surface shortcut used in
 * the tank: it is the general case, and it is the reason light leaks out of a
 * tight bend and stays in a gentle one. That is bend loss, and it is a real
 * property of a real fibre.
 *
 * The same `interfaceSplit` decides every bounce. Nothing about total internal
 * reflection is coded twice.
 */
export function traceStream(args: {
  stream: StreamShape;
  entry: { x: number; y: number; dx: number; dy: number; intensity: number };
}): StreamTrace {
  const segments: BeamSegment[] = [];
  const leaks: StreamTrace['leaks'] = [];
  const incidences: number[] = [];

  const pts = args.stream.points;
  if (pts.length < 2 || !(args.entry.intensity > 0)) {
    return { segments, leaks, bounces: 0, tirBounces: 0, delivered: 0, leaked: 0, incidences };
  }

  // Both sides of the channel, as polylines, offset along the local normal.
  const sides: { x0: number; y0: number; x1: number; y1: number }[][] = [[], []];
  const edge = (i: number, s: number) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    return { x: pts[i].x + (-ty / len) * pts[i].w * s, y: pts[i].y + (tx / len) * pts[i].w * s };
  };
  for (let s = 0; s < 2; s++) {
    const sign = s === 0 ? 1 : -1;
    for (let i = 0; i < pts.length - 1; i++) {
      const p = edge(i, sign);
      const q = edge(i + 1, sign);
      sides[s].push({ x0: p.x, y0: p.y, x1: q.x, y1: q.y });
    }
  }

  let x = args.entry.x;
  let y = args.entry.y;
  let dx = args.entry.dx;
  let dy = args.entry.dy;
  let intensity = args.entry.intensity;
  const entered = intensity;

  const endX = pts[pts.length - 1].x;
  let leaked = 0;
  let bounces = 0;
  let tirBounces = 0;

  for (let step = 0; step < MAX_STREAM_BOUNCES; step++) {
    let best = Infinity;
    let hit: { x: number; y: number; nx: number; ny: number } | null = null;

    for (let s = 0; s < 2; s++) {
      for (const seg of sides[s]) {
        const ex = seg.x1 - seg.x0;
        const ey = seg.y1 - seg.y0;
        const denom = dx * ey - dy * ex;
        if (Math.abs(denom) < 1e-12) continue;
        const t = ((seg.x0 - x) * ey - (seg.y0 - y) * ex) / denom;
        if (!(t > 1e-7) || t >= best) continue;
        const k = ((seg.x0 - x) * dy - (seg.y0 - y) * dx) / denom;
        if (k < 0 || k > 1) continue;
        const len = Math.hypot(ex, ey) || 1;
        best = t;
        hit = { x: x + dx * t, y: y + dy * t, nx: -ey / len, ny: ex / len };
      }
    }

    // Nothing left to hit, or the water has run out from under it and the
    // light carries on into the basin as an ordinary beam in air.
    if (hit === null || hit.x > endX) {
      const toEnd = dx > EPS ? (endX - x) / dx : 0;
      const runTo = Math.max(0, toEnd);
      segments.push({ x0: x, y0: y, x1: x + dx * runTo, y1: y + dy * runTo, intensity });
      break;
    }

    segments.push({ x0: x, y0: y, x1: hit.x, y1: hit.y, intensity });

    // The normal, pointed back against the ray, so the angle is measured the
    // way `interfaceSplit` expects however the piece happens to be wound.
    let nx = hit.nx;
    let ny = hit.ny;
    let dot = dx * nx + dy * ny;
    if (dot > 0) {
      nx = -nx;
      ny = -ny;
      dot = -dot;
    }
    const incidence = Math.acos(Math.min(1, Math.max(0, -dot)));
    incidences.push(incidence);

    const split = interfaceSplit({ incidence, n1: N_WATER, n2: N_AIR });
    if (split.transmitted > 0 && split.refracted !== null) {
      // Out through the side, bent away from the normal by Snell in exactly the
      // way it is at the top of the tank.
      const tx = dx - dot * nx;
      const ty = dy - dot * ny;
      const tl = Math.hypot(tx, ty) || 1;
      const st = Math.sin(split.refracted);
      const ct = Math.cos(split.refracted);
      leaks.push({
        x: hit.x,
        y: hit.y,
        dx: (tx / tl) * st - nx * ct,
        dy: (ty / tl) * st - ny * ct,
        intensity: intensity * split.transmitted,
      });
      leaked += intensity * split.transmitted;
    }

    intensity *= split.reflected;
    bounces++;
    if (split.tir) tirBounces++;

    // Mirror the direction about the surface, which is the reflection law.
    dx = dx - 2 * dot * nx;
    dy = dy - 2 * dot * ny;
    x = hit.x;
    y = hit.y;

    if (intensity < INTENSITY_FLOOR) break;
  }

  return {
    segments,
    leaks,
    bounces,
    tirBounces,
    delivered: intensity,
    leaked,
    incidences,
  };
}

// ---------------------------------------------------------------------------
// The caustic on the tank floor
// ---------------------------------------------------------------------------

/** How many bins the floor is cut into for the caustic. */
export const CAUSTIC_BINS = 84;
/**
 * How many rays of room light are sent down through the surface.
 *
 * A whole number of rays per bin, deliberately. With a flat surface every bin
 * then comes back at exactly one rather than at six sevenths or eight sevenths,
 * so the reduced-motion picture is an even band and not a faint stripe pattern
 * that happens to be an artefact of the sampling.
 */
export const CAUSTIC_RAYS = CAUSTIC_BINS * 8;

/** How high the ripple on the surface can be, at full amplitude. */
export const RIPPLE_HEIGHT = 0.011;

/**
 * The height of the surface at a point, and its slope.
 *
 * Two waves of different lengths, so the pattern does not repeat across the
 * tank and read as wallpaper. `phase` is the only place a clock can enter this
 * module and it enters as an argument, so the caller decides whether it moves.
 * Under reduced motion the caller passes an amplitude of zero and this is flat.
 */
export function rippleAt(
  x: number,
  phase: number,
  amplitude: number,
): { height: number; slope: number } {
  const k1 = 17.0;
  const k2 = 27.0;
  const a = RIPPLE_HEIGHT * amplitude;
  return {
    height: a * (Math.sin(k1 * x + phase) + 0.6 * Math.sin(k2 * x - 1.3 * phase)),
    slope: a * (k1 * Math.cos(k1 * x + phase) + 0.6 * k2 * Math.cos(k2 * x - 1.3 * phase)),
  };
}

/**
 * The bright and dark bands the ripple throws on the tank floor.
 *
 * Room light coming straight down meets a surface that is not flat, so each
 * ray is bent by Snell through the local tilt and lands somewhere other than
 * directly below where it went in. Where a stretch of surface bends a wide band
 * of rays into a narrow band of floor, that stretch of floor is bright. That is
 * what a caustic IS, and computing it this way costs one pass of arithmetic and
 * is honest, where a couple of sine waves painted on the floor would be neither.
 *
 * Returned as a brightness per bin with an average of one, so a caller can
 * multiply it straight into an alpha without knowing how many rays were sent.
 * With the amplitude at zero the surface is flat, every ray lands directly
 * below where it entered, and every bin comes back at exactly one.
 */
export function causticBand(args: {
  level: number;
  phase: number;
  amplitude: number;
}): number[] {
  const level = clampLevel(args.level);
  const bins = new Array<number>(CAUSTIC_BINS).fill(0);

  for (let i = 0; i < CAUSTIC_RAYS; i++) {
    const sx = (TANK_W * (i + 0.5)) / CAUSTIC_RAYS;
    const { slope } = rippleAt(sx, args.phase, args.amplitude);
    // The normal tilts by the arctangent of the slope, and a ray coming
    // straight down meets that normal at exactly that angle.
    const tilt = Math.atan(slope);
    const incidence = Math.abs(tilt);
    const split = interfaceSplit({ incidence, n1: N_AIR, n2: N_WATER });
    const bend = split.refracted === null ? 0 : incidence - split.refracted;
    const drift = Math.tan(bend) * level * Math.sign(tilt);
    const fx = sx + drift;
    const bin = Math.floor((fx / TANK_W) * CAUSTIC_BINS);
    if (bin >= 0 && bin < CAUSTIC_BINS) bins[bin] += 1;
  }

  // Normalised to an average of one over the bins that could be reached. Rays
  // that drifted off the end of the floor are not counted in either place, so
  // the average is over what actually landed.
  let landed = 0;
  for (const b of bins) landed += b;
  if (landed <= 0) return bins.map(() => 1);
  const mean = landed / CAUSTIC_BINS;
  return bins.map((b) => b / mean);
}

// ---------------------------------------------------------------------------
// Sound
// ---------------------------------------------------------------------------

/** The bottom note. Low, warm, and the same one at every setting. */
export const BASE_HZ = 147;

/** Which partials are stacked on top of it. */
export const PARTIALS: readonly number[] = [1, 2, 3, 5];

/**
 * How bright the tone is, from how much light got out.
 *
 * The fundamental is always there, so the sound never disappears and the child
 * is never punished with silence for trapping the light. What changes is what
 * sits on top: with light streaming out of the water the tone is open and
 * bright, and as they swing past the critical angle the partials fall away and
 * what is left is a low hum with nothing above it. Trapped SOUNDS closed.
 *
 * The argument is `escapedFraction` of the very trace being drawn, so the ear
 * and the eye cannot disagree. The suite drives both from one trace and checks
 * that they move together.
 */
export function toneMix(escaped: number): number[] {
  const e = Math.min(1, Math.max(0, Number.isFinite(escaped) ? escaped : 0));
  return PARTIALS.map((multiple, i) => {
    if (i === 0) return 0.5;
    // Higher partials need more light before they arrive and fade faster in
    // proportion to their own multiple, which keeps the stack a warm tone
    // rather than letting it turn into a whistle at the top.
    return (e ** (1 + i * 0.35) * 0.42) / multiple;
  });
}

export function partialHz(index: number): number {
  return BASE_HZ * PARTIALS[Math.min(PARTIALS.length - 1, Math.max(0, index))];
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

/**
 * Every hue folds through `safeHue`, which maps the whole circle onto the arc
 * outside the banned 270 to 350 band. The suite sweeps the real functions
 * rather than reading these constants back.
 */
export const WATER_HUE_T = 0.7174;
export const BEAM_HUE_T = 0.1884;
export const STREAM_HUE_T = 0.7536;
export const CAUSTIC_HUE_T = 0.663;
export const GLASS_HUE_T = 0.78;

export function waterHue(): number {
  return safeHue(WATER_HUE_T);
}
export function beamHue(): number {
  return safeHue(BEAM_HUE_T);
}
export function streamHue(): number {
  return safeHue(STREAM_HUE_T);
}
export function causticHue(): number {
  return safeHue(CAUSTIC_HUE_T);
}
export function glassHue(): number {
  return safeHue(GLASS_HUE_T);
}

// ---------------------------------------------------------------------------
// The world the scene is drawn into
// ---------------------------------------------------------------------------

/**
 * A box big enough for every state the child can reach.
 *
 * Fixed once, exactly as Shape Ladder fits to the largest its shape can ever
 * be, and for the same reason: a view that followed the scene would shrink the
 * tank whenever the stream was shut off, so opening the spout would look like
 * the tank moving rather than like water coming out. The suite proves nothing
 * reachable lands outside it.
 */
export const WORLD = { x0: -0.09, x1: 3.16, y0: -1.03, y1: 0.92 } as const;

// ---------------------------------------------------------------------------
// The frame loop
// ---------------------------------------------------------------------------

export const HOLD_RISE = 3.4;
export const HOLD_DECAY = 1.7;
export const HOLD_FLOOR = 0.004;

/**
 * How lit the scene is under the child's hand.
 *
 * Rises while a finger is down and settles after it lifts. Under reduced motion
 * it SNAPS, because a ramp is an animation that outlives the input that started
 * it and a child who taps once should not then watch the tank breathe.
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
   * How much the surface ripples, which is what makes the caustic move. TIME
   * driven: a wall-clock walk, so it keeps going under a finger resting
   * perfectly still. That is autonomous motion however it got started, so it is
   * ZERO under reduced motion at every moment, held or not, and the surface is
   * flat and the caustic is an even band instead.
   */
  shimmer: number;
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
    shimmer: args.reduceMotion ? 0 : args.holdAmp,
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
// Words
// ---------------------------------------------------------------------------

/**
 * What the child has just been shown, in three numbers.
 *
 * Read off the traces that are ON THE SCREEN rather than recomputed from the
 * controls, and read off them ONCE, here, so the naming reducer, the test suite
 * and the component cannot each arrive at a slightly different idea of what
 * just happened. That is not hypothetical: Water Sphere shipped a sound and a
 * picture that disagreed because the same quantity was written down twice.
 */
export interface Reading {
  /**
   * The widest angle between a beam arriving at an interface and the beam that
   * left it, counting only the departures bright enough to see. Zero when
   * nothing got out.
   */
  bend: number;
  /**
   * How far past the critical angle a total reflection actually happened, in
   * radians. Zero when the beam never met an interface, which is a real state:
   * a steep swing in a full tank runs into the end wall without ever reaching
   * the surface, and the child has been shown nothing.
   */
  pastCritical: number;
  /** Bounces inside the falling stream that let nothing out. */
  bounces: number;
}

export function readTrace(tank: TankTrace, ride: StreamTrace | null): Reading {
  let bend = 0;
  for (const escape of tank.escapes) {
    if (escape.intensity < ESCAPE_VISIBLE) continue;
    bend = Math.max(bend, escape.refracted - escape.incidence);
  }

  let pastCritical = 0;
  for (const hit of tank.hits) {
    if (hit.tir) pastCritical = Math.max(pastCritical, hit.incidence - CRITICAL);
  }

  return { bend, pastCritical, bounces: ride === null ? 0 : ride.tirBounces };
}

/**
 * How much light has to be getting out before the sentence says it is getting
 * out, as a fraction of the torch.
 *
 * A hundredth is roughly the two per cent that bounces back off a flat surface
 * at dead-on incidence, so anything at or under that is the residue rather than
 * a beam, and calling it one would be wrong.
 */
export const ESCAPE_VISIBLE = 0.01;

/**
 * What is happening in the tank, for a child using a screen reader.
 *
 * Read off the trace that is actually on the screen rather than recomputed from
 * the controls, so the sentence and the picture cannot come apart. Shape Ladder
 * shipped a description built from a different figure than the one it named and
 * the observed pass is what caught it.
 */
export function describeTank(trace: TankTrace, stream: StreamTrace | null): string {
  const degrees = Math.round((trace.incidence * 180) / Math.PI);
  const first = trace.hits.length > 0 ? trace.hits[0] : null;

  let head: string;
  if (first === null) {
    head = `The torch is pointing ${degrees} degrees from straight up, and the beam has not reached the surface.`;
  } else if (first.tir) {
    head =
      `The torch is ${degrees} degrees from straight up, past the angle where light can get out. ` +
      `None of it is leaving the water. The top has turned into a mirror and the beam is bouncing along inside.`;
  } else {
    // The same split the picture is drawn from, asked again for the one number
    // the sentence needs, rather than a second copy of the arithmetic.
    const out = interfaceSplit({ incidence: first.incidence, n1: N_WATER, n2: N_AIR }).refracted ?? 0;
    const outDegrees = Math.round((out * 180) / Math.PI);
    head =
      `The torch is ${degrees} degrees from straight up. ` +
      `The beam bends as it leaves the water and comes out at ${outDegrees} degrees, wider than it went in.`;
  }

  if (stream === null || stream.bounces === 0) {
    return `${head} Drag the torch to swing it. Drag the water line to change how deep it is. Pull the tab on the right to open the spout.`;
  }

  const bounces = `${stream.bounces} ${stream.bounces === 1 ? 'time' : 'times'}`;
  return `${head} Light has gone out through the spout and is riding the falling water, bouncing off the inside of it ${bounces} on the way down.`;
}
