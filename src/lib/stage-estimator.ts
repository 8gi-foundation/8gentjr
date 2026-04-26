/**
 * 8gent Jr - GLP Stage Estimator (T3.7)
 *
 * Pure local heuristic that turns recent session-logger events into a
 * read-only suggestion of the child's current Marge Blanc NLA stage.
 * The parent slider in /settings is the source of truth; this estimate
 * is shown as an evidence-grounded banner the parent can override.
 *
 * Constraints:
 *   - On-device only. No network. No ML training. Deterministic.
 *   - Reads from session-logger.getAllEvents(); never mutates state.
 *   - Targets <50ms on the hot path (single linear pass + small sets).
 *
 * Heuristic mapping under NLA (issue #141):
 *   - Mostly multi-word / gestalt taps, few single words      -> 1 or 2
 *   - Many isolated single-word taps, low gestalt ratio       -> 3
 *   - Multi-word taps but no questions / conjunctions         -> 4
 *   - Question words OR conjunctions appear                   -> 5
 *   - Long mean utterance + multi-word + conjunctions + Qs    -> 6
 *
 * Confidence scales by (event count / 100). With <20 events we return
 * stage 3 / confidence 0 so the UI can render a "not enough data yet"
 * fallback instead of a misleading number.
 *
 * Sanity scenarios (synthetic events -> expected stage):
 *   1. 30 multi-word gestalt taps ("all done", "let's go") -> stage 1 or 2
 *   2. 50 single-word taps ("more", "stop", "water")       -> stage 3
 *   3. 40 two-word combos ("want more", "go home"), no Qs  -> stage 4
 *   4. 40 multi-word + a "what" / "and" tap                -> stage 5
 *   5. 60 long phrases with question + conjunction         -> stage 6
 *   6. 5 events total                                      -> stage 3, conf 0
 *
 * Issue: https://github.com/8gi-foundation/8gentjr/issues/141
 */

import { getAllEvents, type SessionEvent } from './session-logger';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface StageSignals {
  /** Number of `word_used` events considered (capped at WINDOW). */
  eventCount: number;
  /** Mean tokens per tap label across the window. */
  meanUtteranceLength: number;
  /** Multi-word taps / total taps. 0..1. */
  multiWordRatio: number;
  /** Gestalt-flagged taps / total taps. 0..1. */
  gestaltRatio: number;
  /** Single-word taps / total taps. 0..1. */
  singleWordRatio: number;
  /** Tap count whose label contains a question word. */
  questionCount: number;
  /** Tap count whose label contains a conjunction. */
  conjunctionCount: number;
}

