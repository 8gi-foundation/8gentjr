/**
 * Shadow Globe: when the naming line is earned.
 *
 * Two failure modes shipped in wave 1 and this suite is written against both: a
 * predicate no sequence of child actions could reach, and a line that named
 * itself before the child had touched anything. Every discovery here is proved
 * reachable by driving a sequence, and the gate is proved by driving a sequence
 * that would name four things if it were missing.
 *
 * WHAT IS DRIVEN, AND WHAT IS NOT
 *
 * Every claim about REACHABILITY goes through the real control pipeline: a drag
 * or a key press, into `applyDrag`, into the orientation, into
 * `shadowFootprint`, into `readShadow`. Nothing in those tests hands the reducer
 * a number, and in particular nothing hands it a threshold. A test that fed
 * SHADOW_MOVED in as its own input would pass at any value of SHADOW_MOVED,
 * including values no child can reach, which is exactly the class of bug this
 * file exists to catch.
 *
 * The tests about the reducer's MECHANICS, on the other hand, do build readings
 * by hand, because their subject is the state machine and not the geometry.
 * Those use values far past every threshold and say so.
 *
 * Issue: #225 (wave 7, Shadow Globe)
 */

import { describe, expect, test } from 'bun:test';
import { getDiscoveries } from '@/lib/guided-naming';
import {
  DRAG_GAIN,
  IDENTITY,
  KEY_TRAVEL,
  LAMP_MAX,
  PATTERNS,
  anchorAtStart,
  applyDrag,
  applyKeyTurn,
  clampLampTilt,
  readShadow,
  shadowFootprint,
  type PatternId,
  type Quat,
  type TurnKey,
} from '@/lib/shadow-globe';
import {
  CIRCLES_HELD,
  POLE_HUGE,
  ROLLED_AWAY,
  ROLLED_BACK,
  SHADOW_GLOBE_DISCOVERIES,
  SHADOW_MOVED,
  initialDiscoveryState,
  stepDiscovery,
  type ShadowGlobeDiscoveryId,
  type ShadowGlobeDiscoveryState,
  type ShadowGlobeEvent,
  type ShadowGlobeReading,
} from '@/lib/shadow-globe-discovery';

const NOTHING: ShadowGlobeReading = { shift: 0, distortion: 1, magnify: 0.5, departure: 0 };

/** Run a sequence and collect everything it named, in order. */
function run(events: ShadowGlobeEvent[]): {
  named: ShadowGlobeDiscoveryId[];
  state: ShadowGlobeDiscoveryState;
} {
  let state = initialDiscoveryState();
  const named: ShadowGlobeDiscoveryId[] = [];
  for (const event of events) {
    const step = stepDiscovery(state, event);
    state = step.state;
    named.push(...step.emit);
  }
  return { named, state };
}

const handled = (r: Partial<ShadowGlobeReading>): ShadowGlobeEvent => ({
  type: 'handled',
  ...NOTHING,
  ...r,
});
const settle = (r: Partial<ShadowGlobeReading> = {}): ShadowGlobeEvent => ({
  type: 'settle',
  ...NOTHING,
  ...r,
});

/**
 * A child, with their hands on the activity.
 *
 * Holds exactly what the component holds: the pattern they picked, the
 * orientation their drags have built up, and where the lamp is. `read` is the
 * SAME call the component makes, so a sequence here is a sequence a child could
 * perform, and a threshold that drifted out of reach fails in this file rather
 * than in front of them.
 */
function child(pattern: PatternId) {
  let orient: Quat = IDENTITY;
  let lampTilt = 0;
  const start = anchorAtStart(pattern);
  const events: ShadowGlobeEvent[] = [];

  const read = (): ShadowGlobeReading =>
    readShadow({
      footprint: shadowFootprint({ pattern, orient, lampTilt }),
      anchorAtStart: start,
      orient,
    });

  const api = {
    drag(dx: number, dy: number, steps = 1) {
      for (let i = 0; i < steps; i++) {
        orient = applyDrag(orient, dx, dy);
        events.push({ type: 'handled', ...read() });
      }
      return api;
    },
    press(key: TurnKey, times = 1) {
      for (let i = 0; i < times; i++) {
        orient = applyKeyTurn(orient, key);
        events.push({ type: 'handled', ...read() });
      }
      return api;
    },
    slideLamp(to: number, steps = 8) {
      const from = lampTilt;
      for (let i = 1; i <= steps; i++) {
        lampTilt = clampLampTilt(from + ((to - from) * i) / steps);
        events.push({ type: 'handled', ...read() });
      }
      return api;
    },
    pause() {
      events.push({ type: 'settle', ...read() });
      return api;
    },
    read,
    events: () => events,
    named: () => run(events).named,
  };
  return api;
}

