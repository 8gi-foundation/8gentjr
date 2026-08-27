/**
 * Light Bender: when the naming line is earned.
 *
 * Two failure modes shipped in wave 1 and this suite is written against both:
 * a predicate no sequence of child actions could reach, and a line that named
 * itself before the child had touched anything. Every discovery here is proved
 * reachable by driving a sequence, and the gate is proved by driving a sequence
 * that would name four things if it were missing.
 *
 * The readings fed in are taken from the REAL physics wherever a test is making
 * a claim about what a child can do, so a threshold that drifted out of the
 * reachable range would fail here rather than in front of a child.
 *
 * Issue: #225 (wave 6, Light Bender)
 */

import { describe, expect, test } from 'bun:test';
import { getDiscoveries } from '@/lib/guided-naming';
import {
  AIM_MAX,
  LEVEL_MIN,
  readTrace,
  streamShape,
  traceStream,
  traceTank,
} from '@/lib/light-bender';
import {
  BEND_SEEN,
  LIGHT_BENDER_DISCOVERIES,
  RIDE_BOUNCES,
  TIR_MARGIN,
  initialDiscoveryState,
  stepDiscovery,
  type LightBenderDiscoveryId,
  type LightBenderDiscoveryState,
  type LightBenderEvent,
  type LightBenderReading,
} from '@/lib/light-bender-discovery';

const NOTHING: LightBenderReading = { bend: 0, pastCritical: 0, bounces: 0 };

/** Run a sequence and collect everything it named, in order. */
function run(events: LightBenderEvent[]): {
  named: LightBenderDiscoveryId[];
  state: LightBenderDiscoveryState;
} {
  let state = initialDiscoveryState();
  const named: LightBenderDiscoveryId[] = [];
  for (const event of events) {
    const step = stepDiscovery(state, event);
    state = step.state;
    named.push(...step.emit);
  }
  return { named, state };
}

const handled = (r: Partial<LightBenderReading>): LightBenderEvent => ({
  type: 'handled',
  ...NOTHING,
  ...r,
});
const settle = (r: Partial<LightBenderReading> = {}): LightBenderEvent => ({
  type: 'settle',
  ...NOTHING,
  ...r,
});

/**
 * What the child would actually be looking at, measured off the real trace.
 *
 * Used by the reachability tests so that they are claims about the product
 * rather than about invented numbers.
 */
function readingFor(aim: number, level: number, open: number): LightBenderReading {
  const tank = traceTank({ aim, level, open });
  const ride = tank.slotRay
    ? traceStream({ stream: streamShape({ level, open }), entry: tank.slotRay })
    : null;
  // The SAME function the component feeds the reducer from, so a test that
  // proves a threshold reachable is proving it about the product.
  return readTrace(tank, ride);
}

// ---------------------------------------------------------------------------

describe('the gate', () => {
  test('names nothing at all before the child has touched anything', () => {
    // A carer opening the activity and leaving it sitting there. The settle
    // timer fires over and over against a scene that already shows a bending
    // beam, and none of it may be banked or named.
    const loud: Partial<LightBenderReading> = { bend: 1.2, pastCritical: 0.6, bounces: 30 };
    const { named, state } = run([settle(loud), settle(loud), settle(loud), settle(loud)]);
    expect(named).toEqual([]);
    expect(state.interacted).toBe(false);
    // And nothing was quietly remembered either, so the first real touch does
    // not immediately cash in four sentences the child never earned.
    expect(state.mostBend).toBe(0);
    expect(state.mostPastCritical).toBe(0);
    expect(state.mostBounces).toBe(0);
  });

  test('opens on the first real handling and not before', () => {
    const { state } = run([handled({})]);
    expect(state.interacted).toBe(true);
  });

  test('a settle straight after the gate opens can name what the child just made', () => {
    const { named } = run([handled({ bend: BEND_SEEN }), settle()]);
    expect(named).toEqual(['light-bends']);
  });
});

describe('every authored line is reachable', () => {
  test('light-bends, from bending the beam and stopping to look', () => {
    expect(run([handled({ bend: BEND_SEEN }), settle()]).named).toContain('light-bends');
  });

  test('trapped, from swinging past the critical angle', () => {
    expect(run([handled({ pastCritical: TIR_MARGIN }), settle()]).named).toContain('trapped');
  });

  test('follows-the-water, from getting the light into the stream', () => {
    expect(run([handled({ bounces: RIDE_BOUNCES }), settle()]).named).toContain(
      'follows-the-water',
    );
  });

  test('the-same-rule, from having been in both places', () => {
    const { named } = run([
      handled({ pastCritical: TIR_MARGIN }),
      settle(),
      handled({ bounces: RIDE_BOUNCES }),
      settle(),
    ]);
    expect(named).toContain('the-same-rule');
  });

  test('all four, in one session, and each exactly once', () => {
    const { named } = run([
      handled({ bend: BEND_SEEN }),
      settle(),
      handled({ pastCritical: TIR_MARGIN }),
      settle(),
      handled({ bounces: RIDE_BOUNCES }),
      settle(),
      settle(),
      settle(),
      handled({ bend: 1, pastCritical: 1, bounces: 40 }),
      settle(),
    ]);
    expect(named.sort()).toEqual([...LIGHT_BENDER_DISCOVERIES].sort());
    expect(new Set(named).size).toBe(named.length);
  });
});

