/**
 * Sound Drawing: when the naming line is earned, as a pure reducer.
 *
 * WHY THIS IS NOT INSIDE THE COMPONENT
 *
 * Wave 1 decided this inline in canvas components and shipped two bugs no test
 * could see: an unreachable branch that made one discovery impossible, and two
 * activities that recorded an effect from their opening frame, so a naming line
 * was on screen before the child had touched anything. Water Sphere answered
 * that by moving its predicates out here, and Pattern Garden and Fractal Grower
 * followed. This file follows all three, for the same reasons and with the same
 * three properties made mechanical:
 *
 *   1. NOTHING NAMES BEFORE THE CHILD ACTS. A machine standing still with blank
 *      paper looks safe, and it is not: a carer setting the activity up, or the
 *      component taking its first look at the drawing, would otherwise bank
 *      observations the child never made.
 *
 *   2. EVERY AUTHORED DISCOVERY IS REACHABLE. The suite finds a real sequence
 *      of child actions for each one.
 *
 *   3. NOTHING NAMES TWICE. Anti-engagement: one line per effect, ever.
 *
 * WHAT EACH LINE ACTUALLY CLAIMS
 *
 * All five are claims about the drawing the child has just made, and each is
 * gated on the evidence for that specific claim:
 *
 *   - `drew-a-figure` needs ink on the paper. Not a touch: a touch that moved
 *     nothing leaves a blank sheet, and there is nothing to name about a blank
 *     sheet.
 *
 *   - `both-strings` needs BOTH pendulums dragged by the child. Tapping a ratio
 *     card moves both, and deliberately does not count, because the line says
 *     what the child's own two gestures did.
 *
 *   - `more-loops` needs a real journey across the ratio, not a nudge. A
 *     boundary test would fire for a twitch across some threshold and stay
 *     silent for a long steady crawl that happened not to cross it, so the
 *     measure is the span actually travelled. The loops on the paper are
 *     proportional to that ratio, which `harmonograph.test.ts` measures by
 *     counting them in the sampled path.
 *
 *   - `simple-closes` needs the pen to be genuinely coming back over its own
 *     path, measured by `openness` across every lap drawn so far. It cannot
 *     fire on a short drawing, because `openness` refuses to answer before two
 *     whole laps exist and a claim of closure with nothing to compare against
 *     is not a measurement.
 *
 *   - `never-joins` needs BOTH that the pen has wandered a long way off its own
 *     path AND that the ratio is genuinely away from a simple one. The second
 *     condition is what makes the sentence true rather than merely descriptive:
 *     it is the in-between-ness that causes the drift, and a line naming a
 *     cause has to be gated on that cause.
 *
 * Issue: #225 (wave 4, Sound Drawing)
 */

import { CLOSED_GAP, OPEN_GAP } from '@/lib/harmonograph';

/** Discovery ids this game can record. Must match the guided-naming registry. */
export const HARMONOGRAPH_DISCOVERIES = [
  'drew-a-figure',
  'both-strings',
  'more-loops',
  'simple-closes',
  'never-joins',
] as const;

export type HarmonographDiscoveryId = (typeof HARMONOGRAPH_DISCOVERIES)[number];

/** Which pendulum a drag was on. One swings the pen across, one swings it away. */
export type StringId = 'x' | 'y';

export type HarmonographEvent =
  /** The child dragged one pendulum's bob up or down its string. */
  | { type: 'string'; which: StringId; ratio: number }
  /** The child dragged on the paper, which leans the figure and adds ink. */
  | { type: 'paper' }
  /** The child tapped a ratio card, which moves both pendulums at once. */
  | { type: 'card'; ratio: number }
  /**
   * The drawing has been left alone long enough to be worth looking at.
   * Emitted by the component on a debounce, never every frame: a drawing
   * watched continuously would hand a child every sentence in two seconds.
   */
  | {
      type: 'settle';
      ratio: number;
      /** Swings of the first pendulum drawn so far. */
      turns: number;
      /** From `openness`. Null when too little has been drawn to judge. */
      gap: number | null;
      /** How far the ratio is from the nearest simple one. */
      ratioError: number;
    };

export interface HarmonographDiscoveryState {
  /** True once the child has actually done something. Gates every emission. */
  interacted: boolean;
  /** Effects already named. Never emitted a second time. */
  named: ReadonlySet<HarmonographDiscoveryId>;
  /** Pendulums the child has dragged themselves. */
  stringsMoved: ReadonlySet<StringId>;
  /** The corners of the ratio the machine has actually been put through. */
  minRatio: number | null;
  maxRatio: number | null;
  /** Most ink the child has had on the paper. */
  mostInk: number;
}

export function initialDiscoveryState(): HarmonographDiscoveryState {
  return {
    interacted: false,
    named: new Set(),
    stringsMoved: new Set(),
    minRatio: null,
    maxRatio: null,
    mostInk: 0,
  };
}

