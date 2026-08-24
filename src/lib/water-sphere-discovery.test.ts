// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Water Sphere: when the naming line is earned.
 *
 * This is the coverage wave 1 did not have. The wave-1 suite checks that every
 * authored line RESOLVES, which catches orphaned copy and nothing else: the
 * light mixer's unreachable-branch bug and the both-activities-name-at-mount
 * bug were both live while that suite was green.
 *
 * Here the predicates are a pure reducer, so the tests drive real sequences of
 * child actions through them and assert on what comes out. Reintroduce either
 * wave-1 bug in stepDiscovery and a test in this file fails.
 *
 * Issue: #225
 */
import { describe, expect, test } from 'bun:test';
import { GLP_STAGES } from './glp';
import { getDiscoveries, getNamingLine } from './guided-naming';
import { MODES, readMode } from './water-sphere';
import {
  PETAL_SPREAD,
  WATER_SPHERE_DISCOVERIES,
  initialDiscoveryState,
  stepDiscovery,
} from './water-sphere-discovery';

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

const CENTRE = MODES.map((m) => m.exactHz);
/** A frequency squarely between two modes, where the surface properly churns. */
const between = (i) => Math.sqrt(MODES[i].exactHz * MODES[i + 1].exactHz);

describe('nothing is named before the child acts', () => {
  test('the drop opens on a locked mode, which is what makes this worth testing', () => {
    // The activity deliberately mounts already resonating, because a still,
    // alive drop is the right thing to open on. That means every frame from
    // mount looks exactly like a discovery, and only the gate stops it.
    expect(readMode(CENTRE[0]).locked).toBe(true);
  });

  test('a long run of observations at a locked mode emits nothing before any input', () => {
    const events = Array.from({ length: 200 }, () => ({ type: 'observe', hz: CENTRE[0] }));
    expect(run(events).emitted).toEqual([]);
  });

  test('observing every mode and every gap between them emits nothing before any input', () => {
    const events = [];
    for (let hz = 40; hz <= 380; hz += 1) events.push({ type: 'observe', hz });
    expect(run(events).emitted).toEqual([]);
  });

  test('the same observations after one interact do name', () => {
    // The gate is a gate, not a mute. This is the pair to the test above and
    // the reason a broken gate cannot pass by simply never emitting.
    const { emitted } = run([{ type: 'interact' }, { type: 'observe', hz: CENTRE[0] }]);
    expect(emitted).toEqual(['mode-locked']);
  });

  test('churn seen before the child acts is not banked for later', () => {
    // Otherwise a carer setting the activity up hands the child a discovery
    // they did not make.
    const { emitted } = run([
      { type: 'observe', hz: between(0) },
      { type: 'interact' },
      { type: 'observe', hz: CENTRE[0] },
    ]);
    expect(emitted).toEqual(['mode-locked']);
    expect(emitted).not.toContain('between-is-messy');
  });
});

describe('every authored discovery is reachable', () => {
  test('mode-locked: hold a shape', () => {
    const { emitted } = run([{ type: 'interact' }, { type: 'observe', hz: CENTRE[1] }]);
    expect(emitted).toContain('mode-locked');
  });

  test('poked-rings: poke the drop', () => {
    expect(run([{ type: 'poke' }]).emitted).toContain('poked-rings');
  });

  test('higher-more-petals: hold a low shape and then a high one', () => {
    const { emitted } = run([
      { type: 'interact' },
      { type: 'observe', hz: CENTRE[0] },
      { type: 'observe', hz: CENTRE[3] },
    ]);
    expect(emitted).toContain('higher-more-petals');
  });

  test('between-is-messy: feel the churn, then find a shape again', () => {
    const { emitted } = run([
      { type: 'interact' },
      { type: 'observe', hz: CENTRE[0] },
      { type: 'observe', hz: between(0) },
      { type: 'observe', hz: CENTRE[1] },
    ]);
    expect(emitted).toContain('between-is-messy');
  });

  test('one ordinary session reaches all four', () => {
    // The sequence a child actually produces: touch, sweep up through the
    // churn, land shapes, poke it. No contrived path is needed for any of them.
    const { emitted } = run([
      { type: 'interact' },
      { type: 'observe', hz: CENTRE[0] },
      { type: 'observe', hz: between(0) },
      { type: 'observe', hz: CENTRE[1] },
      { type: 'observe', hz: between(2) },
      { type: 'observe', hz: CENTRE[3] },
      { type: 'poke' },
    ]);
    expect([...emitted].sort()).toEqual([...WATER_SPHERE_DISCOVERIES].sort());
  });

  test('the reverse sweep reaches them too', () => {
    // Wave 1's cymatics bug: a discovery that required a strictly ascending
    // climb, so a child who started high and slid down never earned it.
    const { emitted } = run([
      { type: 'interact' },
      { type: 'observe', hz: CENTRE[4] },
      { type: 'observe', hz: between(1) },
      { type: 'observe', hz: CENTRE[0] },
      { type: 'poke' },
    ]);
    expect([...emitted].sort()).toEqual([...WATER_SPHERE_DISCOVERIES].sort());
  });

  test('no discovery is dead copy', () => {
    // The catalogue and the reducer cannot drift apart: anything declared here
    // must be produced by one of the sequences above.
    const reached = new Set();
    for (const path of [
      [{ type: 'poke' }],
      [
        { type: 'interact' },
        { type: 'observe', hz: CENTRE[0] },
        { type: 'observe', hz: between(0) },
        { type: 'observe', hz: CENTRE[3] },
      ],
    ]) {
      for (const id of run(path).emitted) reached.add(id);
    }
    for (const id of WATER_SPHERE_DISCOVERIES) {
      expect(reached.has(id), `${id} is never emitted by any path`).toBe(true);
    }
  });
});

