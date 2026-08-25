/**
 * Fractal Grower: when the naming line is earned, as a pure reducer.
 *
 * WHY THIS IS NOT INSIDE THE COMPONENT
 *
 * Wave 1 decided this inline in canvas components and shipped two bugs no test
 * could see: an unreachable branch that made one discovery impossible, and two
 * activities that recorded an effect from their opening frame, so a naming line
 * was on screen before the child had touched anything. Water Sphere answered
 * that by moving its predicates out here and Pattern Garden followed. This file
 * follows both, for the same reasons and with the same three properties made
 * mechanical:
 *
 *   1. NOTHING NAMES BEFORE THE CHILD ACTS. A bare seed on the ground looks
 *      safe, and it is not: a carer setting the activity up, or the component
 *      raising its first look at the structure, would otherwise bank
 *      observations the child never made.
 *
 *   2. EVERY AUTHORED DISCOVERY IS REACHABLE. The suite finds a real sequence
 *      of child actions for each one.
 *
 *   3. NOTHING NAMES TWICE. Anti-engagement: one line per effect, ever.
 *
 * WHAT EACH LINE ACTUALLY CLAIMS
 *
 * All four are claims about the structure the child has just made, and each is
 * gated on the evidence for that specific claim:
 *
 *   - `branch` needs a split to exist. One stem is not a branch, so this waits
 *     for a second generation rather than firing on the first drag.
 *
 *   - `pattern-repeats` needs FOUR generations, not two. With two, a child has
 *     seen one split and there is nothing to compare it against. With four, a
 *     branch and that branch's own small copy of itself are both on the screen
 *     at once, which is the only state in which "the small branches copy the
 *     big ones" is a thing they can go and check rather than a thing they are
 *     told.
 *
 *   - `small-change-big-change` needs a real journey across the angle, not a
 *     nudge, and needs enough generations for the change to have visibly gone
 *     all the way down. A boundary test would fire for a twitch across some
 *     threshold and stay silent for a long steady crawl that happened not to
 *     cross it, so the measure is distance travelled.
 *
 *   - `same-rule-different-nature` needs two seeds actually tried. It is the
 *     deepest of the four and the only one comparing two things, so it must not
 *     fire until the child has made both halves of the comparison themselves.
 *
 * Issue: #225 (wave 3, Fractal Grower)
 */

import type { PresetId } from '@/lib/fractal-grower';

/** Discovery ids this game can record. Must match the guided-naming registry. */
export const FRACTAL_DISCOVERIES = [
  'branch',
  'pattern-repeats',
  'small-change-big-change',
  'same-rule-different-nature',
] as const;

export type FractalDiscoveryId = (typeof FRACTAL_DISCOVERIES)[number];

/**
 * Every child action carries the seed that was loaded when they did it.
 *
 * That is what "tried two seeds" is counted from, and it is deliberately not
 * counted from taps on the seed buttons. A child who opens the activity on the
 * tree, grows one, then taps the fern and grows that has plainly tried two, and
 * a count of taps would say one. The tap itself also counts, because tapping a
 * seed regrows the structure under their finger straight away: they saw that
 * nature, so they tried it.
 */
export type FractalEvent =
  /** The child dragged the trunk up or down. */
  | { type: 'grow'; preset: PresetId; generations: number }
  /** The child dragged the branching angle. */
  | { type: 'bend'; preset: PresetId; angle: number }
  /** The child dragged the length ratio. Real input, and it moves no angle. */
  | { type: 'stretch'; preset: PresetId }
  /** The child tapped a seed. */
  | { type: 'seed'; preset: PresetId }
  /**
   * The structure has been left alone long enough to be worth looking at.
   * Emitted by the component on a debounce, never every frame: a structure
   * watched continuously would hand a child every sentence in two seconds.
   */
  | { type: 'settle'; generations: number };

export interface FractalDiscoveryState {
  /** True once the child has actually done something. Gates every emission. */
  interacted: boolean;
  /** Effects already named. Never emitted a second time. */
  named: ReadonlySet<FractalDiscoveryId>;
  /** Deepest structure the child has grown so far, counting the trunk. */
  deepest: number;
  /** The corners of the angle control the child has actually reached. */
  minAngle: number | null;
  maxAngle: number | null;
  /** Seeds the child has actually tried, including the one they started on. */
  seedsTried: ReadonlySet<PresetId>;
}

