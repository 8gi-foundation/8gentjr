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

export type GuidedActivityId = 'cymatics' | 'interference' | 'light-mix';

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
 * How many distinct discoveries a child produces before the single naming line
 * appears. The issue calls for 2 to 3 patterns first; three keeps the naming
 * genuinely earned without making it rare.
 */
export const DISCOVERIES_BEFORE_NAMING = 3;
