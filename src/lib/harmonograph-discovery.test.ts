// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Sound Drawing: when the naming line is earned.
 *
 * The predicates are a pure reducer, so these tests drive real sequences of
 * child actions through them and assert on what comes out. Reintroduce either
 * wave-1 bug - a naming line before the first touch, or an `else if` chain that
 * makes a later discovery unreachable - and a test in this file fails.
 *
 * The two closing lines are driven with numbers taken from the real measuring
 * functions rather than with hand-written ones, so a change to the physics that
 * broke either line would fail here as well as in `harmonograph.test.ts`.
 *
 * Issue: #225 (wave 4, Sound Drawing)
 */
import { describe, expect, test } from 'bun:test';
import { GLP_STAGES } from './glp';
import { CLOSED_GAP, INK_MAX, OPEN_GAP, nearestSimpleRatio, openness } from './harmonograph';
import { getDiscoveries, getNamingLine } from './guided-naming';
import {
  HARMONOGRAPH_DISCOVERIES,
  INK_FOR_FIGURE,
  LOOP_JOURNEY,
  OPEN_RATIO_ERROR,
  TURNS_FOR_JUDGEMENT,
  initialDiscoveryState,
  stepDiscovery,
} from './harmonograph-discovery';

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

const string = (which, ratio = 1.5) => ({ type: 'string', which, ratio });
const paper = () => ({ type: 'paper' });
const card = (ratio) => ({ type: 'card', ratio });

/**
 * A look at the machine, with the gap and the ratio error MEASURED from the
 * same functions the component reads them from. Nothing about closing is
 * hand-written in this file.
 */
const settle = (ratio, turns) => ({
  type: 'settle',
  ratio,
  turns,
  gap: openness({ ratio, phase: 0.6, balance: 1, turns }),
  ratioError: nearestSimpleRatio(ratio).error,
});

/** A ratio well away from every simple one, for the drifting line. */
const BETWEEN = 1.72;
const INK = INK_MAX;

describe('nothing is named before the child acts', () => {
  test('a long run of looks at a full drawing emits nothing before any input', () => {
    const events = [];
    for (let i = 0; i < 300; i++) events.push(settle(1.5, INK));
    expect(run(events).emitted).toEqual([]);
  });

  test('the same look after one touch does name', () => {
    // The gate is a gate, not a mute. This is the pair to the test above, and
    // the reason a broken gate cannot pass by simply never emitting anything.
    const { emitted } = run([paper(), settle(1.5, 2)]);
    expect(emitted).toEqual(['drew-a-figure']);
  });

  test('a drawing watched before the child arrives is not banked for later', () => {
    // Otherwise a carer setting the activity up hands the child four
    // discoveries they did not make, on their very first touch.
    const { emitted } = run([settle(BETWEEN, INK), settle(BETWEEN, INK), paper(), settle(1.5, 2)]);
    expect(emitted).toEqual(['drew-a-figure']);
    expect(emitted).not.toContain('never-joins');
  });

  test('every kind of input opens the gate, and none of them name on their own', () => {
    for (const opener of [string('x'), string('y'), paper(), card(2)]) {
      const { emitted, state } = run([opener]);
      expect(emitted, `${opener.type} named something with no look at the drawing`).toEqual([]);
      expect(state.interacted).toBe(true);
    }
  });
});

describe('drew a figure', () => {
  test('a touch that left no ink is not a picture', () => {
    expect(run([paper(), settle(1.5, INK_FOR_FIGURE - 0.01)]).emitted).toEqual([]);
  });

  test('ink on the paper names it', () => {
    expect(run([paper(), settle(1.5, INK_FOR_FIGURE)]).emitted).toEqual(['drew-a-figure']);
  });

  test('the most ink the child ever had is what counts, not a fresh sheet', () => {
    const { emitted } = run([paper(), settle(1.5, 3), settle(1.5, 0)]);
    expect(emitted).toEqual(['drew-a-figure']);
  });

  test('it names once and never again, however much more they draw', () => {
    const events = [paper(), settle(1.5, 2)];
    for (let i = 0; i < 40; i++) events.push(settle(1.5, 2 + i * 0.2));
    expect(run(events).emitted.filter((id) => id === 'drew-a-figure')).toHaveLength(1);
  });
});

