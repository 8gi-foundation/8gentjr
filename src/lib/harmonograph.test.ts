// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Sound Drawing: the two pendulums, measured.
 *
 * Every sentence this activity says to a child is a claim about the module
 * under test here, so each one has a test that MEASURES it rather than a
 * comment that asserts it:
 *
 *   - "a shorter string made more loops": the loops are COUNTED in the sampled
 *     path, and the count is swept across the whole length control and asserted
 *     never to go down as the string gets shorter.
 *   - "the line came back over itself": the pen is compared against its own
 *     earlier laps across the whole drawing, and that distance is asserted to
 *     be zero to floating point at every exact simple ratio, at every length of
 *     drawing this machine can produce.
 *   - "between the simple numbers the line drifts": the same measure is
 *     asserted to grow lap by lap once the ratio is off a simple one, and never
 *     to shrink as the child keeps drawing.
 *   - the picture is the RATIO and not the size: two figures grown from
 *     different string lengths at one ratio are compared point for point.
 *
 * The two guards that carry the reduced-motion rule and the self-stopping
 * render loop are pure functions here rather than branches in the component,
 * and each has a test written to kill the one-line change that would revert it.
 *
 * Issue: #225 (wave 4, Sound Drawing)
 */
import { describe, expect, test } from 'bun:test';
import {
  BALANCE_MAX,
  BALANCE_MIN,
  CLOSED_GAP,
  FREQ_MAX,
  FREQ_MIN,
  HOLD_DECAY,
  HOLD_FLOOR,
  INK_MAX,
  INK_PER_PX,
  LENGTH_MAX,
  LENGTH_MIN,
  MAX_TERM,
  MIN_CANVAS_PX,
  OPEN_GAP,
  PHASE_MAX,
  PHASE_MIN,
  POINT_CAP,
  RATIO_CARDS,
  RATIO_MAX,
  RATIO_MIN,
  SAMPLES_PER_TURN,
  clampBalance,
  clampInk,
  clampLength,
  clampPhase,
  describeFigure,
  frequencyFor,
  holdAmpNext,
  hueIsAllowed,
  inkAfterTravel,
  lengthForFrequency,
  lengthsForCard,
  loopCount,
  makeCamera,
  motionAmplitudes,
  nearestSimpleRatio,
  openness,
  paletteAt,
  paletteTFor,
  penAt,
  projectPoint,
  safeHue,
  samplesFor,
  shouldSchedule,
  traceFigure,
} from '@/lib/harmonograph';

const fig = (over = {}) => ({ ratio: 1.5, phase: 0.6, balance: 1, turns: 8, ...over });

// ---------------------------------------------------------------------------
// The pendulum law
// ---------------------------------------------------------------------------

describe('the pendulum law', () => {
  test('four times the string is exactly half the speed', () => {
    // The thing a child can hear: an octave down for four times the length.
    // Measured at several lengths so it is the LAW and not one lucky point.
    for (const l of [0.25, 0.35, 0.5, 0.75, 1]) {
      expect(frequencyFor(l * 4)).toBeCloseTo(frequencyFor(l) / 2, 12);
    }
  });

  test('shorter is always faster, everywhere on the control', () => {
    let previous = Infinity;
    for (let i = 0; i <= 400; i++) {
      const length = LENGTH_MIN + ((LENGTH_MAX - LENGTH_MIN) * i) / 400;
      const f = frequencyFor(length);
      expect(f).toBeLessThan(previous);
      previous = f;
    }
  });

  test('length and frequency are inverses of each other', () => {
    for (let i = 0; i <= 60; i++) {
      const length = LENGTH_MIN + ((LENGTH_MAX - LENGTH_MIN) * i) / 60;
      expect(lengthForFrequency(frequencyFor(length))).toBeCloseTo(length, 10);
    }
  });

  test('the quoted speed and ratio ends are the measured ones', () => {
    // The module comment says the length span is sixteen to one, which is four
    // to one in speed and two octaves. All three are checked here so the
    // sentence cannot rot away from the constants.
    expect(LENGTH_MAX / LENGTH_MIN).toBeCloseTo(16, 12);
    expect(FREQ_MAX / FREQ_MIN).toBeCloseTo(4, 12);
    expect(RATIO_MIN).toBeCloseTo(0.25, 12);
    expect(RATIO_MAX).toBeCloseTo(4, 12);
  });

  test('the controls clamp rather than escape', () => {
    expect(clampLength(-5)).toBe(LENGTH_MIN);
    expect(clampLength(900)).toBe(LENGTH_MAX);
    expect(clampLength(Number.NaN)).toBe(LENGTH_MIN);
    expect(clampPhase(-1)).toBe(PHASE_MIN);
    expect(clampPhase(99)).toBe(PHASE_MAX);
    expect(clampBalance(-1)).toBe(BALANCE_MIN);
    expect(clampBalance(99)).toBe(BALANCE_MAX);
    expect(clampBalance(Number.NaN)).toBe(1);
    expect(clampInk(-3)).toBe(0);
    expect(clampInk(500)).toBe(INK_MAX);
  });
});

