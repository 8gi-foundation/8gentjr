/**
 * Personal Vocab - frequency-sorted "Your Words" promotion (GLP Tier 2.5).
 *
 * Wraps session-logger to surface the child's most-tapped words from the
 * last 7 days. Cards above this row CAN move (motor-planning lives in the
 * locked Supercore grid below). Empty result hides the row entirely.
 *
 * Issue: #139
 */

import { getAllEvents } from '@/lib/session-logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** A word qualifies once it has been tapped this many times in the window. */
export const PERSONAL_VOCAB_MIN_TAPS = 5;

/** Recency window applied to the event log. */
export const PERSONAL_VOCAB_WINDOW_DAYS = 7;

/** Maximum cards shown in the Your Words row. */
export const PERSONAL_VOCAB_MAX_CARDS = 6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PersonalVocabEntry {
  /** Lowercase word as stored by logWord(). */
  word: string;
  /** Tap count inside the recency window. */
  count: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the child's qualifying words.
 *
 * - Filters events to the recency window
 * - Counts by lowercase word
 * - Drops anything below the tap threshold
 * - Returns top N sorted by count desc, ties broken alphabetically for stability
 *
 * Safe to call during SSR. Returns [] if the event log is unavailable.
 */
export function getPersonalVocab(now: number = Date.now()): PersonalVocabEntry[] {
  const cutoff = now - PERSONAL_VOCAB_WINDOW_DAYS * 86_400_000;
  const events = getAllEvents();

  const freq = new Map<string, number>();
  for (const e of events) {
    if (e.type !== 'word_used') continue;
    if (e.timestamp < cutoff) continue;
    const word = typeof e.data.word === 'string' ? e.data.word : '';
    if (!word) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  const qualifying: PersonalVocabEntry[] = [];
  for (const [word, count] of freq.entries()) {
    if (count >= PERSONAL_VOCAB_MIN_TAPS) {
      qualifying.push({ word, count });
    }
  }

  qualifying.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.word.localeCompare(b.word);
  });

  return qualifying.slice(0, PERSONAL_VOCAB_MAX_CARDS);
}
