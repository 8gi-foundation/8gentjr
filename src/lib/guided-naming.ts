/**
 * 8gent Jr - Guided naming lines for do -> see -> name activities.
 *
 * The doctrine (issue #225): the child manipulates something, sees or hears the
 * consequence immediately, and only THEN gets one calm sentence naming what they
 * already produced. Never a lecture screen, never instructions first.
 *
 * Two rules are enforced by this module rather than by good intentions:
 *
 *   1. Stage-appropriate length. Every line is authored per GLP stage band and
 *      checked against getMaxWords() from the same system the AAC surfaces use.
 *      Truncating a sentence to fit a stage produces nonsense ("You"), so each
 *      band gets its own real phrasing instead.
 *
 *   2. The science fence. Every line describes something the child just made
 *      happen on screen. No claim appears here that the interaction cannot
 *      demonstrate. BANNED_TERMS makes the issue's LEAVE list executable, so a
 *      later copy edit that drifts into mysticism fails a test instead of
 *      shipping to a child.
 *
 * Issue: #225
 */

import { getMaxWords } from '@/lib/glp';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GuidedActivityId =
  | 'cymatics'
  | 'interference'
  | 'light-mix'
  | 'water-sphere'
  | 'pattern-garden'
  | 'fractal';

/**
 * Stage bands. GLP stages 1-6 collapse to five phrasing shapes because stages 1
 * and 2 share a max utterance length and both want a whole gestalt chunk.
 */
export type StageBand = 'gestalt' | 'single' | 'early' | 'complex' | 'full';

/** One thing the child can actually produce in an activity. */
export interface Discovery {
  /** Stable id, recorded by the activity when the child produces the effect. */
  id: string;
  /** Phrasing per stage band. Every entry is a complete, speakable line. */
  lines: Record<StageBand, string>;
}

// ---------------------------------------------------------------------------
// The science fence (issue #225 LEAVE list, made executable)
// ---------------------------------------------------------------------------

/**
 * Terms that must never appear in a naming line. Drawn directly from the LEAVE
 * list in issue #225 plus the adjacent mysticism the source material mixes in.
 * Matched case-insensitively as whole words by the test suite.
 */
export const BANNED_TERMS: readonly string[] = [
  'golden ratio',
  'phi',
  'sacred',
  'sacred geometry',
  'pyramid',
  'consciousness',
  'veil',
  'aura',
  'chakra',
  'energy field',
  'vibrational',
  'frequency healing',
  'hologram',
  'holographic',
  '4d',
  'fourth dimension',
  'divine',
  'cosmic',
  'manifest',
  'quantum',
  'resonance of the universe',
];

// ---------------------------------------------------------------------------
// Stage -> band
// ---------------------------------------------------------------------------

/**
 * Map a GLP stage (1-6) to its phrasing band. Unknown stages fall back to the
 * single-word band, which is the safest line for a child whose stage we do not
 * reliably know: one word is understandable at every stage above it too.
 */
export function bandForStage(stageId: number): StageBand {
  switch (stageId) {
    case 1:
    case 2:
      return 'gestalt';
    case 3:
      return 'single';
    case 4:
      return 'early';
    case 5:
      return 'complex';
    case 6:
      return 'full';
    default:
      return 'single';
  }
}

// ---------------------------------------------------------------------------
// Discoveries per activity
// ---------------------------------------------------------------------------

/**
 * Every line below describes an observation the child has already made on
 * screen. Nothing here asserts a fact the activity cannot show.
 */
