/**
 * Shadow Globe: when the naming line is earned, as a pure reducer.
 *
 * WHY THIS IS NOT INSIDE THE COMPONENT
 *
 * Wave 1 decided this inline in canvas components and shipped two bugs no test
 * could see: an unreachable branch that made one discovery impossible, and two
 * activities that recorded an effect from their opening frame, so a naming line
 * was on screen before the child had touched anything. Every activity since has
 * moved its predicates out here, and this one follows for the same reasons and
 * with the same three properties made mechanical:
 *
 *   1. NOTHING NAMES BEFORE THE CHILD ACTS. A globe sitting still with a shadow
 *      already on the floor looks safe, and it is not: a carer setting the
 *      activity up, or the component taking its first look at the scene, would
 *      otherwise bank observations the child never made.
 *
 *   2. EVERY AUTHORED DISCOVERY IS REACHABLE. The suite finds a real sequence
 *      of child actions for each one, driven through the real control pipeline
 *      rather than through invented numbers, for the pointer AND for the keys.
 *
 *   3. NOTHING NAMES TWICE. Anti-engagement: one line per effect, ever.
 *
 * WHAT EACH LINE ACTUALLY CLAIMS
 *
 *   - `a-shadow` needs the middle of the shadow to have MOVED across the floor
 *     by a distance a child would call moving. Not any movement: a shadow that
 *     twitched a hundredth of the floor's width has not shown anybody that the
 *     shadow is a picture of the shape rather than the shape itself.
 *
 *   - `circles-stay-circles` needs the shadow to have been badly deformed, and
 *     the measure of deformed is the ratio between the most magnified ring in
 *     the picture and the least. At the start every pattern sits in a tidy
 *     little cap and that ratio is under two; at five, one side of the picture
 *     is five times the scale of the other and it no longer looks like the
 *     thing painted on the glass. The theorem does the rest: it is still made
 *     of circles, which is the whole point of the sentence.
 *
 *   - `grows-huge` needs a single ring to have been blown up by a factor a
 *     child can see, which is the local scale of the projection at the point of
 *     that ring nearest the lamp. Four is where a ring that started as a speck
 *     under the ball is thrown out past the waist ring and across the floor.
 *
 *   - `roll-it-back` is the only line in the activity that is not a high-water
 *     mark on its own, and it is the one worth the activity. It needs the child
 *     to have gone a long way AND to be back. The going is remembered and the
 *     being back is read off the picture in front of them, because a sentence
 *     about having returned is false if they have not returned.
 *
 * HIGH-WATER MARKS, NOT THE STATE ON SCREEN
 *
 * The first three marks are maximum accumulators, and that is deliberate. A
 * child rolls the pattern up under the lamp, watches it explode across the
 * floor, and rolls it back. What they already made, they already made, and a
 * sentence about it stays earned. Reading the CURRENT reading instead still
 * passes most of a suite, so the sequences that separate the two are driven
 * explicitly in `shadow-globe-discovery.test.ts`.
 *
 * The fourth is the mirror image of that trap: it needs BOTH a mark and a
 * current value, and a version built out of only one of them passes a
 * surprising amount of a suite too. A pure high-water version names the moment
 * the child gets far away; a pure current-value version names on the very first
 * settle, before they have gone anywhere. Both are driven and both fail.
 *
 * WHAT `departure` IS AND IS NOT SCOPED TO
 *
 * It is the angle between the globe's orientation NOW and the orientation it
 * had at mount. It is not a distance to the nearest orientation the child has
 * ever visited: coming back near some other place they passed through earns
 * nothing, and that is the intended reading of the sentence, which is about
 * getting back to where the picture started. It also ignores the lamp entirely.
 * Sliding the lamp out and back is a real return to a previous PICTURE and is
 * deliberately not this line, because the lamp has a home position marked on
 * the screen and a button that puts it back, and a sentence about nothing being
 * lost should be earned by hand rather than by a button.
 *
 * Issue: #225 (wave 7, Shadow Globe)
 */