describe('both strings', () => {
  test('one pendulum is not both', () => {
    const { emitted } = run([string('x'), settle(1.5, 4)]);
    expect(emitted).not.toContain('both-strings');
  });

  test('the same pendulum twice is still one', () => {
    const { emitted } = run([string('x'), string('x', 1.9), settle(1.5, 4)]);
    expect(emitted).not.toContain('both-strings');
  });

  test('dragging each one names it', () => {
    const { emitted } = run([string('x'), string('y', 1.9), settle(1.9, 4)]);
    expect(emitted).toContain('both-strings');
  });

  test('a ratio card moves both pendulums and deliberately does not count', () => {
    // The line says what the child's own two gestures did. A card is one tap.
    const { emitted } = run([card(2), card(1.5), settle(1.5, INK)]);
    expect(emitted).not.toContain('both-strings');
  });

  test('a card plus one real drag is still not two real drags', () => {
    const { emitted } = run([card(2), string('x', 1.5), settle(1.5, INK)]);
    expect(emitted).not.toContain('both-strings');
  });

  test('it still needs a picture to be talking about', () => {
    const { emitted } = run([string('x'), string('y', 1.9), settle(1.9, 0.2)]);
    expect(emitted).not.toContain('both-strings');
  });
});

describe('more loops', () => {
  test('a nudge across the ratio is not a journey', () => {
    const { emitted } = run([
      string('y', 1.5),
      string('y', 1.5 * (LOOP_JOURNEY - 0.05)),
      settle(1.5 * (LOOP_JOURNEY - 0.05), 6),
    ]);
    expect(emitted).not.toContain('more-loops');
  });

  test('a real journey across the ratio names it', () => {
    const { emitted } = run([
      string('y', 1),
      string('y', LOOP_JOURNEY),
      settle(LOOP_JOURNEY, 6),
    ]);
    expect(emitted).toContain('more-loops');
  });

  test('it is the span travelled, not which side of a line they ended on', () => {
    // A child who goes far and comes back has still seen the loops multiply.
    const { emitted } = run([
      string('y', 1),
      string('y', LOOP_JOURNEY + 0.4),
      string('y', 1.05),
      settle(1.05, 6),
    ]);
    expect(emitted).toContain('more-loops');
  });

  test('the journey counts in both directions', () => {
    const { emitted } = run([
      string('y', LOOP_JOURNEY),
      string('y', 1),
      settle(1, 6),
    ]);
    expect(emitted).toContain('more-loops');
  });

  test('ratio cards count towards it, because the loops really do change', () => {
    const { emitted } = run([card(1), card(2), settle(2, 6)]);
    expect(emitted).toContain('more-loops');
  });

  test('it still needs a picture to be talking about', () => {
    const { emitted } = run([string('y', 1), string('y', 3), settle(3, 0.2)]);
    expect(emitted).not.toContain('more-loops');
  });
});

describe('the line came back over itself', () => {
  test('a simple ratio with a real drawing names it', () => {
    const { emitted } = run([card(1.5), paper(), settle(1.5, INK)]);
    expect(emitted).toContain('simple-closes');
  });

  test('a short drawing is not evidence, even at an exact ratio', () => {
    // `openness` refuses to answer below two whole laps, and the reducer will
    // not turn a refusal into a claim.
    const { emitted } = run([card(1.5), settle(1.5, TURNS_FOR_JUDGEMENT - 0.5)]);
    expect(emitted).not.toContain('simple-closes');
  });

  test('a drawing long enough to judge but not long enough to trust says nothing', () => {
    const short = { type: 'settle', ratio: 1.5, turns: 3, gap: 0, ratioError: 0 };
    expect(run([paper(), short]).emitted).not.toContain('simple-closes');
  });

  test('every ratio card can earn it', () => {
    for (const ratio of [1, 2, 1.5, 4 / 3]) {
      const { emitted } = run([card(ratio), paper(), settle(ratio, INK)]);
      expect(emitted, `${ratio} could not close`).toContain('simple-closes');
    }
  });

  test('a ratio nudged off a card cannot earn it', () => {
    const { emitted } = run([card(1.5), string('y', 1.54), paper(), settle(1.54, INK)]);
    expect(emitted).not.toContain('simple-closes');
  });
});