describe('the-same-rule really does need both places', () => {
  test('a whole session of total reflection and no stream never earns it', () => {
    const { named } = run([
      handled({ bend: 1.2, pastCritical: 0.5 }),
      settle(),
      settle(),
      handled({ pastCritical: 0.6 }),
      settle(),
    ]);
    expect(named).toContain('trapped');
    expect(named).toContain('light-bends');
    expect(named).not.toContain('the-same-rule');
    expect(named).not.toContain('follows-the-water');
  });

  test('a whole session of riding the stream and never seeing the flip never earns it', () => {
    // Reachable in principle: a reading can carry bounces without the tank ever
    // having shown a total reflection, because the beam can reach the slot
    // without meeting the surface on the way.
    const { named } = run([handled({ bounces: 12 }), settle(), settle()]);
    expect(named).toContain('follows-the-water');
    expect(named).not.toContain('the-same-rule');
    expect(named).not.toContain('trapped');
  });

  test('it arrives on the settle after the second place, not before', () => {
    let state = initialDiscoveryState();
    const first = stepDiscovery(state, handled({ pastCritical: 0.4 }));
    state = first.state;
    const firstSettle = stepDiscovery(state, settle());
    state = firstSettle.state;
    expect(firstSettle.emit).toEqual(['trapped']);

    const second = stepDiscovery(state, handled({ bounces: RIDE_BOUNCES }));
    state = second.state;
    const secondSettle = stepDiscovery(state, settle());
    expect(secondSettle.emit).toEqual(['follows-the-water', 'the-same-rule']);
  });
});

describe('the marks are high-water marks, not the picture on screen', () => {
  test('a bend the child undid is still a bend they made', () => {
    // THE DISTINGUISHING SEQUENCE. Reading the current reading instead of the
    // mark passes almost everything else in this file: the only thing that
    // separates them is a child who does the thing and then stops doing it,
    // which is what every child does. The settle here carries nothing at all.
    const { named } = run([handled({ bend: 0.9 }), handled({ bend: 0 }), settle()]);
    expect(named).toEqual(['light-bends']);
  });

  test('a flip the child swung back out of is still a flip they saw', () => {
    const { named } = run([
      handled({ pastCritical: 0.5 }),
      handled({ pastCritical: 0 }),
      handled({ pastCritical: 0 }),
      settle(),
    ]);
    expect(named).toEqual(['trapped']);
  });

  test('a ride the child ended by shutting the spout is still a ride they had', () => {
    const { named } = run([handled({ bounces: 20 }), handled({ bounces: 0 }), settle()]);
    expect(named).toEqual(['follows-the-water']);
  });

  test('and the same is true of the line that needs both places at once', () => {
    // The hardest one to get right, because the two halves are banked at
    // different moments and neither is on screen by the time it names.
    const { named } = run([
      handled({ pastCritical: 0.5 }),
      handled({ pastCritical: 0, bounces: 15 }),
      handled({ pastCritical: 0, bounces: 0 }),
      settle(),
    ]);
    expect(named.sort()).toEqual(['follows-the-water', 'the-same-rule', 'trapped']);
  });

  test('the marks only ever go up', () => {
    const { state } = run([
      handled({ bend: 0.7, pastCritical: 0.3, bounces: 9 }),
      handled({ bend: 0.2, pastCritical: 0.1, bounces: 2 }),
      handled({ bend: 0.5, pastCritical: 0.9, bounces: 4 }),
    ]);
    expect(state.mostBend).toBe(0.7);
    expect(state.mostPastCritical).toBe(0.9);
    expect(state.mostBounces).toBe(9);
  });
});

