// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Fractal Grower: when the naming line is earned.
 *
 * The predicates are a pure reducer, so these tests drive real sequences of
 * child actions through them and assert on what comes out. Reintroduce either
 * wave-1 bug - a naming line before the first touch, or an `else if` chain that
 * makes a later discovery unreachable - and a test in this file fails.
 *
 * Issue: #225 (wave 3, Fractal Grower)
 */
import { describe, expect, test } from 'bun:test';
import { GLP_STAGES } from './glp';
import { PRESET_IDS } from './fractal-grower';
import { getDiscoveries, getNamingLine } from './guided-naming';
import {
  ANGLE_JOURNEY,
  BRANCH_GENERATIONS,
  FRACTAL_DISCOVERIES,
  REPEAT_GENERATIONS,
  SEEDS_FOR_NATURE,
  TRANSFORM_GENERATIONS,
  initialDiscoveryState,
  stepDiscovery,
} from './fractal-grower-discovery';

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

const grow = (generations, preset = 'tree') => ({ type: 'grow', preset, generations });
const bend = (angle, preset = 'tree') => ({ type: 'bend', preset, angle });
const stretch = (preset = 'tree') => ({ type: 'stretch', preset });
const seed = (preset) => ({ type: 'seed', preset });
const settle = (generations, preset = 'tree') => ({ type: 'settle', generations });

const DEEP = REPEAT_GENERATIONS;

describe('nothing is named before the child acts', () => {
  test('a long run of observations of a full structure emits nothing before any input', () => {
    const events = [];
    for (let i = 0; i < 300; i++) events.push(settle(9));
    expect(run(events).emitted).toEqual([]);
  });

  test('the same observation after one touch does name', () => {
    // The gate is a gate, not a mute. This is the pair to the test above, and
    // the reason a broken gate cannot pass by simply never emitting anything.
    const { emitted } = run([grow(2), settle(2)]);
    expect(emitted).toEqual(['branch']);
  });

  test('a structure watched before the child arrives is not banked for later', () => {
    // Otherwise a carer setting the activity up hands the child three
    // discoveries they did not make, on their very first touch.
    const { emitted } = run([settle(9), settle(9), grow(2), settle(2)]);
    expect(emitted).toEqual(['branch']);
    expect(emitted).not.toContain('pattern-repeats');
  });

  test('every kind of input opens the gate, and none of them name on their own', () => {
    for (const opener of [grow(9), bend(0.5), stretch(), seed('fern')]) {
      const { emitted, state } = run([opener]);
      expect(emitted, `${opener.type} named something with no look at the structure`).toEqual([]);
      expect(state.interacted).toBe(true);
    }
  });
});

describe('branch', () => {
  test('one stem is not a branch', () => {
    expect(run([grow(1), settle(1)]).emitted).toEqual([]);
  });

  test('a split names it', () => {
    expect(run([grow(BRANCH_GENERATIONS), settle(BRANCH_GENERATIONS)]).emitted).toEqual(['branch']);
  });

  test('it names once and never again, however much more the child grows', () => {
    const { emitted } = run([
      grow(2),
      settle(2),
      grow(3),
      settle(3),
      grow(2),
      settle(2),
      settle(3),
    ]);
    expect(emitted.filter((id) => id === 'branch').length).toBe(1);
  });
});

describe('pattern repeats', () => {
  test('two generations is a split, not a repeat', () => {
    // With one split there is nothing to compare the shape against. Naming the
    // repeat here would be telling the child about something not on screen.
    const { emitted } = run([grow(2), settle(2), grow(3), settle(3)]);
    expect(emitted).not.toContain('pattern-repeats');
  });

  test('four generations puts a shape and its own small copy on screen together', () => {
    const { emitted } = run([grow(REPEAT_GENERATIONS), settle(REPEAT_GENERATIONS)]);
    expect(emitted).toContain('pattern-repeats');
  });

  test('the deepest the child ever reached is what counts, not where they are now', () => {
    // A child who grows a deep structure and then pulls it back down has still
    // seen the repeat. Taking it away again would be a lie about their session.
    const { emitted } = run([grow(DEEP), grow(1), settle(1)]);
    expect(emitted).toContain('pattern-repeats');
  });
});

describe('small change, big change', () => {
  test('a nudge across the angle is not a journey', () => {
    const { emitted } = run([
      grow(TRANSFORM_GENERATIONS),
      bend(0.5),
      bend(0.5 + ANGLE_JOURNEY * 0.5),
      settle(TRANSFORM_GENERATIONS),
    ]);
    expect(emitted).not.toContain('small-change-big-change');
  });

  test('a real journey across the angle names it', () => {
    const { emitted } = run([
      grow(TRANSFORM_GENERATIONS),
      bend(0.2),
      bend(0.2 + ANGLE_JOURNEY),
      settle(TRANSFORM_GENERATIONS),
    ]);
    expect(emitted).toContain('small-change-big-change');
  });

  test('it is the distance travelled, not which side of a line the child ended on', () => {
    // A boundary test would fire for a twitch across some threshold and stay
    // silent for a long steady crawl that happened not to cross it. Both of
    // these end at the same angle and only one of them is a journey.
    const crawl = run([grow(9), bend(0.7), bend(0.72), bend(0.74), settle(9)]);
    expect(crawl.emitted).not.toContain('small-change-big-change');

    const journey = run([grow(9), bend(0.74 - ANGLE_JOURNEY), bend(0.74), settle(9)]);
    expect(journey.emitted).toContain('small-change-big-change');
  });

  test('the journey is measured in both directions', () => {
    const { emitted } = run([grow(9), bend(0.9), bend(0.9 - ANGLE_JOURNEY), settle(9)]);
    expect(emitted).toContain('small-change-big-change');
  });

  test('a whole structure is needed, not two sticks', () => {
    // At two generations the angle moves one pair of branches, so "everything
    // changed" would be describing something the child cannot see yet.
    const { emitted } = run([grow(2), bend(0.1), bend(0.1 + ANGLE_JOURNEY), settle(2)]);
    expect(emitted).not.toContain('small-change-big-change');
  });
});