describe('in between, it never joins up', () => {
  test('a ratio between the simple ones with a real drawing names it', () => {
    const { emitted } = run([string('y', BETWEEN), paper(), settle(BETWEEN, INK)]);
    expect(emitted).toContain('never-joins');
  });

  test('a simple ratio never earns it, however long the drawing', () => {
    const { emitted } = run([card(1.5), paper(), settle(1.5, INK)]);
    expect(emitted).not.toContain('never-joins');
  });

  test('drift alone is not enough: the ratio must really be in between', () => {
    // A wide gap can be reached from very near a simple ratio too, given
    // enough laps. The sentence names a CAUSE, so it is gated on the cause.
    const nearlySimple = 1.5 + OPEN_RATIO_ERROR * 0.6;
    const look = settle(nearlySimple, INK);
    expect(look.gap).toBeGreaterThan(OPEN_GAP);
    expect(look.ratioError).toBeLessThan(OPEN_RATIO_ERROR);
    expect(run([string('y', nearlySimple), look]).emitted).not.toContain('never-joins');
  });

  test('a short drawing is not evidence either', () => {
    const { emitted } = run([string('y', BETWEEN), settle(BETWEEN, TURNS_FOR_JUDGEMENT - 0.5)]);
    expect(emitted).not.toContain('never-joins');
  });

  test('the two closing lines cannot both be said about one drawing', () => {
    for (const ratio of [1, 1.5, BETWEEN, 0.83, 2.35]) {
      const { emitted } = run([string('y', ratio), paper(), settle(ratio, INK)]);
      const closing = emitted.filter((id) => id === 'simple-closes' || id === 'never-joins');
      expect(closing.length, `${ratio} said both`).toBeLessThanOrEqual(1);
    }
  });
});

describe('every discovery is reachable, and none of them is unreachable', () => {
  test('a full session finds all five, in the order a pair of hands finds them', () => {
    const { emitted } = run([
      // Drag one pendulum, and there is something on the paper.
      string('x', 1),
      settle(1, 2),
      // Drag the other, and it is plainly coming from both.
      string('y', 1),
      settle(1, 3),
      // Take one a long way, and the loops multiply.
      string('y', 2.6),
      settle(2.6, 5),
      // Wander off the simple numbers, and it stops joining up.
      string('y', BETWEEN),
      paper(),
      settle(BETWEEN, INK),
      // Tap a card, and it snaps back onto itself.
      card(1.5),
      paper(),
      settle(1.5, INK),
    ]);
    expect(emitted).toEqual([
      'drew-a-figure',
      'both-strings',
      'more-loops',
      'never-joins',
      'simple-closes',
    ]);
  });

  test('a child who does everything at once still gets each line exactly once', () => {
    // Five discoveries in a single look. Nothing is lost and nothing doubles.
    const { emitted } = run([
      string('x', 1),
      string('y', 1),
      string('y', BETWEEN),
      paper(),
      settle(BETWEEN, INK),
      card(1.5),
      settle(1.5, INK),
    ]);
    expect([...emitted].sort()).toEqual([...HARMONOGRAPH_DISCOVERIES].sort());
    expect(new Set(emitted).size).toBe(emitted.length);
  });

  test('no discovery is recorded twice across a long session', () => {
    const events = [string('x', 1), string('y', 1)];
    for (let i = 0; i < 120; i++) {
      const ratio = i % 2 === 0 ? 1.5 : BETWEEN;
      events.push(card(ratio), paper(), settle(ratio, INK));
    }
    const { emitted } = run(events);
    expect(new Set(emitted).size).toBe(emitted.length);
  });
});

describe('the reducer is pure', () => {
  test('it does not mutate the state it was handed', () => {
    const before = initialDiscoveryState();
    const snapshot = {
      interacted: before.interacted,
      named: new Set(before.named),
      stringsMoved: new Set(before.stringsMoved),
      mostInk: before.mostInk,
    };
    stepDiscovery(before, string('x', 2));
    stepDiscovery(before, settle(1.5, INK));
    expect(before.interacted).toBe(snapshot.interacted);
    expect([...before.named]).toEqual([...snapshot.named]);
    expect([...before.stringsMoved]).toEqual([...snapshot.stringsMoved]);
    expect(before.mostInk).toBe(snapshot.mostInk);
  });

  test('the same state and event give the same result every time', () => {
    let state = initialDiscoveryState();
    state = stepDiscovery(state, string('x', 1)).state;
    state = stepDiscovery(state, string('y', 2)).state;
    const a = stepDiscovery(state, settle(2, INK));
    const b = stepDiscovery(state, settle(2, INK));
    expect(a.emit).toEqual(b.emit);
    expect([...a.state.named]).toEqual([...b.state.named]);
  });
});

describe('the reducer and the naming registry agree', () => {
  test('every id this reducer can emit resolves to a line at every stage', () => {
    for (const id of HARMONOGRAPH_DISCOVERIES) {
      for (const stage of GLP_STAGES) {
        const line = getNamingLine('harmonograph', id, stage.id);
        expect(line, `${id} at stage ${stage.id}`).toBeTruthy();
      }
    }
  });

  test('every line authored for this activity is one this reducer can emit', () => {
    // The other direction, which is what catches dead copy: a sentence written
    // for an effect the reducer cannot produce is a sentence no child will read.
    const authored = getDiscoveries('harmonograph').map((d) => d.id);
    expect([...authored].sort()).toEqual([...HARMONOGRAPH_DISCOVERIES].sort());
  });
});
