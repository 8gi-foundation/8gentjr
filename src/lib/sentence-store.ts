/**
 * Persistent Sentence Store — shared across all AAC surfaces.
 *
 * Words added in Core grid or Browse categories persist until
 * the user manually clears them. Backed by localStorage.
 */

import { isPhraseGestalt } from './vocabulary';

const STORAGE_KEY = '8gentjr_sentence';

export interface SentenceWord {
  label: string;
  imageUrl?: string;
  /** Tailwind classes for chip (Fitzgerald Key) */
  className?: string;
  /** Inline styles for chip (category colour) */
  style?: React.CSSProperties;
  /**
   * GLP T2.6 — gestalt flag. `true` means this chip is a whole-language script
   * (parent-captured via VoiceCardCreator, or a multi-word phrase from vocab).
   * Any sentence containing a gestalt chip forces mirror mode regardless of
   * glpStage and skips /api/improve-sentence. Undefined is treated as `false`.
   */
  isGestalt?: boolean;
}

type Listener = () => void;

let _words: SentenceWord[] = [];
const _listeners = new Set<Listener>();

function load(): SentenceWord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_words));
  } catch { /* storage full or unavailable */ }
}

function notify() {
  _listeners.forEach((fn) => fn());
}

// Hydrate on first import (client only)
if (typeof window !== 'undefined') {
  _words = load();
}

export const sentenceStore = {
  getWords(): SentenceWord[] {
    return _words;
  },

  addWord(word: SentenceWord) {
    // Auto-flag gestalts if caller didn't set isGestalt explicitly.
    // Multi-word phrases (3+ tokens) are gestalts by Marge Blanc NLA.
    const flagged: SentenceWord =
      word.isGestalt === undefined
        ? { ...word, isGestalt: isPhraseGestalt(word.label) }
        : word;
    _words = [..._words, flagged];
    persist();
    notify();
  },

  removeWord(index: number) {
    _words = _words.filter((_, i) => i !== index);
    persist();
    notify();
  },

  clear() {
    _words = [];
    persist();
    notify();
  },

  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