// ---------------------------------------------------------------------------
// Ink
// ---------------------------------------------------------------------------

describe('ink is the hand, not the clock', () => {
  test('a hand that has not moved draws nothing more', () => {
    expect(inkAfterTravel(3, 0)).toBe(3);
    expect(inkAfterTravel(3, -20)).toBe(3);
    expect(inkAfterTravel(3, Number.NaN)).toBe(3);
  });

  test('travel is the only thing that adds ink, and it adds it in proportion', () => {
    expect(inkAfterTravel(0, 90)).toBeCloseTo(1, 12);
    expect(inkAfterTravel(0, 180)).toBeCloseTo(2, 12);
    expect(inkAfterTravel(1, 45)).toBeCloseTo(1.5, 12);
    expect(INK_PER_PX * 90).toBeCloseTo(1, 12);
  });

  test('ink stops at the ceiling however far the hand travels', () => {
    expect(inkAfterTravel(0, 1_000_000)).toBe(INK_MAX);
  });

  test('the whole sixteen swings are reachable in a handful of gestures', () => {
    // A full-height drag on a tablet is roughly 700px. The module comment says
    // one gesture is about seven swings and a few give the lot; both are here.
    expect(inkAfterTravel(0, 700)).toBeGreaterThan(7);
    expect(inkAfterTravel(0, 700)).toBeLessThan(8.5);
    expect(inkAfterTravel(inkAfterTravel(0, 700), 700)).toBeGreaterThan(15);
  });
});

// ---------------------------------------------------------------------------
// The drawing
// ---------------------------------------------------------------------------

