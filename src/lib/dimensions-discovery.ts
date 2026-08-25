/**
 * Shape Ladder: when the naming line is earned, as a pure reducer.
 *
 * WHY THIS IS NOT INSIDE THE COMPONENT
 *
 * Wave 1 decided this inline in canvas components and shipped two bugs no test
 * could see: an unreachable branch that made one discovery impossible, and two
 * activities that recorded an effect from their opening frame, so a naming line
 * was on screen before the child had touched anything. Water Sphere answered
 * that by moving its predicates out here, and Pattern Garden, Fractal Grower and
 * Sound Drawing followed. This file follows all four, for the same reasons and
 * with the same three properties made mechanical:
 *
 *   1. NOTHING NAMES BEFORE THE CHILD ACTS. A shape standing still on a dark
 *      screen looks safe, and it is not: a carer setting the activity up, or the
 *      component taking its first look at the figure, would otherwise bank
 *      observations the child never made.
 *
 *   2. EVERY AUTHORED DISCOVERY IS REACHABLE. The suite finds a real sequence of
 *      child actions for each one.
 *
 *   3. NOTHING NAMES TWICE. Anti-engagement: one line per effect, ever.
 *
 * WHAT EACH LINE ACTUALLY CLAIMS
 *
 * All four are claims about the shape the child has just pulled out, and each is
 * gated on the evidence for that specific claim:
 *
 *   - `swept-a-line` needs a whole direction pulled out. Not a touch, and not a
 *     nudge: a sweep abandoned a tenth of the way along has not made a line, and
 *     the sentence says a line.
 *
 *   - `each-drag-a-direction` needs TWO whole directions, because the sentence
 *     is about the second one being the same act as the first. One direction
 *     cannot demonstrate a pattern of adding directions.
 *
 *   - `cube-shadow` needs BOTH that a cube has stood finished AND that the child
 *     has turned the dial a real distance. The first condition is what makes the
 *     sentence true rather than merely available: below a cube the dial has no
 *     authority (see `shadowAuthority` in `dimensions.ts`) and turning it does
 *     nothing at all, so a line naming that effect has to be gated on a state
 *     where the effect exists.
 *
 *   - `same-rule-again` needs the top of the ladder. It is the one line that is
 *     about the whole activity rather than about one shape, and the child has to
 *     have run the rule four times for it to be a description of what they did.
 *
 * HIGH-WATER MARKS, NOT THE STATE ON SCREEN
 *
 * `mostClimb` is a maximum accumulator and `minShadow`/`maxShadow` are corners,
 * and that is deliberate. The child can collapse their cube back to a point and
 * turn the dial back to where it started. What they already made, they already
 * made, and a sentence about it stays earned. Reading the CURRENT climb instead
 * still passes most of a suite, so the sequence that separates the two is driven
 * explicitly in `dimensions-discovery.test.ts`.
 *
 * Issue: #225 (wave 5, Shape Ladder)
 */

import { CUBE_CLIMB, FULL_CLIMB } from '@/lib/dimensions';

/** Discovery ids this game can record. Must match the guided-naming registry. */
export const DIMENSIONS_DISCOVERIES = [
  'swept-a-line',
  'each-drag-a-direction',
  'cube-shadow',
  'same-rule-again',
] as const;

export type DimensionsDiscoveryId = (typeof DIMENSIONS_DISCOVERIES)[number];

export type DimensionsEvent =
  /** The child pulled the sweep bead, which climbed or collapsed the ladder. */
  | { type: 'climb'; climb: number }
  /**
   * The child moved the shadow dial. `climb` travels with it because the dial
   * only means something once there is a cube to turn.
   */
  | { type: 'shadow'; climb: number; shadow: number }
  /** The child turned the shape with a drag. Real handling, and it names nothing. */
  | { type: 'turn' }
  /**
   * The shape has been left alone long enough to be worth looking at. Emitted
   * by the component on a debounce, never every frame: a shape watched
   * continuously would hand a child every sentence in two seconds.
   */
  | { type: 'settle'; climb: number };

export interface DimensionsDiscoveryState {
  /** True once the child has actually done something. Gates every emission. */
  interacted: boolean;
  /** Effects already named. Never emitted a second time. */
  named: ReadonlySet<DimensionsDiscoveryId>;
  /** The highest the ladder has ever been climbed, not where it stands now. */
  mostClimb: number;
  /** The corners of the dial the child has turned WHILE THERE WAS A CUBE. */
  minShadow: number | null;
  maxShadow: number | null;
}