/** Discovery ids this game can record. Must match the guided-naming registry. */
export const SHADOW_GLOBE_DISCOVERIES = [
  'a-shadow',
  'circles-stay-circles',
  'grows-huge',
  'roll-it-back',
] as const;

export type ShadowGlobeDiscoveryId = (typeof SHADOW_GLOBE_DISCOVERIES)[number];

/**
 * What the component measured off the shadow it has just drawn.
 *
 * Every field comes from the SAME footprint the picture was painted from, read
 * once by `readShadow`, so a naming line cannot describe a floor that is not on
 * the screen.
 */
export interface ShadowGlobeReading {
  /** How far the middle of the shadow has moved from where it started, in floor units. */
  shift: number;
  /** The most magnified ring in the picture over the least magnified one. */
  distortion: number;
  /** How many times over the most magnified ring is being blown up. */
  magnify: number;
  /**
   * How far the globe is turned from where it started, in radians, NOW.
   *
   * The one current value in the reading. See the note on scope above.
   */
  departure: number;
}

export type ShadowGlobeEvent =
  /**
   * The child moved the globe, the lamp, or picked a different pattern. Real
   * handling, so it opens the gate, and it banks whatever the new picture is
   * showing.
   */
  | ({ type: 'handled' } & ShadowGlobeReading)
  /**
   * The scene has been left alone long enough to be worth looking at. Emitted
   * by the component on a debounce, never every frame: a scene watched
   * continuously would hand a child every sentence in two seconds.
   */
  | ({ type: 'settle' } & ShadowGlobeReading);

export interface ShadowGlobeDiscoveryState {
  /** True once the child has actually done something. Gates every emission. */
  interacted: boolean;
  /** Effects already named. Never emitted a second time. */
  named: ReadonlySet<ShadowGlobeDiscoveryId>;
  /** The furthest the middle of the shadow has ever been from where it began. */
  mostShift: number;
  /** The worst the picture has ever been stretched. */
  mostDistortion: number;
  /** The biggest any one ring has ever been blown up. */
  mostMagnify: number;
  /** The furthest the globe has ever been turned from where it started. */
  mostDeparture: number;
}

export function initialDiscoveryState(): ShadowGlobeDiscoveryState {
  return {
    interacted: false,
    named: new Set(),
    mostShift: 0,
    mostDistortion: 0,
    mostMagnify: 0,
    mostDeparture: 0,
  };
}

/**
 * How far the middle of the shadow has to travel to count as moving, in floor
 * units, where the floor is three units across from the middle to the edge.
 *
 * Set against the control rather than against a round number: it is a tenth of
 * the floor's radius, and `shadow-globe-discovery.test.ts` measures how many
 * arrow key presses actually reach it rather than asserting a number here. It
 * comes out at three, which is a deliberate nudge rather than a twitch and is
 * well short of the roll that earns anything else.
 */
export const SHADOW_MOVED = 0.3;

/**
 * How badly stretched the shadow has to be before the sentence about circles is
 * worth saying, as the ratio of the largest magnification in the picture to the
 * smallest.
 *
 * Five. Every pattern opens under two, which the suite measures, so this is not
 * something a child can be handed for a single press. Below about three the
 * picture still looks like the pattern painted on the glass and there is
 * nothing surprising about the rings having survived.
 */
export const CIRCLES_HELD = 5;

/**
 * How much magnification counts as huge.
 *
 * Four. The local scale of the projection is a half at the far pole and one at
 * the waist, so four is a ring standing eight times the size it had when it was
 * underneath the ball, thrown out well past the waist ring and across the
 * floor. `shadow-globe.test.ts` measures that eight rather than claiming it.
 */
export const POLE_HUGE = 4;