describe('the drawing', () => {
  test('nothing drawn is nothing on the paper', () => {
    const f = traceFigure(fig({ turns: 0 }));
    for (let i = 0; i < f.count; i++) {
      expect(f.xs[i]).toBeCloseTo(Math.sin(0.6), 12);
      expect(f.ys[i]).toBeCloseTo(0, 12);
    }
  });

  test('same numbers, same drawing, forever', () => {
    const a = traceFigure(fig());
    const b = traceFigure(fig());
    expect(Array.from(a.xs)).toEqual(Array.from(b.xs));
    expect(Array.from(a.ys)).toEqual(Array.from(b.ys));
  });

  test('nothing anywhere in the path is NaN, at any setting', () => {
    for (const ratio of [RATIO_MIN, 0.7, 1, 1.5, 2.4, RATIO_MAX]) {
      for (const phase of [PHASE_MIN, 0.9, PHASE_MAX]) {
        for (const balance of [BALANCE_MIN, 1, BALANCE_MAX]) {
          const f = traceFigure({ ratio, phase, balance, turns: INK_MAX });
          for (let i = 0; i < f.count; i++) {
            expect(Number.isFinite(f.xs[i])).toBe(true);
            expect(Number.isFinite(f.ys[i])).toBe(true);
          }
        }
      }
    }
  });

  test('the pen stays on the paper: nothing leaves its own amplitude', () => {
    const f = traceFigure(fig({ balance: BALANCE_MAX, turns: INK_MAX }));
    expect(f.halfW).toBeLessThanOrEqual(1 + 1e-12);
    expect(f.halfH).toBeLessThanOrEqual(BALANCE_MAX + 1e-12);
  });

  test('sampling follows the FASTER string, so loops cannot be aliased away', () => {
    const slow = samplesFor(fig({ ratio: 1, turns: 8 }));
    const fast = samplesFor(fig({ ratio: 4, turns: 8 }));
    expect(fast).toBeGreaterThan(slow * 3.5);
    // Density per half-cycle of the faster swing, at the worst corner the
    // controls allow. Well above the two samples aliasing needs.
    const worst = samplesFor(fig({ ratio: RATIO_MAX, turns: INK_MAX }));
    const halfCycles = INK_MAX * RATIO_MAX * 2;
    expect(worst / halfCycles).toBeGreaterThan(20);
  });

  test('the point ceiling holds and the honest worst case is under it', () => {
    expect(samplesFor(fig({ ratio: 1000, turns: 1000 }))).toBe(POINT_CAP);
    expect(samplesFor(fig({ ratio: RATIO_MAX, turns: INK_MAX }))).toBeLessThanOrEqual(POINT_CAP);
    expect(traceFigure(fig({ ratio: 1000, turns: 1000 })).count).toBe(POINT_CAP);
  });

  test('the sampled path really is the pen, point for point', () => {
    const p = fig({ turns: 3 });
    const f = traceFigure(p, 24);
    const span = p.turns * Math.PI * 2;
    for (const i of [0, 1, 17, f.count - 1]) {
      const u = (span * i) / (f.count - 1);
      expect(f.xs[i]).toBeCloseTo(penAt(p, u).x, 12);
      expect(f.ys[i]).toBeCloseTo(penAt(p, u).y, 12);
    }
  });
});

// ---------------------------------------------------------------------------
// The picture is the ratio, not the size
// ---------------------------------------------------------------------------

describe('the picture is the ratio and not the size', () => {
  test('two very different pairs of strings at one ratio draw one figure', () => {
    // 3:2 built from a long pair and from a short pair. The two machines swing
    // at completely different speeds and the paper cannot tell them apart.
    const slow = frequencyFor(3 * (2 / 3) ** 2) / frequencyFor(3);
    const fast = frequencyFor(0.75 * (2 / 3) ** 2) / frequencyFor(0.75);
    expect(slow).toBeCloseTo(1.5, 12);
    expect(fast).toBeCloseTo(1.5, 12);
    // The two machines really are running at different speeds, not the same
    // pair of strings written twice.
    expect(frequencyFor(3)).toBeLessThan(frequencyFor(0.75) / 1.9);

    const a = traceFigure(fig({ ratio: slow }));
    const b = traceFigure(fig({ ratio: fast }));
    for (let i = 0; i < a.count; i++) {
      expect(a.xs[i]).toBeCloseTo(b.xs[i], 12);
      expect(a.ys[i]).toBeCloseTo(b.ys[i], 12);
    }
  });

  test('a length cannot reach the drawing at all', () => {
    // Structural, not statistical: the parameters the figure is built from are
    // exactly these four, and none of them is a length.
    expect(Object.keys(fig()).sort()).toEqual(['balance', 'phase', 'ratio', 'turns']);
  });
});

// ---------------------------------------------------------------------------
// Loops
// ---------------------------------------------------------------------------