export function initialDiscoveryState(): DimensionsDiscoveryState {
  return {
    interacted: false,
    named: new Set(),
    mostClimb: 0,
    minShadow: null,
    maxShadow: null,
  };
}

/**
 * How much of a direction counts as having been swept.
 *
 * Nearly all of it. The sentence says a line, and nine tenths of a sweep is a
 * line by any reasonable reading, but a fifth of one is a smudge. The remaining
 * tenth is slack for a child whose finger stops just short of the end, which is
 * most children.
 */
export const SWEPT = 0.9;

/**
 * How far the shadow dial has to be turned before the sentence about it is
 * true, in radians.
 *
 * Set against what the shadow actually does rather than against a round number.
 * At a quarter turn the inner shape has slid all the way out through the outer
 * one, and this is a little over half of that: far enough that the nesting has
 * visibly come apart, and far enough round the ring to be a deliberate drag
 * rather than a twitch. `dimensions.test.ts` measures the sliding itself.
 */
export const SHADOW_JOURNEY = 0.9;

export interface DiscoveryStep {
  state: DimensionsDiscoveryState;
  /** Ids to name now, in order. Empty on most steps, which is the normal case. */
  emit: DimensionsDiscoveryId[];
}

/**
 * Advance the state by one event and say what, if anything, to name.
 *
 * Pure. Same state and event in, same result out, no clock and no randomness,
 * which is what makes the sequences in the test suite meaningful.
 */
export function stepDiscovery(
  state: DimensionsDiscoveryState,
  event: DimensionsEvent,
): DiscoveryStep {
  const emit: DimensionsDiscoveryId[] = [];
  const named = new Set(state.named);
  let next: DimensionsDiscoveryState = { ...state, named };

  const name = (id: DimensionsDiscoveryId) => {
    if (named.has(id)) return;
    named.add(id);
    emit.push(id);
  };

  const seeClimb = (climb: number) => {
    // Defensive, and unreachable from the component: every climb handed in here
    // has already been through `clampClimb`. Kept because this is a public
    // reducer and a caller that grew a new event later should raise the mark
    // with a number, not with a NaN that poisons it.
    if (!Number.isFinite(climb)) return;
    next = { ...next, mostClimb: Math.max(next.mostClimb, climb) };
  };

  switch (event.type) {
    case 'climb':
      next = { ...next, interacted: true };
      seeClimb(event.climb);
      break;

    case 'shadow':
      next = { ...next, interacted: true };
      seeClimb(event.climb);
      // THE CORNERS ONLY WIDEN WHERE THE DIAL DOES SOMETHING. Below a cube the
      // dial has no authority and the shape does not move, so travel down there
      // is not evidence of anything and must not bank towards a sentence about
      // a shadow sliding. A child who scrubbed the dial at a square and later
      // built a cube would otherwise be told about an effect they had never
      // seen. The component refuses to offer the dial down there at all, so
      // this is the reducer holding its own rule rather than the only gate;
      // it is tested with a sequence that fails without it.
      if (Number.isFinite(event.shadow) && event.climb >= CUBE_CLIMB) {
        next = {
          ...next,
          minShadow: next.minShadow === null ? event.shadow : Math.min(next.minShadow, event.shadow),
          maxShadow: next.maxShadow === null ? event.shadow : Math.max(next.maxShadow, event.shadow),
        };
      }
      break;

    case 'turn':
      // Real handling, and it names nothing. Turning the shape is how a child
      // looks at what they made, and there is no sentence about looking.
      next = { ...next, interacted: true };
      break;

    case 'settle': {
      // The gate. Frames at mount, and frames while a carer is setting the
      // activity up, describe a shape nobody has touched. Nothing is named for
      // a shape the child did not make, and nothing is banked from before they
      // arrived either.
      if (!next.interacted) break;

      seeClimb(event.climb);

      const climbed = next.mostClimb;
      const dialSpan =
        next.minShadow === null || next.maxShadow === null ? 0 : next.maxShadow - next.minShadow;

      // Recorded independently of each other. Wave 1's bug was an `else if`
      // chain that made a later branch unreachable once an earlier one hit, so
      // these are deliberately four separate statements.
      if (climbed >= SWEPT) name('swept-a-line');

      if (climbed >= 1 + SWEPT) name('each-drag-a-direction');

      if (climbed >= CUBE_CLIMB && dialSpan >= SHADOW_JOURNEY) name('cube-shadow');

      if (climbed >= FULL_CLIMB - 1 + SWEPT) name('same-rule-again');
      break;
    }
  }

  return { state: next, emit };
}
