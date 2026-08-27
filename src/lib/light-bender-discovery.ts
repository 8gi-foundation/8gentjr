/**
 * Light Bender: when the naming line is earned, as a pure reducer.
 *
 * WHY THIS IS NOT INSIDE THE COMPONENT
 *
 * Wave 1 decided this inline in canvas components and shipped two bugs no test
 * could see: an unreachable branch that made one discovery impossible, and two
 * activities that recorded an effect from their opening frame, so a naming line
 * was on screen before the child had touched anything. Water Sphere answered
 * that by moving its predicates out here, and Pattern Garden, Fractal Grower,
 * Sound Drawing and Shape Ladder followed. This file follows all five, for the
 * same reasons and with the same three properties made mechanical:
 *
 *   1. NOTHING NAMES BEFORE THE CHILD ACTS. A tank standing still with a beam
 *      in it looks safe, and it is not: a carer setting the activity up, or the
 *      component taking its first look at the trace, would otherwise bank
 *      observations the child never made.
 *
 *   2. EVERY AUTHORED DISCOVERY IS REACHABLE. The suite finds a real sequence
 *      of child actions for each one, driven through the real physics rather
 *      than through invented numbers.
 *
 *   3. NOTHING NAMES TWICE. Anti-engagement: one line per effect, ever.
 *
 * WHAT EACH LINE ACTUALLY CLAIMS
 *
 *   - `light-bends` needs the beam to have LEFT the water at a visibly
 *     different angle from the one it arrived at. Not any refraction: at a
 *     couple of degrees off vertical the bend is a couple of degrees and
 *     nobody can see it, and the sentence says the light bends.
 *
 *   - `trapped` needs a total internal reflection that actually happened at
 *     the surface, past the critical angle by enough that it is a state the
 *     child is standing in rather than an edge they touched. A beam that never
 *     reached the surface at all earns nothing, however far round the torch is
 *     swung, because the child did not see anything happen.
 *
 *   - `follows-the-water` needs the light inside the falling stream to have
 *     bounced several times. One bounce is a glance off a wall. Several is the
 *     light going round a corner it could not have gone round on its own, which
 *     is the thing the sentence names.
 *
 *   - `the-same-rule` needs BOTH of the above to have happened. It is the only
 *     line in the activity that is about the activity rather than about one
 *     thing on the screen, and it is a claim about two places obeying one rule,
 *     so the child has to have been in both places for it to be a description
 *     of what they did rather than an assertion about physics.
 *
 * HIGH-WATER MARKS, NOT THE STATE ON SCREEN
 *
 * All three marks are maximum accumulators, and that is deliberate. The child
 * can swing the torch back to vertical, fill the tank up and shut the spout.
 * What they already made, they already made, and a sentence about it stays
 * earned. Reading the CURRENT trace instead still passes most of a suite, so
 * the sequences that separate the two are driven explicitly in
 * `light-bender-discovery.test.ts`.
 *
 * Issue: #225 (wave 6, Light Bender)
 */

/** Discovery ids this game can record. Must match the guided-naming registry. */
export const LIGHT_BENDER_DISCOVERIES = [
  'light-bends',
  'trapped',
  'follows-the-water',
  'the-same-rule',
] as const;

export type LightBenderDiscoveryId = (typeof LIGHT_BENDER_DISCOVERIES)[number];

/**
 * What the component measured off the trace it has just drawn.
 *
 * Every field is read from the SAME trace the child is looking at, not
 * recomputed from the controls, so a naming line cannot describe a picture that
 * is not on the screen.
 */
export interface LightBenderReading {
  /**
   * The largest angle, in radians, between the beam arriving at the surface and
   * the beam leaving it, counting only the times enough light left to see.
   * Zero when nothing got out.
   */
  bend: number;
  /**
   * How far past the critical angle a total internal reflection actually
   * happened, in radians. Zero when the beam never met the surface, and zero
   * when it met it and got through.
   */
  pastCritical: number;
  /**
   * How many times light bounced inside the falling stream WITHOUT losing any
   * of itself. Bounces that leaked are not counted, because the sentence this
   * feeds says the light follows the water rather than that it grazed it.
   */
  bounces: number;
}

export type LightBenderEvent =
  /**
   * The child moved one of the three controls. Real handling, so it opens the
   * gate, and it banks whatever the new picture is showing.
   */
  | ({ type: 'handled' } & LightBenderReading)
  /**
   * The scene has been left alone long enough to be worth looking at. Emitted
   * by the component on a debounce, never every frame: a scene watched
   * continuously would hand a child every sentence in two seconds.
   */
  | ({ type: 'settle' } & LightBenderReading);