// ---------------------------------------------------------------------------

describe('the gate', () => {
  test('names nothing at all before the child has touched anything', () => {
    // A carer opening the activity and leaving it sitting there. The settle
    // timer fires over and over against a scene that already shows a shadow,
    // and none of it may be banked or named. The readings are deliberately far
    // past every threshold, because the claim is about the gate and not about
    // the numbers.
    const loud: Partial<ShadowGlobeReading> = {
      shift: 3,
      distortion: 90,
      magnify: 400,
      departure: 0,
    };
    const { named, state } = run([settle(loud), settle(loud), settle(loud), settle(loud)]);
    expect(named).toEqual([]);
    expect(state.interacted).toBe(false);
    // And nothing was quietly remembered either, so the first real touch does
    // not immediately cash in three sentences the child never earned.
    expect(state.mostShift).toBe(0);
    expect(state.mostDistortion).toBe(0);
    expect(state.mostMagnify).toBe(0);
    expect(state.mostDeparture).toBe(0);
  });

  test('a settled globe nobody has rolled cannot earn the line about rolling it back', () => {
    // The nastiest version of the gate failure, because this line's predicate
    // reads a CURRENT value and an untouched globe is at departure zero, which
    // is inside the return threshold. Without the mark it would name at once.
    const { named } = run([settle({ departure: 0 }), settle({ departure: 0 })]);
    expect(named).toEqual([]);
  });

  test('opens on the first real handling and not before', () => {
    expect(run([handled({})]).state.interacted).toBe(true);
  });

  test('the opening scene of every pattern is clear of every threshold', () => {
    // The other half of the gate, and the one a pattern edit breaks. Even with
    // the gate open, the picture a child is looking at on their first frame
    // must not already satisfy a predicate, or their first nudge hands them
    // three sentences at once.
    for (const id of PATTERNS) {
      const opening = child(id).read();
      expect(opening.shift, `${id} opens at shift ${opening.shift}`).toBe(0);
      expect(opening.departure).toBe(0);
      // A factor of two of daylight on each, measured rather than assumed.
      expect(
        opening.distortion,
        `${id} opens at distortion ${opening.distortion.toFixed(2)}`,
      ).toBeLessThan(CIRCLES_HELD / 2);
      expect(
        opening.magnify,
        `${id} opens at magnify ${opening.magnify.toFixed(2)}`,
      ).toBeLessThan(POLE_HUGE / 2);
    }
  });
});

// ---------------------------------------------------------------------------

describe('every authored line is reachable, by a real hand', () => {
  test('a-shadow, from a small deliberate roll', () => {
    for (const id of PATTERNS) {
      const it = child(id).press('down', 3).pause();
      expect(it.named(), `${id}`).toContain('a-shadow');
    }
  });

  test('a-shadow, from a sideways spin that lifts nothing at all', () => {
    // The other gesture. A drag across the screen turns the globe about the
    // lamp's own axis, so nothing is magnified and nothing is stretched, and
    // the shadow still visibly travels round the floor. A child who only ever
    // swipes sideways is not left with a silent activity.
    for (const id of PATTERNS) {
      const it = child(id).press('right', 6).pause();
      expect(it.named(), `${id}`).toEqual(['a-shadow']);
    }
  });

  test('circles-stay-circles, from rolling the pattern up over the top', () => {
    for (const id of PATTERNS) {
      const it = child(id).press('down', 10).pause();
      expect(it.named(), `${id}`).toContain('circles-stay-circles');
    }
  });

  test('grows-huge, from bringing a ring near the lamp', () => {
    for (const id of PATTERNS) {
      const it = child(id).press('down', 8).pause();
      expect(it.named(), `${id}`).toContain('grows-huge');
    }
  });

  test('roll-it-back, from going a long way and coming home', () => {
    for (const id of PATTERNS) {
      const it = child(id).press('down', 13).pause().press('up', 13).pause();
      expect(it.named(), `${id}`).toContain('roll-it-back');
    }
  });

  test('all four, in one session, and each exactly once', () => {
    for (const id of PATTERNS) {
      const it = child(id)
        .press('down', 4)
        .pause()
        .press('down', 9)
        .pause()
        .press('up', 13)
        .pause()
        .pause()
        .pause();
      const named = it.named();
      expect([...named].sort(), `${id}`).toEqual([...SHADOW_GLOBE_DISCOVERIES].sort());
      expect(new Set(named).size).toBe(named.length);
    }
  });

  test('and by finger drags rather than keys, which is how a child will actually do it', () => {
    // The keyboard path and the pointer path go through the same `applyDrag`,
    // but the travel per step is different and this is the one a child uses. A
    // sweep down the screen, a pause, and a sweep back up.
    for (const id of PATTERNS) {
      const it = child(id)
        .drag(0, 0.12, 12)
        .pause()
        .drag(0, -0.12, 12)
        .pause();
      expect([...it.named()].sort(), `${id}`).toEqual([...SHADOW_GLOBE_DISCOVERIES].sort());
    }
  });
});