export function initialDiscoveryState(): FractalDiscoveryState {
  return {
    interacted: false,
    named: new Set(),
    deepest: 0,
    minAngle: null,
    maxAngle: null,
    seedsTried: new Set(),
  };
}

/**
 * Generations needed before a split exists at all. Trunk plus one.
 */
export const BRANCH_GENERATIONS = 2;

/**
 * Generations needed before the repeat is a thing on the screen rather than a
 * claim. Trunk, branch, the branch's branch, and its branch: a shape and a
 * smaller copy of that same shape, both visible, at the same time.
 */
export const REPEAT_GENERATIONS = 4;

/**
 * Generations needed before an angle drag counts as having changed the WHOLE
 * structure. At two, moving the angle moves one pair of sticks.
 */
export const TRANSFORM_GENERATIONS = 3;

/**
 * How far across the angle counts as having gone somewhere, in radians.
 *
 * The angle runs from 0.06 to 1.15, so this is a third of the whole travel.
 * Small enough that ordinary play crosses it, large enough that a settled hand
 * drifting a little does not.
 */
export const ANGLE_JOURNEY = 0.36;

/** How many different seeds make the comparison the fourth line describes. */
export const SEEDS_FOR_NATURE = 2;

export interface DiscoveryStep {
  state: FractalDiscoveryState;
  /** Ids to name now, in order. Empty on most steps, which is the normal case. */
  emit: FractalDiscoveryId[];
}

/**
 * Advance the state by one event and say what, if anything, to name.
 *
 * Pure. Same state and event in, same result out, no clock and no randomness,
 * which is what makes the sequences in the test suite meaningful.
 */
export function stepDiscovery(
  state: FractalDiscoveryState,
  event: FractalEvent,
): DiscoveryStep {
  const emit: FractalDiscoveryId[] = [];
  const named = new Set(state.named);
  const seedsTried = new Set(state.seedsTried);
  let next: FractalDiscoveryState = { ...state, named, seedsTried };

  const name = (id: FractalDiscoveryId) => {
    if (named.has(id)) return;
    named.add(id);
    emit.push(id);
  };

  // Every action names the seed it happened under, and every action counts as
  // having tried it. Done once here rather than in four places, so a fifth
  // event added later cannot forget.
  if (event.type !== 'settle') seedsTried.add(event.preset);

  switch (event.type) {
    case 'grow':
      next = {
        ...next,
        interacted: true,
        deepest: Math.max(next.deepest, event.generations),
      };
      break;

    case 'bend': {
      const minAngle = next.minAngle === null ? event.angle : Math.min(next.minAngle, event.angle);
      const maxAngle = next.maxAngle === null ? event.angle : Math.max(next.maxAngle, event.angle);
      next = { ...next, interacted: true, minAngle, maxAngle };
      break;
    }

    case 'stretch':
      next = { ...next, interacted: true };
      break;

    case 'seed':
      next = { ...next, interacted: true };
      break;

    case 'settle': {
      // The gate. Frames at mount, and frames while a carer is setting the
      // activity up, describe a structure nobody has touched. Nothing is named
      // for a shape the child did not make, and nothing is banked from before
      // they arrived either.
      if (!next.interacted) break;

      const deepest = Math.max(next.deepest, event.generations);
      next = { ...next, deepest };

      const journey =
        next.minAngle === null || next.maxAngle === null ? 0 : next.maxAngle - next.minAngle;

      // Recorded independently of each other. Wave 1's bug was an `else if`
      // chain that made a later branch unreachable once an earlier one hit, so
      // these are deliberately four separate statements.
      if (deepest >= BRANCH_GENERATIONS) name('branch');

      if (deepest >= REPEAT_GENERATIONS) name('pattern-repeats');

      if (deepest >= TRANSFORM_GENERATIONS && journey >= ANGLE_JOURNEY) {
        name('small-change-big-change');
      }

      if (deepest >= BRANCH_GENERATIONS && seedsTried.size >= SEEDS_FOR_NATURE) {
        name('same-rule-different-nature');
      }
      break;
    }
  }

  return { state: next, emit };
}