export interface StageEstimate {
  /** NLA stage 1-6. Defaults to 3 when there is not enough data. */
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  /** 0..1 confidence. 0 means "not enough activity yet". */
  confidence: number;
  /** Underlying signals used to derive the stage (for debugging / UI). */
  signals: StageSignals;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WINDOW = 100; // last N word_used events
const MIN_EVENTS_FOR_CONFIDENCE = 20;

const QUESTION_WORDS = new Set([
  'what',
  'where',
  'why',
  'who',
  'when',
  'how',
]);

const CONJUNCTIONS = new Set([
  'and',
  'because',
  'but',
  'so',
  'or',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split a label into lowercase tokens. Returns [] for empty input. */
function tokens(label: string): string[] {
  if (!label) return [];
  return label
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z']/g, ''))
    .filter(Boolean);
}

/** Pull the label string from a session event, however it was logged. */
function eventLabel(ev: SessionEvent): string {
  // logWord() writes { word: string }. Future writers may use { label }.
  const data = ev.data ?? {};
  if (typeof data.word === 'string') return data.word;
  if (typeof data.label === 'string') return data.label;
  return '';
}

/** Derive isGestalt: prefer explicit flag, otherwise infer from token count. */
function eventIsGestalt(ev: SessionEvent, tokenCount: number): boolean {
  const flag = ev.data?.isGestalt;
  if (typeof flag === 'boolean') return flag;
  // Fallback: any multi-word label is treated as a gestalt-style chunk.
  return tokenCount >= 2;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Estimate the child's current NLA stage from on-device session-logger data.
 *
 * @param now Optional timestamp override (used in tests). Currently unused
 *   inside the heuristic; reserved for future time-decay weighting.
 */
export function estimateStage(_now: number = Date.now()): StageEstimate {
  const all = getAllEvents();

  // Take the last WINDOW word_used events in chronological order.
  const wordEvents: SessionEvent[] = [];
  for (let i = all.length - 1; i >= 0 && wordEvents.length < WINDOW; i--) {
    if (all[i].type === 'word_used') wordEvents.push(all[i]);
  }
  wordEvents.reverse();

  const eventCount = wordEvents.length;

  // --- Default fallback when not enough data ------------------------------
  if (eventCount < MIN_EVENTS_FOR_CONFIDENCE) {
    return {
      stage: 3,
      confidence: 0,
      signals: {
        eventCount,
        meanUtteranceLength: 0,
        multiWordRatio: 0,
        gestaltRatio: 0,
        singleWordRatio: 0,
        questionCount: 0,
        conjunctionCount: 0,
      },
    };
  }

  // --- Single linear pass over the window --------------------------------
  let totalTokens = 0;
  let multiWord = 0;
  let singleWord = 0;
  let gestalt = 0;
  let questionCount = 0;
  let conjunctionCount = 0;

  for (const ev of wordEvents) {
    const t = tokens(eventLabel(ev));
    if (t.length === 0) continue;

    totalTokens += t.length;
    if (t.length >= 2) multiWord++;
    else singleWord++;

    if (eventIsGestalt(ev, t.length)) gestalt++;

    let sawQuestion = false;
    let sawConjunction = false;
    for (const tok of t) {
      if (!sawQuestion && QUESTION_WORDS.has(tok)) sawQuestion = true;
      if (!sawConjunction && CONJUNCTIONS.has(tok)) sawConjunction = true;
    }
    if (sawQuestion) questionCount++;
    if (sawConjunction) conjunctionCount++;
  }

  const meanUtteranceLength = totalTokens / eventCount;
  const multiWordRatio = multiWord / eventCount;
  const gestaltRatio = gestalt / eventCount;
  const singleWordRatio = singleWord / eventCount;

  const signals: StageSignals = {
    eventCount,
    meanUtteranceLength,
    multiWordRatio,
    gestaltRatio,
    singleWordRatio,
    questionCount,
    conjunctionCount,
  };

  // --- Stage classification ----------------------------------------------
  // Order matters: highest stages have the strictest preconditions.
  const hasQuestions = questionCount > 0;
  const hasConjunctions = conjunctionCount > 0;
  const hasGrammar = hasQuestions || hasConjunctions;

  let stage: StageEstimate['stage'];

  if (
    meanUtteranceLength >= 4 &&
    multiWordRatio >= 0.5 &&
    hasQuestions &&
    hasConjunctions
  ) {
    // Long, varied, grammatical -> full conversation.
    stage = 6;
  } else if (hasGrammar && multiWordRatio >= 0.3) {
    // Question words or conjunctions appearing in multi-word context.
    stage = 5;
  } else if (multiWordRatio >= 0.4 && gestaltRatio < 0.6 && !hasGrammar) {
    // Novel 2-3 word combinations dominate, but no question/conjunction yet.
    stage = 4;
  } else if (singleWordRatio >= 0.6 && gestaltRatio < 0.4) {
    // Mostly isolated single-word taps -> single words from gestalts.
    stage = 3;
  } else if (gestaltRatio >= 0.6 && multiWordRatio >= 0.5) {
    // Heavy gestalt usage. Distinguish 1 vs 2 by mix breadth: a high
    // single-word ratio alongside gestalts hints at mitigated gestalts
    // (the child is starting to break chunks apart).
    stage = singleWordRatio >= 0.2 ? 2 : 1;
  } else {
    // Mixed / unclear -> stay on the safe single-word default.
    stage = 3;
  }

  // --- Confidence ---------------------------------------------------------
  // Linear ramp from MIN_EVENTS_FOR_CONFIDENCE..WINDOW.
  const raw = (eventCount - MIN_EVENTS_FOR_CONFIDENCE) /
    (WINDOW - MIN_EVENTS_FOR_CONFIDENCE);
  const confidence = Math.max(0, Math.min(1, raw));

  return { stage, confidence, signals };
}