describe('a shorter string makes more loops', () => {
  test('the loops on the paper are the ratio, counted', () => {
    for (const ratio of [0.25, 0.5, 1, 1.5, 2, 3, 4]) {
      // Counted from the sampled path, then checked against what the machine
      // is doing: eight swings of the first string is eight times the ratio
      // turns of the second.
      expect(loopCount(fig({ ratio, turns: 8 }))).toBe(Math.round(8 * ratio));
    }
  });

  test('shortening the second string never takes loops away, anywhere', () => {
    let previous = -1;
    for (let i = 0; i <= 300; i++) {
      const length = LENGTH_MAX - ((LENGTH_MAX - LENGTH_MIN) * i) / 300;
      const ratio = frequencyFor(length) / frequencyFor(1);
      const loops = loopCount(fig({ ratio, turns: 8 }));
      expect(loops).toBeGreaterThanOrEqual(previous);
      previous = loops;
    }
  });

  test('the journey the reducer asks for really does add loops a child can see', () => {
    // A factor of 1.6 in the ratio, which is what LOOP_JOURNEY is set to.
    const before = loopCount(fig({ ratio: 1, turns: 8 }));
    const after = loopCount(fig({ ratio: 1.6, turns: 8 }));
    expect(after - before).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// Closing
// ---------------------------------------------------------------------------

describe('simple numbers draw a line that comes back over itself', () => {
  test('every simple ratio closes exactly, at every length of drawing', () => {
    for (let q = 1; q <= MAX_TERM; q++) {
      for (let p = 1; p <= MAX_TERM; p++) {
        for (const turns of [2 * MAX_TERM, 12, INK_MAX]) {
          const gap = openness(fig({ ratio: p / q, turns }));
          if (gap === null) continue;
          expect(gap).toBeLessThan(1e-9);
        }
      }
    }
  });

  test('closing does not care about the phase or the stretch', () => {
    for (const phase of [PHASE_MIN, 0.4, 1.2, PHASE_MAX]) {
      for (const balance of [BALANCE_MIN, 1, BALANCE_MAX]) {
        expect(openness({ ratio: 1.5, phase, balance, turns: INK_MAX })).toBeLessThan(1e-9);
      }
    }
  });

  test('every ratio card lands the machine exactly on its figure', () => {
    for (const card of RATIO_CARDS) {
      const { lengthX, lengthY } = lengthsForCard(card);
      // Both strings stay inside their travel, so the child can still drag
      // either one in both directions afterwards.
      expect(lengthX).toBeGreaterThan(LENGTH_MIN);
      expect(lengthX).toBeLessThan(LENGTH_MAX);
      expect(lengthY).toBeGreaterThan(LENGTH_MIN);
      expect(lengthY).toBeLessThan(LENGTH_MAX);

      const ratio = frequencyFor(lengthY) / frequencyFor(lengthX);
      expect(ratio).toBeCloseTo(card.p / card.q, 12);
      const gap = openness(fig({ ratio, turns: INK_MAX }));
      expect(gap).not.toBeNull();
      expect(gap).toBeLessThan(CLOSED_GAP);
    }
  });

  test('there is no answer at all before two whole laps exist', () => {
    // A claim of closure with nothing to compare against is not a measurement,
    // so the function refuses rather than returning a flattering zero.
    for (const [p, q] of [
      [1, 1],
      [3, 2],
      [4, 3],
      [4, 5],
    ]) {
      const ratio = p / q;
      const period = nearestSimpleRatio(ratio).q;
      expect(openness(fig({ ratio, turns: 2 * period - 0.01 }))).toBeNull();
      expect(openness(fig({ ratio, turns: 2 * period }))).not.toBeNull();
    }
  });
});

describe('in between, the line drifts and never joins up', () => {
  test('drifting grows lap by lap and never shrinks as the child keeps drawing', () => {
    const ratio = 1.5 + 0.004;
    let previous = -1;
    let grew = 0;
    for (let turns = 4; turns <= INK_MAX; turns += 0.5) {
      const gap = openness(fig({ ratio, turns }));
      if (gap === null) continue;
      expect(gap).toBeGreaterThanOrEqual(previous - 1e-12);
      if (gap > previous + 1e-9) grew++;
      previous = gap;
    }
    // Not merely non-decreasing: it visibly grows, many times over the drawing.
    expect(grew).toBeGreaterThanOrEqual(6);
    expect(previous).toBeGreaterThan(0.3);
  });

  test('measured against neighbouring laps instead, the drift would say nothing', () => {
    // Why `openness` compares against EVERY lap and not the next one. The
    // offset between two neighbouring laps is the same constant however much
    // has been drawn, so a next-lap measure is flat and cannot express the
    // thing the child is watching happen. Measured here so the reason the
    // shipped function is shaped the way it is stays true.
    const params = { ratio: 1.504, phase: 0.6, balance: 1 };
    const neighbour = (turns: number) => {
      const lap = nearestSimpleRatio(params.ratio).q * Math.PI * 2;
      let worst = 0;
      for (let i = 0; i < 192; i++) {
        const u = ((turns * Math.PI * 2 - lap) * i) / 191;
        const a = penAt({ ...params, turns }, u);
        const b = penAt({ ...params, turns }, u + lap);
        worst = Math.max(worst, Math.hypot(a.x - b.x, a.y - b.y));
      }
      return worst;
    };
    expect(neighbour(16)).toBeCloseTo(neighbour(6), 6);
    // The shipped measure, on the same drawing, does not stay flat.
    expect(openness({ ...params, turns: 16 })).toBeGreaterThan(
      openness({ ...params, turns: 6 }) * 2,
    );
  });

  test('the ratios the reducer calls in between really do drift a long way', () => {
    // Every one of these is at least OPEN_RATIO_ERROR from the nearest simple
    // ratio, which is the second condition `never-joins` is gated on.
    for (const ratio of [0.83, 1.13, 1.72, 2.35, 2.71, 3.17]) {
      expect(nearestSimpleRatio(ratio).error).toBeGreaterThanOrEqual(0.02);
      expect(openness(fig({ ratio, turns: INK_MAX }))).toBeGreaterThan(OPEN_GAP);
    }
  });

  test('the two thresholds cannot both be true of one drawing', () => {
    expect(CLOSED_GAP).toBeLessThan(OPEN_GAP);
  });

  test('the drift can never exceed the paper it is drawn on', () => {
    let worst = 0;
    for (let i = 0; i <= 400; i++) {
      const ratio = RATIO_MIN + ((RATIO_MAX - RATIO_MIN) * i) / 400;
      worst = Math.max(worst, openness(fig({ ratio, turns: INK_MAX })) ?? 0);
    }
    // Two swings of amplitude one, which is the width of the figure itself.
    expect(worst).toBeLessThanOrEqual(2 + 1e-9);
  });
});

describe('the nearest simple ratio', () => {
  test('an exact simple ratio is described as itself', () => {
    for (const [p, q] of [
      [1, 1],
      [2, 1],
      [3, 2],
      [4, 3],
      [5, 3],
      [5, 4],
      [4, 5],
    ]) {
      const found = nearestSimpleRatio(p / q);
      expect(found.p).toBe(p);
      expect(found.q).toBe(q);
      expect(found.error).toBeLessThan(1e-12);
    }
  });

  test('it never invents a term bigger than the limit', () => {
    for (let i = 0; i <= 500; i++) {
      const ratio = RATIO_MIN + ((RATIO_MAX - RATIO_MIN) * i) / 500;
      const found = nearestSimpleRatio(ratio);
      expect(found.p).toBeLessThanOrEqual(MAX_TERM);
      expect(found.q).toBeLessThanOrEqual(MAX_TERM);
      expect(found.error).toBeCloseTo(Math.abs(ratio - found.p / found.q), 12);
    }
  });

  test('it really is the nearest, checked against every candidate', () => {
    for (let i = 0; i <= 200; i++) {
      const ratio = RATIO_MIN + ((RATIO_MAX - RATIO_MIN) * i) / 200;
      const found = nearestSimpleRatio(ratio);
      for (let q = 1; q <= MAX_TERM; q++) {
        for (let p = 1; p <= MAX_TERM; p++) {
          expect(found.error).toBeLessThanOrEqual(Math.abs(ratio - p / q) + 1e-12);
        }
      }
    }
  });

  test('a tie goes to the figure that closes sooner', () => {
    // 11/6 sits exactly midway between 5:3 and 2:1, and 11:6 itself is out of
    // range, so the two neighbours tie to the last bit. The rule picks the one
    // whose figure the child can actually watch close, which is the shorter
    // one: 2:1 closes in a single swing, 5:3 takes three.
    const tie = nearestSimpleRatio(11 / 6);
    expect(Math.abs(11 / 6 - 5 / 3)).toBeCloseTo(Math.abs(11 / 6 - 2), 12);
    expect(tie.p).toBe(2);
    expect(tie.q).toBe(1);
    // Away from a tie the nearest wins outright, whatever its q.
    expect(nearestSimpleRatio(1.25).q).toBe(4);
    expect(nearestSimpleRatio(1.25).p).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// The camera
// ---------------------------------------------------------------------------

describe('the camera', () => {
  const cam = makeCamera(0, 2.4, 5.2, 3.2);

  test('the middle of the table lands in the middle of the picture', () => {
    const p = projectPoint(0, 0, 0, cam);
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.y).toBeCloseTo(0, 10);
  });

  test('nearer is bigger and further is smaller', () => {
    const near = projectPoint(1, 0, -1.2, cam);
    const far = projectPoint(1, 0, 1.2, cam);
    expect(near.k).toBeGreaterThan(far.k);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
    expect(near.depth).toBeLessThan(far.depth);
  });

  test('up is up', () => {
    expect(projectPoint(0, 1.5, 0, cam).y).toBeGreaterThan(projectPoint(0, 0, 0, cam).y);
    expect(projectPoint(0, -0.5, 0, cam).y).toBeLessThan(projectPoint(0, 0, 0, cam).y);
  });

  test('yaw orbits the eye, so the two pendulums swap which is nearer', () => {
    const left = { x: -1.5, z: 0 };
    const right = { x: 1.5, z: 0 };
    const a = makeCamera(0.32, 2.4, 5.2, 3.2);
    const b = makeCamera(-0.32, 2.4, 5.2, 3.2);
    const leftNearer = projectPoint(left.x, 1, left.z, a).depth;
    const rightNearer = projectPoint(right.x, 1, right.z, a).depth;
    expect(leftNearer).not.toBeCloseTo(rightNearer, 3);
    // Turning the other way puts the other one in front.
    expect(
      Math.sign(
        projectPoint(left.x, 1, left.z, b).depth - projectPoint(right.x, 1, right.z, b).depth,
      ),
    ).toBe(-Math.sign(leftNearer - rightNearer));
  });

  test('a point behind the eye cannot turn the picture inside out', () => {
    const behind = projectPoint(0, 0, -400, cam);
    expect(Number.isFinite(behind.x)).toBe(true);
    expect(Number.isFinite(behind.y)).toBe(true);
    expect(behind.k).toBeGreaterThan(0);
  });

  test('nothing the machine contains comes near the depth floor', () => {
    let closest = Infinity;
    for (const yaw of [-0.34, 0, 0.34]) {
      const c = makeCamera(yaw, 2.4, 5.2, 3.2);
      for (const x of [-1.8, 0, 1.8]) {
        for (const y of [0, 1.2, 2.4]) {
          for (const z of [-1.6, 0, 1.6]) {
            closest = Math.min(closest, projectPoint(x, y, z, c).depth);
          }
        }
      }
    }
    expect(closest).toBeGreaterThan(1.5);
  });
});

// ---------------------------------------------------------------------------
// Motion, and the two guards that carry the rules
// ---------------------------------------------------------------------------

describe('reduced motion takes the clock out and leaves the hand in', () => {
  test('the time-driven swing is zero under reduced motion, held or not', () => {
    // The mutation this kills: `swing: args.holdAmp`, which is what shipped in
    // Fractal Grower and which no test that samples only AFTER a release can
    // see. Held is the case that matters, so it is first.
    for (const holdAmp of [0, 0.3, 1]) {
      expect(motionAmplitudes({ reduceMotion: true, holdAmp }).swing).toBe(0);
    }
  });

  test('the position-driven lean survives reduced motion untouched', () => {
    // The opposite mutation, which would be a different bug of the same size:
    // dropping the lean too leaves a child with no response to their own hand.
    for (const holdAmp of [0, 0.3, 1]) {
      expect(motionAmplitudes({ reduceMotion: true, holdAmp }).lean).toBe(holdAmp);
      expect(motionAmplitudes({ reduceMotion: false, holdAmp }).lean).toBe(holdAmp);
    }
  });

  test('out of reduced motion the swing is there', () => {
    expect(motionAmplitudes({ reduceMotion: false, holdAmp: 1 }).swing).toBe(1);
  });

  test('a held-still finger under reduced motion produces one unchanging frame', () => {
    // The whole reduced-motion claim, end to end and in the units the paint
    // code uses. Nothing here advances, however long the finger is held.
    let amp = 0;
    const seen = new Set<string>();
    for (let frame = 0; frame < 40; frame++) {
      amp = holdAmpNext({ reduceMotion: true, holding: true, amp, dt: 1 / 32 });
      const m = motionAmplitudes({ reduceMotion: true, holdAmp: amp });
      seen.add(`${m.lean}:${m.swing}`);
    }
    expect(seen.size).toBe(1);
    expect([...seen][0]).toBe('1:0');
  });

  test('under reduced motion the amplitude snaps rather than ramping', () => {
    // A ramp is an animation that outlives the input that started it.
    expect(holdAmpNext({ reduceMotion: true, holding: true, amp: 0, dt: 1 / 32 })).toBe(1);
    expect(holdAmpNext({ reduceMotion: true, holding: false, amp: 1, dt: 1 / 32 })).toBe(0);
  });

  test('out of reduced motion it winds up, settles, and reaches a real stop', () => {
    let amp = 0;
    for (let i = 0; i < 32; i++) {
      amp = holdAmpNext({ reduceMotion: false, holding: true, amp, dt: 1 / 32 });
    }
    expect(amp).toBe(1);

    let frames = 0;
    while (amp > 0 && frames < 1000) {
      amp = holdAmpNext({ reduceMotion: false, holding: false, amp, dt: 1 / 32 });
      frames++;
    }
    // It reaches exactly zero rather than crawling towards it forever, which
    // is what lets the render loop stop.
    expect(amp).toBe(0);
    expect(frames).toBeLessThan(Math.ceil(32 / HOLD_DECAY) + 4);
    expect(HOLD_FLOOR).toBeGreaterThan(0);
  });
});

describe('the render loop stops itself', () => {
  const base = { cssW: 800, dirty: false, holding: false, queued: false, swinging: false };

  test('a canvas with no size gets no frame, whatever else is true', () => {
    // The mutation this kills: dropping the size guard. A hidden or unlaid-out
    // canvas would then spin the loop forever, painting nothing.
    for (const cssW of [0, 1, MIN_CANVAS_PX - 0.01, Number.NaN]) {
      expect(
        shouldSchedule({ ...base, cssW, dirty: true, holding: true, queued: true, swinging: true }),
      ).toBe(false);
    }
  });

  test('a still, untouched machine gets no frame', () => {
    expect(shouldSchedule(base)).toBe(false);
  });

  test('each reason to keep painting is enough on its own', () => {
    expect(shouldSchedule({ ...base, dirty: true })).toBe(true);
    expect(shouldSchedule({ ...base, holding: true })).toBe(true);
    expect(shouldSchedule({ ...base, queued: true })).toBe(true);
    expect(shouldSchedule({ ...base, swinging: true })).toBe(true);
  });

  test('a canvas that has just been given a size may paint again', () => {
    expect(shouldSchedule({ ...base, cssW: MIN_CANVAS_PX, dirty: true })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The colour fence
// ---------------------------------------------------------------------------

describe('the colour fence', () => {
  test('safeHue never lands in the banned band, anywhere on the circle', () => {
    for (let i = 0; i <= 4000; i++) {
      expect(hueIsAllowed(safeHue(i / 4000))).toBe(true);
    }
    expect(hueIsAllowed(safeHue(-3.7))).toBe(true);
    expect(hueIsAllowed(safeHue(9.2))).toBe(true);
  });

  test('every colour this activity can produce is clear of the band', () => {
    for (let i = 0; i <= 2000; i++) {
      const p = paletteAt(i / 2000);
      for (const hue of [p.roomHue, p.paperHue, p.inkHue, p.brassHue]) {
        expect(hueIsAllowed(hue)).toBe(true);
      }
    }
  });

  test('the whole palette sits on ONE narrow arc, so blends stay clear too', () => {
    // Load bearing rather than tidy. The paint mixes ink towards the paper and
    // towards the room as it recedes, in straight RGB, and a blend between two
    // colours far apart on the circle can cross the banned band even when both
    // ends are outside it. Measured as an arc on the circle, not as a range of
    // numbers.
    const hues: number[] = [];
    for (let i = 0; i <= 400; i++) {
      const p = paletteAt(i / 400);
      hues.push(p.roomHue, p.paperHue, p.inkHue, p.brassHue);
    }
    const lo = Math.min(...hues);
    const hi = Math.max(...hues);
    const arc = Math.min(hi - lo, 360 - (hi - lo));
    expect(arc).toBeLessThan(180);
    // The arc is walked at one degree steps, which is finer than any blend of
    // two of its own colours can step across.
    for (let h = lo; h <= hi; h += 1) {
      expect(hueIsAllowed(h)).toBe(true);
    }
  });

  test('the ratio walks the palette once, without doubling back', () => {
    let previous = -1;
    for (let i = 0; i <= 400; i++) {
      const ratio = RATIO_MIN * (RATIO_MAX / RATIO_MIN) ** (i / 400);
      const t = paletteTFor(ratio);
      expect(t).toBeGreaterThanOrEqual(previous);
      previous = t;
    }
    expect(paletteTFor(RATIO_MIN)).toBeCloseTo(0, 10);
    expect(paletteTFor(RATIO_MAX)).toBeCloseTo(1, 10);
    // A ratio outside the machine's reach is pinned rather than escaping.
    expect(paletteTFor(0)).toBeCloseTo(0, 10);
    expect(paletteTFor(1000)).toBeCloseTo(1, 10);
  });
});

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

describe('what a screen reader is told', () => {
  test('a blank sheet says it is blank and says what to do', () => {
    const said = describeFigure(fig({ turns: 0 }));
    expect(said).toContain('blank');
    expect(said.toLowerCase()).toContain('drag');
  });

  test('a closed figure is described as closed, an open one as not', () => {
    expect(describeFigure(fig({ ratio: 1.5, turns: INK_MAX }))).toContain('closed');
    expect(describeFigure(fig({ ratio: 1.72, turns: INK_MAX }))).toContain('not coming back');
  });

  test('it counts the loops that are actually on the paper', () => {
    expect(describeFigure(fig({ ratio: 2, turns: 8 }))).toContain('16 loops');
  });

  test('it never claims closure before there is evidence for it', () => {
    const said = describeFigure(fig({ ratio: 1.5, turns: 2 }));
    expect(said).not.toContain('closed');
    expect(said).not.toContain('not coming back');
  });

  test('it says something at every setting, and never says NaN', () => {
    for (const ratio of [RATIO_MIN, 1, 1.5, 2.9, RATIO_MAX]) {
      for (const turns of [0, 1, 4, INK_MAX]) {
        const said = describeFigure(fig({ ratio, turns }));
        expect(said.length).toBeGreaterThan(10);
        expect(said).not.toContain('NaN');
        expect(said).not.toContain('undefined');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Sampling density is not a lie
// ---------------------------------------------------------------------------

describe('the drawing does not depend on how finely it is sampled', () => {
  test('counting loops at half the density gives the same count', () => {
    for (const ratio of [1, 1.5, 2, 3, 4]) {
      expect(loopCount(fig({ ratio, turns: 8 }), SAMPLES_PER_TURN / 2)).toBe(
        loopCount(fig({ ratio, turns: 8 }), SAMPLES_PER_TURN),
      );
    }
  });

  test('the closing measure is the same at a quarter of the samples', () => {
    for (const ratio of [1.5, 1.504, 1.72]) {
      const coarse = openness(fig({ ratio, turns: INK_MAX }), 48);
      const fine = openness(fig({ ratio, turns: INK_MAX }), 192);
      expect(coarse).toBeCloseTo(fine, 2);
    }
  });
});
