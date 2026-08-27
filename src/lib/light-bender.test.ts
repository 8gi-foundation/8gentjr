/**
 * Light Bender: the physics, measured.
 *
 * Every claim this activity makes to a child is checked here against a closed
 * form or against a sweep of the real control space, not against a table of
 * numbers recorded from a previous run. Where a number IS pinned, it is pinned
 * because it is the value of a textbook expression and a change to it would be
 * a change to the physics rather than to a tuning choice.
 *
 * Where a claim only holds over part of the control space, the test says which
 * part, in the test itself, so a reader is never left inferring the scope of an
 * assertion from its name.
 *
 * Issue: #225 (wave 6, Light Bender)
 */

import { describe, expect, test } from 'bun:test';
import { hueIsAllowed } from '@/lib/pattern-garden';
import { BEND_SEEN, RIDE_BOUNCES } from '@/lib/light-bender-discovery';
import {
  AIM_MAX,
  AIM_MIN,
  BASE_HZ,
  CAUSTIC_BINS,
  CAUSTIC_PEAK,
  CAUSTIC_RAYS,
  CRITICAL,
  ESCAPE_VISIBLE,
  FIT_ANCHOR,
  FIT_HEIGHT,
  FIT_WIDTH,
  HOLD_DECAY,
  HOLD_FLOOR,
  INTENSITY_FLOOR,
  LEVEL_MAX,
  LEVEL_MIN,
  MAX_STREAM_BOUNCES,
  MIN_CANVAS_PX,
  N_AIR,
  N_WATER,
  PARTIALS,
  RIPPLE_HEIGHT,
  SLOT_MAX,
  STREAM_DROP,
  TANK_H,
  TANK_W,
  TORCH_ARM,
  TORCH_PIVOT,
  WORLD,
  beamDirection,
  beamHue,
  causticBand,
  causticHue,
  causticOutline,
  clampAim,
  clampLevel,
  clampOpen,
  criticalAngle,
  describeTank,
  escapedFraction,
  fitScene,
  glassHue,
  glassSegments,
  holdAmpNext,
  interfaceSplit,
  motionAmplitudes,
  partialHz,
  rippleAt,
  shouldSchedule,
  slotInterval,
  slotMid,
  slotTop,
  streamCentreDrop,
  streamCurvature,
  streamHalfWidth,
  streamLength,
  streamShape,
  streamHue,
  readTrace,
  toneMix,
  torchHead,
  traceStream,
  traceTank,
  waterHue,
} from '@/lib/light-bender';

const DEG = Math.PI / 180;

/** Every level the child can set, at a spacing finer than a finger can hold. */
function levels(count = 24): number[] {
  return Array.from({ length: count + 1 }, (_, i) => LEVEL_MIN + ((LEVEL_MAX - LEVEL_MIN) * i) / count);
}

/** Every swing the child can make. */
function aims(count = 96): number[] {
  return Array.from({ length: count + 1 }, (_, i) => AIM_MIN + ((AIM_MAX - AIM_MIN) * i) / count);
}

/** An on-axis ray entering the mouth of the stream at a given angle from the vertical. */
function streamEntry(angle: number, open = 1) {
  return {
    x: TANK_W,
    y: slotMid(open),
    dx: Math.sin(angle),
    dy: -Math.cos(angle),
    intensity: 1,
  };
}

/**
 * How wide, in radians, the band of swings that ride has to be.
 *
 * Not a tolerance. It is the difference between a target and a needle. The
 * whole swing is 1.42 radians wide and the child aims the torch by pointing at
 * the place they want it to shine, so on a laptop this is a dozen pixels of
 * pointing and on a phone it is fewer: small, but a width a finger sweeping
 * across can stop inside and a keyboard step of 0.06 can very nearly not jump
 * over. A band a tenth of this wide is real in the arithmetic and is not there
 * for the child, which is the state this whole fix is about.
 */
const RIDE_WINDOW = 0.05;

/**
 * Drive the child's actual pipeline across the whole swing at one setting.
 *
 * `traceTank` to find the swings whose beam arrives inside the slot, `slotRay`
 * as the light that got through it, `traceStream` to follow that light down the
 * falling water. Nothing is hand placed anywhere in here.
 *
 * Returns the best ride found and the width of the widest unbroken band of
 * swings that ride, which is the number that says whether a child can find it.
 */
function rideSweep(level: number, open: number, step = 0.0005) {
  const stream = streamShape({ level, open });
  let bestBounces = 0;
  let widest = 0;
  let runStart = -1;
  let runEnd = -1;
  for (let i = 0; ; i++) {
    const aim = AIM_MIN + i * step;
    if (aim > AIM_MAX + 1e-12) break;
    const tank = traceTank({ aim, level, open });
    let rides = false;
    if (tank.slotRay) {
      const ride = traceStream({ stream, entry: tank.slotRay });
      if (ride.tirBounces > bestBounces) bestBounces = ride.tirBounces;
      rides = ride.tirBounces >= RIDE_BOUNCES;
    }
    if (rides) {
      if (runStart < 0) runStart = aim;
      runEnd = aim;
    } else if (runStart >= 0) {
      widest = Math.max(widest, runEnd - runStart + step);
      runStart = -1;
    }
  }
  if (runStart >= 0) widest = Math.max(widest, runEnd - runStart + step);
  return { bestBounces, widest };
}

// ---------------------------------------------------------------------------

describe('the critical angle', () => {
  test('is asin of the index ratio, and its value is pinned', () => {
    // Not a tuned threshold. Everything else in the activity turns on this
    // number, so it is written out to the digit rather than derived in the
    // assertion from the same expression it is supposed to be checking.
    expect(CRITICAL).toBeCloseTo(0.8483456688217663, 15);
    expect(CRITICAL / DEG).toBeCloseTo(48.60662639169, 9);
    expect(criticalAngle(N_WATER, N_AIR)).toBe(CRITICAL);
    expect(Math.sin(CRITICAL) * N_WATER).toBeCloseTo(1, 15);
  });

  test('does not exist going into the denser material, which is why the torch is under water', () => {
    // A ray arriving from air bends TOWARDS the normal, so however grazing it
    // is on the way in it is never trapped on the way in. If this ever
    // returned a number, an activity with the lamp above the water would look
    // like it worked and would be teaching something untrue.
    expect(criticalAngle(N_AIR, N_WATER)).toBeNull();
    expect(criticalAngle(N_WATER, N_WATER)).toBeNull();
    expect(criticalAngle(0, 1)).toBeNull();
    expect(criticalAngle(1, 0)).toBeNull();
    expect(criticalAngle(Number.NaN, 1)).toBeNull();
  });
});

describe("Snell's law", () => {
  test('sends light out at exactly the angle the law says, at known pairs', () => {
    // Water to air, angles a protractor could check on the screen. Pinned to
    // nine decimal places in degrees, which is far tighter than any plausible
    // reformulation of the expression would survive.
    const pairs: [number, number][] = [
      [10, 13.383810159],
      [20, 27.123684066],
      [30, 41.797504451],
      [40, 58.963150998],
      [45, 70.488305561],
      [48, 82.14288143],
    ];
    for (const [inDeg, outDeg] of pairs) {
      const split = interfaceSplit({ incidence: inDeg * DEG, n1: N_WATER, n2: N_AIR });
      expect(split.tir).toBe(false);
      expect(split.refracted! / DEG).toBeCloseTo(outDeg, 8);
    }
  });

  test('holds n1 sin i equal to n2 sin t everywhere below the critical angle', () => {
    // The law itself, swept, rather than six points off it.
    for (let i = 0; i < 400; i++) {
      const incidence = (CRITICAL * i) / 400;
      const split = interfaceSplit({ incidence, n1: N_WATER, n2: N_AIR });
      expect(split.refracted).not.toBeNull();
      expect(N_WATER * Math.sin(incidence)).toBeCloseTo(N_AIR * Math.sin(split.refracted!), 14);
    }
  });

  test('light always leaves at a WIDER angle than it arrived at, going out of water', () => {
    for (let i = 1; i < 400; i++) {
      const incidence = (CRITICAL * i) / 400;
      const split = interfaceSplit({ incidence, n1: N_WATER, n2: N_AIR });
      expect(split.refracted!).toBeGreaterThan(incidence);
    }
  });
});

