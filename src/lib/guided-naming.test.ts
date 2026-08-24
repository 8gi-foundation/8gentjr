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
  test('ships the three activities issue #225 asks for', () => {
    expect(getActivityIds().sort()).toEqual(['cymatics', 'interference', 'light-mix']);
  });

  test('every activity authors at least the floor number of discoveries', () => {
    for (const id of getActivityIds()) {
      expect(getDiscoveries(id).length).toBeGreaterThanOrEqual(MIN_AUTHORED_DISCOVERIES);
    }
  });

  test('EVERY authored discovery is reachable, at every stage', () => {
    // Regression guard. Naming is not gated on a count, so any discovery an
    // activity can record must resolve to a real line. A discovery that can
    // never produce a sentence is dead copy, and an activity whose predicates
    // are mutually exclusive can leave a child with no naming at all.
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
