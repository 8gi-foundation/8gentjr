// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Shape Ladder: when the naming line is earned.
 *
 * The predicates are a pure reducer, so these tests drive real sequences of
 * child actions through them and assert on what comes out. Reintroduce either
 * wave-1 bug - a naming line before the first touch, or an `else if` chain that
 * makes a later discovery unreachable - and a test in this file fails.
 *
 * Three guards in the reducer get a test that fails if the guard is reverted:
 * the high-water climb mark, the rule that the shadow dial only banks evidence
 * where it has authority, and the interaction gate. Each is driven with a
 * sequence chosen so that the reverted version behaves differently, rather than
 * with a sequence that happens to pass either way.
 *
 * Issue: #225 (wave 5, Shape Ladder)
 */
import { describe, expect, test } from 'bun:test';
import { GLP_STAGES } from './glp';
import { CUBE_CLIMB, FULL_CLIMB } from './dimensions';
import { getDiscoveries, getNamingLine } from './guided-naming';
import {
  DIMENSIONS_DISCOVERIES,
  SHADOW_JOURNEY,
  SWEPT,
  initialDiscoveryState,
  stepDiscovery,
} from './dimensions-discovery';

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

const climb = (c) => ({ type: 'climb', climb: c });
const shadow = (c, s) => ({ type: 'shadow', climb: c, shadow: s });
const turn = () => ({ type: 'turn' });
const settle = (c) => ({ type: 'settle', climb: c });

/** A dial position far enough past the start to count, and one at the start. */
const DIAL_FAR = SHADOW_JOURNEY + 0.2;

describe('nothing is named before the child acts', () => {
  test('a long run of looks at a finished shape emits nothing before any input', () => {
    const events = [];
    for (let i = 0; i < 300; i++) events.push(settle(FULL_CLIMB));
    expect(run(events).emitted).toEqual([]);
  });

  test('the same look after one drag does name', () => {
    // The gate is a gate, not a mute. This is the pair to the test above, and
    // the reason a broken gate cannot pass by simply never emitting anything.
    const { emitted } = run([climb(1), settle(1)]);
    expect(emitted).toEqual(['swept-a-line']);
  });

  test('a shape watched before the child arrives is not banked for later', () => {
    // Otherwise a carer setting the activity up hands the child four sentences
    // they did not earn, on their very first touch.
    const { emitted } = run([
      settle(FULL_CLIMB),
      settle(FULL_CLIMB),
      climb(1),
      settle(1),
    ]);
    expect(emitted).toEqual(['swept-a-line']);
    expect(emitted).not.toContain('same-rule-again');
  });

  test('every kind of input opens the gate, and none of them name on their own', () => {
    for (const opener of [climb(FULL_CLIMB), shadow(FULL_CLIMB, DIAL_FAR), turn()]) {
      const { emitted, state } = run([opener]);
      expect(emitted, `${opener.type} named something with no look at the shape`).toEqual([]);
      expect(state.interacted).toBe(true);
    }
  });

  test('turning the shape to look at it is real handling and names nothing on its own', () => {
    const { emitted, state } = run([turn(), turn(), turn(), settle(0)]);
    expect(state.interacted).toBe(true);
    expect(emitted).toEqual([]);
  });
});

describe('every authored line is reachable by a real child', () => {
  test('sweeping one whole direction names the line', () => {
    expect(run([climb(SWEPT), settle(SWEPT)]).emitted).toEqual(['swept-a-line']);
  });

  test('a sweep abandoned part way names nothing, because there is no line yet', () => {
    const { emitted } = run([climb(0.4), settle(0.4), climb(0.7), settle(0.7)]);
    expect(emitted).toEqual([]);
  });

  test('a second whole direction names the second line', () => {
    const { emitted } = run([climb(1), settle(1), climb(2), settle(2)]);
    expect(emitted).toEqual(['swept-a-line', 'each-drag-a-direction']);
  });

  test('turning the dial on a cube names the shadow', () => {
    const { emitted } = run([
      climb(CUBE_CLIMB),
      settle(CUBE_CLIMB),
      shadow(CUBE_CLIMB, 0),
      shadow(CUBE_CLIMB, DIAL_FAR),
      settle(CUBE_CLIMB),
    ]);
    expect(emitted).toContain('cube-shadow');
  });

  test('reaching the top names the rule', () => {
    const { emitted } = run([climb(FULL_CLIMB), settle(FULL_CLIMB)]);
    expect(emitted).toContain('same-rule-again');
  });

  test('a whole session reaches every authored line and no others', () => {
    const { emitted } = run([
      climb(0.5),
      settle(0.5),
      climb(1),
      settle(1),
      turn(),
      climb(2),
      settle(2),
      climb(CUBE_CLIMB),
      settle(CUBE_CLIMB),
      shadow(CUBE_CLIMB, 0),
      shadow(CUBE_CLIMB, DIAL_FAR),
      settle(CUBE_CLIMB),
      climb(FULL_CLIMB),
      settle(FULL_CLIMB),
      settle(FULL_CLIMB),
    ]);
    expect([...emitted].sort()).toEqual([...DIMENSIONS_DISCOVERIES].sort());
  });
});

