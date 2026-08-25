/**
 * Pattern Garden: when the naming line is earned, as a pure reducer.
 *
 * WHY THIS IS NOT INSIDE THE COMPONENT
 *
 * Wave 1 put these decisions inline in canvas components and shipped two bugs
 * no test could see: an unreachable branch that made one discovery impossible,
 * and two activities that recorded an effect from their opening frame, so a
 * naming line was on screen before the child had touched anything. The wave-1
 * suite stayed green through both, because it only ever checked that the
 * authored lines resolve. Water Sphere answered that by moving its predicates
 * out here, and this file follows it for the same reasons.
 *
 * Three properties are mechanical rather than hoped for:
 *
 *   1. NOTHING NAMES BEFORE THE CHILD ACTS. A garden nobody has touched is
 *      bare soil, so this looks safe, and it is not: a carer setting the
 *      activity up, or a hand resting on the control, would otherwise bank
 *      observations the child never made.
 *
 *   2. EVERY AUTHORED DISCOVERY IS REACHABLE. The suite finds a real sequence
 *      of child actions for each one. A discovery no path can reach fails here.
 *
 *   3. NOTHING NAMES TWICE. Anti-engagement: one line per effect, ever.
 *
 * WHAT EACH LINE ACTUALLY CLAIMS
 *
 * All four are claims about something the child has just done, and each one is
 * gated on the evidence for that specific claim rather than on a general sense
 * that things are going well:
 *
 *   - `first-growth` needs growth. Painting alone is not it; the bed has to
 *     have carried the pattern outward.
 *   - `grows-on-its-own` needs the bed to have gained ground SINCE the last
 *     touch, which is the only honest evidence for "by itself".
 *   - `different-shapes` needs a real journey across the control, not a nudge.
 *     A boundary test would fire for a twitch across it and stay silent for a
 *     long crawl that happened to stay one side of it.
 *   - `own-size` needs both a dab and a smear to have been planted. It is the
 *     deepest of the four and the only one that compares two things, so it is
 *     the one that must not fire until the child has made both halves of the
 *     comparison themselves.
 *
 * Issue: #225 (wave 3, Pattern Garden)
 */

/** Discovery ids this game can record. Must match the guided-naming registry. */
export const PATTERN_GARDEN_DISCOVERIES = [
  'first-growth',
  'grows-on-its-own',
  'different-shapes',
  'own-size',
] as const;

export type PatternGardenDiscoveryId = (typeof PATTERN_GARDEN_DISCOVERIES)[number];

export type PatternGardenEvent =
  /**
   * The child painted seed into the bed. `area` is the fraction of the bed the
   * stroke covered and `coverage` is the fraction carrying pattern immediately
   * afterwards, which becomes the baseline for "did it spread on its own".
   */
  | { type: 'plant'; area: number; coverage: number }
  /** The child moved the control. Real input, but it plants nothing. */
  | { type: 'tune' }
  /**
   * The garden has been left alone long enough to be worth looking at.
   * Emitted by the component on a debounce, never every frame: a bed watched
   * continuously would hand a child every sentence in the first two seconds.
   */
  | { type: 'settle'; x: number; y: number; coverage: number };

export interface PatternGardenDiscoveryState {
  /** True once the child has actually done something. Gates every emission. */
  interacted: boolean;
  /** Effects already named. Never emitted a second time. */
  named: ReadonlySet<PatternGardenDiscoveryId>;
  /** Coverage at the moment of the last planting, or null before any. */
  coverageWhenPlanted: number | null;
  /** Whether a small dab and a large smear have each been planted. */
  plantedDab: boolean;
  plantedSmear: boolean;
  /** The corners of the control the child has actually settled at. */
  minX: number | null;
  maxX: number | null;
  minY: number | null;
  maxY: number | null;
}

export function initialDiscoveryState(): PatternGardenDiscoveryState {
  return {
    interacted: false,
    named: new Set(),
    coverageWhenPlanted: null,
    plantedDab: false,
    plantedSmear: false,
    minX: null,
    maxX: null,
    minY: null,
    maxY: null,
  };
}

