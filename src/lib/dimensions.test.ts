// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for Shape Ladder's mathematics. Runs via `bun test`.
 *
 * Every claim the activity makes to a child is measured here, on the same
 * functions the canvas draws with. Nothing is asserted about a comment.
 *
 *   - The counts. Corners and edges at every rung, checked against the closed
 *     forms rather than against a table typed in twice.
 *   - The one rule. The figure at each rung is proved to contain two exact
 *     copies of the figure below it, joined corner to corner. That is the
 *     naming line "Same rule again and again", made structural.
 *   - The two perspective divides. Both denominators are swept across the
 *     entire reachable control space and asserted strictly positive with a
 *     measured margin, because a divide that can reach zero is a shape that can
 *     explode in a child's hands.
 *   - Turning is an isometry. Every edge length in 4D survives every rotation,
 *     measured on the real figure.
 *   - The colour fence, on the real `safeHue` imported from the garden.
 *   - The sound table, pinned, because it is the only place those numbers live
 *     and both the picture and the audio read it.
 *   - The load-bearing guards, each with a test that fails if the guard is
 *     reverted: the frame loop's two refusals, the reduced-motion split, and
 *     the shadow-turn authority that stops a line being turned into nothing.
 */
import { describe, expect, test } from 'bun:test';
import { BANNED_HUE_MIN, BANNED_HUE_MAX, hueIsAllowed, safeHue } from './pattern-garden';
import {
  AXIS_HUE_T,
  BASE_HZ,
  CLIMB_TRAVEL_PX,
  CUBE_CLIMB,
  DEFAULT_TURN,
  EYE_Z,
  FIT_RADIUS,
  FULL_CLIMB,
  HANDLE_STANDOFF,
  HARMONIC_MULTIPLES,
  MIN_CANVAS_PX,
  SHADOW_LIMIT,
  SETTLED_CLIMB,
  SHADOW_RING,
  SPAN,
  W_BEAD_DIR,
  W_EYE,
  angleDelta,
  axisHue,
  buildFigure,
  clampClimb,
  clampShadowTurn,
  clampToRung,
  climbAfterTravel,
  describeLadder,
  dialAngleAt,
  edgeCountFor,
  handleHue,
  harmonicHz,
  harmonicLevels,
  holdAmpNext,
  motionAmplitudes,
  projectVertex,
  rotate4,
  rungName,
  shadowAuthority,
  shadowBeadDirection,
  shadowHandleShown,
  shadowHue,
  shadowTurnBy,
  shouldSchedule,
  sweepGlow,
  sweepHandleFor,
  turnAfterDrag,
  vertexCountFor,
  viewFor,
} from './dimensions';

const RUNGS = [0, 1, 2, 3, 4];