const DISCOVERIES: Record<GuidedActivityId, Discovery[]> = {
  cymatics: [
    {
      id: 'pattern-formed',
      lines: {
        gestalt: 'You made the sound visible.',
        single: 'Pattern',
        early: 'Sound made shapes',
        complex: 'You made the sound visible in the sand.',
        full: 'The sand moved into a pattern because the plate is shaking.',
      },
    },
    {
      id: 'higher-more-lines',
      lines: {
        gestalt: 'Higher sounds made more lines.',
        single: 'More',
        early: 'Higher makes more',
        complex: 'Higher sounds made more lines in the sand.',
        full: 'When you slid higher, the sand made more lines across the plate.',
      },
    },
    {
      id: 'quiet-lines',
      lines: {
        gestalt: 'Sand rests where it is still.',
        single: 'Still',
        early: 'Sand stays still',
        complex: 'The sand gathers where the plate stays still.',
        full: 'Sand collects along the lines where the plate is not moving.',
      },
    },
  ],

  interference: [
    {
      id: 'waves-overlap',
      lines: {
        gestalt: 'Two waves met each other.',
        single: 'Two',
        early: 'Waves met here',
        complex: 'Two waves met and made a new pattern.',
        full: 'Two sets of ripples met and made a new pattern together.',
      },
    },
    {
      id: 'found-quiet',
      lines: {
        gestalt: 'You found a quiet spot.',
        single: 'Quiet',
        early: 'You found quiet',
        complex: 'You found a quiet spot where waves cancel.',
        full: 'In the dark bands the two waves cancel and it goes quiet.',
      },
    },
    {
      id: 'found-loud',
      lines: {
        gestalt: 'Two waves made a big one.',
        single: 'Big',
        early: 'Waves got bigger',
        complex: 'Where the waves add up they get bigger.',
        full: 'In the bright bands the two waves add together and grow bigger.',
      },
    },
  ],

  'light-mix': [
    {
      id: 'two-lights',
      lines: {
        gestalt: 'Two lights made a new color.',
        single: 'New',
        early: 'Two made one',
        complex: 'Two lights overlapped and made a new color.',
        full: 'Where the two lights overlap they mix into a different color.',
      },
    },
    {
      id: 'all-three-white',
      lines: {
        gestalt: 'All three lights made white.',
        single: 'White',
        early: 'Three made white',
        complex: 'Red, green and blue light together made white.',
        full: 'Where red, green and blue light all overlap, you get white.',
      },
    },
    {
      id: 'shadow-colors',
      lines: {
        gestalt: 'Your shadow turned a color.',
        single: 'Shadow',
        early: 'Shadows have color',
        complex: 'Blocking one light leaves the other two colors.',
        full: 'A shadow blocks one light, so the other two lights color it.',
      },
    },
  ],

  /**
   * Water Sphere. The child shakes a floating drop and hunts for the speeds
   * where its surface stops churning and holds a lobed shape.
   *
   * Which line fires when is decided by a pure reducer in
   * `water-sphere-discovery.ts`, and the ids here are the ones it emits. The
   * two files are held together by a test, so a rename in either fails the
   * suite rather than silently leaving a child with nothing named.
   */
  'water-sphere': [
    {
      id: 'mode-locked',
      lines: {
        gestalt: 'You made the water hold still.',
        single: 'Shape',
        early: 'Water made shapes',
        complex: 'The water settled into a steady shape.',
        full: 'At this speed the ripples line up and hold one steady shape.',
      },
    },
    {
      id: 'higher-more-petals',
      lines: {
        gestalt: 'Higher sounds made more petals.',
        single: 'More',
        early: 'Higher makes more',
        complex: 'Higher sounds made more petals on the drop.',
        full: 'When you went higher the drop grew more petals around it.',
      },
    },
    {
      id: 'poked-rings',
      lines: {
        gestalt: 'You touched it and it rang.',
        single: 'Rings',
        early: 'Your touch rippled',
        complex: 'Your touch sent rings across the water.',
        full: 'Touching the drop sent rings running around it until they faded.',
      },
    },
    {
      id: 'between-is-messy',
      lines: {
        gestalt: 'Between shapes the water churns.',
        single: 'Between',
        early: 'Between is messy',
        complex: 'Between the shapes the water goes choppy.',
        full: 'Only some speeds hold a shape, and between them the water churns.',
      },
    },
  ],

  /**
   * Pattern Garden. The child paints seed into a dark bed and shapes grow out
   * of it, live, under their hand. Two things spread and react, and out of that
   * one small rule come the coats of animals.
   *
   * Every line here is a description of something on the screen. In particular
   * the last one is a real law and not a flourish: the width of the shapes
   * comes from the rule, not from the finger, so a dab and a smear settle into
   * features of the same size. The claim is checked by a test that grows both
   * beds and compares them, because a line that tells a child to go and look is
   * only worth writing if what they find agrees with it.
   *
   * Which line fires when is decided by a pure reducer in
   * `pattern-garden-discovery.ts`, and the ids here are the ones it emits. The
   * two files are held together by a test in both directions, so neither a
   * rename nor a piece of dead copy can survive the suite.
   */
  'pattern-garden': [
    {
      id: 'first-growth',
      lines: {
        gestalt: 'Your touch grew a pattern.',
        single: 'Grew',
        early: 'Your touch grew',
        complex: 'The pattern grew where your finger went.',
        full: 'Everywhere your finger touched, a pattern started growing on its own.',
      },
    },
    {
      id: 'grows-on-its-own',
      lines: {
        gestalt: 'It kept growing by itself.',
        single: 'Growing',
        early: 'It keeps growing',
        complex: 'It kept spreading after you let go.',
        full: 'You stopped touching it and the pattern kept spreading across the bed.',
      },
    },
    {
      id: 'different-shapes',
      lines: {
        gestalt: 'You grew a different shape.',
        single: 'Different',
        early: 'A different shape',
        complex: 'The same garden grew a different shape.',
        full: 'You moved one thing and the same garden grew a different shape.',
      },
    },
    {
      id: 'own-size',
      lines: {
        gestalt: 'The pattern picks its own size.',
        single: 'Same',
        early: 'Same size shapes',
        complex: 'Big and small seeds grew the same size.',
        full: 'A big smear and a small dab grew shapes the same size.',
      },
    },
  ],

  /**
   * Fractal Grower. The child drags a stem up out of a seed, it splits, and
   * every piece then does exactly what the stem did. Their fingers hold the two
   * numbers the split uses, so one drag changes every branch at every size at
   * once.
   *
   * The four lines are the four things that are on the screen in front of them,
   * in the order a pair of hands finds them:
   *
   *   - a split exists,
   *   - the small branches are the same shape as the big ones,
   *   - moving one thing a little moved everything a lot,
   *   - and the same rule, given a different split, made a different nature.
   *
   * The third and fourth are the ones worth the activity. Neither is a
   * flourish: `fractal-grower.test.ts` sweeps the angle and measures the
   * bounding box widening and shortening across the whole range, and the four
   * seeds are four lists of multipliers handed to one recursion, with a test
   * asserting none of them reaches code of its own.
   *
   * Which line fires when is decided by a pure reducer in
   * `fractal-grower-discovery.ts`, and the ids here are the ones it emits. The
   * two files are held together by a test in both directions, so neither a
   * rename nor a piece of dead copy can survive the suite.
   */
  fractal: [
    {
      id: 'branch',
      lines: {
        gestalt: 'Your stem split in two.',
        single: 'Branch',
        early: 'A branch grew',
        complex: 'The stem split into two branches.',
        full: 'You grew it taller and the stem split into two branches.',
      },
    },
    {
      id: 'pattern-repeats',
      lines: {
        gestalt: 'Small branches copy big branches.',
        single: 'Again',
        early: 'Small copies big',
        complex: 'The small branches copy the big ones.',
        full: 'Every small branch is the same shape as the big one.',
      },
    },
    {
      id: 'small-change-big-change',
      lines: {
        gestalt: 'A small change moved everything.',
        single: 'Changed',
        early: 'Everything moved',
        complex: 'You moved one thing and everything changed.',
        full: 'You changed the angle a little and the whole shape changed.',
      },
    },
    {
      id: 'same-rule-different-nature',
      lines: {
        gestalt: 'One rule made both shapes.',
        single: 'Both',
        early: 'Same rule again',
        complex: 'The same rule made a different shape.',
        full: 'One rule made the tree, the fern and the lightning.',
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Every discovery defined for an activity, in authored order. */
export function getDiscoveries(activityId: GuidedActivityId): Discovery[] {
  return DISCOVERIES[activityId] ?? [];
}

/** All activity ids, for exhaustive tests and registries. */
export function getActivityIds(): GuidedActivityId[] {
  return Object.keys(DISCOVERIES) as GuidedActivityId[];
}

/**
 * The naming line for one discovery at one GLP stage.
 *
 * Returns null when the discovery id is unknown, so a caller that records a
 * typo shows nothing rather than an invented sentence.
 */
export function getNamingLine(
  activityId: GuidedActivityId,
  discoveryId: string,
  stageId: number,
): string | null {
  const discovery = getDiscoveries(activityId).find((d) => d.id === discoveryId);
  if (!discovery) return null;
  return discovery.lines[bandForStage(stageId)];
}

/**
 * Whether an effect may take the card right now.
 *
 * Pure, and out here rather than inline in the hook, because the ORDER of these
 * three conditions is the whole bug that shipped in wave 1 and a comment
 * claiming the order is right is not worth the line it is written on.
 *
 * The rule that matters is the middle one. Two effects can be recorded inside a
 * single event handler, before React has committed anything, and the first
 * pointerdown in the interference activity does exactly that. If a record that
 * arrives while a line is showing is marked as named and then loses the setLine
 * race, its sentence is spent without ever being read. So it is declined
 * instead, and the caller must not mark it named, which leaves it free to earn
 * its line the next time the child produces the same effect.
 */
export function canTakeTheCard(args: {
  /** Effects that have already had their line. */
  named: ReadonlySet<string>;
  /** The line currently on screen, or null when the card is clear. */
  lineOnScreen: string | null;
  discoveryId: string;
  /** The resolved line, or null when the id is unknown. */
  text: string | null;
}): boolean {
  if (args.named.has(args.discoveryId)) return false;
  if (args.lineOnScreen !== null) return false;
  if (!args.text) return false;
  return true;
}

/** Word count used by the stage-length rule. Whitespace separated. */
export function countWords(line: string): number {
  const trimmed = line.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * True when a line fits the max utterance length for the stage, per the same
 * GLP system the AAC surfaces use. Exported so the test suite and any future
 * copy tooling apply one rule rather than two.
 */
export function fitsStage(line: string, stageId: number): boolean {
  return countWords(line) <= getMaxWords(stageId);
}

/**
 * How many discoveries every activity must AUTHOR. This is a floor on the
 * content, not a gate on the child: each activity offers at least this many
 * different things worth naming, so exploring in any direction finds one.
 *
 * Naming is deliberately NOT gated on reaching this count. A line appears
 * after the first effect the child produces, and each distinct effect may earn
 * its own single line, once. See useGuidedDiscovery for the rule and why.
 */
export const MIN_AUTHORED_DISCOVERIES = 3;