describe('the predicates are independent, not a chain', () => {
  test('landing a far-apart shape names both the lock and the petals in one step', () => {
    // Wave 1's light mixer bug in its exact shape: an `else if` meant that
    // hitting the first condition made a later one unreachable forever.
    const { emitted } = run([
      { type: 'interact' },
      { type: 'observe', hz: CENTRE[0] },
      { type: 'observe', hz: CENTRE[4] },
    ]);
    expect(emitted).toEqual(['mode-locked', 'higher-more-petals']);
  });

  test('a single step can name three things at once', () => {
    const { emitted } = run([
      { type: 'poke' },
      { type: 'observe', hz: between(0) },
      { type: 'observe', hz: CENTRE[0] },
      { type: 'observe', hz: CENTRE[4] },
    ]);
    // The last observe locks, spans the petal spread, and follows churn.
    expect(emitted.slice(1)).toEqual(['mode-locked', 'between-is-messy', 'higher-more-petals']);
  });
});

describe('anti-engagement: one line per effect, ever', () => {
  test('holding the same shape all session names it once', () => {
    const events = [{ type: 'interact' }];
    for (let i = 0; i < 500; i++) events.push({ type: 'observe', hz: CENTRE[2] });
    expect(run(events).emitted).toEqual(['mode-locked']);
  });

  test('poking a hundred times names it once', () => {
    const events = Array.from({ length: 100 }, () => ({ type: 'poke' }));
    expect(run(events).emitted).toEqual(['poked-rings']);
  });

  test('a long free-play session never repeats a line', () => {
    const events = [{ type: 'interact' }];
    for (let pass = 0; pass < 12; pass++) {
      for (let hz = 40; hz <= 380; hz += 3) events.push({ type: 'observe', hz });
      events.push({ type: 'poke' });
    }
    const { emitted } = run(events);
    expect(new Set(emitted).size).toBe(emitted.length);
    expect(emitted.length).toBeLessThanOrEqual(WATER_SPHERE_DISCOVERIES.length);
  });
});

describe('the petal claim is only named once it is visible', () => {
  test('two shapes closer than the spread do not claim more petals', () => {
    const { emitted } = run([
      { type: 'interact' },
      { type: 'observe', hz: CENTRE[0] },
      { type: 'observe', hz: CENTRE[1] },
    ]);
    expect(emitted).not.toContain('higher-more-petals');
  });

  test('the spread it does need is really there in the ladder', () => {
    expect(MODES[MODES.length - 1].l - MODES[0].l).toBeGreaterThanOrEqual(PETAL_SPREAD);
  });

  test('near-miss frequencies are not banked as churn', () => {
    // Just outside a lock window is not "the water churns", it is nearly there.
    // Naming the churn off a near miss would describe something the child did
    // not see.
    const nearMiss = MODES[0].exactHz * 1.07;
    expect(readMode(nearMiss).locked).toBe(false);
    expect(readMode(nearMiss).lock).toBeGreaterThan(0.15);
    const { state } = run([{ type: 'interact' }, { type: 'observe', hz: nearMiss }]);
    expect(state.sawChurn).toBe(false);
  });
});

describe('the reducer and the naming registry cannot drift apart', () => {
  test('every id the reducer emits has an authored line at every stage', () => {
    // The join between two files that are edited at different times. A rename
    // in either one lands here rather than as silence in front of a child.
    for (const id of WATER_SPHERE_DISCOVERIES) {
      for (const stage of GLP_STAGES.map((s) => s.id)) {
        expect(
          getNamingLine('water-sphere', id, stage),
          `water-sphere/${id} at stage ${stage} has no line`,
        ).toBeTruthy();
      }
    }
  });

  test('the registry authors nothing the reducer can never emit', () => {
    const emittable = new Set(WATER_SPHERE_DISCOVERIES);
    for (const d of getDiscoveries('water-sphere')) {
      expect(emittable.has(d.id), `water-sphere/${d.id} is authored but never emitted`).toBe(true);
    }
  });
});

describe('the reducer is pure', () => {
  test('it never mutates the state handed to it', () => {
    const before = initialDiscoveryState();
    const snapshot = { ...before, named: new Set(before.named) };
    stepDiscovery(before, { type: 'poke' });
    expect(before.interacted).toBe(snapshot.interacted);
    expect(before.named.size).toBe(0);
  });

  test('the same state and event always give the same result', () => {
    const state = run([{ type: 'interact' }]).state;
    const a = stepDiscovery(state, { type: 'observe', hz: CENTRE[2] });
    const b = stepDiscovery(state, { type: 'observe', hz: CENTRE[2] });
    expect(a.emit).toEqual(b.emit);
  });
});
