// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Pattern Garden: when the naming line is earned.
 *
 * The predicates are a pure reducer, so these tests drive real sequences of
 * child actions through them and assert on what comes out. Reintroduce either
 * wave-1 bug - a naming line before the first touch, or an `else if` chain that
 * makes a later discovery unreachable - and a test in this file fails.
 *
 * Issue: #225 (wave 3, Pattern Garden)
 */
import { describe, expect, test } from 'bun:test';
import { GLP_STAGES } from './glp';
import { getDiscoveries, getNamingLine } from './guided-naming';
import {
  DAB_AREA,
  GROWN_COVERAGE,
  JOURNEY,
  PATTERN_GARDEN_DISCOVERIES,
  SMEAR_AREA,
  SPREAD_SINCE_PLANT,
  initialDiscoveryState,
  stepDiscovery,
} from './pattern-garden-discovery';

/** Feed a sequence and collect everything named, in order. */
function run(events) {
  let state = initialDiscoveryState();
  const emitted = [];
  for (const event of events) {
    const step = stepDiscovery(state, event);
    state = step.state;
    emitted.push(...step.emit);
  }
  return { state, emitted };
}

const dab = (coverage = 0.02) => ({ type: 'plant', area: DAB_AREA * 0.5, coverage });
const smear = (coverage = 0.05) => ({ type: 'plant', area: SMEAR_AREA * 1.5, coverage });
const settle = (x, y, coverage) => ({ type: 'settle', x, y, coverage });
const GROWN = GROWN_COVERAGE + 0.01;

describe('nothing is named before the child acts', () => {
  test('a long run of observations of a growing bed emits nothing before any input', () => {
    const events = [];
    for (let i = 0; i < 300; i++) events.push(settle(0.5, 0.5, 0.4));
    expect(run(events).emitted).toEqual([]);
  });

  test('observations from every corner of the control emit nothing before any input', () => {
    // A journey across the whole control, a full bed, everything a discovery
    // could want, and none of it done by the child.
    const events = [];
    for (let i = 0; i <= 10; i++) {
      for (let j = 0; j <= 10; j++) events.push(settle(i / 10, j / 10, 0.5));
    }
    expect(run(events).emitted).toEqual([]);
  });

  test('the same observation after one touch of the control does name', () => {
    // The gate is a gate, not a mute. This is the pair to the tests above, and
    // the reason a broken gate cannot pass by simply never emitting anything.
    const { emitted } = run([{ type: 'tune' }, settle(0.5, 0.5, GROWN)]);
    expect(emitted).toEqual(['first-growth']);
  });

  test('a journey watched before the child arrives is not banked for later', () => {
    // Otherwise a carer setting the activity up hands the child a discovery
    // they did not make on their very first touch.
    const { emitted } = run([
      settle(0, 0, 0.5),
      settle(1, 1, 0.5),
      { type: 'tune' },
      settle(0.5, 0.5, GROWN),
    ]);
    expect(emitted).toEqual(['first-growth']);
    expect(emitted).not.toContain('different-shapes');
  });

  test('planting is itself an act, so it opens the gate', () => {
    const { emitted } = run([dab(), settle(0.5, 0.5, GROWN)]);
    expect(emitted).toEqual(['first-growth']);
  });
});

describe('first-growth', () => {
  test('is not named for a bed that never took hold', () => {
    // Painting is not growing. A dab that faded gets no sentence about growth,
    // because there is none on the screen to point at.
    const { emitted } = run([dab(0.001), settle(0.5, 0.5, 0.001)]);
    expect(emitted).toEqual([]);
  });

  test('is named once the bed is carrying pattern', () => {
    const { emitted } = run([dab(), settle(0.5, 0.5, GROWN)]);
    expect(emitted).toEqual(['first-growth']);
  });

  test('is named only once, however long the child plays', () => {
    const events = [dab()];
    for (let i = 0; i < 50; i++) events.push(settle(0.5, 0.5, 0.5));
    expect(run(events).emitted.filter((id) => id === 'first-growth')).toHaveLength(1);
  });
});

describe('grows-on-its-own', () => {
  test('needs the bed to have gained ground since the last planting', () => {
    const { emitted } = run([
      dab(0.07),
      settle(0.5, 0.5, 0.07 + SPREAD_SINCE_PLANT + 0.01),
    ]);
    expect(emitted).toContain('grows-on-its-own');
  });

  test('is not named when the bed has barely moved since the child let go', () => {
    // "It kept growing by itself" said over a bed that did nothing is a lie a
    // child can check, and they will.
    const { emitted } = run([dab(0.07), settle(0.5, 0.5, 0.08)]);
    expect(emitted).toEqual(['first-growth']);
  });

  test('is not named for growth the child painted in themselves', () => {
    // Each planting resets the baseline, so a child who keeps painting is
    // never told the bed did it on its own.
    const events = [];
    let cover = 0.07;
    for (let i = 0; i < 20; i++) {
      cover += 0.04;
      events.push(dab(cover));
      events.push(settle(0.5, 0.5, cover));
    }
    expect(run(events).emitted).not.toContain('grows-on-its-own');
  });

  test('a bed that shrinks back does not count as growing', () => {
    const { emitted } = run([dab(0.4), settle(0.5, 0.5, 0.2)]);
    expect(emitted).toEqual(['first-growth']);
  });
});