/**
 * Swings of the first pendulum before there is a picture rather than a stroke.
 *
 * One and a half, which is enough that the pen has turned around at both ends
 * and the line on the paper has a shape instead of a direction.
 */
export const INK_FOR_FIGURE = 1.5;

/**
 * How much of the ratio control counts as having gone somewhere, as a factor
 * between the slowest and fastest the second pendulum has been run.
 *
 * The whole control spans a factor of sixteen, so this is a fifth of it in
 * log terms. Small enough that ordinary play crosses it, large enough that a
 * settled hand drifting a little does not, and large enough that the change in
 * the number of loops on the paper is something a child can see rather than
 * something only a counter would notice.
 */
export const LOOP_JOURNEY = 1.6;

/**
 * Ink needed before either closing line may be said.
 *
 * `openness` already refuses to answer below two whole laps, which for the
 * slowest closing figure this machine can make is ten swings. This is the floor
 * underneath that: a judgement about whether a line comes back over itself
 * should not be made on a drawing the child can take in at a glance.
 */
export const TURNS_FOR_JUDGEMENT = 4;

/**
 * How far off a simple ratio counts as being in between two of them.
 *
 * Set against what the machine's own controls can do rather than against a
 * round number: one pixel of finger travel on the length control moves the
 * ratio by about four thousandths, so this is a handful of pixels. A child who
 * has nudged a string off a card has crossed it; a child who has not touched
 * one has not.
 */
export const OPEN_RATIO_ERROR = 0.02;

export interface DiscoveryStep {
  state: HarmonographDiscoveryState;
  /** Ids to name now, in order. Empty on most steps, which is the normal case. */
  emit: HarmonographDiscoveryId[];
}

/**
 * Advance the state by one event and say what, if anything, to name.
 *
 * Pure. Same state and event in, same result out, no clock and no randomness,
 * which is what makes the sequences in the test suite meaningful.
 */
export function stepDiscovery(
  state: HarmonographDiscoveryState,
  event: HarmonographEvent,
): DiscoveryStep {
  const emit: HarmonographDiscoveryId[] = [];
  const named = new Set(state.named);
  const stringsMoved = new Set(state.stringsMoved);
  let next: HarmonographDiscoveryState = { ...state, named, stringsMoved };

  const name = (id: HarmonographDiscoveryId) => {
    if (named.has(id)) return;
    named.add(id);
    emit.push(id);
  };

  const seeRatio = (ratio: number) => {
    if (!Number.isFinite(ratio)) return;
    next = {
      ...next,
      minRatio: next.minRatio === null ? ratio : Math.min(next.minRatio, ratio),
      maxRatio: next.maxRatio === null ? ratio : Math.max(next.maxRatio, ratio),
    };
  };

  switch (event.type) {
    case 'string':
      next = { ...next, interacted: true };
      stringsMoved.add(event.which);
      seeRatio(event.ratio);
      break;

    case 'card':
      // Counts as a real action and as a ratio the machine has been through,
      // because both pendulums visibly move and the loops on the paper visibly
      // change. It deliberately does NOT count towards `both-strings`: that
      // line is about the child's own two gestures.
      next = { ...next, interacted: true };
      seeRatio(event.ratio);
      break;

    case 'paper':
      next = { ...next, interacted: true };
      break;

    case 'settle': {
      // The gate. Frames at mount, and frames while a carer is setting the
      // activity up, describe a machine nobody has touched. Nothing is named
      // for a drawing the child did not make, and nothing is banked from before
      // they arrived either.
      if (!next.interacted) break;

      const mostInk = Math.max(next.mostInk, event.turns);
      next = { ...next, mostInk };
      seeRatio(event.ratio);

      const span =
        next.minRatio === null || next.maxRatio === null || next.minRatio <= 0
          ? 1
          : next.maxRatio / next.minRatio;

      // Recorded independently of each other. Wave 1's bug was an `else if`
      // chain that made a later branch unreachable once an earlier one hit, so
      // these are deliberately five separate statements.
      if (mostInk >= INK_FOR_FIGURE) name('drew-a-figure');

      if (mostInk >= INK_FOR_FIGURE && stringsMoved.size >= 2) name('both-strings');

      if (mostInk >= INK_FOR_FIGURE && span >= LOOP_JOURNEY) name('more-loops');

      if (event.turns >= TURNS_FOR_JUDGEMENT && event.gap !== null && event.gap <= CLOSED_GAP) {
        name('simple-closes');
      }

      if (
        event.turns >= TURNS_FOR_JUDGEMENT &&
        event.gap !== null &&
        event.gap >= OPEN_GAP &&
        event.ratioError >= OPEN_RATIO_ERROR
      ) {
        name('never-joins');
      }
      break;
    }
  }

  return { state: next, emit };
}