describe('same rule, different nature', () => {
  test('one seed is not a comparison', () => {
    const { emitted } = run([grow(9), bend(0.4), stretch(), settle(9)]);
    expect(emitted).not.toContain('same-rule-different-nature');
  });

  test('growing on one seed and then another is', () => {
    const { emitted } = run([grow(9, 'tree'), seed('fern'), grow(9, 'fern'), settle(9)]);
    expect(emitted).toContain('same-rule-different-nature');
  });

  test('a tap alone counts, because tapping regrows the structure in front of them', () => {
    const { emitted } = run([grow(9, 'tree'), seed('lightning'), settle(9)]);
    expect(emitted).toContain('same-rule-different-nature');
  });

  test('tapping the same seed twice is still one seed', () => {
    const { emitted } = run([grow(9, 'tree'), seed('tree'), seed('tree'), settle(9)]);
    expect(emitted).not.toContain('same-rule-different-nature');
  });

  test('the seeds are counted from where the child was working', () => {
    const { state } = run([grow(9, 'river'), bend(0.3, 'river'), stretch('river')]);
    expect([...state.seedsTried]).toEqual(['river']);
    expect(state.seedsTried.size).toBeLessThan(SEEDS_FOR_NATURE);
  });

  test('every seed in the product can be one half of the comparison', () => {
    for (const preset of PRESET_IDS) {
      if (preset === 'tree') continue;
      const { emitted } = run([grow(9, 'tree'), seed(preset), grow(9, preset), settle(9)]);
      expect(emitted, `${preset} could not complete the comparison`).toContain(
        'same-rule-different-nature',
      );
    }
  });
});

describe('every discovery is reachable, and none of them is unreachable', () => {
  test('a full session finds all four, in the order a pair of hands finds them', () => {
    const { emitted } = run([
      grow(2, 'tree'),
      settle(2, 'tree'),
      grow(REPEAT_GENERATIONS, 'tree'),
      settle(REPEAT_GENERATIONS, 'tree'),
      bend(0.2, 'tree'),
      bend(0.2 + ANGLE_JOURNEY, 'tree'),
      settle(REPEAT_GENERATIONS, 'tree'),
      seed('fern'),
      grow(5, 'fern'),
      settle(5, 'fern'),
    ]);
    expect(emitted).toEqual([
      'branch',
      'pattern-repeats',
      'small-change-big-change',
      'same-rule-different-nature',
    ]);
  });

  test('a child who does everything at once still gets each line exactly once', () => {
    // The reducer may emit several in one step. That is the component's problem
    // to queue, and it is this file's job not to repeat any of them.
    const { emitted } = run([
      grow(9, 'tree'),
      bend(0.1, 'tree'),
      bend(1.1, 'tree'),
      seed('river'),
      grow(5, 'river'),
      settle(9),
      settle(9),
      settle(9),
    ]);
    expect(emitted.length).toBe(FRACTAL_DISCOVERIES.length);
    expect(new Set(emitted).size).toBe(FRACTAL_DISCOVERIES.length);
  });

  test('no discovery is recorded twice across a long session', () => {
    const events = [];
    for (let i = 0; i < 200; i++) {
      events.push(grow(9, 'tree'), bend((i % 10) / 8, 'tree'), seed('fern'), settle(9));
    }
    const { emitted } = run(events);
    expect(new Set(emitted).size).toBe(emitted.length);
  });
});

describe('the reducer is pure', () => {
  test('it does not mutate the state it was handed', () => {
    const before = initialDiscoveryState();
    const frozenNamed = before.named;
    const frozenSeeds = before.seedsTried;
    stepDiscovery(before, grow(9));
    stepDiscovery(before, seed('fern'));
    expect(before.interacted).toBe(false);
    expect(before.deepest).toBe(0);
    expect(frozenNamed.size).toBe(0);
    expect(frozenSeeds.size).toBe(0);
  });

  test('the same state and event give the same result every time', () => {
    const state = run([grow(3), bend(0.4)]).state;
    const a = stepDiscovery(state, settle(9));
    const b = stepDiscovery(state, settle(9));
    expect(a.emit).toEqual(b.emit);
    expect([...a.state.named]).toEqual([...b.state.named]);
  });
});

describe('the reducer and the naming registry agree', () => {
  test('every id this reducer can emit resolves to a line at every stage', () => {
    for (const id of FRACTAL_DISCOVERIES) {
      for (const stage of GLP_STAGES.map((s) => s.id)) {
        const line = getNamingLine('fractal', id, stage);
        expect(line, `fractal/${id} at stage ${stage} resolves to nothing`).toBeTruthy();
      }
    }
  });

  test('every line authored for this activity is one this reducer can emit', () => {
    // The other direction, which is what catches dead copy: a sentence written
    // for an effect nothing records is a sentence no child will ever be shown.
    const authored = getDiscoveries('fractal').map((d) => d.id);
    expect(authored.sort()).toEqual([...FRACTAL_DISCOVERIES].sort());
  });
});