describe('different-shapes', () => {
  test('needs a real journey across the control, not a nudge over a boundary', () => {
    // A boundary test would fire here. This is the whole reason the reducer
    // measures distance travelled instead of comparing labels.
    const { emitted } = run([
      { type: 'tune' },
      settle(0.5 - 0.001, 0.5, GROWN),
      settle(0.5 + 0.001, 0.5, GROWN),
    ]);
    expect(emitted).not.toContain('different-shapes');
  });

  test('is named after a journey on the sideways axis', () => {
    const { emitted } = run([
      dab(),
      settle(0.05, 0.5, GROWN),
      settle(0.05 + JOURNEY, 0.5, GROWN),
    ]);
    expect(emitted).toContain('different-shapes');
  });

  test('is named after a journey on the up axis', () => {
    const { emitted } = run([
      dab(),
      settle(0.5, 0.05, GROWN),
      settle(0.5, 0.05 + JOURNEY, GROWN),
    ]);
    expect(emitted).toContain('different-shapes');
  });

  test('a wandering child gets it from the widest two places they stopped', () => {
    const { emitted } = run([
      dab(),
      settle(0.1, 0.5, GROWN),
      settle(0.2, 0.5, GROWN),
      settle(0.15, 0.5, GROWN),
      settle(0.9, 0.5, GROWN),
    ]);
    expect(emitted).toContain('different-shapes');
  });

  test('is not named over a bed with nothing growing in it', () => {
    // The claim is about shapes. With nothing on the bed there are none to
    // compare, whatever the control has been doing.
    const { emitted } = run([{ type: 'tune' }, settle(0, 0.5, 0.001), settle(1, 0.5, 0.001)]);
    expect(emitted).toEqual([]);
  });
});

describe('own-size', () => {
  test('needs both a dab and a smear', () => {
    const onlyDabs = run([dab(), dab(), settle(0.5, 0.5, GROWN)]);
    expect(onlyDabs.emitted).not.toContain('own-size');

    const onlySmears = run([smear(), smear(), settle(0.5, 0.5, GROWN)]);
    expect(onlySmears.emitted).not.toContain('own-size');
  });

  test('is named once the child has planted one of each and it has grown', () => {
    const { emitted } = run([dab(), smear(), settle(0.5, 0.5, GROWN)]);
    expect(emitted).toContain('own-size');
  });

  test('strokes between a dab and a smear count as neither', () => {
    // The gap between the two sizes is deliberate: the comparison is only
    // worth naming when the child really did make both halves of it.
    const middling = { type: 'plant', area: (DAB_AREA + SMEAR_AREA) / 2, coverage: 0.1 };
    const { emitted } = run([middling, middling, settle(0.5, 0.5, GROWN)]);
    expect(emitted).not.toContain('own-size');
  });

  test('the order the child plants them in does not matter', () => {
    const a = run([dab(), smear(), settle(0.5, 0.5, GROWN)]).emitted;
    const b = run([smear(), dab(), settle(0.5, 0.5, GROWN)]).emitted;
    expect(a).toContain('own-size');
    expect(b).toContain('own-size');
  });
});

describe('every authored discovery is reachable, and none names twice', () => {
  test('a real session reaches all four', () => {
    // Not a synthetic poke at each predicate: one plausible run of play, in
    // order, from bare soil. If any discovery cannot be reached this way it is
    // dead copy and should not be authored.
    const { emitted } = run([
      dab(0.02),
      settle(0.15, 0.2, 0.03),
      settle(0.15, 0.2, 0.12),
      smear(0.2),
      settle(0.15, 0.2, 0.3),
      { type: 'tune' },
      settle(0.85, 0.8, 0.45),
    ]);
    expect(new Set(emitted)).toEqual(new Set(PATTERN_GARDEN_DISCOVERIES));
  });

  test('nothing is named twice, however long the session runs', () => {
    const events = [dab(0.02), smear(0.2)];
    for (let i = 0; i <= 30; i++) {
      events.push(settle(i / 30, 1 - i / 30, 0.1 + i * 0.02));
    }
    const { emitted } = run(events);
    expect(new Set(emitted).size).toBe(emitted.length);
  });

  test('the reducer is pure: the state handed in is never mutated', () => {
    const before = initialDiscoveryState();
    const snapshot = JSON.stringify({ ...before, named: [...before.named] });
    stepDiscovery(before, dab());
    stepDiscovery(before, settle(0.5, 0.5, 0.5));
    expect(JSON.stringify({ ...before, named: [...before.named] })).toBe(snapshot);
  });

  test('a named set is never shared between the old state and the new one', () => {
    // Sharing it would make "named once" depend on which copy of the state a
    // caller happened to keep, and the bug would only show up in a long
    // session.
    const a = initialDiscoveryState();
    const b = stepDiscovery(a, dab()).state;
    expect(b.named).not.toBe(a.named);
  });
});

describe('the reducer and the naming registry agree', () => {
  test('every id the reducer can emit resolves to a line at every stage', () => {
    // The two files are held together here. A rename in either one fails this
    // rather than silently leaving a child with nothing named.
    for (const id of PATTERN_GARDEN_DISCOVERIES) {
      for (const stage of GLP_STAGES.map((s) => s.id)) {
        expect(
          getNamingLine('pattern-garden', id, stage),
          `pattern-garden/${id} at stage ${stage} resolves to nothing`,
        ).toBeTruthy();
      }
    }
  });

  test('the registry authors no line the reducer can never emit', () => {
    // Dead copy is the other half of the same problem: a sentence written for
    // a child that no sequence of their actions can ever produce.
    const authored = getDiscoveries('pattern-garden').map((d) => d.id);
    expect(new Set(authored)).toEqual(new Set(PATTERN_GARDEN_DISCOVERIES));
  });
});