describe('the Fresnel split', () => {
  test('transmitted and reflected sum to exactly one, everywhere', () => {
    // Energy conservation, and it is exact rather than close: the transmitted
    // fraction is computed AS one minus the reflected, so a change that broke
    // this would be a change that computed the two separately.
    for (const [n1, n2] of [
      [N_WATER, N_AIR],
      [N_AIR, N_WATER],
    ]) {
      for (let i = 0; i <= 900; i++) {
        const split = interfaceSplit({ incidence: (i * Math.PI) / 1800, n1, n2 });
        expect(split.transmitted + split.reflected).toBe(1);
        expect(split.transmitted).toBeGreaterThanOrEqual(0);
        expect(split.reflected).toBeLessThanOrEqual(1);
      }
    }
  });

  test('reflects the textbook two per cent when the light meets the surface square on', () => {
    // ((n1 - n2) / (n1 + n2)) squared, which is where the faint second beam in
    // the picture comes from when the torch is pointing straight up.
    const square = ((N_WATER - N_AIR) / (N_WATER + N_AIR)) ** 2;
    expect(interfaceSplit({ incidence: 0, n1: N_WATER, n2: N_AIR }).reflected).toBeCloseTo(
      square,
      15,
    );
    expect(square).toBeCloseTo(0.0203731878419714, 15);
  });

  test("obeys Brewster's identity, which no fitted curve does", () => {
    // At Brewster's angle the p polarisation is not reflected at all, so the
    // unpolarised reflectance is exactly half the s reflectance, and the s
    // reflectance there collapses to cos(2 theta_B) squared. Getting this right
    // to twelve places is only possible if the real expression is in there.
    const brewster = Math.atan(N_AIR / N_WATER);
    const split = interfaceSplit({ incidence: brewster, n1: N_WATER, n2: N_AIR });
    expect(split.reflected).toBeCloseTo(Math.cos(2 * brewster) ** 2 / 2, 12);
    // The other half of the identity: the reflected and transmitted rays leave
    // at a right angle to each other.
    expect(brewster + split.refracted!).toBeCloseTo(Math.PI / 2, 12);
  });

  test('is reciprocal: the same surface reflects the same fraction from either side', () => {
    // Stokes reciprocity. A ray going water to air at i and a ray going air to
    // water at the angle the first one left by must meet the same reflectance.
    // It is an independent property of the expression and nothing in the code
    // enforces it, so it is a real check rather than a restatement.
    for (let i = 1; i < 300; i++) {
      const incidence = (CRITICAL * i) / 301;
      const out = interfaceSplit({ incidence, n1: N_WATER, n2: N_AIR });
      const back = interfaceSplit({ incidence: out.refracted!, n1: N_AIR, n2: N_WATER });
      expect(back.reflected).toBeCloseTo(out.reflected, 14);
    }
  });
});

