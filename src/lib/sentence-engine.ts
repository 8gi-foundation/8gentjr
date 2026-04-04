/**
 * 8gent Jr — Local Sentence Engine (v1)
 *
 * Pure local logic for word suggestions and basic grammar improvement.
 * No LLM dependency — runs entirely client-side.
 *
 * Issue: #22
 */

// ---------------------------------------------------------------------------
// Core word list — AAC-style high-frequency words grouped by category
// ---------------------------------------------------------------------------

interface WordEntry {
  word: string;
  category: 'pronoun' | 'verb' | 'noun' | 'adjective' | 'preposition' | 'social' | 'question' | 'determiner' | 'adverb';
  /** Words that commonly follow this one */
  nextWords: string[];
}

const CORE_WORDS: WordEntry[] = [
  // Pronouns
  { word: 'I', category: 'pronoun', nextWords: ['want', 'like', 'need', 'am', 'feel', 'see', 'have', 'go', 'eat', 'drink', 'play', 'can', 'love', 'do'] },
  { word: 'you', category: 'pronoun', nextWords: ['are', 'want', 'like', 'need', 'go', 'have', 'can', 'help'] },
  { word: 'he', category: 'pronoun', nextWords: ['is', 'wants', 'likes', 'has', 'goes', 'can'] },
  { word: 'she', category: 'pronoun', nextWords: ['is', 'wants', 'likes', 'has', 'goes', 'can'] },
  { word: 'we', category: 'pronoun', nextWords: ['want', 'like', 'need', 'are', 'go', 'have', 'can', 'play'] },
  { word: 'it', category: 'pronoun', nextWords: ['is', 'was', 'has', 'looks', 'feels'] },
  { word: 'my', category: 'pronoun', nextWords: ['turn', 'food', 'drink', 'toy', 'book', 'friend', 'home', 'bed'] },

  // Verbs
  { word: 'want', category: 'verb', nextWords: ['more', 'food', 'drink', 'to', 'that', 'it', 'help', 'play'] },
  { word: 'like', category: 'verb', nextWords: ['it', 'that', 'this', 'food', 'to', 'playing', 'music'] },
  { word: 'need', category: 'verb', nextWords: ['help', 'more', 'food', 'drink', 'to', 'it', 'that'] },
  { word: 'go', category: 'verb', nextWords: ['home', 'outside', 'there', 'to', 'play', 'now', 'away'] },
  { word: 'eat', category: 'verb', nextWords: ['food', 'more', 'that', 'it', 'now', 'please'] },
  { word: 'drink', category: 'verb', nextWords: ['water', 'juice', 'more', 'that', 'it', 'please'] },
  { word: 'play', category: 'verb', nextWords: ['with', 'more', 'outside', 'now', 'music', 'game'] },
  { word: 'help', category: 'verb', nextWords: ['me', 'please', 'now', 'with'] },
  { word: 'stop', category: 'verb', nextWords: ['it', 'that', 'now', 'please'] },
  { word: 'am', category: 'verb', nextWords: ['happy', 'sad', 'tired', 'hungry', 'done', 'here', 'ready'] },
  { word: 'is', category: 'verb', nextWords: ['good', 'big', 'small', 'here', 'there', 'fun', 'nice', 'done'] },
  { word: 'have', category: 'verb', nextWords: ['it', 'more', 'fun', 'food', 'that', 'one'] },
  { word: 'see', category: 'verb', nextWords: ['it', 'that', 'you', 'here', 'there'] },
  { word: 'feel', category: 'verb', nextWords: ['happy', 'sad', 'tired', 'sick', 'good', 'bad'] },
  { word: 'can', category: 'verb', nextWords: ['I', 'you', 'we', 'go', 'play', 'have', 'do', 'help'] },
  { word: 'do', category: 'verb', nextWords: ['it', 'that', 'more', 'again', 'now'] },
  { word: 'look', category: 'verb', nextWords: ['at', 'here', 'there', 'it', 'that'] },
  { word: 'run', category: 'verb', nextWords: ['outside', 'now', 'please', 'fast', 'more'] },
  { word: 'jump', category: 'verb', nextWords: ['more', 'now', 'please', 'high'] },
  { word: 'throw', category: 'verb', nextWords: ['ball', 'it', 'please', 'more'] },
  { word: 'bounce', category: 'verb', nextWords: ['ball', 'it', 'more', 'please'] },
  { word: 'kick', category: 'verb', nextWords: ['ball', 'it', 'please', 'more'] },
  { word: 'draw', category: 'verb', nextWords: ['please', 'more', 'it', 'that'] },
  { word: 'read', category: 'verb', nextWords: ['book', 'please', 'more', 'it'] },
  { word: 'love', category: 'verb', nextWords: ['it', 'that', 'you', 'music', 'food', 'game'] },

  // Nouns
  { word: 'food', category: 'noun', nextWords: ['please', 'now', 'more', 'is'] },
  { word: 'water', category: 'noun', nextWords: ['please', 'now', 'more'] },
  { word: 'juice', category: 'noun', nextWords: ['please', 'now', 'more'] },
  { word: 'home', category: 'noun', nextWords: ['now', 'please'] },
  { word: 'toy', category: 'noun', nextWords: ['please', 'now', 'is'] },
  { word: 'book', category: 'noun', nextWords: ['please', 'now', 'is', 'read'] },
  { word: 'music', category: 'noun', nextWords: ['please', 'now', 'is'] },
  { word: 'game', category: 'noun', nextWords: ['please', 'now', 'is', 'play'] },
  { word: 'friend', category: 'noun', nextWords: ['play', 'is', 'here', 'help', 'come'] },
  { word: 'turn', category: 'noun', nextWords: ['now', 'please'] },
  { word: 'ball', category: 'noun', nextWords: ['please', 'throw', 'bounce', 'play', 'kick'] },
  { word: 'playground', category: 'noun', nextWords: ['please', 'now', 'go', 'play'] },
  { word: 'teacher', category: 'noun', nextWords: ['help', 'is', 'look', 'please'] },
  { word: 'lunch', category: 'noun', nextWords: ['please', 'now', 'more', 'eat'] },
  { word: 'snack', category: 'noun', nextWords: ['please', 'now', 'more', 'eat'] },
  { word: 'pencil', category: 'noun', nextWords: ['please', 'draw', 'is'] },

  // Adjectives
  { word: 'happy', category: 'adjective', nextWords: ['now', 'today'] },
  { word: 'sad', category: 'adjective', nextWords: ['now', 'today'] },
  { word: 'tired', category: 'adjective', nextWords: ['now', 'today'] },
  { word: 'hungry', category: 'adjective', nextWords: ['now', 'please'] },
  { word: 'good', category: 'adjective', nextWords: ['job', 'one', 'now'] },
  { word: 'big', category: 'adjective', nextWords: ['one', 'toy', 'book'] },
  { word: 'small', category: 'adjective', nextWords: ['one', 'toy', 'book'] },
  { word: 'fun', category: 'adjective', nextWords: ['game', 'now', 'today'] },
  { word: 'done', category: 'adjective', nextWords: ['now', 'with'] },
  { word: 'ready', category: 'adjective', nextWords: ['now', 'to'] },
  { word: 'more', category: 'adjective', nextWords: ['food', 'water', 'juice', 'please', 'fun', 'music'] },

  // Prepositions
  { word: 'to', category: 'preposition', nextWords: ['go', 'play', 'eat', 'drink', 'do', 'see', 'home'] },
  { word: 'with', category: 'preposition', nextWords: ['me', 'you', 'friend', 'that', 'it'] },
  { word: 'at', category: 'preposition', nextWords: ['home', 'it', 'that', 'here'] },
  { word: 'on', category: 'preposition', nextWords: ['it', 'that', 'here', 'there'] },
  { word: 'in', category: 'preposition', nextWords: ['here', 'there', 'it'] },

  // Social
  { word: 'please', category: 'social', nextWords: ['help', 'more', 'now'] },
  { word: 'thank you', category: 'social', nextWords: [] },
  { word: 'sorry', category: 'social', nextWords: [] },
  { word: 'hello', category: 'social', nextWords: ['friend'] },
  { word: 'bye', category: 'social', nextWords: [] },
  { word: 'yes', category: 'social', nextWords: ['please', 'now'] },
  { word: 'no', category: 'social', nextWords: ['more', 'thank you', 'stop'] },

  // Questions
  { word: 'what', category: 'question', nextWords: ['is', 'do', 'can'] },
  { word: 'where', category: 'question', nextWords: ['is', 'do', 'are'] },
  { word: 'who', category: 'question', nextWords: ['is', 'can', 'has'] },
  { word: 'when', category: 'question', nextWords: ['do', 'is', 'can'] },

  // Determiners
  { word: 'the', category: 'determiner', nextWords: ['food', 'water', 'toy', 'book', 'game', 'music', 'big', 'small'] },
  { word: 'a', category: 'determiner', nextWords: ['food', 'drink', 'toy', 'book', 'game', 'friend', 'big', 'small'] },
  { word: 'that', category: 'determiner', nextWords: ['one', 'is', 'please', 'now'] },
  { word: 'this', category: 'determiner', nextWords: ['one', 'is', 'please', 'now'] },

  // Adverbs
  { word: 'now', category: 'adverb', nextWords: ['please'] },
  { word: 'here', category: 'adverb', nextWords: ['please', 'now'] },
  { word: 'there', category: 'adverb', nextWords: ['please', 'now'] },
  { word: 'again', category: 'adverb', nextWords: ['please', 'now'] },
  { word: 'outside', category: 'adverb', nextWords: ['now', 'please'] },
];