describe('the predicates are independent statements, not a chain', () => {
  test('one climb straight to the top names all four at once', () => {
    // THE WAVE-1 BUG, AS A TEST. An `else if` chain would emit only the first
    // one that matched and leave the rest permanently unreachable for a child
    // who climbed fast. All four are separate statements, so all four land.
    const { emitted } = run([
      climb(FULL_CLIMB),
      shadow(FULL_CLIMB, 0),
      shadow(FULL_CLIMB, DIAL_FAR),
      settle(FULL_CLIMB),
    ]);
    expect([...emitted].sort()).toEqual([...DIMENSIONS_DISCOVERIES].sort());
  });

  test('a later line does not need an earlier one to have been named first', () => {
    // Reached in the opposite order to the authored one: the dial is turned on
    // a cube before the settle that would have named the first two lines.
    const { emitted } = run([
      climb(CUBE_CLIMB),
      shadow(CUBE_CLIMB, -DIAL_FAR),
      shadow(CUBE_CLIMB, 0),
      settle(CUBE_CLIMB),
    ]);
    expect(emitted).toContain('cube-shadow');
    expect(emitted).toContain('swept-a-line');
  });
});

describe('nothing is ever named twice', () => {
  test('two hundred looks at the top of the ladder produce four sentences in total', () => {
    const events = [climb(FULL_CLIMB), shadow(FULL_CLIMB, 0), shadow(FULL_CLIMB, DIAL_FAR)];
    for (let i = 0; i < 200; i++) events.push(settle(FULL_CLIMB));
    const { emitted } = run(events);
    expect(emitted.length).toBe(DIMENSIONS_DISCOVERIES.length);
    expect(new Set(emitted).size).toBe(emitted.length);
  });

  test('collapsing the shape and building it again says nothing a second time', () => {
    // Anti-engagement. A child who plays for an hour is never nagged with a
    // sentence they have already read.
    const { emitted } = run([
      climb(FULL_CLIMB),
      settle(FULL_CLIMB),
      climb(0),
      settle(0),
      climb(FULL_CLIMB),
      settle(FULL_CLIMB),
    ]);
    expect(new Set(emitted).size).toBe(emitted.length);
  });
});

describe('the high-water climb mark, and the sequence that separates it', () => {
  test('what the child already swept stays earned after they collapse it', () => {
    // THE GUARD, AND THE MUTATION IT KILLS. Reading `event.climb` in place of
    // `state.mostClimb` in the predicates passes every other test in this file
    // and fails here: the child climbs to two, collapses all the way back to a
    // point, and only then does the shape settle. The lines are about what they
    // made, and they made it.
    const { emitted } = run([climb(2), climb(1), climb(0), settle(0)]);
    expect([...emitted].sort()).toEqual(['each-drag-a-direction', 'swept-a-line']);
  });

  test('the mark rises and never falls', () => {
    const { state } = run([climb(1), climb(3), climb(0.2), settle(0.2)]);
    expect(state.mostClimb).toBe(3);
  });

  test('a broken climb number leaves the mark where it was', () => {
    const { state } = run([climb(2), climb(Number.NaN), climb(Infinity), settle(2)]);
    expect(state.mostClimb).toBe(2);
  });

  test('the settle itself raises the mark, so a look at a shape counts it', () => {
    const { emitted } = run([turn(), settle(FULL_CLIMB)]);
    expect(emitted).toContain('same-rule-again');
  });
});