/** A dense walk of everything the child's fingers can reach. */
function* reachableStates(climbSteps = 40, shadowSteps = 16, yawSteps = 16, pitchSteps = 5) {
  for (let ci = 0; ci <= climbSteps; ci++) {
    const climb = (ci / climbSteps) * FULL_CLIMB;
    const figure = buildFigure(climb);
    for (let si = -shadowSteps; si <= shadowSteps; si++) {
      const shadow = (si / shadowSteps) * SHADOW_LIMIT;
      for (let yi = 0; yi < yawSteps; yi++) {
        const yaw = (yi / yawSteps) * Math.PI * 2;
        for (let pi = -pitchSteps; pi <= pitchSteps; pi++) {
          const pitch = (pi / pitchSteps) * 1.2;
          yield { climb, figure, turn: viewFor({ yaw, pitch, shadow }, climb) };
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The counts
// ---------------------------------------------------------------------------

describe('the ladder counts what it draws', () => {
  test('corners double at every rung: 1, 2, 4, 8, 16', () => {
    expect(RUNGS.map((r) => buildFigure(r).vertices.length)).toEqual([1, 2, 4, 8, 16]);
  });

  test('edges go 0, 1, 4, 12, 32', () => {
    expect(RUNGS.map((r) => buildFigure(r).edges.length)).toEqual([0, 1, 4, 12, 32]);
  });

  test('the builder agrees with the closed forms rather than a second table', () => {
    // 2^k corners and k*2^(k-1) edges. If the loop ever drifted from the rule,
    // this fails; a table typed in twice would not catch it.
    for (const rung of RUNGS) {
      const f = buildFigure(rung);
      expect(f.vertices.length).toBe(vertexCountFor(rung));
      expect(f.edges.length).toBe(edgeCountFor(rung));
    }
  });

  test('a part-swept rung already has the corners and edges of the rung above', () => {
    // The half-open shape is not a special case with fewer parts. It is the
    // finished shape with one direction not yet pulled all the way out, which
    // is why the child can watch the edges arrive as they drag.
    for (const rung of [0, 1, 2, 3]) {
      const mid = buildFigure(rung + 0.4);
      expect(mid.vertices.length).toBe(vertexCountFor(rung + 1));
      expect(mid.edges.length).toBe(edgeCountFor(rung + 1));
    }
  });

  test('the top of the ladder is the top: climbing past it changes nothing', () => {
    const top = buildFigure(FULL_CLIMB);
    const past = buildFigure(FULL_CLIMB + 9);
    expect(past.vertices).toEqual(top.vertices);
    expect(past.edges).toEqual(top.edges);
    expect(clampClimb(-4)).toBe(0);
    expect(clampClimb(Number.NaN)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// One rule, again and again
// ---------------------------------------------------------------------------

describe('the same rule made every shape', () => {
  test('each rung is two copies of the rung below, joined corner to corner', () => {
    // THE NAMING LINE, AS A MEASUREMENT. If a rung were special-cased anywhere,
    // its two halves would stop being exact copies of the shape below and this
    // fails. Nothing about this test knows the word square or the word cube.
    for (const rung of [0, 1, 2, 3]) {
      const below = buildFigure(rung);
      const above = buildFigure(rung + 1);
      const n = below.vertices.length;

      expect(above.vertices.length).toBe(2 * n);

      const half = SPAN / 2;
      const axis = rung;
      const key = (v) => [v.x, v.y, v.z, v.w];
      const shifted = (v, by) => {
        const c = key(v);
        c[axis] = by;
        return c;
      };

      for (let i = 0; i < n; i++) {
        expect(key(above.vertices[i])).toEqual(shifted(below.vertices[i], -half));
        expect(key(above.vertices[n + i])).toEqual(shifted(below.vertices[i], half));
      }

      // Both copies carry exactly the edges the shape below had...
      const belowEdges = below.edges.map((e) => `${e.a}-${e.b}`).sort();
      const low = above.edges
        .filter((e) => e.a < n && e.b < n)
        .map((e) => `${e.a}-${e.b}`)
        .sort();
      const high = above.edges
        .filter((e) => e.a >= n && e.b >= n)
        .map((e) => `${e.a - n}-${e.b - n}`)
        .sort();
      expect(low).toEqual(belowEdges);
      expect(high).toEqual(belowEdges);

      // ...and the new edges are one per corner, each joining a corner to its
      // own copy. Those edges ARE the paths the corners swept.
      const joins = above.edges.filter((e) => e.a < n && e.b >= n);
      expect(joins.length).toBe(n);
      for (const e of joins) {
        expect(e.b - e.a).toBe(n);
        expect(e.axis).toBe(axis);
      }
    }
  });

  test('every edge is labelled with the sweep that made it', () => {
    const f = buildFigure(FULL_CLIMB);
    const perAxis = [0, 1, 2, 3].map((a) => f.edges.filter((e) => e.axis === a).length);
    // Sweep k leaves 2^k new edges and doubles everything already there, so the
    // counts run 8, 8, 8, 8 backwards: 1*8, 2*4, 4*2, 8*1.
    expect(perAxis).toEqual([8, 8, 8, 8]);
    expect(perAxis.reduce((a, b) => a + b, 0)).toBe(f.edges.length);
  });

  test('every edge joins two corners that exist and are not the same corner', () => {
    for (let ci = 0; ci <= 60; ci++) {
      const f = buildFigure((ci / 60) * FULL_CLIMB);
      for (const e of f.edges) {
        expect(e.a).toBeGreaterThanOrEqual(0);
        expect(e.b).toBeLessThan(f.vertices.length);
        expect(e.a).not.toBe(e.b);
      }
    }
  });

  test('the figure is centred on its own middle at every climb', () => {
    // Growing out of the middle rather than off one corner is what keeps the
    // child dragging a NEW DIRECTION out of the shape instead of dragging the
    // shape off the screen.
    for (let ci = 0; ci <= 60; ci++) {
      const f = buildFigure((ci / 60) * FULL_CLIMB);
      for (const k of ['x', 'y', 'z', 'w']) {
        const sum = f.vertices.reduce((s, v) => s + v[k], 0);
        expect(Math.abs(sum)).toBeLessThan(1e-12);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Sweeping is the child's finger
// ---------------------------------------------------------------------------

describe('the climb follows the finger and nothing else', () => {
  test('a whole rung costs exactly one travel length of finger', () => {
    expect(climbAfterTravel(0, CLIMB_TRAVEL_PX)).toBeCloseTo(1, 12);
    expect(climbAfterTravel(1, CLIMB_TRAVEL_PX / 2)).toBeCloseTo(1.5, 12);
  });

  test('dragging back down collapses the shape again', () => {
    expect(climbAfterTravel(2, -CLIMB_TRAVEL_PX)).toBeCloseTo(1, 12);
    expect(climbAfterTravel(0.3, -CLIMB_TRAVEL_PX * 9)).toBe(0);
    expect(climbAfterTravel(3.9, CLIMB_TRAVEL_PX * 9)).toBe(FULL_CLIMB);
  });

  test('one pull adds one direction and cannot run past it', () => {
    // THE DEFECT THE OBSERVED PASS FOUND, AS A TEST. The bead for the next
    // direction stands at right angles to the one being pulled, so a finger
    // still travelling after a rung completed was read against the new
    // direction, came out negative, and pulled the shape back down: the climb
    // chattered at the rung and the bead flickered between two places under a
    // finger doing one steady thing. Latching a sweep to its own rung answers
    // that, and stops a careless flick skipping the whole activity as well.
    expect(clampToRung(climbAfterTravel(2.9, CLIMB_TRAVEL_PX * 3), 2)).toBe(3);
    expect(clampToRung(climbAfterTravel(2.4, -CLIMB_TRAVEL_PX * 3), 2)).toBe(2);
    // Inside its own rung the pull is untouched.
    expect(clampToRung(climbAfterTravel(2, CLIMB_TRAVEL_PX / 2), 2)).toBeCloseTo(2.5, 12);
    for (const axis of [0, 1, 2, 3]) {
      for (const c of [-9, 0, 1.4, 2.7, 3.9, 99]) {
        const held = clampToRung(c, axis);
        expect(held).toBeGreaterThanOrEqual(axis);
        expect(held).toBeLessThanOrEqual(axis + 1);
      }
    }
  });

  test('a broken travel number leaves the climb where it was', () => {
    expect(climbAfterTravel(2.5, Number.NaN)).toBe(2.5);
    expect(climbAfterTravel(2.5, Infinity)).toBe(2.5);
  });

  test('the dial moves by the angle it is asked for, and stops at the ends', () => {
    expect(shadowTurnBy(0, 0.4)).toBeCloseTo(0.4, 12);
    expect(shadowTurnBy(0, 99)).toBe(SHADOW_LIMIT);
    expect(shadowTurnBy(0, -99)).toBe(-SHADOW_LIMIT);
    expect(shadowTurnBy(0.4, Number.NaN)).toBe(0.4);
    expect(clampShadowTurn(Number.NaN)).toBe(0);
  });

  test('the bead stays under the finger, on every size of screen', () => {
    // THE GUARD, AND THE BUG IT KILLS. A travel rule needs a number of pixels
    // per radian, and the ring is drawn at a radius that depends on the size of
    // the canvas, so on any screen where the two disagree the bead runs ahead
    // of or behind the finger holding it. Reading the finger's ANGLE makes the
    // two agree by construction, which this measures at three ring radii.
    for (const r of [90, 240, 520]) {
      for (const target of [0.3, 1.1, -2.2, 3.0]) {
        const d = shadowBeadDirection(target);
        // A finger placed exactly on the bead, from a dial that starts at rest.
        const angle = dialAngleAt(d.x * r, d.y * r);
        expect(shadowTurnBy(0, angleDelta(0, angle)), `radius ${r}, target ${target}`).toBeCloseTo(
          target,
          10,
        );
      }
    }
  });

  test('crossing the bottom of the ring is a small move, not a whole turn', () => {
    // Angles wrap a half turn either side of straight up, so a finger crossing
    // the bottom jumps from one end of that range to the other. Taking the
    // short way round turns the jump back into the movement it really was.
    expect(angleDelta(3.0, -3.0)).toBeCloseTo(2 * Math.PI - 6, 12);
    expect(Math.abs(angleDelta(3.0, -3.0))).toBeLessThan(0.3);
    expect(angleDelta(-3.0, 3.0)).toBeCloseTo(6 - 2 * Math.PI, 12);
    expect(angleDelta(0.1, 0.4)).toBeCloseTo(0.3, 12);
    expect(angleDelta(Number.NaN, 1)).toBe(0);
  });

  test('the dial reads straight up as no turn and a quarter round as a quarter turn', () => {
    expect(dialAngleAt(0, -10)).toBe(0);
    expect(dialAngleAt(10, 0)).toBeCloseTo(Math.PI / 2, 12);
    expect(dialAngleAt(-10, 0)).toBeCloseTo(-Math.PI / 2, 12);
  });

  test('turning has no memory: the same drags from the same view give the same view', () => {
    // There is nowhere for momentum to hide, because nothing in the signature
    // knows what time it is. Two identical drags land in identical places.
    const a = turnAfterDrag(turnAfterDrag(DEFAULT_TURN, 40, -18), -12, 30);
    const b = turnAfterDrag(turnAfterDrag(DEFAULT_TURN, 40, -18), -12, 30);
    expect(a).toEqual(b);
    expect(a.yaw).not.toBe(DEFAULT_TURN.yaw);
  });

  test('the object cannot be tipped over onto its own head', () => {
    expect(turnAfterDrag(DEFAULT_TURN, 0, 99999).pitch).toBeLessThanOrEqual(1.2);
    expect(turnAfterDrag(DEFAULT_TURN, 0, -99999).pitch).toBeGreaterThanOrEqual(-1.2);
    expect(turnAfterDrag(DEFAULT_TURN, Number.NaN, Number.NaN)).toEqual(DEFAULT_TURN);
  });
});

// ---------------------------------------------------------------------------
// Turning preserves the shape
// ---------------------------------------------------------------------------

describe('turning is a turn, not a squash', () => {
  test('every edge keeps its length in 4D through every rotation', () => {
    const figure = buildFigure(FULL_CLIMB);
    const rest = figure.edges.map((e) => {
      const a = figure.vertices[e.a];
      const b = figure.vertices[e.b];
      return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
    });
    let worst = 0;
    for (let i = 0; i < 24; i++) {
      const turn = {
        yaw: (i / 24) * Math.PI * 2,
        pitch: ((i % 7) / 7) * 2.4 - 1.2,
        shadow: ((i % 11) / 11) * 2 * SHADOW_LIMIT - SHADOW_LIMIT,
      };
      const moved = figure.vertices.map((v) => rotate4(v, turn));
      figure.edges.forEach((e, k) => {
        const a = moved[e.a];
        const b = moved[e.b];
        const len = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
        worst = Math.max(worst, Math.abs(len - rest[k]));
      });
    }
    expect(worst).toBeLessThan(1e-12);
  });

  test('every corner keeps its distance from the middle', () => {
    const figure = buildFigure(FULL_CLIMB);
    for (let i = 0; i < 24; i++) {
      const turn = { yaw: i * 0.37, pitch: i * -0.11, shadow: i * 0.29 - 3 };
      for (const v of figure.vertices) {
        const r = rotate4(v, turn);
        expect(Math.hypot(r.x, r.y, r.z, r.w)).toBeCloseTo(
          Math.hypot(v.x, v.y, v.z, v.w),
          12,
        );
      }
    }
  });

  test('no turn is the identity turn', () => {
    const v = { x: 0.5, y: -0.5, z: 0.5, w: -0.5 };
    expect(rotate4(v, { yaw: 0, pitch: 0, shadow: 0 })).toEqual(v);
  });
});

// ---------------------------------------------------------------------------
// The two perspective divides
// ---------------------------------------------------------------------------

describe('both divides stay safe everywhere the child can reach', () => {
  test('neither denominator can approach zero, with a measured margin', () => {
    let minW = Infinity;
    let minDepth = Infinity;
    let maxAbsW = 0;
    for (const { figure, turn } of reachableStates()) {
      for (const v of figure.vertices) {
        const r = rotate4(v, turn);
        maxAbsW = Math.max(maxAbsW, Math.abs(r.w));
        minW = Math.min(minW, W_EYE - r.w);
        minDepth = Math.min(minDepth, projectVertex(v, turn).depth);
      }
    }
    // Measured, then asserted. The margins are large fractions of the eye
    // distances rather than a hair above zero.
    expect(maxAbsW).toBeLessThan(0.71);
    expect(minW).toBeGreaterThan(0.85);
    expect(minDepth).toBeGreaterThan(2.1);
    expect(minW).toBeLessThan(W_EYE);
    expect(minDepth).toBeLessThan(EYE_Z);
  });

  test('every projected corner is a finite number', () => {
    for (const { figure, turn } of reachableStates(24, 10, 10, 3)) {
      for (const v of figure.vertices) {
        const p = projectVertex(v, turn);
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(Number.isFinite(p.depth)).toBe(true);
        expect(Number.isFinite(p.shadowScale)).toBe(true);
        expect(p.shadowScale).toBeGreaterThan(0);
      }
    }
  });

  test('every drawn edge has a positive length at the view the activity uses', () => {
    // Scoped to the view the child actually gets, and that scoping is honest
    // rather than convenient: turned a quarter turn in yaw, a line points
    // straight away from the eye and correctly projects to a point. What is
    // asserted is that no state the ACTIVITY presents contains an edge of zero
    // length, swept across the whole climb and the whole shadow dial.
    let worst = Infinity;
    for (let ci = 1; ci <= 200; ci++) {
      const climb = (ci / 200) * FULL_CLIMB;
      const figure = buildFigure(climb);
      if (figure.partial > 0 && figure.partial < 0.01) continue;
      for (let si = -32; si <= 32; si++) {
        const turn = viewFor({ ...DEFAULT_TURN, shadow: (si / 32) * SHADOW_LIMIT }, climb);
        const ps = figure.vertices.map((v) => projectVertex(v, turn));
        for (const e of figure.edges) {
          worst = Math.min(worst, Math.hypot(ps[e.a].x - ps[e.b].x, ps[e.a].y - ps[e.b].y));
        }
      }
    }
    expect(worst).toBeGreaterThan(0);
  });

  test('at a finished rung every edge is comfortably visible, not merely non-zero', () => {
    let worst = Infinity;
    for (const rung of [1, 2, 3, 4]) {
      const figure = buildFigure(rung);
      for (let si = -32; si <= 32; si++) {
        const turn = viewFor({ ...DEFAULT_TURN, shadow: (si / 32) * SHADOW_LIMIT }, rung);
        const ps = figure.vertices.map((v) => projectVertex(v, turn));
        for (const e of figure.edges) {
          worst = Math.min(worst, Math.hypot(ps[e.a].x - ps[e.b].x, ps[e.a].y - ps[e.b].y));
        }
      }
    }
    // The bound below is what was measured, not a round number picked first:
    // the shortest edge anywhere on a finished shape at any position of the
    // dial clears it, against a fitted radius of FIT_RADIUS. Short, but a drawn
    // line rather than a dot. The worst case is a shadow-turned edge seen
    // nearly end on.
    expect(worst).toBeGreaterThan(0.05);
  });

  test('the inner shape really does slide out through the outer one', () => {
    // THE CLAIM BEHIND THE NAMING LINE, MEASURED. At rest the two cubes of the
    // top rung are one inside the other: the half at the far end of the fourth
    // axis draws small, the near half large. A quarter turn puts the fourth
    // axis exactly where the first one was, so the two halves are no longer a
    // near one and a far one at all and they draw the same size, which is the
    // moment the inner cube has slid out through the outer. A half turn nests
    // them the other way round.
    //
    // Measured on the halves the BUILDER produced, so it cannot pass by
    // agreeing with a hard-coded idea of which cube is which.
    const figure = buildFigure(FULL_CLIMB);
    const half = figure.vertices.length / 2;
    const nesting = (shadow) => {
      const turn = viewFor({ ...DEFAULT_TURN, shadow }, FULL_CLIMB);
      // The fourth divide only. That number is precisely how much bigger or
      // smaller the fourth axis draws a part of the object, which is what
      // "inside" and "outside" mean on this screen.
      const spread = (from, to) => {
        const ps = figure.vertices.slice(from, to).map((v) => projectVertex(v, turn));
        return ps.reduce((s, p) => s + p.shadowScale, 0) / ps.length;
      };
      return spread(0, half) / spread(half, figure.vertices.length);
    };

    const rest = nesting(0);
    const quarter = nesting(Math.PI / 2);
    const flipped = nesting(Math.PI);

    expect(Math.abs(rest - 1)).toBeGreaterThan(0.2);
    expect(Math.abs(quarter - 1)).toBeLessThan(0.02);
    expect(Math.abs(flipped - 1 / rest)).toBeLessThan(0.02);
    expect((rest - 1) * (flipped - 1)).toBeLessThan(0);
  });

  test('the fit radius bounds the object everywhere and is not wastefully wide', () => {
    let maxR = 0;
    for (const { figure, turn } of reachableStates()) {
      for (const v of figure.vertices) {
        const p = projectVertex(v, turn);
        maxR = Math.max(maxR, Math.hypot(p.x, p.y));
      }
    }
    expect(maxR).toBeLessThanOrEqual(FIT_RADIUS);
    expect(maxR).toBeGreaterThan(FIT_RADIUS * 0.9);
    // The dial is drawn on the fit circle, so it must clear the shape it turns.
    expect(SHADOW_RING * FIT_RADIUS).toBeGreaterThan(maxR);
  });
});

// ---------------------------------------------------------------------------
// The shadow authority guard
// ---------------------------------------------------------------------------

describe('the shadow turn only exists once there is a cube', () => {
  test('a line can never be turned into nothing', () => {
    // THE GUARD, AND THE BUG IT KILLS. A quarter turn puts the fourth axis
    // exactly where the first one was, so a LINE turned that far lies entirely
    // along a direction the screen projects to a single point: the child's
    // shape vanishes. It was reachable by turning the dial at the top of the
    // ladder and then collapsing back down. Deleting `shadowAuthority` from
    // `viewFor` makes this length zero.
    const line = buildFigure(1);
    const turn = viewFor({ yaw: 0, pitch: 0, shadow: Math.PI / 2 }, 1);
    const ps = line.vertices.map((v) => projectVertex(v, turn));
    expect(Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y)).toBeGreaterThan(0.5);
  });

  test('the authority is full at the cube and gone a rung below it', () => {
    expect(shadowAuthority(FULL_CLIMB)).toBe(1);
    expect(shadowAuthority(CUBE_CLIMB)).toBe(1);
    expect(shadowAuthority(CUBE_CLIMB - 1)).toBe(0);
    expect(shadowAuthority(0)).toBe(0);
    expect(shadowAuthority(CUBE_CLIMB - 0.5)).toBeCloseTo(0.5, 12);
  });

  test('it unwinds continuously, so collapsing a cube never makes the shape jump', () => {
    let previous = null;
    for (let ci = 0; ci <= 400; ci++) {
      const climb = (ci / 400) * FULL_CLIMB;
      const shadow = viewFor({ yaw: 0, pitch: 0, shadow: SHADOW_LIMIT }, climb).shadow;
      if (previous !== null) expect(Math.abs(shadow - previous)).toBeLessThan(0.05);
      previous = shadow;
    }
  });

  test('the dial is offered only where it means something', () => {
    expect(shadowHandleShown(CUBE_CLIMB)).toBe(true);
    expect(shadowHandleShown(FULL_CLIMB)).toBe(true);
    expect(shadowHandleShown(CUBE_CLIMB - 0.01)).toBe(false);
    expect(shadowHandleShown(0)).toBe(false);
  });

  test('the bead sits at the angle it turns to, starting straight up', () => {
    expect(shadowBeadDirection(0)).toEqual({ x: 0, y: -1 });
    const quarter = shadowBeadDirection(Math.PI / 2);
    expect(quarter.x).toBeCloseTo(1, 12);
    expect(quarter.y).toBeCloseTo(0, 12);
  });
});

// ---------------------------------------------------------------------------
// The handles
// ---------------------------------------------------------------------------

describe('the bead the child pulls', () => {
  test('there is one for every direction still to be swept, and none at the top', () => {
    for (const rung of [0, 1, 2, 3]) {
      const h = sweepHandleFor(rung);
      expect(h).not.toBeNull();
      expect(h.axis).toBe(rung);
    }
    expect(sweepHandleFor(FULL_CLIMB)).toBeNull();
  });

  test('the first three beads sit on their own direction and nowhere else', () => {
    for (const rung of [0, 1, 2]) {
      const h = sweepHandleFor(rung);
      const c = [h.point.x, h.point.y, h.point.z, h.point.w];
      expect(c[rung]).toBeCloseTo(HANDLE_STANDOFF, 12);
      c.forEach((value, i) => {
        if (i !== rung) expect(value).toBe(0);
      });
    }
  });

  test('a bead travels outwards as the sweep it is pulling goes on', () => {
    for (const rung of [0, 1, 2]) {
      const near = sweepHandleFor(rung);
      const far = sweepHandleFor(rung + 0.8);
      const at = (h) => [h.point.x, h.point.y, h.point.z, h.point.w][rung];
      expect(at(far)).toBeGreaterThan(at(near));
    }
  });

  test('the fourth bead is drawn off to the side, because its direction is not on the screen', () => {
    // A point lying purely on the fourth axis has no x, y or z, so it projects
    // to the exact middle of the screen. A bead drawn there would be buried
    // inside the cube and would not move as the child pulled it. This asserts
    // both halves: the true position really is the middle, and the bead really
    // is somewhere else.
    const trueSpot = projectVertex({ x: 0, y: 0, z: 0, w: 0.9 }, DEFAULT_TURN);
    expect(Math.hypot(trueSpot.x, trueSpot.y)).toBeLessThan(1e-12);

    const h = sweepHandleFor(3);
    expect(h.point).toBeNull();
    expect(Math.hypot(h.screen.x, h.screen.y)).toBeGreaterThan(0.3);
    expect(Math.hypot(W_BEAD_DIR.x, W_BEAD_DIR.y)).toBeCloseTo(1, 12);

    const far = sweepHandleFor(3.9);
    expect(Math.hypot(far.screen.x, far.screen.y)).toBeGreaterThan(
      Math.hypot(h.screen.x, h.screen.y),
    );
  });
});

// ---------------------------------------------------------------------------
// The ink
// ---------------------------------------------------------------------------

describe('the sweep ink is a function of the finger, not of the clock', () => {
  test('it lights as the direction opens and has settled by the time it lands', () => {
    expect(sweepGlow(0)).toBeCloseTo(0, 12);
    expect(sweepGlow(1)).toBeCloseTo(0, 12);
    expect(sweepGlow(0.5)).toBeCloseTo(1, 12);
  });

  test('it rises without a wobble across the first half of a sweep', () => {
    let previous = -1;
    for (let i = 0; i <= 50; i++) {
      const g = sweepGlow(i / 100);
      expect(g).toBeGreaterThan(previous);
      previous = g;
    }
  });

  test('it cannot pop at a rung boundary, because both ends are zero', () => {
    expect(Math.abs(sweepGlow(0.999) - sweepGlow(0.001))).toBeLessThan(0.01);
  });

  test('rubbish in leaves it dark rather than undefined', () => {
    expect(sweepGlow(Number.NaN)).toBe(0);
    expect(sweepGlow(-3)).toBe(0);
    expect(sweepGlow(9)).toBeCloseTo(0, 12);
  });
});

// ---------------------------------------------------------------------------
// Sound
// ---------------------------------------------------------------------------

describe('one table, for the picture and the sound', () => {
  test('the harmonics are pinned: 1, 2, 3, 4, 6 against the base note', () => {
    // The only place these numbers exist. Water Sphere shipped a sound whose
    // pitches had drifted away from its picture because they were written down
    // twice; the rungs beside the object and the oscillators both read this.
    expect([...HARMONIC_MULTIPLES]).toEqual([1, 2, 3, 4, 6]);
    expect(HARMONIC_MULTIPLES.length).toBe(FULL_CLIMB + 1);
  });

  test('each rung adds one harmonic and none of them replaces another', () => {
    expect(harmonicLevels(0)).toEqual([1, 0, 0, 0, 0]);
    expect(harmonicLevels(1)).toEqual([1, 1, 0, 0, 0]);
    expect(harmonicLevels(2)).toEqual([1, 1, 1, 0, 0]);
    expect(harmonicLevels(3)).toEqual([1, 1, 1, 1, 0]);
    expect(harmonicLevels(4)).toEqual([1, 1, 1, 1, 1]);
  });

  test('a harmonic arrives at exactly the pace of the sweep pulling it out', () => {
    expect(harmonicLevels(2.5)[3]).toBeCloseTo(0.5, 12);
    expect(harmonicLevels(2.5)[2]).toBe(1);
    expect(harmonicLevels(2.5)[4]).toBe(0);
  });

  test('the level of every rung only ever rises as the child climbs', () => {
    let previous = harmonicLevels(0);
    for (let i = 1; i <= 200; i++) {
      const now = harmonicLevels((i / 200) * FULL_CLIMB);
      now.forEach((v, k) => expect(v).toBeGreaterThanOrEqual(previous[k] - 1e-12));
      previous = now;
    }
  });

  test('the pitches come from the same table the levels do', () => {
    HARMONIC_MULTIPLES.forEach((m, i) => expect(harmonicHz(i)).toBe(BASE_HZ * m));
    expect(harmonicHz(99)).toBe(0);
    // Low enough to be a hum rather than a whistle, and the top of the stack
    // stays inside the range a small speaker reproduces.
    expect(BASE_HZ).toBeGreaterThan(100);
    expect(harmonicHz(HARMONIC_MULTIPLES.length - 1)).toBeLessThan(1200);
  });
});

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

describe('the colour fence', () => {
  test('the real safeHue cannot reach the banned band from anywhere', () => {
    for (let i = 0; i <= 20000; i++) {
      const h = safeHue(i / 20000);
      expect(hueIsAllowed(h), `safeHue(${i / 20000}) = ${h}`).toBe(true);
      expect(h < BANNED_HUE_MIN || h > BANNED_HUE_MAX).toBe(true);
    }
  });

  test('every direction, and both beads, land clear of it', () => {
    for (let axis = -2; axis < 8; axis++) expect(hueIsAllowed(axisHue(axis))).toBe(true);
    expect(hueIsAllowed(handleHue())).toBe(true);
    expect(hueIsAllowed(shadowHue())).toBe(true);
  });

  test('the four directions are told apart without any of them meaning more', () => {
    const hues = [0, 1, 2, 3].map(axisHue);
    expect(new Set(hues).size).toBe(4);
    // One narrow walk, not a rainbow: a rainbow would say the fourth direction
    // is special in a way the first is not, and it is not.
    expect(Math.max(...hues) - Math.min(...hues)).toBeLessThan(50);
    expect(AXIS_HUE_T.length).toBe(4);
  });

  test('the beads are warm and the shape is cool, so the thing to pull stands out', () => {
    const beads = [handleHue(), shadowHue()];
    const shape = [0, 1, 2, 3].map(axisHue);
    for (const b of beads) {
      for (const s of shape) expect(Math.abs(b - s)).toBeGreaterThan(60);
    }
    expect(Math.abs(handleHue() - shadowHue())).toBeGreaterThan(15);
  });
});

// ---------------------------------------------------------------------------
// The frame loop, and reduced motion
// ---------------------------------------------------------------------------

describe('the render loop refuses the two frames it must refuse', () => {
  const busy = { dirty: true, holding: true, queued: true, animating: true };

  test('a canvas with no width gets no frame, however busy everything else is', () => {
    expect(shouldSchedule({ ...busy, cssW: 0, cssH: 800 })).toBe(false);
    expect(shouldSchedule({ ...busy, cssW: MIN_CANVAS_PX - 0.01, cssH: 800 })).toBe(false);
  });

  test('a canvas with no height gets no frame either', () => {
    // A collapsing subtree usually loses its height first and keeps its width,
    // so a width-only rule would let it keep asking for frames. Sound Drawing's
    // fix round added this side.
    expect(shouldSchedule({ ...busy, cssW: 800, cssH: 0 })).toBe(false);
    expect(shouldSchedule({ ...busy, cssW: 800, cssH: MIN_CANVAS_PX - 0.01 })).toBe(false);
  });

  test('a still, unhandled object gets no frame at all', () => {
    expect(
      shouldSchedule({
        cssW: 800,
        cssH: 600,
        dirty: false,
        holding: false,
        queued: false,
        animating: false,
      }),
    ).toBe(false);
  });

  test('each of the four reasons on its own is enough to keep going', () => {
    const still = {
      cssW: 800,
      cssH: 600,
      dirty: false,
      holding: false,
      queued: false,
      animating: false,
    };
    expect(shouldSchedule({ ...still, dirty: true })).toBe(true);
    expect(shouldSchedule({ ...still, holding: true })).toBe(true);
    expect(shouldSchedule({ ...still, queued: true })).toBe(true);
    expect(shouldSchedule({ ...still, animating: true })).toBe(true);
  });

  test('a real canvas that is busy does get its frame', () => {
    expect(shouldSchedule({ ...busy, cssW: 800, cssH: 600 })).toBe(true);
  });
});

describe('reduced motion takes the clock away and leaves the hand', () => {
  test('the glint is gone under reduced motion even while a finger is held', () => {
    // THE FRACTAL GROWER BUG, AS A TEST. Collapsing these two into one value
    // ran a time-driven effect at full amplitude under reduced motion for as
    // long as a finger stayed down. Writing `glint: args.holdAmp` fails here.
    expect(motionAmplitudes({ reduceMotion: true, holdAmp: 1 }).glint).toBe(0);
    expect(motionAmplitudes({ reduceMotion: true, holdAmp: 0.6 }).glint).toBe(0);
  });

  test('the touch light is kept, because it is the hand and not the clock', () => {
    expect(motionAmplitudes({ reduceMotion: true, holdAmp: 1 }).hold).toBe(1);
    expect(motionAmplitudes({ reduceMotion: false, holdAmp: 0.4 }).hold).toBe(0.4);
    expect(motionAmplitudes({ reduceMotion: false, holdAmp: 0.4 }).glint).toBe(0.4);
  });

  test('the hold light snaps under reduced motion instead of easing', () => {
    // A ramp is an animation that outlives the input that started it. Under
    // reduced motion a touch is on or off, with no frames in between.
    expect(holdAmpNext({ reduceMotion: true, holding: true, amp: 0, dt: 0.016 })).toBe(1);
    expect(holdAmpNext({ reduceMotion: true, holding: false, amp: 1, dt: 0.016 })).toBe(0);
  });

  test('with motion allowed it eases in and settles all the way to nothing', () => {
    const up = holdAmpNext({ reduceMotion: false, holding: true, amp: 0, dt: 0.016 });
    expect(up).toBeGreaterThan(0);
    expect(up).toBeLessThan(1);
    expect(holdAmpNext({ reduceMotion: false, holding: true, amp: 0.99, dt: 1 })).toBe(1);
    // It reaches exactly zero rather than crawling, so the loop can stop.
    expect(holdAmpNext({ reduceMotion: false, holding: false, amp: 0.001, dt: 0.016 })).toBe(0);
    expect(holdAmpNext({ reduceMotion: false, holding: false, amp: 0, dt: 1 })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

describe('what a child using a screen reader is told', () => {
  test('the counts in the sentence are counted from the figure that is drawn', () => {
    // From rung one up. The point's sentence says "One corner" rather than
    // "1 corner", and is checked in the singular test below.
    for (const rung of [1, 2, 3, 4]) {
      const f = buildFigure(rung);
      const said = describeLadder(rung, 0);
      expect(said).toContain(`${f.vertices.length} corner`);
      if (f.edges.length > 0) expect(said).toContain(`${f.edges.length} edge`);
    }
  });

  test('it names the shape the child made, and invents nothing for the top rung', () => {
    expect(describeLadder(0, 0)).toContain('point');
    expect(describeLadder(1, 0)).toContain('line');
    expect(describeLadder(2, 0)).toContain('square');
    expect(describeLadder(3, 0)).toContain('cube');
    expect(rungName(4)).toBe("cube's shadow");
    expect(describeLadder(4, 0)).toContain("cube's shadow");
  });

  test('a hair past a rung is still that rung, named and counted the same way', () => {
    // THE DEFECT THE OBSERVED PASS FOUND, AS A TEST. A finger that stops a
    // thousandth of a sweep past a rung leaves a figure already carrying the
    // corners of the rung ABOVE. Describing it at the raw climb read out "A
    // cube. 16 corners, 32 edges", which is a cube with a tesseract's corners.
    // Building at the rung when it is at one is what keeps the name and the
    // count coming from the same figure; reverting that fails here.
    for (const rung of [1, 2, 3, 4]) {
      const whole = buildFigure(rung);
      const edges = `${whole.edges.length} ${whole.edges.length === 1 ? 'edge' : 'edges'}`;
      for (const offset of [-SETTLED_CLIMB / 2, -0.005, 0, 0.005, SETTLED_CLIMB / 2]) {
        const said = describeLadder(rung + offset, 0);
        expect(said, `rung ${rung} offset ${offset}`).toContain(
          `${whole.vertices.length} corners, ${edges}`,
        );
        expect(said).toContain(rungName(rung));
        expect(said).not.toContain('sweeping out');
      }
    }
  });

  test('and clearly past one is a sweep in progress, with the counts to match', () => {
    // The other half: the settling rule must not swallow a real sweep.
    const mid = buildFigure(2.5);
    const said = describeLadder(2.5, 0);
    expect(said).toContain('sweeping out');
    expect(said).toContain(`${mid.vertices.length} corners, ${mid.edges.length} edges`);
  });

  test('mid-sweep it says which direction is being pulled out', () => {
    expect(describeLadder(1.5, 0)).toContain('line sweeping out into a square');
    expect(describeLadder(2.5, 0)).toContain('square sweeping out into a cube');
  });

  test('it says the shadow has moved only once the child has turned it', () => {
    expect(describeLadder(4, 0)).toContain('Drag the ring bead');
    expect(describeLadder(4, 1.2)).toContain('has slid');
    expect(describeLadder(4, 1.2)).not.toContain('Drag the ring bead');
  });

  test('the sentence is singular where the shape is', () => {
    expect(describeLadder(0, 0)).toContain('One corner');
    expect(describeLadder(1, 0)).toContain('1 edge.');
    expect(describeLadder(1, 0)).not.toContain('1 edges');
  });

  test('no em dashes anywhere in what is said or named', () => {
    for (let i = 0; i <= 40; i++) {
      expect(describeLadder((i / 40) * FULL_CLIMB, 1)).not.toContain('—');
    }
    for (const rung of RUNGS) expect(rungName(rung)).not.toContain('—');
  });
});