/**
 * How much of the bed must carry pattern before it counts as grown.
 *
 * Low, on purpose. This is not a target and the child is never told it exists;
 * it is only here so that the sentence "your touch grew a pattern" is not said
 * over a bed where the seed faded. A single dab that took hold clears it.
 */
export const GROWN_COVERAGE = 0.06;

/**
 * How much ground the bed must gain after a planting before "it kept growing
 * by itself" is a description rather than a flourish. Roughly a doubling of a
 * small first patch.
 */
export const SPREAD_SINCE_PLANT = 0.05;

/**
 * What counts as a dab and what counts as a smear, as fractions of the bed.
 *
 * The gap between them is deliberate and wide. Strokes in between are neither,
 * so "big and small grew the same" is only ever said to a child who really did
 * plant one of each, and not to one whose two strokes happened to differ by a
 * few pixels.
 */
export const DAB_AREA = 0.01;
export const SMEAR_AREA = 0.035;

/**
 * How far across the control counts as having gone somewhere else.
 *
 * Just under half the control, measured on whichever axis moved further. Small
 * enough that ordinary play crosses it, large enough that a settled hand
 * drifting a little does not.
 */
export const JOURNEY = 0.45;

export interface DiscoveryStep {
  state: PatternGardenDiscoveryState;
  /** Ids to name now, in order. Empty on most steps, which is the normal case. */
  emit: PatternGardenDiscoveryId[];
}

/**
 * Advance the state by one event and say what, if anything, to name.
 *
 * Pure. Same state and event in, same result out, no clock and no randomness,
 * which is what makes the sequences in the test suite meaningful.
 */
export function stepDiscovery(
  state: PatternGardenDiscoveryState,
  event: PatternGardenEvent,
): DiscoveryStep {
  const emit: PatternGardenDiscoveryId[] = [];
  const named = new Set(state.named);
  let next: PatternGardenDiscoveryState = { ...state, named };

  const name = (id: PatternGardenDiscoveryId) => {
    if (named.has(id)) return;
    named.add(id);
    emit.push(id);
  };

  switch (event.type) {
    case 'tune':
      next = { ...next, interacted: true };
      break;

    case 'plant':
      next = {
        ...next,
        interacted: true,
        coverageWhenPlanted: event.coverage,
        plantedDab: next.plantedDab || event.area <= DAB_AREA,
        plantedSmear: next.plantedSmear || event.area >= SMEAR_AREA,
      };
      break;

    case 'settle': {
      // The gate. Frames at mount, and frames while a carer is setting the
      // activity up, describe a bed nobody has touched. Nothing is named for a
      // pattern the child did not put there, and nothing is banked from before
      // they arrived either.
      if (!next.interacted) break;

      const minX = next.minX === null ? event.x : Math.min(next.minX, event.x);
      const maxX = next.maxX === null ? event.x : Math.max(next.maxX, event.x);
      const minY = next.minY === null ? event.y : Math.min(next.minY, event.y);
      const maxY = next.maxY === null ? event.y : Math.max(next.maxY, event.y);
      next = { ...next, minX, maxX, minY, maxY };

      const grown = event.coverage >= GROWN_COVERAGE;
      const journey = Math.max(maxX - minX, maxY - minY);

      // Recorded independently of each other. Wave 1's bug was an `else if`
      // chain that made a later branch unreachable once an earlier one hit, so
      // these are deliberately four separate statements.
      if (grown) name('first-growth');

      if (
        grown &&
        next.coverageWhenPlanted !== null &&
        event.coverage - next.coverageWhenPlanted >= SPREAD_SINCE_PLANT
      ) {
        name('grows-on-its-own');
      }

      if (grown && journey >= JOURNEY) name('different-shapes');

      if (grown && next.plantedDab && next.plantedSmear) name('own-size');
      break;
    }
  }

  return { state: next, emit };
}