// ---------------------------------------------------------------------------

describe('the keyboard reaches everything the finger does', () => {
  test('every discovery, for every pattern, from arrow keys alone', () => {
    // Issue #236's lesson, as a lattice. A keyboard control that can only reach
    // half the activity is a keyboard control that does not exist, and it is
    // not something anybody notices by hand because nobody drives an activity
    // like this with a keyboard except the child who has to.
    for (const id of PATTERNS) {
      for (const target of SHADOW_GLOBE_DISCOVERIES) {
        const it = child(id)
          .press('down', 13)
          .pause()
          .press('up', 13)
          .pause();
        expect(it.named(), `${id} cannot reach ${target} from the keys`).toContain(target);
      }
    }
  });

  test('how many presses each line actually costs, so a drifted constant shows up here', () => {
    // Not a claim that the numbers are right: a claim that they are in the
    // range a child will actually travel. A line that took forty presses is
    // unreachable in practice and a line that took one is not a discovery.
    const costs: Record<string, number> = {};
    for (const id of PATTERNS) {
      for (const key of ['shift', 'distortion', 'magnify', 'departure'] as const) {
        const it = child(id);
        let presses = -1;
        for (let i = 1; i <= 40; i++) {
          it.press('down');
          const r = it.read();
          const value =
            key === 'shift'
              ? r.shift
              : key === 'distortion'
                ? r.distortion
                : key === 'magnify'
                  ? r.magnify
                  : r.departure;
          const threshold =
            key === 'shift'
              ? SHADOW_MOVED
              : key === 'distortion'
                ? CIRCLES_HELD
                : key === 'magnify'
                  ? POLE_HUGE
                  : ROLLED_AWAY;
          if (value >= threshold) {
            presses = i;
            break;
          }
        }
        costs[`${id}/${key}`] = presses;
        expect(presses, `${id}/${key} was never reached in forty presses`).toBeGreaterThan(0);
        expect(presses, `${id}/${key} arrived on press ${presses}`).toBeLessThanOrEqual(15);
      }
    }
    // The first line is the cheapest for every pattern, which is what makes it
    // the first line: nothing else can arrive before a child has been told the
    // shadow moves.
    for (const id of PATTERNS) {
      expect(costs[`${id}/shift`]).toBeLessThan(costs[`${id}/distortion`]);
      expect(costs[`${id}/shift`]).toBeLessThan(costs[`${id}/magnify`]);
      expect(costs[`${id}/shift`]).toBeLessThan(costs[`${id}/departure`]);
    }
  });

  test('one press is not enough for anything, and two is not enough for the first line', () => {
    // The other end of the same guard. A threshold that drifted DOWN would make
    // the opening touch name something, which is the wave-1 defect wearing a
    // different hat.
    for (const id of PATTERNS) {
      expect(child(id).press('down').pause().named(), `${id}`).toEqual([]);
      expect(child(id).press('down', 2).pause().named(), `${id}`).toEqual([]);
      expect(child(id).press('right').pause().named(), `${id}`).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------

describe('the lamp on its own', () => {
  test('sliding the lamp all the way moves the shadow enough to earn the first line', () => {
    // True for every pattern, and driven through the lamp control rather than
    // through the globe, so a child who finds the lamp before the globe gets
    // somewhere.
    for (const id of PATTERNS) {
      const it = child(id).slideLamp(LAMP_MAX, 14).pause();
      expect(it.named(), `${id}`).toContain('a-shadow');
    }
  });

  test('and it never on its own reaches the other three, which is measured rather than glossed', () => {
    // SCOPE, stated because the tempting sentence would be "the lamp alone
    // reaches every line". It does not, and it is not meant to. The lamp's
    // travel is bounded by what keeps the floor reading as a floor, and over
    // that travel it swings the picture out and stretches it without ever
    // bringing a ring close enough to the light to blow it up. The globe is
    // what does that.
    const best: Record<string, { shift: number; distortion: number; magnify: number }> = {};
    for (const id of PATTERNS) {
      const it = child(id);
      const b = { shift: 0, distortion: 0, magnify: 0 };
      for (let i = 1; i <= 24; i++) {
        it.slideLamp((i / 24) * LAMP_MAX, 1);
        const r = it.read();
        b.shift = Math.max(b.shift, r.shift);
        b.distortion = Math.max(b.distortion, r.distortion);
        b.magnify = Math.max(b.magnify, r.magnify);
      }
      best[id] = b;
      expect(b.shift, `${id} shift tops out at ${b.shift.toFixed(2)}`).toBeGreaterThan(SHADOW_MOVED);
      expect(
        b.magnify,
        `${id} magnify tops out at ${b.magnify.toFixed(2)}`,
      ).toBeLessThan(POLE_HUGE);
      expect(
        b.distortion,
        `${id} distortion tops out at ${b.distortion.toFixed(2)}`,
      ).toBeLessThan(CIRCLES_HELD);
      // And it is not doing nothing either: the picture is meaningfully
      // stretched by the end of the lamp's travel, so this is a bound on a
      // control that works rather than on one that is inert.
      expect(b.distortion).toBeGreaterThan(1.75);
      expect(b.magnify).toBeGreaterThan(1.25);
      // At least a tenth again as stretched as it opened. Star and Face are the
      // weakest of the three at 1.17 times each, because both are laid out
      // evenly round their own middle and the lamp coming over one side
      // therefore changes less about them than it does about Beetle, which is
      // long and lies across the lamp's meridian; Beetle manages 1.60.
      expect(b.distortion / child(id).read().distortion).toBeGreaterThan(1.12);
    }
    // Whole sessions of lamp only, for every pattern, earn exactly one line.
    for (const id of PATTERNS) {
      const it = child(id).slideLamp(LAMP_MAX, 24).pause().pause();
      expect(it.named(), `${id}`).toEqual(['a-shadow']);
    }
  });

  test('the lamp is not the globe: sliding it out and back earns nothing about rolling back', () => {
    // The scope of `departure`, as a test. The lamp has a home position and a
    // button that returns it, and a sentence about nothing being lost should be
    // earned by hand rather than by a button.
    for (const id of PATTERNS) {
      const it = child(id).slideLamp(LAMP_MAX, 12).pause().slideLamp(0, 12).pause();
      expect(it.named(), `${id}`).not.toContain('roll-it-back');
    }
  });
});

// ---------------------------------------------------------------------------

describe('roll-it-back needs BOTH halves, and each half alone is driven and killed', () => {
  test('a child who never went anywhere never earns it, however long they fiddle', () => {
    // Kills the version built from the current value alone. That version names
    // on the first settle of every session, because a globe that has not been
    // rolled is by definition at its starting orientation.
    for (const id of PATTERNS) {
      // A real fiddle: six presses out and six back, four times over, which
      // moves the shadow right round the floor and never gets further than
      // sixty degrees from home.
      const it = child(id);
      for (let i = 0; i < 4; i++) it.press('right', 6).pause().press('left', 6).pause();
      expect(it.read().departure).toBeLessThan(ROLLED_AWAY);
      expect(it.named(), `${id}`).not.toContain('roll-it-back');
      // And they did earn the ones they were entitled to, so this is not a
      // reducer that has simply stopped working.
      expect(it.named()).toContain('a-shadow');
    }
  });

  test('a child who went and stayed never earns it either', () => {
    // Kills the version built from the high-water mark alone. That version
    // names the moment the child gets far away, which is the opposite of what
    // the sentence says.
    for (const id of PATTERNS) {
      const it = child(id).press('down', 14).pause().pause().pause();
      const named = it.named();
      expect(named, `${id}`).not.toContain('roll-it-back');
      expect(named).toContain('grows-huge');
    }
  });

  test('it arrives on the settle after they are back, and not on the way out', () => {
    const it = child('star');
    it.press('down', 13);
    let state = initialDiscoveryState();
    const emitted: ShadowGlobeDiscoveryId[][] = [];
    for (const event of [...it.events(), { type: 'settle' as const, ...it.read() }]) {
      const step = stepDiscovery(state, event);
      state = step.state;
      if (event.type === 'settle') emitted.push(step.emit);
    }
    expect(emitted[0]).not.toContain('roll-it-back');
    expect(state.mostDeparture).toBeGreaterThanOrEqual(ROLLED_AWAY);

    it.press('up', 13);
    const back = stepDiscovery(state, { type: 'settle', ...it.read() });
    expect(back.emit).toEqual(['roll-it-back']);
  });

  test('coming back part of the way is not coming back', () => {
    // Six presses back out of thirteen leaves them a long way from home, and
    // the picture in front of them is not the picture they started with.
    for (const id of PATTERNS) {
      const it = child(id).press('down', 13).pause().press('up', 6).pause();
      expect(it.read().departure).toBeGreaterThan(ROLLED_BACK);
      expect(it.named(), `${id}`).not.toContain('roll-it-back');
    }
  });

  test('going out and back twice still names it exactly once', () => {
    const it = child('face')
      .press('down', 13)
      .pause()
      .press('up', 13)
      .pause()
      .press('down', 13)
      .pause()
      .press('up', 13)
      .pause();
    expect(it.named().filter((n) => n === 'roll-it-back')).toHaveLength(1);
  });

  test('the long way round counts as coming back, because it is the same picture', () => {
    // A child who keeps rolling in one direction all the way round arrives at
    // the orientation they started from. The shadow is identical, so the line
    // is earned; anything else would be a claim about the quaternion rather
    // than about what is on the floor.
    const presses = Math.round((2 * Math.PI) / (KEY_TRAVEL * DRAG_GAIN));
    const it = child('beetle').press('down', presses).pause();
    // A whole turn does not land on a whole number of presses, so this lands
    // three degrees short of home, which is well inside the return threshold
    // and is exactly the situation a child rolling steadily arrives at.
    expect(it.read().departure).toBeGreaterThan(0);
    expect(it.read().departure).toBeLessThan(ROLLED_BACK);
    expect(it.named()).toContain('roll-it-back');
  });
});

// ---------------------------------------------------------------------------

describe('the marks are high-water marks, not the picture on screen', () => {
  test('a shadow the child brought home is still a shadow they moved', () => {
    // THE DISTINGUISHING SEQUENCE for the first three lines. Reading the
    // current reading instead of the mark passes almost everything else in this
    // file: the only thing that separates them is a child who does the thing
    // and then stops doing it, which is what every child does. The settle here
    // happens with the globe back where it started, so the picture carries
    // nothing at all.
    for (const id of PATTERNS) {
      const it = child(id).press('down', 13).press('up', 13).pause();
      const r = it.read();
      expect(r.shift).toBeLessThan(SHADOW_MOVED);
      expect(r.distortion).toBeLessThan(CIRCLES_HELD);
      expect(r.magnify).toBeLessThan(POLE_HUGE);
      expect([...it.named()].sort(), `${id}`).toEqual([...SHADOW_GLOBE_DISCOVERIES].sort());
    }
  });

  test('the marks only ever go up', () => {
    // Values far past every threshold, because the subject is the accumulator.
    const { state } = run([
      handled({ shift: 2.4, distortion: 40, magnify: 90, departure: 2.9 }),
      handled({ shift: 0.1, distortion: 1.1, magnify: 0.6, departure: 0.2 }),
      handled({ shift: 1.2, distortion: 70, magnify: 12, departure: 1.4 }),
    ]);
    expect(state.mostShift).toBe(2.4);
    expect(state.mostDistortion).toBe(70);
    expect(state.mostMagnify).toBe(90);
    expect(state.mostDeparture).toBe(2.9);
  });
});

// ---------------------------------------------------------------------------

describe('nothing names twice, and nothing names early', () => {
  test('a hundred settles after everything is earned emit nothing more', () => {
    const it = child('star').press('down', 13).pause().press('up', 13);
    const events = [...it.events()];
    for (let i = 0; i < 100; i++) events.push({ type: 'settle', ...it.read() });
    expect(run(events).named).toHaveLength(SHADOW_GLOBE_DISCOVERIES.length);
  });

  test('handling alone never names, however much of it there is', () => {
    // The settle debounce is what stops the activity handing over every
    // sentence in the first two seconds of a drag. Without it, a child sweeping
    // the globe right over would collect all four lines before they had looked
    // at any of them.
    for (const id of PATTERNS) {
      const it = child(id).press('down', 20).press('up', 20).press('right', 20);
      expect(run(it.events()).named, `${id}`).toEqual([]);
    }
  });

  test('a reading one hair short of a threshold names nothing', () => {
    // Values built by stepping back from the constants rather than by feeding
    // them in, so this measures the boundary rather than restating it.
    expect(run([handled({ shift: SHADOW_MOVED - 1e-9 }), settle()]).named).toEqual([]);
    expect(run([handled({ distortion: CIRCLES_HELD - 1e-9 }), settle()]).named).toEqual([]);
    expect(run([handled({ magnify: POLE_HUGE - 1e-9 }), settle()]).named).toEqual([]);
    expect(
      run([
        handled({ departure: ROLLED_AWAY - 1e-9 }),
        settle({ departure: 0 }),
      ]).named,
    ).toEqual([]);
    expect(
      run([
        handled({ departure: ROLLED_AWAY + 1 }),
        settle({ departure: ROLLED_BACK + 1e-9 }),
      ]).named,
    ).toEqual([]);
  });

  test('and one hair over names exactly the one thing', () => {
    expect(run([handled({ shift: SHADOW_MOVED }), settle()]).named).toEqual(['a-shadow']);
    expect(run([handled({ distortion: CIRCLES_HELD }), settle()]).named).toEqual([
      'circles-stay-circles',
    ]);
    expect(run([handled({ magnify: POLE_HUGE }), settle()]).named).toEqual(['grows-huge']);
    expect(
      run([handled({ departure: ROLLED_AWAY }), settle({ departure: ROLLED_BACK })]).named,
    ).toEqual(['roll-it-back']);
  });

  test('the four predicates are independent, so none can shadow another', () => {
    // Wave 1's bug was an `else if` chain that made a later branch unreachable
    // once an earlier one hit. Everything at once, all four out.
    const { named } = run([
      handled({ shift: 3, distortion: 90, magnify: 400, departure: 3 }),
      settle({ departure: 0 }),
    ]);
    expect([...named].sort()).toEqual([...SHADOW_GLOBE_DISCOVERIES].sort());
  });
});

// ---------------------------------------------------------------------------

describe('a reading that is not a number cannot poison the marks', () => {
  test('a NaN leaves every mark where it was', () => {
    const { state } = run([
      handled({ shift: 0.6, distortion: 6, magnify: 5, departure: 2.4 }),
      handled({
        shift: Number.NaN,
        distortion: Number.NaN,
        magnify: Number.NaN,
        departure: Number.NaN,
      }),
    ]);
    expect(state.mostShift).toBe(0.6);
    expect(state.mostDistortion).toBe(6);
    expect(state.mostMagnify).toBe(5);
    expect(state.mostDeparture).toBe(2.4);
  });

  test('and a settle carrying one still names what was already earned', () => {
    const { named } = run([
      handled({ shift: 0.9 }),
      settle({
        shift: Number.NaN,
        distortion: Number.NaN,
        magnify: Number.NaN,
        departure: Number.NaN,
      }),
    ]);
    expect(named).toEqual(['a-shadow']);
  });

  test('a NaN departure on a settle does not read as being back home', () => {
    // The comparison is `<=`, and NaN fails every comparison, so a poisoned
    // settle declines rather than naming. Written down because the natural
    // reading of the code is that it might.
    const { named } = run([
      handled({ departure: 3 }),
      settle({ departure: Number.NaN }),
    ]);
    expect(named).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('the reducer and the naming registry agree', () => {
  test('every id the reducer can emit has a line, and every line has an id', () => {
    const authored = getDiscoveries('shadow-globe').map((d) => d.id);
    expect([...SHADOW_GLOBE_DISCOVERIES].sort()).toEqual([...authored].sort());
  });

  test('the reducer really can emit each of them', () => {
    // Held in both directions, so neither a rename nor a piece of dead copy can
    // survive: this is the half that catches an authored line no reducer path
    // reaches.
    const { named } = run([
      handled({ shift: 3, distortion: 90, magnify: 400, departure: 3 }),
      settle({ departure: 0 }),
    ]);
    expect([...named].sort()).toEqual([...SHADOW_GLOBE_DISCOVERIES].sort());
  });

  test('and a real session reaches every one of them without a single invented number', () => {
    // The end to end proof. Drags only, from the opening state, through the
    // real geometry, for every pattern.
    for (const id of PATTERNS) {
      const it = child(id).drag(0, 0.15, 10).pause().drag(0, -0.15, 10).pause();
      expect([...it.named()].sort(), `${id}`).toEqual([...SHADOW_GLOBE_DISCOVERIES].sort());
    }
  });
});