// Build a lookup map for fast access
const wordMap = new Map<string, WordEntry>();
for (const entry of CORE_WORDS) {
  wordMap.set(entry.word.toLowerCase(), entry);
}

// ---------------------------------------------------------------------------
// suggestNextWord — local matching from core word list
// ---------------------------------------------------------------------------

/**
 * Given the current words in a sentence, suggest likely next words.
 * Uses bigram-style next-word associations from the core word list.
 * Falls back to high-frequency starters if no context match.
 */
export function suggestNextWord(currentWords: string[]): string[] {
  if (currentWords.length === 0) {
    // Sentence starters — pronouns and questions
    return ['I', 'you', 'we', 'what', 'where', 'can', 'help', 'more', 'yes', 'no', 'hello'];
  }

  const lastWord = currentWords[currentWords.length - 1].toLowerCase();
  const entry = wordMap.get(lastWord);

  if (entry && entry.nextWords.length > 0) {
    // Filter out words already used (avoid repetition), keep at least some
    const unused = entry.nextWords.filter(
      (w) => !currentWords.some((cw) => cw.toLowerCase() === w.toLowerCase())
    );
    if (unused.length > 0) return unused;
    return entry.nextWords;
  }

  // Fallback: suggest common continuations based on last word's category
  const fallbackByCategory: Record<string, string[]> = {
    pronoun: ['want', 'like', 'need', 'am', 'go', 'feel', 'can'],
    verb: ['it', 'that', 'more', 'please', 'now', 'food', 'home'],
    noun: ['is', 'please', 'now', 'more'],
    adjective: ['now', 'please', 'today'],
    preposition: ['me', 'you', 'it', 'home', 'here', 'there'],
    social: [],
    question: ['is', 'do', 'can', 'we', 'you'],
    determiner: ['food', 'toy', 'book', 'game', 'big', 'small'],
    adverb: ['please'],
  };

  // Try to find category of last word
  if (entry) {
    const fallback = fallbackByCategory[entry.category] || [];
    if (fallback.length > 0) return fallback;
  }

  // Last resort: common words
  return ['please', 'more', 'now', 'help', 'yes', 'no', 'I', 'want'];
}

