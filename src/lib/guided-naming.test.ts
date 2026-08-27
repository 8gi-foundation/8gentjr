// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the guided naming engine. Runs via `bun test`.
 *
 * These tests exist to make two of issue #225's non-negotiables mechanical
 * rather than editorial:
 *
 *   - Stage conformance: every authored line fits the max utterance length the
 *     GLP system defines for that stage. A copy edit that overshoots stage 3's
 *     one-word budget fails here instead of reaching a child.
 *
 *   - The science fence: no naming line may contain a term from the issue's
 *     LEAVE list. This is the pseudoscience guard, executable.
 *
 * Canvas and audio behaviour is not testable here and was checked by hand.
 */
import { describe, expect, test } from 'bun:test';
import { GLP_STAGES, getMaxWords } from './glp';
import {
  BANNED_TERMS,
  MIN_AUTHORED_DISCOVERIES,
  bandForStage,
  canTakeTheCard,
  countWords,
  fitsStage,
  getActivityIds,
  getDiscoveries,
  getNamingLine,
} from './guided-naming';

const ALL_STAGE_IDS = GLP_STAGES.map((s) => s.id);
const BANDS = ['gestalt', 'single', 'early', 'complex', 'full'] as const;

describe('countWords', () => {
  test('counts whitespace separated words', () => {
    expect(countWords('You made the sound visible.')).toBe(5);
  });
  test('collapses runs of whitespace', () => {
    expect(countWords('  two   words  ')).toBe(2);
  });
  test('returns 0 for an empty or whitespace-only line', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('bandForStage', () => {
  test('stages 1 and 2 share the whole-gestalt band', () => {
    expect(bandForStage(1)).toBe('gestalt');
    expect(bandForStage(2)).toBe('gestalt');
  });
  test('maps the remaining stages to their own band', () => {
    expect(bandForStage(3)).toBe('single');
    expect(bandForStage(4)).toBe('early');
    expect(bandForStage(5)).toBe('complex');
    expect(bandForStage(6)).toBe('full');
  });
  test('falls back to the single-word band for an unknown stage', () => {
    // One word is the safest line when the stage is not reliably known: it is
    // understandable at every stage above it.
    expect(bandForStage(0)).toBe('single');
    expect(bandForStage(99)).toBe('single');
    expect(bandForStage(Number.NaN)).toBe('single');
  });
});

describe('activity catalogue', () => {
  test('ships every activity built against issue #225', () => {
    expect(getActivityIds().sort()).toEqual([
      'cymatics',
      'dimensions',
      'fractal',
      'harmonograph',
      'interference',
      'light-bender',
      'light-mix',
      'pattern-garden',
      'shadow-globe',
      'water-sphere',
    ]);
  });

  test('every activity authors at least the floor number of discoveries', () => {
    for (const id of getActivityIds()) {
      expect(getDiscoveries(id).length).toBeGreaterThanOrEqual(MIN_AUTHORED_DISCOVERIES);
    }
  });

  test('EVERY authored discovery resolves to a line, at every stage', () => {
    // Regression guard against DEAD COPY, and only that. Naming is not gated on
    // a count, so any discovery an activity records must resolve to a real
    // sentence at every stage; a discovery that resolves to nothing would leave
    // a child with silence where a naming was intended.
    //
    // WHAT THIS TEST DOES NOT COVER, stated plainly because an earlier version
    // of this comment claimed otherwise: it does not check that a component
    // ever calls record() with these ids, so it cannot catch an unreachable
    // predicate. Restoring the wave-1 LightMixer `else if` bug leaves this
    // suite green. It also cannot catch a component naming at mount before the
    // child has touched anything. Both of those bugs shipped under this file.
    //
    // The repo has no DOM test harness and adding one is out of scope, so the
    // structural answer is to keep the predicates out of the components. Water
    // Sphere does that: its predicates are a pure reducer in
    // `water-sphere-discovery.ts` and `water-sphere-discovery.test.ts` drives
    // real event sequences through them, covering both failure modes above.
    // The three wave-1 activities still decide inline and remain uncovered
    // here, which is a known gap and not something this test papers over.
    for (const id of getActivityIds()) {
      for (const d of getDiscoveries(id)) {
        for (const stage of ALL_STAGE_IDS) {
          expect(
            getNamingLine(id, d.id, stage),
            `${id}/${d.id} at stage ${stage} resolves to nothing`,
          ).toBeTruthy();
        }
      }
    }
  });

  test('discovery ids are unique within an activity', () => {
    for (const id of getActivityIds()) {
      const ids = getDiscoveries(id).map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test('every discovery defines a line for every band', () => {
    for (const id of getActivityIds()) {
      for (const d of getDiscoveries(id)) {
        for (const band of BANDS) {
          expect(typeof d.lines[band]).toBe('string');
          expect(d.lines[band].trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('getNamingLine', () => {
  test('returns the stage-appropriate phrasing, not a truncation', () => {
    // Stage 3 caps at one word, so it gets its own real word rather than the
    // first token of a longer sentence.
    expect(getNamingLine('cymatics', 'pattern-formed', 3)).toBe('Pattern');
    expect(getNamingLine('cymatics', 'pattern-formed', 1)).toBe('You made the sound visible.');
  });

  test('returns null for an unknown discovery rather than inventing a line', () => {
    expect(getNamingLine('cymatics', 'no-such-discovery', 4)).toBeNull();
  });

  test('resolves a line for every activity, discovery and stage', () => {
    for (const id of getActivityIds()) {
      for (const d of getDiscoveries(id)) {
        for (const stage of ALL_STAGE_IDS) {
          const line = getNamingLine(id, d.id, stage);
          expect(line).not.toBeNull();
          expect(line!.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('canTakeTheCard (hold, never burn)', () => {
  const line = 'You made the sound visible.';

  test('a fresh effect with a clear card takes it', () => {
    expect(
      canTakeTheCard({
        named: new Set(),
        lineOnScreen: null,
        discoveryId: 'pattern-formed',
        text: line,
      }),
    ).toBe(true);
  });

  test('an effect already named never takes the card again', () => {
    expect(
      canTakeTheCard({
        named: new Set(['pattern-formed']),
        lineOnScreen: null,
        discoveryId: 'pattern-formed',
        text: line,
      }),
    ).toBe(false);
  });

  test('a second effect in the same handler is declined while a line is showing', () => {
    // The wave-1 bug, as a test. Two records inside one pointerdown both ran
    // before React committed, both were marked named, and only the last line
    // was ever shown. The first sentence was spent unread on the child's very
    // first touch. Declining here is what leaves it available.
    expect(
      canTakeTheCard({
        named: new Set(),
        lineOnScreen: 'Two waves met each other.',
        discoveryId: 'found-loud',
        text: 'Two waves made a big one.',
      }),
    ).toBe(false);
  });

  test('the same effect takes the card once the card is clear', () => {
    // The other half: declining must not be a permanent loss. The caller does
    // not mark a declined effect as named, so the next time the child produces
    // it, it names.
    const named = new Set<string>();
    expect(
      canTakeTheCard({ named, lineOnScreen: 'something', discoveryId: 'found-loud', text: line }),
    ).toBe(false);
    expect(
      canTakeTheCard({ named, lineOnScreen: null, discoveryId: 'found-loud', text: line }),
    ).toBe(true);
  });

  test('an unresolvable line is declined rather than shown blank', () => {
    expect(
      canTakeTheCard({ named: new Set(), lineOnScreen: null, discoveryId: 'typo', text: null }),
    ).toBe(false);
    expect(
      canTakeTheCard({ named: new Set(), lineOnScreen: null, discoveryId: 'typo', text: '' }),
    ).toBe(false);
  });

  test('an empty line on screen still counts as a clear card', () => {
    // null means clear. Anything else, including an empty string that somehow
    // reached the card, means occupied.
    expect(
      canTakeTheCard({ named: new Set(), lineOnScreen: '', discoveryId: 'x', text: line }),
    ).toBe(false);
  });
});

describe('stage conformance (GLP max utterance length)', () => {
  test('every naming line fits its stage word budget', () => {
    for (const id of getActivityIds()) {
      for (const d of getDiscoveries(id)) {
        for (const stage of ALL_STAGE_IDS) {
          const line = getNamingLine(id, d.id, stage)!;
          const words = countWords(line);
          const max = getMaxWords(stage);
          // Message names the offender so a failing copy edit is obvious.
          expect(
            words <= max,
            `${id}/${d.id} at stage ${stage}: "${line}" is ${words} words, max ${max}`,
          ).toBe(true);
        }
      }
    }
  });

  test('stage 3 lines are exactly one word', () => {
    for (const id of getActivityIds()) {
      for (const d of getDiscoveries(id)) {
        expect(countWords(getNamingLine(id, d.id, 3)!)).toBe(1);
      }
    }
  });

  test('fitsStage agrees with the GLP budget', () => {
    expect(fitsStage('Pattern', 3)).toBe(true);
    expect(fitsStage('Two words', 3)).toBe(false);
    expect(fitsStage('You made the sound visible.', 1)).toBe(true);
  });
});

describe('science fence (issue #225 LEAVE list)', () => {
  test('no naming line contains a banned term', () => {
    for (const id of getActivityIds()) {
      for (const d of getDiscoveries(id)) {
        for (const band of BANDS) {
          const line = d.lines[band].toLowerCase();
          for (const term of BANNED_TERMS) {
            const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            expect(
              pattern.test(line),
              `${id}/${d.id}/${band} contains banned term "${term}": "${d.lines[band]}"`,
            ).toBe(false);
          }
        }
      }
    }
  });

  test('the fence itself is non-empty and covers the headline claims', () => {
    // A silently emptied BANNED_TERMS would make the fence test vacuous.
    expect(BANNED_TERMS.length).toBeGreaterThan(10);
    for (const required of ['golden ratio', 'sacred', 'pyramid', 'consciousness', 'hologram']) {
      expect(BANNED_TERMS).toContain(required);
    }
  });
});

describe('house style', () => {
  test('no em dashes in any naming line', () => {
    for (const id of getActivityIds()) {
      for (const d of getDiscoveries(id)) {
        for (const band of BANDS) {
          expect(d.lines[band]).not.toContain('—');
        }
      }
    }
  });

  test('lines are plain sentences, not shouted or padded with emoji', () => {
    for (const id of getActivityIds()) {
      for (const d of getDiscoveries(id)) {
        for (const band of BANDS) {
          const line = d.lines[band];
          expect(line).not.toContain('!');
          expect(line).toBe(line.trim());
        }
      }
    }
  });
});