describe('total internal reflection', () => {
  test('is a hard zero at and past the critical angle, not a small number', () => {
    for (const past of [0, 1e-12, 1e-6, 0.001, 0.05, 0.3, Math.PI / 2 - CRITICAL]) {
      const split = interfaceSplit({ incidence: CRITICAL + past, n1: N_WATER, n2: N_AIR });
      expect(split.tir).toBe(true);
      expect(split.transmitted).toBe(0);
      expect(split.reflected).toBe(1);
      expect(split.refracted).toBeNull();
    }
  });

  test('arrives as a cliff: half the light goes in the last hundredth of a radian', () => {
    // THE MEASURED DISCONTINUITY. Transmission does not fall away gently and
    // then stop; it holds up above nine tenths for most of the swing, loses
    // more than half of what is left inside the final 0.01 radians before the
    // critical angle, and is then exactly zero. That last window is about two
    // pixels of finger travel, which is why the child experiences it as the
    // beam going out rather than as the beam dimming.
    const justBelow = interfaceSplit({ incidence: CRITICAL - 0.01, n1: N_WATER, n2: N_AIR });
    expect(justBelow.transmitted).toBeCloseTo(0.556850071495, 10);

    const dropAtTheEdge = justBelow.transmitted;
    expect(dropAtTheEdge).toBeGreaterThan(0.55);

    // And nothing anywhere else in the swing behaves like that. SCOPED, because
    // the figure is meaningless without its scope: the sweep runs over
    // incidences a with a < CRITICAL - 0.02 and compares each against a + 0.01,
    // so the windows measured all END at or before CRITICAL - 0.01 and the
    // cliff itself is deliberately outside them. Over that range the worst
    // 0.01 radian window loses 0.12035 of the transmission, about an eighth,
    // against the 0.55685 lost in the window the scope excludes.
    let worstElsewhere = 0;
    for (let a = 0; a < CRITICAL - 0.02; a += 0.0005) {
      const here = interfaceSplit({ incidence: a, n1: N_WATER, n2: N_AIR }).transmitted;
      const there = interfaceSplit({ incidence: a + 0.01, n1: N_WATER, n2: N_AIR }).transmitted;
      worstElsewhere = Math.max(worstElsewhere, here - there);
    }
    expect(worstElsewhere).toBeCloseTo(0.12035, 4);
    expect(dropAtTheEdge).toBeGreaterThan(worstElsewhere * 4);
  });

  test('nothing gets out at any incidence past the critical angle, at any index pair tried', () => {
    for (const [n1, n2] of [
      [1.5, 1],
      [1.333, 1],
      [1.333, 1.2],
    ]) {
      const c = criticalAngle(n1, n2)!;
      for (let i = 0; i <= 60; i++) {
        const incidence = c + ((Math.PI / 2 - c) * i) / 60;
        expect(interfaceSplit({ incidence, n1, n2 }).transmitted).toBe(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------

describe('the tank the child is holding', () => {
  test('the lamp is always under the water, at every setting', () => {
    // If the lamp head could ever break the surface it would be shining air
    // into water, where there is no critical angle and the whole second half of
    // the activity has nothing to find. Checked against the numbers rather than
    // asserted in a comment.
    const highest = TORCH_PIVOT.y + TORCH_ARM;
    expect(highest).toBeLessThan(LEVEL_MIN);
    for (const aim of aims()) {
      const head = torchHead(aim);
      expect(head.y).toBeLessThan(LEVEL_MIN);
      expect(head.x).toBeGreaterThan(0);
      expect(head.x).toBeLessThan(TANK_W);
      expect(head.y).toBeGreaterThan(0);
    }
  });

  test('the slot never reaches the surface, so there is always water above it', () => {
    // Torricelli needs a depth. A slot at or above the water line would give a
    // stream with no speed and a divide that has to be special-cased.
    expect(slotTop(1)).toBe(SLOT_MAX);
    expect(slotMid(1)).toBeLessThan(LEVEL_MIN);
    expect(slotTop(0)).toBe(0);
  });

  test('the controls clamp rather than wrap, and refuse nonsense', () => {
    expect(clampAim(-3)).toBe(AIM_MIN);
    expect(clampAim(99)).toBe(AIM_MAX);
    expect(clampAim(Number.NaN)).toBe(AIM_MIN);
    expect(clampLevel(0)).toBe(LEVEL_MIN);
    expect(clampLevel(9)).toBe(LEVEL_MAX);
    expect(clampLevel(Number.NaN)).toBe(LEVEL_MIN);
    expect(clampOpen(-1)).toBe(0);
    expect(clampOpen(2)).toBe(1);
    expect(clampOpen(Number.NaN)).toBe(0);
  });

  test('the beam leaves the lamp in the direction the lamp points', () => {
    for (const aim of aims(40)) {
      const d = beamDirection(aim);
      expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 15);
      expect(Math.atan2(d.x, d.y)).toBeCloseTo(aim, 14);
    }
  });
});

describe('tracing the beam in the tank', () => {
  test('every interface it meets is met at the SAME angle, and that angle is the swing', () => {
    // The property the whole activity rests on. The top of the water and the
    // floor of the tank are parallel, so a bounce flips the vertical part of
    // the direction and leaves the horizontal part alone. One number under the
    // child's finger therefore decides everything that happens to the light,
    // which is why swinging the torch feels like one continuous control rather
    // than like poking a simulation.
    //
    // THE SIZE OF THE SWEEP, counted: 637 states, thirteen water levels against
    // forty-nine swings, and the interfaces those states produce carry 1236
    // assertions between them. A state whose beam never reaches the surface
    // contributes none, which is why the two numbers are not multiples.
    let checked = 0;
    for (const level of levels(12)) {
      for (const aim of aims(48)) {
        const trace = traceTank({ aim, level, open: 0 });
        for (const hit of trace.hits) {
          expect(hit.incidence).toBeCloseTo(aim, 12);
          checked++;
        }
      }
    }
    expect(checked).toBe(1236);
  });

  test('all of the light is accounted for, everywhere in the control space', () => {
    // Escaped, soaked up by a side wall, gone out through the slot, or still
    // bouncing when the trace ran out of budget. Nothing else can happen to it,
    // and the four add to one to within floating point.
    //
    // THE SIZE OF THE SWEEP, counted rather than estimated: 4165 traces, being
    // seventeen water levels by five spout openings by forty-nine swings, and
    // 16661 assertions, being four per trace and one at the end. The tolerance
    // asserted is 1e-12 and the worst error measured across the whole of it is
    // 1.11e-16, which is one bit of a double. The first version of this line
    // reported 52029 states within 2.2e-16; neither number was the sweep's, and
    // this counts both of them in the test rather than in a comment.
    let worst = 0;
    let traces = 0;
    let assertions = 0;
    for (const level of levels(16)) {
      for (const open of [0, 0.25, 0.5, 0.75, 1]) {
        for (const aim of aims(48)) {
          const t = traceTank({ aim, level, open });
          traces++;
          worst = Math.max(worst, Math.abs(t.escaped + t.intoWall + t.intoSlot + t.left - 1));
          expect(t.escaped).toBeGreaterThanOrEqual(0);
          expect(t.intoWall).toBeGreaterThanOrEqual(0);
          expect(t.intoSlot).toBeGreaterThanOrEqual(0);
          expect(t.left).toBeGreaterThanOrEqual(0);
          assertions += 4;
        }
      }
    }
    expect(worst).toBeLessThan(1e-12);
    expect(worst).toBeLessThan(2 * Number.EPSILON);
    expect(traces).toBe(4165);
    expect(assertions + 1).toBe(16661);
  });

  test('the beam is one unbroken path: each piece starts where the last one stopped', () => {
    for (const level of [LEVEL_MIN, 0.35, LEVEL_MAX]) {
      for (const aim of aims(32)) {
        const t = traceTank({ aim, level, open: 1 });
        for (let i = 1; i < t.segments.length; i++) {
          expect(t.segments[i].x0).toBeCloseTo(t.segments[i - 1].x1, 12);
          expect(t.segments[i].y0).toBeCloseTo(t.segments[i - 1].y1, 12);
        }
      }
    }
  });

  test('the beam stays inside the tank while it is inside the tank', () => {
    for (const level of levels(10)) {
      for (const aim of aims(40)) {
        const t = traceTank({ aim, level, open: 1 });
        for (const s of t.segments) {
          for (const [x, y] of [
            [s.x0, s.y0],
            [s.x1, s.y1],
          ]) {
            expect(x).toBeGreaterThanOrEqual(-1e-9);
            expect(x).toBeLessThanOrEqual(TANK_W + 1e-9);
            expect(y).toBeGreaterThanOrEqual(-1e-9);
            expect(y).toBeLessThanOrEqual(level + 1e-9);
          }
        }
      }
    }
  });

  test('the angle at which the tank stops letting light out IS the critical angle', () => {
    // Found by bisecting the real trace rather than read off the constant, so
    // this is a measurement of the product and not a restatement of the physics
    // module. It comes back exact to floating point, which it should: the
    // interface in the tank is flat, so there is nothing between the swing of
    // the child's hand and the angle of incidence.
    const holds = (aim: number) => {
      const t = traceTank({ aim, level: 0.35, open: 0 });
      return t.hits.length > 0 && t.escaped === 0;
    };
    let lo = 0.2;
    let hi = 1.2;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (holds(mid)) hi = mid;
      else lo = mid;
    }
    expect(hi).toBeCloseTo(CRITICAL, 12);
  });

  test('past the critical angle nothing gets out, at every level and every swing', () => {
    for (const level of levels(16)) {
      for (const aim of aims(64)) {
        const t = traceTank({ aim, level, open: 0 });
        if (aim >= CRITICAL) {
          expect(t.escaped).toBe(0);
          expect(t.escapes).toHaveLength(0);
          for (const hit of t.hits) expect(hit.tir).toBe(true);
        }
      }
    }
  });

  test('below the critical angle almost all of it gets out, whenever the beam reaches the surface', () => {
    // Scoped, deliberately. A very steep swing in a full tank runs into the far
    // end before it ever reaches the surface, and that beam has not failed to
    // escape, it has not arrived. The claim is about beams that got there.
    //
    // The floor is 0.98 and the worst case measured over this grid is 0.9875.
    // It used to be 0.8881, at a nearly full tank at forty-four degrees, where
    // the beam met the surface once steeply enough to send an eighth of itself
    // back down and that eighth ran into the far wall before it could meet
    // another interface. Capping the water at the rideable ceiling took that
    // state out of the child's reach, so the floor moved up with it. Nothing is
    // lost by the model in either case; it is soaked up by a wall.
    let worst = 1;
    for (const level of levels(12)) {
      for (const aim of aims(48)) {
        if (aim > CRITICAL - 0.05) continue;
        const t = traceTank({ aim, level, open: 0 });
        if (t.hits.length === 0) continue;
        expect(t.escaped).toBeGreaterThan(0.98);
        worst = Math.min(worst, t.escaped);
      }
    }
    expect(worst).toBeCloseTo(0.98748, 4);
  });

  test('the escaping ray is a real direction, bent away from the normal, on the right side', () => {
    for (const level of levels(8)) {
      for (const aim of aims(40)) {
        const t = traceTank({ aim, level, open: 0 });
        for (const e of t.escapes) {
          expect(Math.hypot(e.dx, e.dy)).toBeCloseTo(1, 12);
          expect(e.refracted).toBeGreaterThanOrEqual(e.incidence);
          // Out through the top means going up; out through the floor means
          // going down. A sign error here would draw light climbing out of the
          // bottom of the tank.
          if (e.face === 'top') expect(e.dy).toBeGreaterThan(0);
          else expect(e.dy).toBeLessThan(0);
          expect(e.intensity).toBeGreaterThan(0);
        }
      }
    }
  });

  test('a shut spout lets no light out of the side, ever', () => {
    for (const level of levels(16)) {
      for (const aim of aims(64)) {
        const t = traceTank({ aim, level, open: 0 });
        expect(t.intoSlot).toBe(0);
        expect(t.slotRay).toBeNull();
      }
    }
  });

  test('an open spout can be found by swinging the torch, at every level', () => {
    // Reachability, MEASURED AND SCOPED. If the only way into the stream were a
    // needle the child could not thread, the second half of the activity would
    // not exist for them.
    //
    // How easy it is depends on the water level, and it depends on it the way
    // the rest of the activity does: a low tank makes the beam zig-zag, so it
    // crosses the height of the slot many times on its way down the tank and
    // there are many swings that work. At the fullest tank the beam reaches the
    // far wall in fewer hops and there are only seven windows in this sampling.
    // Both numbers are asserted, because a change that made the full tank
    // easier by making the empty one harder should not pass quietly.
    //
    // Finding the slot is NOT the same as riding the stream, and the difference
    // is what the cap in LEVEL_MAX is about. There were still four windows at
    // the old ceiling of 0.72; every one of them was under the critical angle,
    // so the light went into the water and straight back out of the side of it.
    const windowsAt = (level: number) =>
      aims(200).filter((aim) => traceTank({ aim, level, open: 1 }).slotRay !== null).length;
    for (const level of levels(10)) expect(windowsAt(level)).toBeGreaterThanOrEqual(7);
    expect(windowsAt(LEVEL_MAX)).toBe(7);
    expect(windowsAt(LEVEL_MIN)).toBeGreaterThan(25);
  });

  test('the far wall soaks up whatever reaches it, and it is counted', () => {
    // The right hand wall above the slot is where a steep swing in a full tank
    // ends, and what it absorbs has to be counted or the energy sum above is
    // being satisfied by a number nobody is watching.
    const steep = traceTank({ aim: AIM_MAX, level: LEVEL_MAX, open: 0 });
    expect(steep.hits).toHaveLength(0);
    expect(steep.intoWall).toBe(1);
    expect(steep.escaped).toBe(0);
  });

  test('the near wall is behind the lamp and nothing can ever reach it', () => {
    // The tracer has a branch for the left hand wall, and across the whole
    // control space that branch is DEAD: the swing starts at straight up and
    // only ever goes right, a bounce off a horizontal surface flips the
    // vertical part of the direction and leaves the horizontal part alone, so
    // the beam's horizontal sense can never reverse. The branch is kept because
    // it is a general tracer and a later change to AIM_MIN would make it live,
    // and AIM_MIN is pinned here so such a change cannot be silent.
    expect(AIM_MIN).toBe(0);
    for (const level of levels(20)) {
      for (const aim of aims(80)) {
        for (const seg of traceTank({ aim, level, open: 1 }).segments) {
          expect(seg.x1).toBeGreaterThan(-1e-9);
          expect(seg.x1 >= seg.x0 - 1e-9).toBe(true);
        }
      }
    }
  });

  test('the beam left in the trace is below the floor it stops at, or it hit something', () => {
    for (const level of levels(10)) {
      for (const aim of aims(40)) {
        const t = traceTank({ aim, level, open: 1 });
        if (t.left > 0) expect(t.left).toBeLessThan(INTENSITY_FLOOR);
      }
    }
  });
});

// ---------------------------------------------------------------------------

describe('the falling stream', () => {
  test('is the Torricelli parabola, with gravity cancelled out of it', () => {
    // drop = u squared over four times the depth. Checked against the closed
    // form at a spread of depths and distances, because the whole reason the
    // child's water level controls the shape of the arc is that g is not in it.
    for (const depth of [0.1, 0.25, 0.4, 0.6, 0.7]) {
      for (const u of [0, 0.1, 0.3, 0.7, 1.2]) {
        expect(streamCentreDrop(u, depth)).toBeCloseTo((u * u) / (4 * depth), 15);
      }
    }
    expect(streamCentreDrop(1, 0)).toBe(0);
    expect(streamCentreDrop(1, -1)).toBe(0);
  });

  test('reaches the basin at twice the root of depth times drop, the classic range', () => {
    for (const depth of [0.1, 0.3, 0.5, 0.7]) {
      const length = streamLength(depth);
      expect(length).toBeCloseTo(2 * Math.sqrt(depth * STREAM_DROP), 15);
      // And it really has fallen exactly that far by then.
      expect(streamCentreDrop(length, depth)).toBeCloseTo(STREAM_DROP, 14);
    }
  });

  test('narrows as it speeds up, by continuity, and gravity cancels there too', () => {
    for (const depth of [0.15, 0.4, 0.7]) {
      const mouth = 0.025;
      expect(streamHalfWidth(0, depth, mouth)).toBeCloseTo(mouth, 15);
      let previous = mouth + 1;
      for (let u = 0; u <= streamLength(depth); u += 0.05) {
        const w = streamHalfWidth(u, depth, mouth);
        expect(w).toBeCloseTo(mouth / Math.sqrt(1 + (u / (2 * depth)) ** 2), 15);
        expect(w).toBeLessThan(previous);
        previous = w;
      }
    }
  });

  test('bends harder when there is less water above the slot', () => {
    // Curvature at the mouth is one over twice the depth, which is why filling
    // the tank flattens the arc and emptying it tightens it. The child controls
    // this directly with the water line.
    for (const depth of [0.1, 0.3, 0.7]) {
      expect(streamCurvature(depth)).toBeCloseTo(1 / (2 * depth), 15);
    }
    expect(streamCurvature(0)).toBe(0);
    expect(streamCurvature(0.2)).toBeGreaterThan(streamCurvature(0.6));
  });

  test('turns through the angle the closed form says, by the time it lands', () => {
    // The tangent at the end is atan of the root of drop over depth, so a
    // shallow tank throws a stream that has turned a long way round by the time
    // it reaches the basin. Measured off the polyline that is actually drawn
    // and traced, so this catches a sampling change as well as an algebra one.
    for (const level of [LEVEL_MIN, 0.4, LEVEL_MAX]) {
      const shape = streamShape({ level, open: 1 });
      const n = shape.points.length;
      const a = shape.points[n - 2];
      const b = shape.points[n - 1];
      const measured = Math.atan2(-(b.y - a.y), b.x - a.x);
      expect(measured).toBeCloseTo(Math.atan(Math.sqrt(STREAM_DROP / shape.depth)), 2);
    }
  });

  test('there is no stream at all with the spout shut', () => {
    for (const level of levels(8)) {
      const shape = streamShape({ level, open: 0 });
      expect(shape.points).toHaveLength(0);
      expect(shape.length).toBe(0);
      expect(traceStream({ stream: shape, entry: streamEntry(1.2) }).bounces).toBe(0);
    }
  });
});

describe('light inside the falling stream', () => {
  test('all of the light that went in is either still inside or has leaked out', () => {
    for (const level of levels(10)) {
      for (const angle of [0.5, 0.85, 1.0, 1.2, 1.4]) {
        const shape = streamShape({ level, open: 1 });
        const trace = traceStream({ stream: shape, entry: streamEntry(angle) });
        expect(trace.delivered + trace.leaked).toBeCloseTo(1, 10);
        expect(trace.bounces).toBeLessThanOrEqual(MAX_STREAM_BOUNCES);
        expect(trace.tirBounces).toBeLessThanOrEqual(trace.bounces);
        expect(trace.incidences).toHaveLength(trace.bounces);
      }
    }
  });

  test('when every bounce is total, nothing leaks, and that is one implication not two', () => {
    for (const level of levels(10)) {
      for (const angle of [0.6, 0.9, 1.1, 1.3, 1.42]) {
        const trace = traceStream({
          stream: streamShape({ level, open: 1 }),
          entry: streamEntry(angle),
        });
        if (trace.bounces > 0 && trace.tirBounces === trace.bounces) {
          expect(trace.leaked).toBe(0);
          expect(trace.delivered).toBe(1);
          expect(trace.leaks).toHaveLength(0);
        }
        for (const incidence of trace.incidences.slice(0, trace.tirBounces)) {
          expect(incidence).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  test('a bending stream needs MORE than the critical angle, which a flat surface does not', () => {
    // BEND LOSS, and it is the one place where the tank and the stream part
    // company. Light arriving in the tank at exactly the critical angle is held
    // completely. The same light arriving in the stream at exactly the critical
    // angle leaks out of every stream the child can make, because the stream
    // turns its own walls under the beam as it falls. Both places obey the same
    // rule at every single bounce; the stream simply keeps moving the bounce.
    let leastLeaked = 1;
    for (const level of levels(20)) {
      for (const open of [0.25, 0.5, 0.75, 1]) {
        const trace = traceStream({
          stream: streamShape({ level, open }),
          entry: streamEntry(CRITICAL, open),
        });
        expect(trace.leaked).toBeGreaterThan(0);
        leastLeaked = Math.min(leastLeaked, trace.leaked);
      }
    }
    // And it is not a rounding crumb that leaks: it is nearly all of it.
    expect(leastLeaked).toBeGreaterThan(0.99);
  });

  test('and the swing that would hold it is not the swing the child can aim into the slot', () => {
    // The other half, and the correction. A hand-placed ray laid on the axis of
    // the mouth needs about 1.30 radians to be held completely, and the torch
    // goes to 1.42, so on paper there is margin. That measurement was the whole
    // of the old evidence for "every stream can be lit", and it was NOT the
    // child's pipeline: it starts the ray at the slot instead of aiming a torch
    // at it, and what a torch can aim into the slot is decided by the tank, not
    // by the range of the swing.
    //
    // The number is kept because it is a true statement about the stream. What
    // it is not is a statement about reachability, and the test below is.
    let worstNeeded = 0;
    for (const level of levels(20)) {
      const holds = (angle: number) =>
        traceStream({ stream: streamShape({ level, open: 1 }), entry: streamEntry(angle) })
          .leaked === 0;
      expect(holds(AIM_MAX)).toBe(true);
      let lo = CRITICAL;
      let hi = AIM_MAX;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (holds(mid)) hi = mid;
        else lo = mid;
      }
      worstNeeded = Math.max(worstNeeded, hi);
    }
    expect(worstNeeded).toBeGreaterThan(CRITICAL);
    expect(worstNeeded).toBeLessThan(AIM_MAX);
    expect(worstNeeded).toBeCloseTo(1.30305, 4);
  });

  test('a flatter stream carries the light through many more bounces than a tight one', () => {
    // MEASURED, AND SCOPED. The entry ray is held at 1.05 radians on the axis
    // of the mouth and the spout is fully open, so the only thing changing is
    // the water level and therefore the curvature. Averaged over the shallowest
    // quarter of the levels the child can reach and over the deepest quarter,
    // because the count at any single level is not monotone against its
    // neighbours: whether a bounce lands just before or just after the end of
    // the stream is an alignment accident, and only the trend is a claim about
    // the physics.
    const bouncesAt = (level: number) =>
      traceStream({ stream: streamShape({ level, open: 1 }), entry: streamEntry(1.05) }).bounces;

    let shallow = 0;
    let deep = 0;
    const span = LEVEL_MAX - LEVEL_MIN;
    for (let i = 0; i < 8; i++) {
      shallow += bouncesAt(LEVEL_MIN + (span * i) / 32);
      deep += bouncesAt(LEVEL_MIN + (span * (24 + i)) / 32);
    }
    expect(shallow / 8).toBeCloseTo(9.0, 1);
    expect(deep / 8).toBeCloseTo(18.375, 1);
    expect(deep).toBeGreaterThan(shallow * 2);
    expect(streamCurvature(clampLevel(LEVEL_MIN) - slotMid(1))).toBeGreaterThan(
      streamCurvature(clampLevel(LEVEL_MAX) - slotMid(1)),
    );
  });

  test('the ride is reachable through the real controls at EVERY level the child can set', () => {
    // THE CLAIM, DRIVEN THE WAY A CHILD DRIVES IT. Swing the torch, take
    // whatever went through the slot, follow it down the water: traceTank into
    // slotRay into traceStream, over the whole swing, at every level and at the
    // fully open spout.
    //
    // This test exists because the claim it replaces was false. The old
    // evidence was a ray hand-placed on the axis of the mouth, which cannot
    // fail to enter the stream because it is already in it. Through the real
    // controls the steepest swing that arrives inside the slot FALLS as the
    // tank fills, and past the cap the only swings that reach it are under the
    // critical angle, so a child who filled the tank lost the second half of
    // the activity and was told nothing.
    //
    // Two things are asserted at every level, because either one alone can be
    // satisfied while the activity is broken. The ride has to be there, and the
    // swings that find it have to be a target a hand can land on.
    let worstBounces = Number.POSITIVE_INFINITY;
    let worstWindow = Number.POSITIVE_INFINITY;
    const steps = 68;
    for (let i = 0; i <= steps; i++) {
      const level = LEVEL_MIN + ((LEVEL_MAX - LEVEL_MIN) * i) / steps;
      const swept = rideSweep(level, 1);
      expect(swept.bestBounces).toBeGreaterThanOrEqual(RIDE_BOUNCES);
      expect(swept.widest).toBeGreaterThanOrEqual(RIDE_WINDOW - 1e-9);
      worstBounces = Math.min(worstBounces, swept.bestBounces);
      worstWindow = Math.min(worstWindow, swept.widest);
    }
    // The margins, recorded. The worst level in the range still rides eleven
    // corners without losing anything, which is more than three times what the
    // naming line asks for, so this is not a claim balanced on the threshold.
    expect(worstBounces).toBeGreaterThanOrEqual(RIDE_BOUNCES * 3);
    expect(worstBounces).toBe(11);
    expect(worstWindow).toBeCloseTo(RIDE_WINDOW, 9);
  });

  test('and at every opening of the spout, not only the widest one', () => {
    // The slot is the target, so the target narrows with it, near enough in
    // proportion. What must not happen is the ride disappearing at a part-open
    // spout, and it does not: a thinner stream bends the light MORE often, so
    // the quarter-open spout is the setting that rides furthest of all.
    for (const open of [0.25, 0.5, 0.75]) {
      for (let i = 0; i <= 20; i++) {
        const level = LEVEL_MIN + ((LEVEL_MAX - LEVEL_MIN) * i) / 20;
        const swept = rideSweep(level, open);
        expect(swept.bestBounces).toBeGreaterThanOrEqual(RIDE_BOUNCES);
        expect(swept.widest).toBeGreaterThanOrEqual(RIDE_WINDOW * open - 1e-9);
      }
    }
    expect(rideSweep(LEVEL_MAX, 0.25).bestBounces).toBeGreaterThan(
      rideSweep(LEVEL_MAX, 1).bestBounces,
    );
  });

  test('and the cap sits exactly where that stops being true', () => {
    // THE CAP IS PINNED FROM BOTH SIDES. The test above fails if LEVEL_MAX is
    // raised, because the window has narrowed past holding. This one fails if
    // it is lowered, because the window at the top of the range would then be
    // wider than the floor: at the cap it is the floor, to the radian.
    //
    // Nothing above the cap can be driven through this pipeline to show what
    // was there, because `clampLevel` is doing its job and the states no longer
    // exist. What can be shown is the slope that runs into it, and it is steep:
    // the window loses a fifth of its width over the last tenth of the range,
    // and the measurements that found the cliff are written into LEVEL_MAX's
    // own comment in `light-bender.ts`.
    const atCap = rideSweep(LEVEL_MAX, 1);
    expect(atCap.widest).toBeLessThan(RIDE_WINDOW + 1e-9);

    const tenthDown = rideSweep(LEVEL_MAX - (LEVEL_MAX - LEVEL_MIN) / 10, 1);
    expect(tenthDown.widest).toBeGreaterThan(atCap.widest);
    expect(rideSweep(LEVEL_MIN, 1).widest).toBeGreaterThan(atCap.widest * 1.4);
  });
});

// ---------------------------------------------------------------------------

describe('the three fixes the observed pass bought, kept where they can be seen', () => {
  // Each of these three was a real defect in a screenshot, each was fixed in the
  // same commit that shipped the activity, and NONE of the three had a test.
  // The fix lived in a component constant or in a run of canvas calls, so
  // putting any of them back was a silent one-line revert. The geometry now
  // lives in `light-bender.ts` as data, and this is what watches it.

  test('the scene fills the screen it is given, on a laptop as well as on a phone', () => {
    // FIT_HEIGHT was 0.62 and left two thirds of a laptop empty. The constant
    // is pinned, and then the thing the constant is FOR is measured: how much
    // of a real canvas the scene actually covers once `fitScene` has fitted it.
    expect(FIT_HEIGHT).toBeGreaterThanOrEqual(0.8);
    expect(FIT_HEIGHT).toBeLessThan(1);
    expect(FIT_WIDTH).toBeLessThan(1);
    expect(FIT_ANCHOR).toBeGreaterThan(0.5);

    const worldW = WORLD.x1 - WORLD.x0;
    const worldH = WORLD.y1 - WORLD.y0;

    // A laptop. Wider than it is tall, so HEIGHT binds and this is exactly the
    // case 0.62 spoiled: the scene has to cover most of the picture.
    for (const [cssW, cssH] of [
      [1440, 800],
      [1180, 700],
      [900, 560],
    ]) {
      const fit = fitScene({ cssW, cssH });
      expect((worldH * fit.scale) / cssH).toBeGreaterThan(0.8);
      expect(worldW * fit.scale).toBeLessThanOrEqual(cssW * FIT_WIDTH + 1e-9);
      expect(fit.padX).toBeGreaterThanOrEqual(0);
      expect(fit.padY).toBeGreaterThanOrEqual(0);
    }

    // A phone held upright. WIDTH binds here, the height fraction is small and
    // that is correct, so the assertion above is scoped to the shape it is
    // about rather than being asserted everywhere and quietly weakened.
    for (const [cssW, cssH] of [
      [390, 780],
      [360, 900],
    ]) {
      const fit = fitScene({ cssW, cssH });
      expect(worldW * fit.scale).toBeCloseTo(cssW * FIT_WIDTH, 9);
      expect(fit.padY).toBeGreaterThanOrEqual(0);
    }

    // Nothing about the fit can divide by zero or go backwards on a canvas
    // smaller than the guard lets it draw into.
    expect(fitScene({ cssW: 1, cssH: 1 }).scale).toBeGreaterThan(0);
  });

  test('no piece of glass is ever drawn across the open spout', () => {
    // The right wall used to be one stroke from rim to floor, so an open spout
    // had a pane across it and the water appeared to come through the glass.
    // The geometry is data now, and this sweeps every opening the child can set.
    for (let i = 0; i <= 40; i++) {
      const open = i / 40;
      const [bottom, top] = slotInterval(open);
      const segments = glassSegments({ open });
      for (const g of segments) {
        const onFarWall = Math.abs(g.x0 - TANK_W) < 1e-12 && Math.abs(g.x1 - TANK_W) < 1e-12;
        if (!onFarWall) continue;
        // The hole is the half open interval from the floor to the top of the
        // slot. No part of any far wall segment may lie inside it.
        const lo = Math.min(g.y0, g.y1);
        const hi = Math.max(g.y0, g.y1);
        expect(lo).toBeGreaterThanOrEqual(top - 1e-12);
        expect(hi > bottom).toBe(true);
      }
      // And the wall is still there above the hole, at every opening, because a
      // tank drawn with no far wall at all would also pass the test above.
      const far = segments.filter(
        (g) => Math.abs(g.x0 - TANK_W) < 1e-12 && Math.abs(g.x1 - TANK_W) < 1e-12,
      );
      expect(far).toHaveLength(1);
      expect(Math.min(far[0].y0, far[0].y1)).toBeCloseTo(top, 12);
      expect(Math.max(far[0].y0, far[0].y1)).toBeCloseTo(TANK_H, 12);
    }

    // A shut spout has no hole, so the far wall runs the whole way down.
    const shut = glassSegments({ open: 0 }).find((g) => Math.abs(g.x0 - TANK_W) < 1e-12)!;
    expect(Math.min(shut.y0, shut.y1)).toBe(0);

    // The near wall and the floor are whole at every opening, which is the
    // control: only ONE of the four lines is allowed to have a hole in it.
    for (const open of [0, 0.5, 1]) {
      const segs = glassSegments({ open });
      expect(segs.some((g) => g.x0 === 0 && g.x1 === 0 && Math.abs(g.y0 - g.y1) === TANK_H)).toBe(
        true,
      );
      expect(segs.some((g) => g.y0 === 0 && g.y1 === 0 && Math.abs(g.x0 - g.x1) === TANK_W)).toBe(
        true,
      );
    }
  });

  test('the caustic is one smooth pool, not eighty-four rectangles', () => {
    // The first cut drew a rectangle per bin and the observed pass showed what
    // that reads as: hard vertical edges every few pixels, wallpaper rather
    // than light pooling. Both properties that fix it are asserted, because
    // either one alone can be true of a picture that is still wrong.
    const band = causticBand({ level: 0.35, phase: 0.7, amplitude: 1 });
    const outline = causticOutline(band);

    // ONE vertex per bin, plus the two feet on the floor that close the shape.
    expect(outline).toHaveLength(CAUSTIC_BINS + 2);
    expect(outline[0]).toEqual({ u: 0, v: 0 });
    expect(outline[outline.length - 1]).toEqual({ u: 1, v: 0 });

    // NO VERTICAL EDGES. This is the rectangles, killed: a rectangle needs two
    // vertices at the same u, and every step across this shape moves sideways.
    for (let i = 1; i < outline.length; i++) {
      expect(outline[i].u).toBeGreaterThan(outline[i - 1].u);
    }

    // And it is smoothed. Measured as total variation against the raw band,
    // over every phase of the ripple and at the two ends of the water range, so
    // this is not one lucky frame. Dropping the three tap average puts the
    // ratio at exactly one.
    let worstRatio = 0;
    for (let phase = 0; phase < 6.3; phase += 0.1) {
      for (const level of [LEVEL_MIN, 0.3, LEVEL_MAX]) {
        const b = causticBand({ level, phase, amplitude: 1 });
        const o = causticOutline(b);
        let rawTV = 0;
        for (let i = 1; i < b.length; i++) rawTV += Math.abs(b[i] - b[i - 1]) / CAUSTIC_PEAK;
        let outTV = 0;
        for (let i = 2; i < o.length - 1; i++) outTV += Math.abs(o[i].v - o[i - 1].v);
        if (rawTV > 0) worstRatio = Math.max(worstRatio, outTV / rawTV);
      }
    }
    expect(worstRatio).toBeLessThan(0.85);

    // The height is a fraction, so a caller can scale it without clamping, and
    // a flat surface gives a flat pool with no ribs in it at all.
    for (const point of outline) {
      expect(point.v).toBeGreaterThanOrEqual(0);
      expect(point.v).toBeLessThanOrEqual(1);
    }
    const flat = causticOutline(causticBand({ level: 0.35, phase: 0.7, amplitude: 0 }));
    for (let i = 2; i < flat.length - 1; i++) {
      expect(flat[i].v).toBeCloseTo(flat[i - 1].v, 12);
    }
    expect(flat[1].v).toBeCloseTo(1 / CAUSTIC_PEAK, 12);
  });
});

describe('the world the scene is drawn into', () => {
  test('holds every tank beam, every stream and every lamp position the child can reach', () => {
    for (const level of levels(12)) {
      for (const open of [0, 0.5, 1]) {
        const shape = streamShape({ level, open });
        for (const p of shape.points) {
          expect(p.x + p.w).toBeLessThanOrEqual(WORLD.x1);
          expect(p.y - p.w).toBeGreaterThanOrEqual(WORLD.y0);
          expect(p.y + p.w).toBeLessThanOrEqual(WORLD.y1);
        }
        for (const aim of aims(32)) {
          const head = torchHead(aim);
          expect(head.x).toBeGreaterThan(WORLD.x0);
          expect(head.y).toBeGreaterThan(WORLD.y0);
          for (const s of traceTank({ aim, level, open }).segments) {
            expect(s.x1).toBeLessThanOrEqual(WORLD.x1);
            expect(s.y1).toBeLessThanOrEqual(WORLD.y1);
          }
        }
      }
    }
    expect(WORLD.x0).toBeLessThan(0);
    expect(WORLD.y1).toBeGreaterThan(TANK_H);
  });

  test('and is not one unit wider than it has to be', () => {
    // ONE SIDED IS HALF A TEST. Everything above says nothing reaches past the
    // right hand edge, and a box ten units wide would satisfy every line of it
    // while drawing the tank at a tenth of the size on the child's screen. The
    // far edge is therefore measured from the other direction as well: it is
    // the end of the longest stream the child can make plus a fingernail.
    let reach = 0;
    for (let i = 0; i <= 200; i++) {
      const level = LEVEL_MIN + ((LEVEL_MAX - LEVEL_MIN) * i) / 200;
      for (const open of [0, 0.25, 0.5, 0.75, 1]) {
        for (const p of streamShape({ level, open }).points) reach = Math.max(reach, p.x + p.w);
        for (const aim of aims(64)) {
          for (const seg of traceTank({ aim, level, open }).segments) {
            reach = Math.max(reach, seg.x1);
          }
        }
      }
    }
    expect(reach).toBeCloseTo(2.80894, 4);
    expect(WORLD.x1).toBeGreaterThanOrEqual(reach);
    expect(WORLD.x1 - reach).toBeLessThan(0.05);
  });
});

describe('the caustic on the tank floor', () => {
  test('is an even band when the surface is flat, at every phase', () => {
    // The reduced-motion picture. With the amplitude zeroed the ripple is gone,
    // every ray of room light lands directly below where it entered, and the
    // floor is lit evenly. Checked at several phases because a phase that still
    // moved the picture with the amplitude at zero would be exactly the
    // reduced-motion bug this pattern exists to prevent.
    const flat = causticBand({ level: 0.4, phase: 0, amplitude: 0 });
    expect(flat).toHaveLength(CAUSTIC_BINS);
    for (const bin of flat) expect(bin).toBe(1);
    for (const phase of [0.3, 1.7, 4.2, 12.5]) {
      expect(causticBand({ level: 0.4, phase, amplitude: 0 })).toEqual(flat);
    }
  });

  test('bunches the light into real bright and dark bands when the surface moves', () => {
    const band = causticBand({ level: 0.4, phase: 0.7, amplitude: 1 });
    const mean = band.reduce((a, b) => a + b, 0) / band.length;
    // Normalised, so it can be multiplied straight into an alpha.
    expect(mean).toBeCloseTo(1, 12);
    expect(Math.max(...band)).toBeGreaterThan(3);
    expect(Math.min(...band)).toBeLessThan(0.4);
  });

  test('focuses at every water depth and every phase, so the floor is never blank', () => {
    let dimmestPeak = Infinity;
    for (const level of levels(10)) {
      for (let p = 0; p < 12; p++) {
        const band = causticBand({ level, phase: p * 0.5, amplitude: 1 });
        dimmestPeak = Math.min(dimmestPeak, Math.max(...band));
      }
    }
    expect(dimmestPeak).toBeGreaterThan(1.3);
  });

  test('sends a whole number of rays into each bin, so a flat surface cannot stripe', () => {
    expect(CAUSTIC_RAYS % CAUSTIC_BINS).toBe(0);
  });

  test('the ripple is a pure function of position, phase and amplitude', () => {
    expect(rippleAt(0.3, 1.1, 0)).toEqual({ height: 0, slope: 0 });
    expect(rippleAt(0.3, 1.1, 1)).toEqual(rippleAt(0.3, 1.1, 1));
    expect(rippleAt(0.3, 1.1, 1).height).not.toBe(rippleAt(0.3, 2.2, 1).height);
  });

  test('RIPPLE_HEIGHT is bounded by the water above and by the caustic below', () => {
    // PINNED, in both directions, and neither bound is a round number chosen
    // for looking reasonable. The height of the ripple was free to be set to
    // anything, and two different things go wrong at the two ends.
    //
    // TOO TALL and the surface stops being a surface. A trough at full
    // amplitude has to stay above the top of the slot even in the emptiest tank
    // the child can set, or the water would appear to fall away from its own
    // spout, and a crest has to stay under the rim of the glass in the fullest.
    // The ripple is a sum of two sines whose amplitudes are 1 and 0.6, so the
    // deepest trough is 1.6 times the height.
    const deepest = RIPPLE_HEIGHT * 1.6;
    expect(deepest).toBeLessThan(LEVEL_MIN - SLOT_MAX);
    expect(LEVEL_MAX + deepest).toBeLessThan(TANK_H);

    // TOO SHORT and the caustic stops existing. This is the honest lower bound,
    // because it is the only thing the height is FOR: the drift of a ray on the
    // floor is the tangent of the bend times the depth, so a flatter surface
    // bunches less light and the bright ribs fade into the even band. Measured
    // at the fullest tank over a whole cycle of the ripple: the brightest bin
    // has to be at least three times the mean at every phase. Three quarters of
    // the current height already fails this.
    let dimmestPeak = Infinity;
    for (let phase = 0; phase < 6.3; phase += 0.05) {
      dimmestPeak = Math.min(
        dimmestPeak,
        Math.max(...causticBand({ level: LEVEL_MAX, phase, amplitude: 1 })),
      );
    }
    expect(dimmestPeak).toBeCloseTo(3.66316, 4);
    expect(dimmestPeak).toBeGreaterThan(3);

    // The amplitude the caller passes multiplies the height, so the two are the
    // same knob and the measurement above is a measurement of RIPPLE_HEIGHT.
    expect(rippleAt(0.31, 0.9, 0.5).height * 2).toBeCloseTo(rippleAt(0.31, 0.9, 1).height, 12);
    expect(RIPPLE_HEIGHT).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------

describe('the sound', () => {
  test('keeps the low note and drops everything above it when the light is trapped', () => {
    const mix = toneMix(0);
    expect(mix).toHaveLength(PARTIALS.length);
    expect(mix[0]).toBeGreaterThan(0);
    for (let i = 1; i < mix.length; i++) expect(mix[i]).toBe(0);
  });

  test('brightens without ever going backwards as more light gets out', () => {
    let previous = toneMix(0);
    for (let e = 0.02; e <= 1.0001; e += 0.02) {
      const mix = toneMix(e);
      for (let i = 0; i < mix.length; i++) {
        expect(mix[i]).toBeGreaterThanOrEqual(previous[i]);
      }
      previous = mix;
    }
    for (let i = 1; i < previous.length; i++) expect(previous[i]).toBeGreaterThan(0);
  });

  test('is driven by the SAME number the picture is drawn from', () => {
    // Water Sphere shipped a sound whose pitches had drifted away from its own
    // picture because the two were written down twice. Here the ear reads
    // escapedFraction of the very trace the eye is looking at, so this test
    // drives one trace into both and checks they agree about what is happening.
    const open = traceTank({ aim: 0.4, level: 0.4, open: 0 });
    const shut = traceTank({ aim: 1.0, level: 0.4, open: 0 });

    expect(open.escapes.length).toBeGreaterThan(0);
    expect(toneMix(escapedFraction(open)).slice(1).every((g) => g > 0)).toBe(true);

    expect(shut.escapes).toHaveLength(0);
    expect(escapedFraction(shut)).toBe(0);
    expect(toneMix(escapedFraction(shut)).slice(1).every((g) => g === 0)).toBe(true);
  });

  test('refuses to be poisoned by a value that is not a number', () => {
    expect(toneMix(Number.NaN)[1]).toBe(0);
    expect(toneMix(-1)[1]).toBe(0);
    expect(toneMix(5)).toEqual(toneMix(1));
  });

  test('the partials are whole multiples of one low note', () => {
    expect(partialHz(0)).toBe(BASE_HZ);
    for (let i = 0; i < PARTIALS.length; i++) {
      expect(partialHz(i)).toBeCloseTo(BASE_HZ * PARTIALS[i], 12);
      expect(Number.isInteger(PARTIALS[i])).toBe(true);
    }
    expect(partialHz(-1)).toBe(partialHz(0));
    expect(partialHz(99)).toBe(partialHz(PARTIALS.length - 1));
  });
});

// ---------------------------------------------------------------------------

describe('colour', () => {
  test('no hue anywhere in the activity can land in the banned band', () => {
    for (const hue of [waterHue(), beamHue(), streamHue(), causticHue(), glassHue()]) {
      expect(hueIsAllowed(hue)).toBe(true);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  test('the fence is a fold, not a clamp, so nothing snaps as the arc is walked', () => {
    // Swept through the real fold rather than reading the five constants back,
    // so widening one of them later without reading this comment still fails.
    for (let i = 0; i < 3600; i++) {
      const { safeHue } = require('@/lib/pattern-garden');
      expect(hueIsAllowed(safeHue(i / 3600))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------

describe('motion, and what reduced motion turns off', () => {
  test('the shimmer is zero under reduced motion at every hold, and the hold is not', () => {
    // THE ONE-CHARACTER MUTATION THIS TEST EXISTS TO KILL. Fractal Grower
    // shipped with these two collapsed into one value, so its clock-driven
    // motion ran at full amplitude under reduced motion for as long as a finger
    // stayed on the screen. Nothing but sampling the canvas DURING a held-still
    // touch found it.
    for (const holdAmp of [0, 0.01, 0.3, 0.75, 1]) {
      expect(motionAmplitudes({ reduceMotion: true, holdAmp }).shimmer).toBe(0);
      expect(motionAmplitudes({ reduceMotion: true, holdAmp }).hold).toBe(holdAmp);
      expect(motionAmplitudes({ reduceMotion: false, holdAmp }).shimmer).toBe(holdAmp);
    }
  });

  test('a touch under reduced motion is on or off, with no frames in between', () => {
    expect(holdAmpNext({ reduceMotion: true, holding: true, amp: 0, dt: 0.016 })).toBe(1);
    expect(holdAmpNext({ reduceMotion: true, holding: false, amp: 1, dt: 0.016 })).toBe(0);
    expect(holdAmpNext({ reduceMotion: true, holding: false, amp: 0.5, dt: 0 })).toBe(0);
  });

  test('with motion allowed it rises under the hand and settles to exactly zero after', () => {
    let amp = 0;
    for (let i = 0; i < 40; i++) {
      amp = holdAmpNext({ reduceMotion: false, holding: true, amp, dt: 1 / 60 });
    }
    expect(amp).toBe(1);
    for (let i = 0; i < 400; i++) {
      amp = holdAmpNext({ reduceMotion: false, holding: false, amp, dt: 1 / 60 });
    }
    // Exactly zero, not a crumb that keeps the loop awake forever.
    expect(amp).toBe(0);
  });

  test('the last frame of the fade is one the eye can see, not a thousandth of one', () => {
    // The floor under the decay. On a fast display the step per frame is small,
    // and without this the amplitude crawls down through values that cannot be
    // told from black while every one of them is a reason to paint another
    // frame. Driven at a small step, because at sixty frames a second the step
    // is seven times the floor and the two are indistinguishable.
    expect(HOLD_FLOOR).toBeGreaterThan(0);
    const justAbove = HOLD_FLOOR * 1.25;
    const step = HOLD_FLOOR * 0.42;
    expect(justAbove - step).toBeGreaterThan(0);
    expect(justAbove - step).toBeLessThan(HOLD_FLOOR);
    expect(
      holdAmpNext({ reduceMotion: false, holding: false, amp: justAbove, dt: step / HOLD_DECAY }),
    ).toBe(0);
    // And a value comfortably above the floor is left alone.
    expect(
      holdAmpNext({ reduceMotion: false, holding: false, amp: 0.5, dt: step / HOLD_DECAY }),
    ).toBeGreaterThan(0.4);
  });
});

describe('the frame loop', () => {
  test('a canvas with no size gets no frame, on either side', () => {
    const busy = { dirty: true, holding: true, queued: true, animating: true };
    expect(shouldSchedule({ cssW: 0, cssH: 600, ...busy })).toBe(false);
    expect(shouldSchedule({ cssW: 600, cssH: 0, ...busy })).toBe(false);
    expect(shouldSchedule({ cssW: MIN_CANVAS_PX - 0.01, cssH: 600, ...busy })).toBe(false);
    expect(shouldSchedule({ cssW: 600, cssH: MIN_CANVAS_PX - 0.01, ...busy })).toBe(false);
    expect(shouldSchedule({ cssW: Number.NaN, cssH: 600, ...busy })).toBe(false);
    expect(shouldSchedule({ cssW: 600, cssH: Number.NaN, ...busy })).toBe(false);
    expect(shouldSchedule({ cssW: MIN_CANVAS_PX, cssH: MIN_CANVAS_PX, ...busy })).toBe(true);
  });

  test('a still, unhandled tank gets no frame at all', () => {
    const size = { cssW: 800, cssH: 600 };
    expect(
      shouldSchedule({ ...size, dirty: false, holding: false, queued: false, animating: false }),
    ).toBe(false);
    for (const key of ['dirty', 'holding', 'queued', 'animating'] as const) {
      const args = {
        ...size,
        dirty: false,
        holding: false,
        queued: false,
        animating: false,
        [key]: true,
      };
      expect(shouldSchedule(args)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------

describe('what it says about itself', () => {
  test('says the light is trapped exactly when the trace says it is', () => {
    const trapped = traceTank({ aim: 1.0, level: 0.35, open: 0 });
    expect(trapped.tir).toBe(true);
    const said = describeTank(trapped, null);
    expect(said).toContain('mirror');
    expect(said).toContain('None of it is leaving');
  });

  test('says the angle the beam actually left at, from the same split the picture used', () => {
    const bending = traceTank({ aim: 0.6, level: 0.35, open: 0 });
    const out = interfaceSplit({ incidence: 0.6, n1: N_WATER, n2: N_AIR }).refracted!;
    expect(describeTank(bending, null)).toContain(`${Math.round(out / DEG)} degrees`);
    expect(describeTank(bending, null)).toContain('wider than it went in');
  });

  test('mentions the ride only when there really is one, and counts it correctly', () => {
    const tank = traceTank({ aim: 1.365, level: LEVEL_MIN, open: 1 });
    expect(tank.slotRay).not.toBeNull();
    const ride = traceStream({
      stream: streamShape({ level: LEVEL_MIN, open: 1 }),
      entry: tank.slotRay!,
    });
    expect(ride.bounces).toBeGreaterThan(1);
    const said = describeTank(tank, ride);
    expect(said).toContain(`${ride.bounces} times`);
    expect(said).toContain('riding the falling water');
    expect(describeTank(tank, null)).not.toContain('riding');
  });

  test('never uses an em dash, whatever it is describing', () => {
    for (const level of levels(6)) {
      for (const aim of aims(24)) {
        const tank = traceTank({ aim, level, open: 1 });
        const ride = tank.slotRay
          ? traceStream({ stream: streamShape({ level, open: 1 }), entry: tank.slotRay })
          : null;
        expect(describeTank(tank, ride)).not.toContain('—');
      }
    }
  });
});

describe('what the naming reducer is told', () => {
  test('reports the bend only while there is a beam bright enough to point at', () => {
    // A grazing escape carrying a thousandth of the torch is not a beam the
    // child can see leaning over, so it does not count as a bend they made.
    const bright = traceTank({ aim: 0.7, level: 0.35, open: 0 });
    expect(readTrace(bright, null).bend).toBeGreaterThan(0.3);
    for (const escape of bright.escapes) {
      if (escape.intensity >= ESCAPE_VISIBLE) {
        expect(readTrace(bright, null).bend).toBeGreaterThanOrEqual(
          escape.refracted - escape.incidence - 1e-12,
        );
      }
    }
  });

  test('does not report a bend for a thread of light nobody could see', () => {
    // A hair under the critical angle the transmitted beam is grazing along the
    // surface and carries under one per cent of the torch. Geometrically it is
    // the biggest bend in the activity, forty-one degrees of it, and visually it
    // is nothing at all. Naming "light bends" for a beam that is not on the
    // screen is the sort of thing that teaches a child their eyes are wrong.
    //
    // SCOPE, stated because it is narrow: every interface in the tank is met at
    // the same angle, so every escape from one trace carries the same bend, and
    // the floor can only change the answer when the FIRST escape is already
    // under it. That happens within about a ten thousandth of a radian of the
    // critical angle, which is under a pixel of drag and is not a multiple of
    // the key step either. The guard is for the state, not for the swing.
    const hair = traceTank({ aim: CRITICAL - 1e-6, level: 0.35, open: 0 });
    expect(hair.escapes.length).toBeGreaterThan(0);
    expect(Math.max(...hair.escapes.map((e) => e.intensity))).toBeLessThan(ESCAPE_VISIBLE);
    expect(hair.escapes[0].refracted - hair.escapes[0].incidence).toBeGreaterThan(0.7);
    expect(readTrace(hair, null).bend).toBe(0);
  });

  test('reports nothing at all when the beam never reached an interface', () => {
    // The steep swing in a full tank. It runs into the far wall, and a child
    // watching it has been shown neither a bend nor a flip.
    const missed = traceTank({ aim: AIM_MAX, level: LEVEL_MAX, open: 0 });
    expect(missed.hits).toHaveLength(0);
    expect(readTrace(missed, null)).toEqual({ bend: 0, pastCritical: 0, bounces: 0 });
  });

  test('reports how far past the critical angle a real flip happened', () => {
    for (const aim of [CRITICAL + 0.05, CRITICAL + 0.2, 1.1]) {
      const trace = traceTank({ aim, level: 0.3, open: 0 });
      expect(trace.hits.length).toBeGreaterThan(0);
      expect(readTrace(trace, null).pastCritical).toBeCloseTo(aim - CRITICAL, 12);
      expect(readTrace(trace, null).bend).toBe(0);
    }
  });

  test('counts only the stream bounces that let nothing out', () => {
    const tank = traceTank({ aim: 1.365, level: LEVEL_MIN, open: 1 });
    const ride = traceStream({
      stream: streamShape({ level: LEVEL_MIN, open: 1 }),
      entry: tank.slotRay!,
    });
    expect(readTrace(tank, ride).bounces).toBe(ride.tirBounces);
    expect(readTrace(tank, null).bounces).toBe(0);
  });
});

describe('the thresholds the naming lines are set against', () => {
  test('a visible bend is about thirty-eight degrees of incidence, and the light is still bright there', () => {
    // The naming threshold for "light bends" is BEND_SEEN radians of BEND, and
    // it is the REAL CONSTANT that is driven here, imported from the reducer.
    // It used to be the literal 0.3 typed in again, which measured a number
    // that happened to match the constant rather than measuring the constant,
    // and left the reducer free to be changed to anything without this failing.
    const bendAt = (incidence: number) => {
      const split = interfaceSplit({ incidence, n1: N_WATER, n2: N_AIR });
      return (split.refracted ?? incidence) - incidence;
    };
    let lo = 0;
    let hi = CRITICAL;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (bendAt(mid) >= BEND_SEEN) hi = mid;
      else lo = mid;
    }
    expect(hi / DEG).toBeCloseTo(38.04, 1);
    expect(hi).toBeLessThan(CRITICAL);
    // And nearly all the light still gets out there, so the sentence about
    // bending arrives while there is a bright beam to point at.
    expect(interfaceSplit({ incidence: hi, n1: N_WATER, n2: N_AIR }).transmitted).toBeGreaterThan(
      0.95,
    );
  });

  test('BEND_SEEN is a bend a child can see, and it is bounded from both sides', () => {
    // PINNED, because it was not. The reducer's own tests feed BEND_SEEN in as
    // their own input, so they stay self-consistently green whatever it is set
    // to: dropping it to 0.02 leaves the whole suite passing and hands a child
    // the sentence "light bends" for a beam that has barely moved.
    //
    // The floor. Above 0.2 radians, which is eleven and a half degrees of
    // daylight between the beam in the water and the beam in the air. A tenth
    // of that is a beam that looks straight.
    expect(BEND_SEEN).toBeGreaterThan(0.2);

    // The ceiling, measured rather than chosen: the bend has to be one the
    // child can actually reach while the beam is still bright enough to point
    // at. The biggest bend carrying visible light is measured here, and
    // BEND_SEEN has to be under it with room to spare, or the first sentence
    // of the activity would be unreachable.
    let biggestVisible = 0;
    for (const aim of aims(400)) {
      const trace = traceTank({ aim, level: 0.35, open: 0 });
      for (const e of trace.escapes) {
        if (e.intensity >= ESCAPE_VISIBLE) {
          biggestVisible = Math.max(biggestVisible, e.refracted - e.incidence);
        }
      }
    }
    expect(biggestVisible).toBeCloseTo(0.64786, 4);
    expect(BEND_SEEN).toBeLessThan(biggestVisible * 0.75);
  });

  test('RIDE_BOUNCES is enough turns that a glance off a wall cannot pass for a ride', () => {
    // PINNED, for the same reason and with the same hole: the reducer's tests
    // supply RIDE_BOUNCES as their own input, so setting it to 1 leaves the
    // suite green while "the light follows the water" starts being said for
    // light that touched the inside of the stream once and left.
    //
    // One bounce is light glancing off a wall, which happens in any container
    // and in a straight pipe. Two is a corner. THREE is light turned back on
    // itself twice and still inside water that is falling away underneath it,
    // and there is nothing else in the scene that can produce it.
    expect(RIDE_BOUNCES).toBeGreaterThanOrEqual(3);
    expect(Number.isInteger(RIDE_BOUNCES)).toBe(true);

    // And it has to be reachable at every level, which is the assertion the
    // whole cap on LEVEL_MAX exists to keep true. Measured there; the margin is
    // restated here so the two constants are read against each other.
    expect(rideSweep(LEVEL_MAX, 1).bestBounces).toBeGreaterThanOrEqual(RIDE_BOUNCES);
    expect(rideSweep(LEVEL_MIN, 1).bestBounces).toBeGreaterThan(RIDE_BOUNCES * 3);
  });

  test('the visible-escape floor is above the light that comes back off a flat surface', () => {
    expect(ESCAPE_VISIBLE).toBeLessThan(
      interfaceSplit({ incidence: 0, n1: N_WATER, n2: N_AIR }).reflected,
    );
    expect(ESCAPE_VISIBLE).toBeGreaterThan(0);
  });
});