// ---------------------------------------------------------------------------
// improveSentence — basic grammar improvement (pure local, no LLM)
// ---------------------------------------------------------------------------

/**
 * Takes an array of words and returns a grammatically improved sentence.
 * Handles: capitalization, article insertion, subject-verb agreement, punctuation.
 */
export function improveSentence(words: string[]): string {
  if (words.length === 0) return '';
  if (words.length === 1) {
    const w = words[0];
    // Capitalize and add period
    return capitalize(w) + (isEndPunct(w) ? '' : '.');
  }

  let result = [...words.map((w) => w.toLowerCase())];

  // 1. Fix "I" always capitalized
  result = result.map((w) => (w === 'i' ? 'I' : w));

  // 2. Insert "the" before nouns only when prev is a verb or preposition
  //    Never insert after pronouns (I, you, my…) — breaks AAC grammar
  const nouns = new Set(
    CORE_WORDS.filter((e) => e.category === 'noun').map((e) => e.word.toLowerCase())
  );
  const determiners = new Set(['the', 'a', 'an', 'my', 'your', 'this', 'that', 'some']);

  const withArticles: string[] = [];
  for (let i = 0; i < result.length; i++) {
    const w = result[i];
    const prev = i > 0 ? result[i - 1] : '';

    if (nouns.has(w) && !determiners.has(prev) && prev !== 'more') {
      const prevEntry = wordMap.get(prev.toLowerCase());
      // Only add article when the previous word is a verb or preposition
      if (prevEntry && (prevEntry.category === 'verb' || prevEntry.category === 'preposition')) {
        withArticles.push('the');
      }
    }
    withArticles.push(w);
  }
  result = withArticles;

  // 3. Capitalize first word
  if (result.length > 0) {
    result[0] = capitalize(result[0]);
  }

  // 4. Add period if sentence doesn't end with punctuation
  let sentence = result.join(' ');
  const lastChar = sentence[sentence.length - 1];
  if (lastChar !== '.' && lastChar !== '!' && lastChar !== '?') {
    // Check if it's a question
    const questionWords = ['what', 'where', 'who', 'when', 'how', 'why', 'can', 'do', 'is', 'are'];
    const firstWord = result[0].toLowerCase();
    if (questionWords.includes(firstWord)) {
      sentence += '?';
    } else {
      sentence += '.';
    }
  }

  return sentence;
}

// ---------------------------------------------------------------------------
// getAllWords — return the full word list for display
// ---------------------------------------------------------------------------

export function getAllWords(): string[] {
  return CORE_WORDS.map((e) => e.word);
}

/**
 * Get the category color for a word (Modified Fitzgerald Key style)
 */
export function getWordColor(word: string): string {
  const entry = wordMap.get(word.toLowerCase());
  if (!entry) return '#666666';

  const colors: Record<string, string> = {
    pronoun: '#FFD700',    // Yellow — people/pronouns
    verb: '#4CAF50',       // Green — actions
    noun: '#FF9800',       // Orange — things
    adjective: '#2196F3',  // Blue — descriptors
    preposition: '#9C27B0', // Purple — prepositions
    social: '#E91E63',     // Pink — social
    question: '#00BCD4',   // Cyan — questions
    determiner: '#795548', // Brown — determiners
    adverb: '#607D8B',     // Grey-blue — adverbs
  };

  return colors[entry.category] || '#666666';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isEndPunct(s: string): boolean {
  const last = s[s.length - 1];
  return last === '.' || last === '!' || last === '?';
}