describe('nothing names twice, and nothing names early', () => {
  test('a hundred settles after everything is earned emit nothing more', () => {
    const events: LightBenderEvent[] = [
      handled({ bend: 1, pastCritical: 1, bounces: 30 }),
      settle(),
    ];
    for (let i = 0; i < 100; i++) events.push(settle({ bend: 1, pastCritical: 1, bounces: 30 }));
    const { named } = run(events);
    expect(named).toHaveLength(LIGHT_BENDER_DISCOVERIES.length);
  });

  test('handling alone never names, however much of it there is', () => {
    // The settle debounce is what stops the activity handing over every
    // sentence in the first two seconds of a drag. Without it, a child sweeping
    // the torch across the whole range would collect all four lines before they
    // had looked at any of them.
    const events: LightBenderEvent[] = [];
    for (let i = 0; i <= 60; i++) {
      events.push(handled({ bend: i / 40, pastCritical: i / 60, bounces: i }));
    }
    expect(run(events).named).toEqual([]);
  });

  test('a bend one hair short of the threshold names nothing', () => {
    expect(run([handled({ bend: BEND_SEEN - 1e-9 }), settle()]).named).toEqual([]);
    expect(run([handled({ pastCritical: TIR_MARGIN - 1e-9 }), settle()]).named).toEqual([]);
    expect(run([handled({ bounces: RIDE_BOUNCES - 1 }), settle()]).named).toEqual([]);
  });
});

describe('a reading that is not a number cannot poison the marks', () => {
  test('a NaN leaves every mark where it was', () => {
    const { state } = run([
      handled({ bend: 0.6, pastCritical: 0.2, bounces: 5 }),
      handled({ bend: Number.NaN, pastCritical: Number.NaN, bounces: Number.NaN }),
    ]);
    expect(state.mostBend).toBe(0.6);
    expect(state.mostPastCritical).toBe(0.2);
    expect(state.mostBounces).toBe(5);
  });

  test('and a settle carrying one still names what was already earned', () => {
    const { named } = run([
      handled({ bend: 0.9 }),
      settle({ bend: Number.NaN, pastCritical: Number.NaN, bounces: Number.NaN }),
    ]);
    expect(named).toEqual(['light-bends']);
  });
});

describe('the reducer and the naming registry agree', () => {
  test('every id the reducer can emit has a line, and every line has an id', () => {
    const authored = getDiscoveries('light-bender').map((d) => d.id);
    expect([...LIGHT_BENDER_DISCOVERIES].sort()).toEqual([...authored].sort());
  });

  test('the reducer really can emit each of them', () => {
    // Held in both directions, so neither a rename nor a piece of dead copy can
    // survive: this is the half that catches an authored line no reducer path
    // reaches.
    const { named } = run([
      handled({ bend: 1, pastCritical: 1, bounces: 40 }),
      settle(),
    ]);
    expect(named.sort()).toEqual([...LIGHT_BENDER_DISCOVERIES].sort());
  });
});

describe('the thresholds are reachable by a child, through the real physics', () => {
  test('a swing the torch can make produces a bend past the threshold', () => {
    // Driven through traceTank, so a change to the geometry that put the
    // bending part of the swing out of reach fails here.
    let best = 0;
    for (let aim = 0; aim <= AIM_MAX; aim += 0.005) {
      best = Math.max(best, readingFor(aim, 0.35, 0).bend);
    }
    expect(best).toBeGreaterThan(BEND_SEEN);
  });

  test('a swing the torch can make goes past the critical angle by more than the margin', () => {
    let best = 0;
    for (let aim = 0; aim <= AIM_MAX; aim += 0.005) {
      best = Math.max(best, readingFor(aim, 0.35, 0).pastCritical);
    }
    expect(best).toBeGreaterThan(TIR_MARGIN);
    expect(best).toBeGreaterThan(TIR_MARGIN * 5);
  });

  test('a swing the torch can make rides the stream past the bounce threshold', () => {
    let best = 0;
    for (let aim = 0; aim <= AIM_MAX; aim += 0.002) {
      best = Math.max(best, readingFor(aim, LEVEL_MIN, 1).bounces);
    }
    expect(best).toBeGreaterThanOrEqual(RIDE_BOUNCES);
    expect(best).toBeGreaterThan(20);
  });

  test('a whole session driven through the real physics earns all four lines', () => {
    // The end to end proof, with no invented readings anywhere in it: swing the
    // torch through the bending part of its range, on past the flip, then drop
    // the water and open the spout and swing again until the stream lights up.
    const events: LightBenderEvent[] = [];
    for (let aim = 0; aim <= AIM_MAX; aim += 0.01) {
      events.push({ type: 'handled', ...readingFor(aim, 0.35, 0) });
    }
    events.push(settle());
    for (let aim = 0; aim <= AIM_MAX; aim += 0.002) {
      events.push({ type: 'handled', ...readingFor(aim, LEVEL_MIN, 1) });
    }
    events.push(settle());
    const { named } = run(events);
    expect(named.sort()).toEqual([...LIGHT_BENDER_DISCOVERIES].sort());
  });
});
