/**
 * Predictive next-word ranking - GLP Tier 2.4.
 *
 * Reads today's `word_used` events from session-logger, walks consecutive
 * pairs to build a `(prev -> next -> count)` bigram map, then ranks
 * candidates that follow the last tapped word. Falls back to the GLP
 * stage word bank when bigram coverage is thin (cold start, brand new
 * combinations, or recency window empty).
 *
 * Design notes:
 * - "Today" only for v1. Cross-session bigrams add complexity without a
 *   measured win at this stage.
 * - No LLM. Deterministic, local, sub-50ms - the strip recomputes on
 *   every sentence change and is never on the hot path of a tap.
 * - Empty `lastWord` (empty sentence) seeds straight from the stage bank.
 *
 * Issue: #138
 */
'use client';

import { getAllEvents, type SessionEvent } from '@/lib/session-logger';
import { suggestByStage } from '@/lib/suggestions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Strip width - 4 cards above the sentence bar. */
export const PREDICTIVE_CARD_COUNT = 4;

/** Bigram window. v1 is today only (resets at local midnight). */
export const PREDICTIVE_WINDOW_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** prev word -> next word -> tap count (today). */
export type BigramMap = Map<string, Map<string, number>>;

export interface PredictiveCandidate {
  /** The word/phrase to display. Lowercase for bigram-derived entries. */
  text: string;
  /** Source of the suggestion - useful for analytics and debugging. */
  source: 'bigram' | 'stage';
  /** Bigram count when source === 'bigram', else 0. */
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Local midnight (today's start) in ms. */
function todayStartMs(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Normalise a label to the same shape `logWord` writes (lowercase + trim). */
function normalise(word: string): string {
  return word.toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// Bigram extraction
// ---------------------------------------------------------------------------

/**
 * Build today's bigram counts from the session log.
 *
 * Walks `word_used` events in chronological order; each consecutive pair
 * (prev, next) inside today's window contributes one count. Events outside
 * the window are skipped, and the chain breaks across the boundary so an
 * old word never seeds a new prefix.
 */
export function getTodaysBigrams(now: number = Date.now()): BigramMap {
  const cutoff = todayStartMs(now);
  const events: SessionEvent[] = getAllEvents();

  const bigrams: BigramMap = new Map();
  let prev: string | null = null;

  for (const e of events) {
    if (e.type !== 'word_used') continue;
    if (e.timestamp < cutoff) {
      // Older event - skip and reset the chain so we don't bridge yesterday
      // to today on the next event.
      prev = null;
      continue;
    }
    const word = typeof e.data.word === 'string' ? normalise(e.data.word) : '';
    if (!word) {
      prev = null;
      continue;
    }
    if (prev) {
      let inner = bigrams.get(prev);
      if (!inner) {
        inner = new Map();
        bigrams.set(prev, inner);
      }
      inner.set(word, (inner.get(word) ?? 0) + 1);
    }
    prev = word;
  }

  return bigrams;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/**
 * Pick up to `count` next-word candidates following `lastWord`.
 *
 * Algorithm:
 *   1. Empty `lastWord` -> first N stage bank entries (cold start).
 *   2. Bigrams that follow `lastWord`, sorted by count desc (ties broken
 *      alphabetically for stable rendering).
 *   3. Top up from `suggestByStage(glpStage)` excluding already-picked
 *      and excluding `lastWord` itself.
 *   4. If still short (eg. unknown stage), keep raw stage suggestions.
 *
 * Pure - no DOM, no React state. Caller memoises against the sentence so
 * we only recompute on tap.
 */
export function predictNext(
  lastWord: string | null,
  glpStage: number,
  count: number = PREDICTIVE_CARD_COUNT,
  bigrams?: BigramMap,
): PredictiveCandidate[] {
  const stageSuggestions = suggestByStage(glpStage);

  // Cold start - no last word means seed straight from the stage bank.
  if (!lastWord) {
    return stageSuggestions
      .slice(0, count)
      .map((s) => ({ text: s.text, source: 'stage' as const, count: 0 }));
  }

  const prev = normalise(lastWord);
  const map = (bigrams ?? getTodaysBigrams()).get(prev);

  const picked: PredictiveCandidate[] = [];
  const seen = new Set<string>([prev]);

  if (map && map.size > 0) {
    const sorted = [...map.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
    for (const [next, c] of sorted) {
      if (picked.length >= count) break;
      if (seen.has(next)) continue;
      picked.push({ text: next, source: 'bigram', count: c });
      seen.add(next);
    }
  }

  // Top up from the stage bank. Match against the lowercased text so we
  // don't double-pick "I want" both as a bigram chain and a stage entry.
  if (picked.length < count) {
    for (const s of stageSuggestions) {
      if (picked.length >= count) break;
      const key = normalise(s.text);
      if (seen.has(key)) continue;
      picked.push({ text: s.text, source: 'stage', count: 0 });
      seen.add(key);
    }
  }

  return picked;
}