describe('the dial only banks evidence where it has authority', () => {
  test('turning the dial below a cube never earns the sentence about a shadow', () => {
    // THE GUARD, AND THE MUTATION IT KILLS. Widening the corners on every
    // shadow event, rather than only where the climb is at a cube, hands the
    // sentence to a child who scrubbed a dead dial at a square and then built a
    // cube without ever touching the dial again. They would be told about an
    // effect they had never seen.
    const { emitted, state } = run([
      climb(2),
      shadow(2, -Math.PI),
      shadow(2, Math.PI),
      climb(FULL_CLIMB),
      settle(FULL_CLIMB),
    ]);
    expect(emitted).not.toContain('cube-shadow');
    expect(state.minShadow).toBeNull();
    expect(state.maxShadow).toBeNull();
  });

  test('and the same child earns it the moment they turn the dial on the cube', () => {
    // The other half. Refusing evidence must not be a permanent loss.
    let state = initialDiscoveryState();
    for (const event of [
      climb(2),
      shadow(2, -Math.PI),
      climb(FULL_CLIMB),
      settle(FULL_CLIMB),
      shadow(FULL_CLIMB, 0),
      shadow(FULL_CLIMB, DIAL_FAR),
    ]) {
      state = stepDiscovery(state, event).state;
    }
    expect(stepDiscovery(state, settle(FULL_CLIMB)).emit).toContain('cube-shadow');
  });

  test('a nudge of the dial is not a turn of it', () => {
    const { emitted } = run([
      climb(FULL_CLIMB),
      shadow(FULL_CLIMB, 0),
      shadow(FULL_CLIMB, SHADOW_JOURNEY * 0.4),
      settle(FULL_CLIMB),
    ]);
    expect(emitted).not.toContain('cube-shadow');
  });

  test('the span is the distance travelled, not the distance from the start', () => {
    // A child who turns the dial a long way one side of centre has turned it,
    // even though it never left that side.
    const { emitted } = run([
      climb(FULL_CLIMB),
      shadow(FULL_CLIMB, -2),
      shadow(FULL_CLIMB, -2 - DIAL_FAR),
      settle(FULL_CLIMB),
    ]);
    expect(emitted).toContain('cube-shadow');
  });

  test('a broken dial number is ignored rather than poisoning the corners', () => {
    const { state } = run([
      climb(FULL_CLIMB),
      shadow(FULL_CLIMB, 1),
      shadow(FULL_CLIMB, Number.NaN),
    ]);
    expect(state.minShadow).toBe(1);
    expect(state.maxShadow).toBe(1);
  });
});

describe('the reducer and the naming registry are held together', () => {
  test('every id this reducer can emit resolves to a line at every stage', () => {
    for (const id of DIMENSIONS_DISCOVERIES) {
      for (const stage of GLP_STAGES) {
        const line = getNamingLine('dimensions', id, stage.id);
        expect(line, `${id} at stage ${stage.id} resolves to nothing`).toBeTruthy();
      }
    }
  });

  test('every authored line is an id this reducer can emit', () => {
    // The other direction, so a piece of dead copy cannot survive either.
    const authored = getDiscoveries('dimensions').map((d) => d.id);
    expect([...authored].sort()).toEqual([...DIMENSIONS_DISCOVERIES].sort());
  });
});

describe('the reducer is pure', () => {
  test('it never mutates the state it was handed', () => {
    const before = initialDiscoveryState();
    const snapshot = { ...before, named: new Set(before.named) };
    stepDiscovery(before, climb(FULL_CLIMB));
    stepDiscovery(before, settle(FULL_CLIMB));
    expect(before.interacted).toBe(snapshot.interacted);
    expect(before.mostClimb).toBe(snapshot.mostClimb);
    expect(before.named.size).toBe(0);
  });

  test('the same state and event give the same answer every time', () => {
    const state = run([climb(2), settle(2)]).state;
    const a = stepDiscovery(state, settle(FULL_CLIMB));
    const b = stepDiscovery(state, settle(FULL_CLIMB));
    expect(a.emit).toEqual(b.emit);
    expect(a.state.mostClimb).toBe(b.state.mostClimb);
  });
});