export interface LightBenderDiscoveryState {
  /** True once the child has actually done something. Gates every emission. */
  interacted: boolean;
  /** Effects already named. Never emitted a second time. */
  named: ReadonlySet<LightBenderDiscoveryId>;
  /** The biggest bend the child has ever put into light that got out. */
  mostBend: number;
  /** The furthest past the critical angle a real total reflection has happened. */
  mostPastCritical: number;
  /** The most times light has ever bounced inside the falling stream. */
  mostBounces: number;
}

export function initialDiscoveryState(): LightBenderDiscoveryState {
  return {
    interacted: false,
    named: new Set(),
    mostBend: 0,
    mostPastCritical: 0,
    mostBounces: 0,
  };
}

/**
 * How much bending counts as bending, in radians.
 *
 * Set against what the water actually does rather than against a round number.
 * Seventeen degrees of bend is what water gives back at about thirty-eight
 * degrees of incidence, which is four fifths of the way to the critical angle:
 * far enough round that the beam in the air is visibly leaning away from the
 * beam in the water, and not so far that a child has to be nearly at the flip
 * before the first sentence arrives. `light-bender.test.ts` measures the
 * incidence this corresponds to rather than asserting it here.
 */
export const BEND_SEEN = 0.3;

/**
 * How far past the critical angle counts as being past it, in radians.
 *
 * Three degrees. Right at the critical angle the transmitted beam is grazing
 * along the surface and vanishingly faint, which is a boundary rather than a
 * place, and a child balanced exactly on it has not yet seen the state that
 * the word trapped describes.
 */
export const TIR_MARGIN = 0.05;

/**
 * How many bounces inside the stream count as riding it.
 *
 * One bounce is light glancing off a wall, which happens in any container.
 * Three is light that has been turned back on itself twice and is still inside
 * water that is falling away underneath it, which is the thing the sentence is
 * about and is not something a straight beam can fake.
 */
export const RIDE_BOUNCES = 3;

export interface DiscoveryStep {
  state: LightBenderDiscoveryState;
  /** Ids to name now, in order. Empty on most steps, which is the normal case. */
  emit: LightBenderDiscoveryId[];
}

/**
 * Advance the state by one event and say what, if anything, to name.
 *
 * Pure. Same state and event in, same result out, no clock and no randomness,
 * which is what makes the sequences in the test suite meaningful.
 */
export function stepDiscovery(
  state: LightBenderDiscoveryState,
  event: LightBenderEvent,
): DiscoveryStep {
  const emit: LightBenderDiscoveryId[] = [];
  const named = new Set(state.named);
  let next: LightBenderDiscoveryState = { ...state, named };

  const name = (id: LightBenderDiscoveryId) => {
    if (named.has(id)) return;
    named.add(id);
    emit.push(id);
  };

  /**
   * Raise the marks.
   *
   * The finiteness guards are defensive and unreachable from the component,
   * where every one of these comes off a trace whose inputs have already been
   * clamped. They are kept because this is a public reducer, and a caller that
   * grows a new control later should raise a mark with a number rather than
   * with a NaN that poisons it for the rest of the session.
   */
  const bank = (reading: LightBenderReading) => {
    if (Number.isFinite(reading.bend)) {
      next = { ...next, mostBend: Math.max(next.mostBend, reading.bend) };
    }
    if (Number.isFinite(reading.pastCritical)) {
      next = {
        ...next,
        mostPastCritical: Math.max(next.mostPastCritical, reading.pastCritical),
      };
    }
    if (Number.isFinite(reading.bounces)) {
      next = { ...next, mostBounces: Math.max(next.mostBounces, reading.bounces) };
    }
  };

  switch (event.type) {
    case 'handled':
      next = { ...next, interacted: true };
      bank(event);
      break;

    case 'settle': {
      // The gate. Frames at mount, and frames while a carer is setting the
      // activity up, describe a tank nobody has touched. Nothing is named for a
      // picture the child did not make, and nothing is banked from before they
      // arrived either.
      if (!next.interacted) break;

      bank(event);

      // Recorded independently of each other. Wave 1's bug was an `else if`
      // chain that made a later branch unreachable once an earlier one hit, so
      // these are deliberately four separate statements.
      if (next.mostBend >= BEND_SEEN) name('light-bends');

      if (next.mostPastCritical >= TIR_MARGIN) name('trapped');

      if (next.mostBounces >= RIDE_BOUNCES) name('follows-the-water');

      if (next.mostPastCritical >= TIR_MARGIN && next.mostBounces >= RIDE_BOUNCES) {
        name('the-same-rule');
      }
      break;
    }
  }

  return { state: next, emit };
}