/**
 * How far the globe has to have been rolled before coming back means anything,
 * in radians.
 *
 * Two, which is a hundred and fifteen degrees: past the point where the pattern
 * has gone over the top of the ball and the shadow has been somewhere
 * unrecognisable. A child who wobbled the globe twenty degrees and let go has
 * not been anywhere to come back from.
 */
export const ROLLED_AWAY = 2;

/**
 * How near the starting orientation counts as back, in radians.
 *
 * Seventeen degrees. Not zero: nobody lands a rolled ball back on the exact
 * orientation it started at, and a threshold that demanded it would make the
 * line unreachable by hand while still passing a suite driven by arrow keys,
 * which land on it exactly. Seventeen degrees is close enough that the shadow
 * is recognisably the picture the child began with.
 */
export const ROLLED_BACK = 0.3;

export interface DiscoveryStep {
  state: ShadowGlobeDiscoveryState;
  /** Ids to name now, in order. Empty on most steps, which is the normal case. */
  emit: ShadowGlobeDiscoveryId[];
}

/**
 * Advance the state by one event and say what, if anything, to name.
 *
 * Pure. Same state and event in, same result out, no clock and no randomness,
 * which is what makes the sequences in the test suite meaningful.
 */
export function stepDiscovery(
  state: ShadowGlobeDiscoveryState,
  event: ShadowGlobeEvent,
): DiscoveryStep {
  const emit: ShadowGlobeDiscoveryId[] = [];
  const named = new Set(state.named);
  let next: ShadowGlobeDiscoveryState = { ...state, named };

  const name = (id: ShadowGlobeDiscoveryId) => {
    if (named.has(id)) return;
    named.add(id);
    emit.push(id);
  };

  /**
   * Raise the marks.
   *
   * The finiteness guards are defensive and unreachable from the component,
   * where every one of these comes off a footprint whose magnifications are
   * capped and whose anchor is held inside the floor. They are kept because
   * this is a public reducer, and a caller that grows a new control later
   * should raise a mark with a number rather than with a NaN that poisons it
   * for the rest of the session.
   */
  const bank = (r: ShadowGlobeReading) => {
    if (Number.isFinite(r.shift)) {
      next = { ...next, mostShift: Math.max(next.mostShift, r.shift) };
    }
    if (Number.isFinite(r.distortion)) {
      next = { ...next, mostDistortion: Math.max(next.mostDistortion, r.distortion) };
    }
    if (Number.isFinite(r.magnify)) {
      next = { ...next, mostMagnify: Math.max(next.mostMagnify, r.magnify) };
    }
    if (Number.isFinite(r.departure)) {
      next = { ...next, mostDeparture: Math.max(next.mostDeparture, r.departure) };
    }
  };

  switch (event.type) {
    case 'handled':
      next = { ...next, interacted: true };
      bank(event);
      break;

    case 'settle': {
      // The gate. Frames at mount, and frames while a carer is setting the
      // activity up, describe a globe nobody has touched. Nothing is named for
      // a picture the child did not make, and nothing is banked from before
      // they arrived either.
      if (!next.interacted) break;

      bank(event);

      // Recorded independently of each other. Wave 1's bug was an `else if`
      // chain that made a later branch unreachable once an earlier one hit, so
      // these are deliberately four separate statements.
      if (next.mostShift >= SHADOW_MOVED) name('a-shadow');

      if (next.mostDistortion >= CIRCLES_HELD) name('circles-stay-circles');

      if (next.mostMagnify >= POLE_HUGE) name('grows-huge');

      // The mark says they went. The event says they are back. Both, or
      // nothing: this is the one predicate in the activity that reads the
      // picture on the screen as well as the record of the session, and a
      // version built from either half alone is driven and killed in the suite.
      if (next.mostDeparture >= ROLLED_AWAY && event.departure <= ROLLED_BACK) {
        name('roll-it-back');
      }
      break;
    }
  }

  return { state: next, emit };
}
