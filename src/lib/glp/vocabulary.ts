/**
 * 8gent Jr — GLP Vocabulary by Stage
 *
 * Word sets appropriate for each GLP stage.
 * Stage 1 uses a minimal high-frequency set.
 * Each subsequent stage adds words from new categories.
 *
 * Words are drawn from AAC core vocabulary research
 * (Banajee, Dicarlo & Stricklin, 2003; Cross et al., 2006).
 *
 * Issue: #53
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VocabWord {
  word: string;
  category: 'noun' | 'verb' | 'pronoun' | 'adjective' | 'social' | 'preposition' | 'question' | 'determiner' | 'adverb' | 'conjunction';
  /** Minimum GLP stage where this word appears */
  minStage: number;
  /** Optional symbol ID for ARASAAC/symbol display */
  symbolId?: number;
}

// ---------------------------------------------------------------------------
// Core vocabulary
// ---------------------------------------------------------------------------

export const VOCABULARY: VocabWord[] = [
  // --- Stage 1: Single words (high-frequency requests and labels) ---
  { word: 'more', category: 'adverb', minStage: 1 },
  { word: 'stop', category: 'verb', minStage: 1 },
  { word: 'help', category: 'verb', minStage: 1 },
  { word: 'yes', category: 'social', minStage: 1 },
  { word: 'no', category: 'social', minStage: 1 },
  { word: 'want', category: 'verb', minStage: 1 },
  { word: 'go', category: 'verb', minStage: 1 },
  { word: 'eat', category: 'verb', minStage: 1 },
  { word: 'drink', category: 'verb', minStage: 1 },
  { word: 'play', category: 'verb', minStage: 1 },
  { word: 'food', category: 'noun', minStage: 1 },
  { word: 'water', category: 'noun', minStage: 1 },
  { word: 'home', category: 'noun', minStage: 1 },
  { word: 'toilet', category: 'noun', minStage: 1 },
  { word: 'please', category: 'social', minStage: 1 },
  { word: 'hello', category: 'social', minStage: 1 },
  { word: 'bye', category: 'social', minStage: 1 },

  // --- Stage 2: Two-word combos (add pronouns, basic adjectives) ---
  { word: 'I', category: 'pronoun', minStage: 2 },
  { word: 'you', category: 'pronoun', minStage: 2 },
  { word: 'my', category: 'pronoun', minStage: 2 },
  { word: 'me', category: 'pronoun', minStage: 2 },
  { word: 'it', category: 'pronoun', minStage: 2 },
  { word: 'like', category: 'verb', minStage: 2 },
  { word: 'need', category: 'verb', minStage: 2 },
  { word: 'look', category: 'verb', minStage: 2 },
  { word: 'big', category: 'adjective', minStage: 2 },
  { word: 'small', category: 'adjective', minStage: 2 },
  { word: 'happy', category: 'adjective', minStage: 2 },
  { word: 'sad', category: 'adjective', minStage: 2 },
  { word: 'good', category: 'adjective', minStage: 2 },
  { word: 'toy', category: 'noun', minStage: 2 },
  { word: 'book', category: 'noun', minStage: 2 },
  { word: 'music', category: 'noun', minStage: 2 },
  { word: 'juice', category: 'noun', minStage: 2 },

  // --- Stage 3: Three-word sentences (add he/she/we, more verbs) ---
  { word: 'he', category: 'pronoun', minStage: 3 },
  { word: 'she', category: 'pronoun', minStage: 3 },
  { word: 'we', category: 'pronoun', minStage: 3 },
  { word: 'am', category: 'verb', minStage: 3 },
  { word: 'is', category: 'verb', minStage: 3 },
  { word: 'are', category: 'verb', minStage: 3 },
  { word: 'have', category: 'verb', minStage: 3 },
  { word: 'see', category: 'verb', minStage: 3 },
  { word: 'feel', category: 'verb', minStage: 3 },
  { word: 'the', category: 'determiner', minStage: 3 },
  { word: 'a', category: 'determiner', minStage: 3 },
  { word: 'tired', category: 'adjective', minStage: 3 },
  { word: 'hungry', category: 'adjective', minStage: 3 },
  { word: 'done', category: 'adjective', minStage: 3 },
  { word: 'game', category: 'noun', minStage: 3 },
  { word: 'friend', category: 'noun', minStage: 3 },
  { word: 'turn', category: 'noun', minStage: 3 },

  // --- Stage 4: Simple sentences (add prepositions, more structure) ---
  { word: 'to', category: 'preposition', minStage: 4 },
  { word: 'with', category: 'preposition', minStage: 4 },
  { word: 'at', category: 'preposition', minStage: 4 },
  { word: 'on', category: 'preposition', minStage: 4 },
  { word: 'in', category: 'preposition', minStage: 4 },
  { word: 'can', category: 'verb', minStage: 4 },
  { word: 'do', category: 'verb', minStage: 4 },
  { word: 'this', category: 'determiner', minStage: 4 },
  { word: 'that', category: 'determiner', minStage: 4 },
  { word: 'fun', category: 'adjective', minStage: 4 },
  { word: 'ready', category: 'adjective', minStage: 4 },
  { word: 'now', category: 'adverb', minStage: 4 },
  { word: 'here', category: 'adverb', minStage: 4 },
  { word: 'there', category: 'adverb', minStage: 4 },

  // --- Stage 5: Complex sentences (add questions, adverbs) ---
  { word: 'what', category: 'question', minStage: 5 },
  { word: 'where', category: 'question', minStage: 5 },
  { word: 'who', category: 'question', minStage: 5 },
  { word: 'when', category: 'question', minStage: 5 },
  { word: 'how', category: 'question', minStage: 5 },
  { word: 'why', category: 'question', minStage: 5 },
  { word: 'again', category: 'adverb', minStage: 5 },
  { word: 'outside', category: 'adverb', minStage: 5 },
  { word: 'today', category: 'adverb', minStage: 5 },
  { word: 'and', category: 'conjunction', minStage: 5 },
  { word: 'but', category: 'conjunction', minStage: 5 },
  { word: 'because', category: 'conjunction', minStage: 5 },

  // --- Stage 6: Conversation (add social-pragmatic, narrative) ---
  { word: 'thank you', category: 'social', minStage: 6 },
  { word: 'sorry', category: 'social', minStage: 6 },
  { word: 'maybe', category: 'adverb', minStage: 6 },
  { word: 'sometimes', category: 'adverb', minStage: 6 },
  { word: 'always', category: 'adverb', minStage: 6 },
  { word: 'never', category: 'adverb', minStage: 6 },
  { word: 'then', category: 'conjunction', minStage: 6 },
  { word: 'or', category: 'conjunction', minStage: 6 },
  { word: 'if', category: 'conjunction', minStage: 6 },
  { word: 'before', category: 'preposition', minStage: 6 },
  { word: 'after', category: 'preposition', minStage: 6 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all words available at a given GLP stage (includes all lower stages) */
export function getWordsForStage(stageId: number): VocabWord[] {
  return VOCABULARY.filter((w) => w.minStage <= stageId);
}

/** Get words for a specific category at a given stage */
export function getWordsByCategory(stageId: number, category: string): VocabWord[] {
  return VOCABULARY.filter((w) => w.minStage <= stageId && w.category === category);
}

/** Get just the word strings for a stage */
export function getWordStringsForStage(stageId: number): string[] {
  return getWordsForStage(stageId).map((w) => w.word);
}

/** Count words available at each stage */
export function getStageWordCounts(): Record<number, number> {
  const counts: Record<number, number> = {};
  for (let i = 1; i <= 6; i++) {
    counts[i] = getWordsForStage(i).length;
  }
  return counts;
}
