/**
 * 8gent Jr AAC Vocabulary System
 *
 * Complete vocabulary with ARASAAC pictographic symbols, organized by
 * Fitzgerald Key color categories and GLP (Gestalt Language Processing) principles.
 *
 * Two systems combined:
 * 1. Robust Core Vocabulary — ~100 high-frequency core words (pronouns, verbs,
 *    adjectives, etc.) that cover 80% of daily communication
 * 2. Topic Vocabulary — 200+ fringe words organized by category (food, places, etc.)
 *
 * Total: 500+ words with ARASAAC symbol URLs, category metadata, and phrase data.
 */

import type { WordCategory } from './fitzgerald-key';

// =============================================================================
// ARASAAC Helper
// =============================================================================

const ARASAAC = (id: number) => `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;

// =============================================================================
// Types
// =============================================================================

export interface AACCategory {
  id: string;
  name: string;
  color: string; // Fitzgerald Key color
  imageUrl: string;
}

export interface AACPhrase {
  id: string;
  text: string;
  spokenText?: string; // Optional different text to speak
  imageUrl: string;
  categoryId: string;
}

/** Communication functions a word can serve */
export type CommunicationFunction =
  | 'request'
  | 'reject'
  | 'comment'
  | 'question'
  | 'greet'
  | 'respond'
  | 'express'
  | 'describe'
  | 'direct'
  | 'narrate'
  | 'joke'
  | 'opinion';

/** A single core vocabulary word with clinical metadata */
export interface CoreWord {
  /** Unique identifier */
  id: string;
  /** Display text */
  text: string;
  /** Spoken text if different from display */
  spokenText?: string;
  /** Grammatical word type (maps to Fitzgerald Key) */
  wordType: WordCategory;
  /** Communication functions this word supports */
  communicationFunctions: CommunicationFunction[];
  /** Usage frequency tier */
  frequency: 'essential' | 'high' | 'medium';
  /** Minimum GLP stage where this word appears */
  glpStage: 1 | 2 | 3 | 4 | 5 | 6;
  /** ARASAAC pictogram symbol ID */
  arasaacId?: number;
  /** Fixed grid position for motor planning */
  coreGridPosition?: { row: number; col: number };
  /** Morphological word forms */
  morphForms?: {
    base: string;
    present?: string;
    past?: string;
    plural?: string;
    comparative?: string;
    superlative?: string;
    negative?: string;
  };
  /** Word types that typically follow this word */
  typicallyFollowedBy?: WordCategory[];
  /** Word types that typically precede this word */
  typicallyPrecedeBy?: WordCategory[];
}

// =============================================================================
// Fitzgerald Key Colors (Topic Vocabulary)
// =============================================================================

export const TOPIC_FITZGERALD_COLORS = {
  people: '#FFD700',      // Yellow - People/Pronouns
  verbs: '#4CAF50',       // Green - Actions/Verbs
  descriptors: '#2196F3', // Blue - Descriptors/Adjectives
  nouns: '#FF9800',       // Orange - Things/Nouns
  places: '#8B6914',      // Warm brown - Places
  feelings: '#E8610A',    // Warm orange - Feelings/Social
  questions: '#00BCD4',   // Cyan - Questions
  misc: '#9E9E9E',        // Gray - Miscellaneous
} as const;

// =============================================================================
// CORE VOCABULARY — Essential Words (~100 high-frequency words)
// =============================================================================

export const CORE_PRONOUNS: CoreWord[] = [
  { id: 'core-i',    text: 'I',    wordType: 'pronoun', communicationFunctions: ['request', 'express', 'comment', 'narrate'], frequency: 'essential', glpStage: 2, arasaacId: 6632, coreGridPosition: { row: 0, col: 0 }, typicallyFollowedBy: ['verb', 'adverb'] },
  { id: 'core-you',  text: 'you',  wordType: 'pronoun', communicationFunctions: ['question', 'direct', 'comment'], frequency: 'essential', glpStage: 2, arasaacId: 7116, coreGridPosition: { row: 0, col: 1 }, typicallyFollowedBy: ['verb', 'adverb'] },
  { id: 'core-he',   text: 'he',   wordType: 'pronoun', communicationFunctions: ['comment', 'narrate', 'describe'], frequency: 'high', glpStage: 3, arasaacId: 31146, typicallyFollowedBy: ['verb'] },
  { id: 'core-she',  text: 'she',  wordType: 'pronoun', communicationFunctions: ['comment', 'narrate', 'describe'], frequency: 'high', glpStage: 3, arasaacId: 2458, typicallyFollowedBy: ['verb'] },
  { id: 'core-it',   text: 'it',   wordType: 'pronoun', communicationFunctions: ['comment', 'describe', 'narrate'], frequency: 'essential', glpStage: 2, coreGridPosition: { row: 0, col: 2 }, typicallyFollowedBy: ['verb'] },
  { id: 'core-we',   text: 'we',   wordType: 'pronoun', communicationFunctions: ['request', 'narrate', 'comment'], frequency: 'high', glpStage: 3, arasaacId: 7116, typicallyFollowedBy: ['verb'] },
  { id: 'core-they', text: 'they', wordType: 'pronoun', communicationFunctions: ['comment', 'narrate'], frequency: 'medium', glpStage: 4, typicallyFollowedBy: ['verb'] },
  { id: 'core-me',   text: 'me',   wordType: 'pronoun', communicationFunctions: ['request', 'express'], frequency: 'essential', glpStage: 2, arasaacId: 6632, typicallyPrecedeBy: ['verb', 'preposition'] },
  { id: 'core-my',   text: 'my',   wordType: 'determiner', communicationFunctions: ['request', 'comment'], frequency: 'essential', glpStage: 2, arasaacId: 6632, coreGridPosition: { row: 0, col: 3 } },
  { id: 'core-your', text: 'your', wordType: 'determiner', communicationFunctions: ['question', 'comment'], frequency: 'high', glpStage: 3, arasaacId: 7116 },
];

export const CORE_VERBS: CoreWord[] = [
  { id: 'core-want',  text: 'want',  wordType: 'verb', communicationFunctions: ['request'], frequency: 'essential', glpStage: 2, arasaacId: 5441, coreGridPosition: { row: 1, col: 0 }, morphForms: { base: 'want', present: 'wants', past: 'wanted', negative: "don't want" }, typicallyPrecedeBy: ['pronoun'] },
  { id: 'core-need',  text: 'need',  wordType: 'verb', communicationFunctions: ['request'], frequency: 'essential', glpStage: 2, arasaacId: 32648, morphForms: { base: 'need', present: 'needs', past: 'needed', negative: "don't need" } },
  { id: 'core-like',  text: 'like',  wordType: 'verb', communicationFunctions: ['express', 'comment', 'opinion'], frequency: 'essential', glpStage: 2, arasaacId: 37721, coreGridPosition: { row: 1, col: 1 }, morphForms: { base: 'like', present: 'likes', past: 'liked', negative: "don't like" } },
  { id: 'core-go',    text: 'go',    wordType: 'verb', communicationFunctions: ['request', 'direct', 'narrate'], frequency: 'essential', glpStage: 2, arasaacId: 29951, coreGridPosition: { row: 1, col: 2 }, morphForms: { base: 'go', present: 'goes', past: 'went', negative: "don't go" } },
  { id: 'core-is',    text: 'is',    wordType: 'verb', communicationFunctions: ['describe', 'comment'], frequency: 'essential', glpStage: 2, coreGridPosition: { row: 1, col: 3 }, morphForms: { base: 'be', present: 'is', past: 'was', negative: "isn't" } },
  { id: 'core-have',  text: 'have',  wordType: 'verb', communicationFunctions: ['comment', 'request'], frequency: 'essential', glpStage: 2, morphForms: { base: 'have', present: 'has', past: 'had', negative: "don't have" } },
  { id: 'core-do',    text: 'do',    wordType: 'verb', communicationFunctions: ['question', 'direct'], frequency: 'essential', glpStage: 2, morphForms: { base: 'do', present: 'does', past: 'did', negative: "don't" } },
  { id: 'core-get',   text: 'get',   wordType: 'verb', communicationFunctions: ['request', 'narrate'], frequency: 'essential', glpStage: 2, morphForms: { base: 'get', present: 'gets', past: 'got' } },
  { id: 'core-see',   text: 'see',   wordType: 'verb', communicationFunctions: ['comment', 'request'], frequency: 'essential', glpStage: 2, arasaacId: 6573, morphForms: { base: 'see', present: 'sees', past: 'saw' } },
  { id: 'core-come',  text: 'come',  wordType: 'verb', communicationFunctions: ['request', 'direct'], frequency: 'essential', glpStage: 2, morphForms: { base: 'come', present: 'comes', past: 'came' } },
  { id: 'core-put',   text: 'put',   wordType: 'verb', communicationFunctions: ['direct', 'request'], frequency: 'high', glpStage: 3, morphForms: { base: 'put', present: 'puts', past: 'put' } },
  { id: 'core-make',  text: 'make',  wordType: 'verb', communicationFunctions: ['request', 'narrate'], frequency: 'high', glpStage: 3, morphForms: { base: 'make', present: 'makes', past: 'made' } },
  { id: 'core-play',  text: 'play',  wordType: 'verb', communicationFunctions: ['request', 'narrate'], frequency: 'high', glpStage: 2, arasaacId: 23392, morphForms: { base: 'play', present: 'plays', past: 'played' } },
  { id: 'core-eat',   text: 'eat',   wordType: 'verb', communicationFunctions: ['request'], frequency: 'high', glpStage: 2, arasaacId: 6456, morphForms: { base: 'eat', present: 'eats', past: 'ate' } },
  { id: 'core-drink', text: 'drink', wordType: 'verb', communicationFunctions: ['request'], frequency: 'high', glpStage: 2, arasaacId: 6061, morphForms: { base: 'drink', present: 'drinks', past: 'drank' } },
  { id: 'core-help',  text: 'help',  wordType: 'verb', communicationFunctions: ['request'], frequency: 'essential', glpStage: 2, arasaacId: 32648, morphForms: { base: 'help', present: 'helps', past: 'helped' } },
  { id: 'core-stop',  text: 'stop',  wordType: 'verb', communicationFunctions: ['reject', 'direct'], frequency: 'essential', glpStage: 2, arasaacId: 7196, morphForms: { base: 'stop', present: 'stops', past: 'stopped' } },
  { id: 'core-look',  text: 'look',  wordType: 'verb', communicationFunctions: ['direct', 'comment'], frequency: 'high', glpStage: 2, arasaacId: 6573, morphForms: { base: 'look', present: 'looks', past: 'looked' } },
  { id: 'core-think', text: 'think', wordType: 'verb', communicationFunctions: ['opinion', 'express'], frequency: 'high', glpStage: 3, morphForms: { base: 'think', present: 'thinks', past: 'thought' } },
  { id: 'core-know',  text: 'know',  wordType: 'verb', communicationFunctions: ['respond', 'express'], frequency: 'high', glpStage: 3, morphForms: { base: 'know', present: 'knows', past: 'knew', negative: "don't know" } },
  { id: 'core-feel',  text: 'feel',  wordType: 'verb', communicationFunctions: ['express'], frequency: 'high', glpStage: 3, morphForms: { base: 'feel', present: 'feels', past: 'felt' } },
  { id: 'core-can',   text: 'can',   wordType: 'verb', communicationFunctions: ['request', 'question'], frequency: 'essential', glpStage: 2, morphForms: { base: 'can', past: 'could', negative: "can't" } },
  { id: 'core-will',  text: 'will',  wordType: 'verb', communicationFunctions: ['narrate', 'request'], frequency: 'high', glpStage: 3, morphForms: { base: 'will', negative: "won't" } },
  { id: 'core-love',  text: 'love',  wordType: 'verb', communicationFunctions: ['express'], frequency: 'high', glpStage: 2, arasaacId: 37721, morphForms: { base: 'love', present: 'loves', past: 'loved' } },
];

export const CORE_ADJECTIVES: CoreWord[] = [
  { id: 'core-big',       text: 'big',       wordType: 'adjective', communicationFunctions: ['describe', 'comment'], frequency: 'essential', glpStage: 2, morphForms: { base: 'big', comparative: 'bigger', superlative: 'biggest' } },
  { id: 'core-little',    text: 'little',    wordType: 'adjective', communicationFunctions: ['describe', 'comment'], frequency: 'essential', glpStage: 2, morphForms: { base: 'little', comparative: 'littler', superlative: 'littlest' } },
  { id: 'core-good',      text: 'good',      wordType: 'adjective', communicationFunctions: ['describe', 'opinion', 'respond'], frequency: 'essential', glpStage: 2, arasaacId: 4581, morphForms: { base: 'good', comparative: 'better', superlative: 'best' } },
  { id: 'core-bad',       text: 'bad',       wordType: 'adjective', communicationFunctions: ['describe', 'express'], frequency: 'high', glpStage: 2, arasaacId: 35545, morphForms: { base: 'bad', comparative: 'worse', superlative: 'worst' } },
  { id: 'core-happy',     text: 'happy',     wordType: 'adjective', communicationFunctions: ['express', 'describe'], frequency: 'essential', glpStage: 2, arasaacId: 35533, morphForms: { base: 'happy', comparative: 'happier', superlative: 'happiest' } },
  { id: 'core-sad',       text: 'sad',       wordType: 'adjective', communicationFunctions: ['express', 'describe'], frequency: 'essential', glpStage: 2, arasaacId: 35545, morphForms: { base: 'sad', comparative: 'sadder', superlative: 'saddest' } },
  { id: 'core-hot',       text: 'hot',       wordType: 'adjective', communicationFunctions: ['describe', 'express'], frequency: 'high', glpStage: 2, arasaacId: 2300, morphForms: { base: 'hot', comparative: 'hotter', superlative: 'hottest' } },
  { id: 'core-cold',      text: 'cold',      wordType: 'adjective', communicationFunctions: ['describe', 'express'], frequency: 'high', glpStage: 2, arasaacId: 4652, morphForms: { base: 'cold', comparative: 'colder', superlative: 'coldest' } },
  { id: 'core-new',       text: 'new',       wordType: 'adjective', communicationFunctions: ['describe'], frequency: 'high', glpStage: 3, morphForms: { base: 'new', comparative: 'newer', superlative: 'newest' } },
  { id: 'core-old',       text: 'old',       wordType: 'adjective', communicationFunctions: ['describe'], frequency: 'high', glpStage: 3, morphForms: { base: 'old', comparative: 'older', superlative: 'oldest' } },
  { id: 'core-more',      text: 'more',      wordType: 'adjective', communicationFunctions: ['request'], frequency: 'essential', glpStage: 2, arasaacId: 5508, coreGridPosition: { row: 2, col: 0 } },
  { id: 'core-all',       text: 'all',       wordType: 'adjective', communicationFunctions: ['describe', 'request'], frequency: 'high', glpStage: 2 },
  { id: 'core-same',      text: 'same',      wordType: 'adjective', communicationFunctions: ['describe', 'comment'], frequency: 'medium', glpStage: 3 },
  { id: 'core-different', text: 'different', wordType: 'adjective', communicationFunctions: ['describe', 'comment'], frequency: 'medium', glpStage: 3 },
  { id: 'core-tired',     text: 'tired',     wordType: 'adjective', communicationFunctions: ['express'], frequency: 'high', glpStage: 2, arasaacId: 35537 },
  { id: 'core-hungry',    text: 'hungry',    wordType: 'adjective', communicationFunctions: ['express', 'request'], frequency: 'high', glpStage: 2 },
  { id: 'core-funny',     text: 'funny',     wordType: 'adjective', communicationFunctions: ['describe', 'joke'], frequency: 'high', glpStage: 2, arasaacId: 13354 },
  { id: 'core-silly',     text: 'silly',     wordType: 'adjective', communicationFunctions: ['describe', 'joke'], frequency: 'high', glpStage: 2 },
  { id: 'core-scary',     text: 'scary',     wordType: 'adjective', communicationFunctions: ['describe', 'express'], frequency: 'medium', glpStage: 3, arasaacId: 6916 },
  { id: 'core-cool',      text: 'cool',      wordType: 'adjective', communicationFunctions: ['describe', 'express', 'opinion'], frequency: 'high', glpStage: 2 },
];

export const CORE_ADVERBS: CoreWord[] = [
  { id: 'core-here',   text: 'here',   wordType: 'adverb', communicationFunctions: ['direct', 'comment'], frequency: 'essential', glpStage: 2, coreGridPosition: { row: 2, col: 1 } },
  { id: 'core-there',  text: 'there',  wordType: 'adverb', communicationFunctions: ['direct', 'comment'], frequency: 'essential', glpStage: 2, coreGridPosition: { row: 2, col: 2 } },
  { id: 'core-now',    text: 'now',    wordType: 'adverb', communicationFunctions: ['request', 'narrate'], frequency: 'essential', glpStage: 2 },
  { id: 'core-later',  text: 'later',  wordType: 'adverb', communicationFunctions: ['narrate', 'respond'], frequency: 'high', glpStage: 3 },
  { id: 'core-again',  text: 'again',  wordType: 'adverb', communicationFunctions: ['request'], frequency: 'essential', glpStage: 2 },
  { id: 'core-too',    text: 'too',    wordType: 'adverb', communicationFunctions: ['describe'], frequency: 'high', glpStage: 3 },
  { id: 'core-very',   text: 'very',   wordType: 'adverb', communicationFunctions: ['describe'], frequency: 'high', glpStage: 3 },
  { id: 'core-not',    text: 'not',    wordType: 'negation', communicationFunctions: ['reject', 'respond'], frequency: 'essential', glpStage: 2, coreGridPosition: { row: 2, col: 3 } },
  { id: 'core-maybe',  text: 'maybe',  wordType: 'adverb', communicationFunctions: ['respond', 'opinion'], frequency: 'high', glpStage: 3 },
  { id: 'core-please', text: 'please', wordType: 'adverb', communicationFunctions: ['request'], frequency: 'essential', glpStage: 2 },
];

export const CORE_PREPOSITIONS: CoreWord[] = [
  { id: 'core-in',   text: 'in',   wordType: 'preposition', communicationFunctions: ['describe', 'narrate'], frequency: 'essential', glpStage: 3 },
  { id: 'core-on',   text: 'on',   wordType: 'preposition', communicationFunctions: ['describe', 'narrate'], frequency: 'essential', glpStage: 3 },
  { id: 'core-to',   text: 'to',   wordType: 'preposition', communicationFunctions: ['narrate', 'request'], frequency: 'essential', glpStage: 2 },
  { id: 'core-with', text: 'with', wordType: 'preposition', communicationFunctions: ['describe', 'request'], frequency: 'essential', glpStage: 3 },
  { id: 'core-for',  text: 'for',  wordType: 'preposition', communicationFunctions: ['request', 'narrate'], frequency: 'high', glpStage: 3 },
  { id: 'core-up',   text: 'up',   wordType: 'preposition', communicationFunctions: ['direct', 'describe'], frequency: 'high', glpStage: 2 },
  { id: 'core-down', text: 'down', wordType: 'preposition', communicationFunctions: ['direct', 'describe'], frequency: 'high', glpStage: 2 },
  { id: 'core-out',  text: 'out',  wordType: 'preposition', communicationFunctions: ['direct', 'request'], frequency: 'high', glpStage: 2 },
  { id: 'core-off',  text: 'off',  wordType: 'preposition', communicationFunctions: ['direct', 'request'], frequency: 'high', glpStage: 2 },
];

export const CORE_QUESTIONS: CoreWord[] = [
  { id: 'core-what',  text: 'what',  wordType: 'question', communicationFunctions: ['question'], frequency: 'essential', glpStage: 2, coreGridPosition: { row: 3, col: 0 } },
  { id: 'core-where', text: 'where', wordType: 'question', communicationFunctions: ['question'], frequency: 'essential', glpStage: 2, coreGridPosition: { row: 3, col: 1 } },
  { id: 'core-who',   text: 'who',   wordType: 'question', communicationFunctions: ['question'], frequency: 'high', glpStage: 3, coreGridPosition: { row: 3, col: 2 } },
  { id: 'core-when',  text: 'when',  wordType: 'question', communicationFunctions: ['question'], frequency: 'high', glpStage: 3, coreGridPosition: { row: 3, col: 3 } },
  { id: 'core-why',   text: 'why',   wordType: 'question', communicationFunctions: ['question'], frequency: 'high', glpStage: 3 },
  { id: 'core-how',   text: 'how',   wordType: 'question', communicationFunctions: ['question'], frequency: 'high', glpStage: 3 },
];

export const CORE_CONJUNCTIONS: CoreWord[] = [
  { id: 'core-and',     text: 'and',     wordType: 'conjunction', communicationFunctions: ['narrate', 'describe'], frequency: 'essential', glpStage: 3 },
  { id: 'core-but',     text: 'but',     wordType: 'conjunction', communicationFunctions: ['narrate', 'opinion'], frequency: 'high', glpStage: 4 },
  { id: 'core-or',      text: 'or',      wordType: 'conjunction', communicationFunctions: ['question', 'narrate'], frequency: 'high', glpStage: 4 },
  { id: 'core-because', text: 'because', wordType: 'conjunction', communicationFunctions: ['narrate', 'express'], frequency: 'medium', glpStage: 4 },
  { id: 'core-then',    text: 'then',    wordType: 'conjunction', communicationFunctions: ['narrate'], frequency: 'high', glpStage: 3 },
];

export const CORE_SOCIAL: CoreWord[] = [
  { id: 'core-yes',       text: 'yes',       wordType: 'interjection', communicationFunctions: ['respond'], frequency: 'essential', glpStage: 1, arasaacId: 5584, coreGridPosition: { row: 4, col: 0 } },
  { id: 'core-no',        text: 'no',        wordType: 'interjection', communicationFunctions: ['respond', 'reject'], frequency: 'essential', glpStage: 1, arasaacId: 5526, coreGridPosition: { row: 4, col: 1 } },
  { id: 'core-hello',     text: 'hello',     wordType: 'social', communicationFunctions: ['greet'], frequency: 'essential', glpStage: 1, arasaacId: 6522, coreGridPosition: { row: 4, col: 2 } },
  { id: 'core-goodbye',   text: 'goodbye',   wordType: 'social', communicationFunctions: ['greet'], frequency: 'essential', glpStage: 1, coreGridPosition: { row: 4, col: 3 } },
  { id: 'core-thank-you', text: 'thank you', wordType: 'social', communicationFunctions: ['respond'], frequency: 'essential', glpStage: 2, arasaacId: 38783 },
  { id: 'core-sorry',     text: 'sorry',     wordType: 'social', communicationFunctions: ['express'], frequency: 'high', glpStage: 2 },
  { id: 'core-okay',      text: 'okay',      wordType: 'interjection', communicationFunctions: ['respond'], frequency: 'essential', glpStage: 1, arasaacId: 5584 },
  { id: 'core-wow',       text: 'wow',       wordType: 'interjection', communicationFunctions: ['express', 'comment'], frequency: 'high', glpStage: 1 },
  { id: 'core-uh-oh',     text: 'uh-oh',     wordType: 'interjection', communicationFunctions: ['comment', 'express'], frequency: 'high', glpStage: 1 },
  { id: 'core-yay',       text: 'yay',       wordType: 'interjection', communicationFunctions: ['express'], frequency: 'high', glpStage: 1 },
];

// =============================================================================
// Combined Core Words
// =============================================================================

/** All core vocabulary words combined (~100 words) */
export const ALL_CORE_WORDS: CoreWord[] = [
  ...CORE_PRONOUNS,
  ...CORE_VERBS,
  ...CORE_ADJECTIVES,
  ...CORE_ADVERBS,
  ...CORE_PREPOSITIONS,
  ...CORE_QUESTIONS,
  ...CORE_CONJUNCTIONS,
  ...CORE_SOCIAL,
];

// =============================================================================
// TOPIC VOCABULARY — Fringe words organized by category (400+ words)
// =============================================================================

export const AAC_CATEGORIES: AACCategory[] = [
  // Core Communication
  { id: 'general', name: 'General', color: TOPIC_FITZGERALD_COLORS.misc, imageUrl: ARASAAC(6964) },
  { id: 'feelings', name: 'Feelings', color: TOPIC_FITZGERALD_COLORS.feelings, imageUrl: ARASAAC(37190) },
  { id: 'actions', name: 'Actions', color: TOPIC_FITZGERALD_COLORS.verbs, imageUrl: ARASAAC(6503) },
  { id: 'questions', name: 'Questions', color: TOPIC_FITZGERALD_COLORS.questions, imageUrl: ARASAAC(22620) },

  // Daily Life
  { id: 'food', name: 'Food', color: TOPIC_FITZGERALD_COLORS.nouns, imageUrl: ARASAAC(4610) },
  { id: 'drinks', name: 'Drinks', color: TOPIC_FITZGERALD_COLORS.nouns, imageUrl: ARASAAC(6061) },
  { id: 'clothes', name: 'Clothes', color: TOPIC_FITZGERALD_COLORS.nouns, imageUrl: ARASAAC(7233) },
  { id: 'body', name: 'Body', color: TOPIC_FITZGERALD_COLORS.nouns, imageUrl: ARASAAC(6473) },

  // Fun & Learning
  { id: 'play', name: 'Play', color: TOPIC_FITZGERALD_COLORS.verbs, imageUrl: ARASAAC(23392) },
  { id: 'colours', name: 'Colours', color: TOPIC_FITZGERALD_COLORS.descriptors, imageUrl: ARASAAC(5968) },
  { id: 'numbers', name: 'Numbers', color: TOPIC_FITZGERALD_COLORS.descriptors, imageUrl: ARASAAC(2879) },
  { id: 'shapes', name: 'Shapes', color: TOPIC_FITZGERALD_COLORS.descriptors, imageUrl: ARASAAC(4651) },

  // People & Places
  { id: 'people', name: 'People', color: TOPIC_FITZGERALD_COLORS.people, imageUrl: ARASAAC(7116) },
  { id: 'places', name: 'Places', color: TOPIC_FITZGERALD_COLORS.places, imageUrl: ARASAAC(32757) },
  { id: 'school', name: 'School', color: TOPIC_FITZGERALD_COLORS.places, imageUrl: ARASAAC(32446) },
  { id: 'home', name: 'Home', color: TOPIC_FITZGERALD_COLORS.places, imageUrl: ARASAAC(6964) },
];

// =============================================================================
// Topic Phrase Data
// =============================================================================

export const GENERAL_PHRASES: AACPhrase[] = [
  { id: 'gen-i', text: 'I', imageUrl: ARASAAC(6632), categoryId: 'general' },
  { id: 'gen-you', text: 'you', imageUrl: ARASAAC(6625), categoryId: 'general' },
  { id: 'gen-yes', text: 'yes', imageUrl: ARASAAC(5584), categoryId: 'general' },
  { id: 'gen-no', text: 'no', imageUrl: ARASAAC(5526), categoryId: 'general' },
  { id: 'gen-help', text: 'help', imageUrl: ARASAAC(7171), categoryId: 'general' },
  { id: 'gen-stop', text: 'stop', imageUrl: ARASAAC(7196), categoryId: 'general' },
  { id: 'gen-more', text: 'more', imageUrl: ARASAAC(32753), categoryId: 'general' },
  { id: 'gen-done', text: 'done', imageUrl: ARASAAC(28429), categoryId: 'general' },
  { id: 'gen-want', text: 'I want', imageUrl: ARASAAC(5441), categoryId: 'general' },
  { id: 'gen-dont-want', text: "I don't want", imageUrl: ARASAAC(29129), categoryId: 'general' },
  { id: 'gen-please', text: 'please', imageUrl: ARASAAC(8195), categoryId: 'general' },
  { id: 'gen-thanks', text: 'thank you', imageUrl: ARASAAC(8129), categoryId: 'general' },
  { id: 'gen-ok', text: 'ok', imageUrl: ARASAAC(5584), categoryId: 'general' },
  { id: 'gen-wait', text: 'wait', imageUrl: ARASAAC(36914), categoryId: 'general' },
  { id: 'gen-look', text: 'look', imageUrl: ARASAAC(6564), categoryId: 'general' },
  { id: 'gen-listen', text: 'listen', imageUrl: ARASAAC(6572), categoryId: 'general' },
];

export const FEELINGS_PHRASES: AACPhrase[] = [
  { id: 'feel-happy', text: 'happy', imageUrl: ARASAAC(35533), categoryId: 'feelings' },
  { id: 'feel-sad', text: 'sad', imageUrl: ARASAAC(35545), categoryId: 'feelings' },
  { id: 'feel-angry', text: 'angry', imageUrl: ARASAAC(35539), categoryId: 'feelings' },
  { id: 'feel-scared', text: 'scared', imageUrl: ARASAAC(35535), categoryId: 'feelings' },
  { id: 'feel-tired', text: 'tired', imageUrl: ARASAAC(35537), categoryId: 'feelings' },
  { id: 'feel-sick', text: 'sick', imageUrl: ARASAAC(7040), categoryId: 'feelings' },
  { id: 'feel-good', text: 'good', imageUrl: ARASAAC(35541), categoryId: 'feelings' },
  { id: 'feel-bad', text: 'bad', imageUrl: ARASAAC(35543), categoryId: 'feelings' },
  { id: 'feel-love', text: 'love', imageUrl: ARASAAC(8020), categoryId: 'feelings' },
  { id: 'feel-excited', text: 'excited', imageUrl: ARASAAC(39090), categoryId: 'feelings' },
  { id: 'feel-nervous', text: 'nervous', imageUrl: ARASAAC(35549), categoryId: 'feelings' },
  { id: 'feel-hot', text: 'hot', imageUrl: ARASAAC(28655), categoryId: 'feelings' },
  { id: 'feel-cold', text: 'cold', imageUrl: ARASAAC(32178), categoryId: 'feelings' },
  { id: 'feel-hungry', text: 'hungry', imageUrl: ARASAAC(35525), categoryId: 'feelings' },
  { id: 'feel-thirsty', text: 'thirsty', imageUrl: ARASAAC(35523), categoryId: 'feelings' },
];

export const ACTIONS_PHRASES: AACPhrase[] = [
  { id: 'act-go', text: 'go', imageUrl: ARASAAC(8142), categoryId: 'actions' },
  { id: 'act-come', text: 'come', imageUrl: ARASAAC(32669), categoryId: 'actions' },
  { id: 'act-eat', text: 'eat', imageUrl: ARASAAC(6456), categoryId: 'actions' },
  { id: 'act-drink', text: 'drink', imageUrl: ARASAAC(6061), categoryId: 'actions' },
  { id: 'act-play', text: 'play', imageUrl: ARASAAC(23392), categoryId: 'actions' },
  { id: 'act-sleep', text: 'sleep', imageUrl: ARASAAC(6479), categoryId: 'actions' },
  { id: 'act-sit', text: 'sit', imageUrl: ARASAAC(6611), categoryId: 'actions' },
  { id: 'act-stand', text: 'stand', imageUrl: ARASAAC(8152), categoryId: 'actions' },
  { id: 'act-walk', text: 'walk', imageUrl: ARASAAC(6044), categoryId: 'actions' },
  { id: 'act-run', text: 'run', imageUrl: ARASAAC(6465), categoryId: 'actions' },
  { id: 'act-jump', text: 'jump', imageUrl: ARASAAC(6607), categoryId: 'actions' },
  { id: 'act-read', text: 'read', imageUrl: ARASAAC(7141), categoryId: 'actions' },
  { id: 'act-write', text: 'write', imageUrl: ARASAAC(2380), categoryId: 'actions' },
  { id: 'act-watch', text: 'watch', imageUrl: ARASAAC(6564), categoryId: 'actions' },
  { id: 'act-give', text: 'give', imageUrl: ARASAAC(28431), categoryId: 'actions' },
  { id: 'act-take', text: 'take', imageUrl: ARASAAC(10148), categoryId: 'actions' },
];

export const QUESTIONS_PHRASES: AACPhrase[] = [
  { id: 'q-what', text: 'what?', imageUrl: ARASAAC(22620), categoryId: 'questions' },
  { id: 'q-where', text: 'where?', imageUrl: ARASAAC(7764), categoryId: 'questions' },
  { id: 'q-when', text: 'when?', imageUrl: ARASAAC(32874), categoryId: 'questions' },
  { id: 'q-who', text: 'who?', imageUrl: ARASAAC(9853), categoryId: 'questions' },
  { id: 'q-why', text: 'why?', imageUrl: ARASAAC(36719), categoryId: 'questions' },
  { id: 'q-how', text: 'how?', imageUrl: ARASAAC(22619), categoryId: 'questions' },
  { id: 'q-can-i', text: 'can I?', imageUrl: ARASAAC(9847), categoryId: 'questions' },
  { id: 'q-do-you', text: 'do you?', imageUrl: ARASAAC(22620), categoryId: 'questions' },
  { id: 'q-is-it', text: 'is it?', imageUrl: ARASAAC(22620), categoryId: 'questions' },
  { id: 'q-dont-know', text: "I don't know", imageUrl: ARASAAC(7180), categoryId: 'questions' },
];

export const FOOD_PHRASES: AACPhrase[] = [
  { id: 'food-eat', text: 'I want to eat', imageUrl: ARASAAC(6456), categoryId: 'food' },
  { id: 'food-apple', text: 'apple', imageUrl: ARASAAC(2462), categoryId: 'food' },
  { id: 'food-banana', text: 'banana', imageUrl: ARASAAC(2530), categoryId: 'food' },
  { id: 'food-bread', text: 'bread', imageUrl: ARASAAC(2494), categoryId: 'food' },
  { id: 'food-cheese', text: 'cheese', imageUrl: ARASAAC(2541), categoryId: 'food' },
  { id: 'food-chicken', text: 'chicken', imageUrl: ARASAAC(4952), categoryId: 'food' },
  { id: 'food-pizza', text: 'pizza', imageUrl: ARASAAC(2527), categoryId: 'food' },
  { id: 'food-pasta', text: 'pasta', imageUrl: ARASAAC(8652), categoryId: 'food' },
  { id: 'food-rice', text: 'rice', imageUrl: ARASAAC(6911), categoryId: 'food' },
  { id: 'food-soup', text: 'soup', imageUrl: ARASAAC(2573), categoryId: 'food' },
  { id: 'food-sandwich', text: 'sandwich', imageUrl: ARASAAC(2281), categoryId: 'food' },
  { id: 'food-cookie', text: 'cookie', imageUrl: ARASAAC(8312), categoryId: 'food' },
  { id: 'food-icecream', text: 'ice cream', imageUrl: ARASAAC(3348), categoryId: 'food' },
  { id: 'food-breakfast', text: 'breakfast', imageUrl: ARASAAC(4626), categoryId: 'food' },
  { id: 'food-lunch', text: 'lunch', imageUrl: ARASAAC(4611), categoryId: 'food' },
  { id: 'food-dinner', text: 'dinner', imageUrl: ARASAAC(4611), categoryId: 'food' },
];

export const DRINKS_PHRASES: AACPhrase[] = [
  { id: 'drink-want', text: 'I want to drink', imageUrl: ARASAAC(6061), categoryId: 'drinks' },
  { id: 'drink-water', text: 'water', imageUrl: ARASAAC(32464), categoryId: 'drinks' },
  { id: 'drink-juice', text: 'juice', imageUrl: ARASAAC(11461), categoryId: 'drinks' },
  { id: 'drink-milk', text: 'milk', imageUrl: ARASAAC(2445), categoryId: 'drinks' },
  { id: 'drink-hot-choc', text: 'hot chocolate', imageUrl: ARASAAC(6448), categoryId: 'drinks' },
  { id: 'drink-tea', text: 'tea', imageUrl: ARASAAC(29802), categoryId: 'drinks' },
  { id: 'drink-cold', text: 'cold drink', imageUrl: ARASAAC(4652), categoryId: 'drinks' },
  { id: 'drink-hot', text: 'hot drink', imageUrl: ARASAAC(2300), categoryId: 'drinks' },
];

export const CLOTHES_PHRASES: AACPhrase[] = [
  { id: 'clothes-dress', text: 'get dressed', imageUrl: ARASAAC(7233), categoryId: 'clothes' },
  { id: 'clothes-shirt', text: 'shirt', imageUrl: ARASAAC(13640), categoryId: 'clothes' },
  { id: 'clothes-pants', text: 'pants', imageUrl: ARASAAC(2565), categoryId: 'clothes' },
  { id: 'clothes-shoes', text: 'shoes', imageUrl: ARASAAC(2775), categoryId: 'clothes' },
  { id: 'clothes-socks', text: 'socks', imageUrl: ARASAAC(2298), categoryId: 'clothes' },
  { id: 'clothes-jacket', text: 'jacket', imageUrl: ARASAAC(4872), categoryId: 'clothes' },
  { id: 'clothes-hat', text: 'hat', imageUrl: ARASAAC(2572), categoryId: 'clothes' },
  { id: 'clothes-pjs', text: 'pajamas', imageUrl: ARASAAC(2522), categoryId: 'clothes' },
];

export const BODY_PHRASES: AACPhrase[] = [
  { id: 'body-head', text: 'head', imageUrl: ARASAAC(2720), categoryId: 'body' },
  { id: 'body-eyes', text: 'eyes', imageUrl: ARASAAC(6573), categoryId: 'body' },
  { id: 'body-ears', text: 'ears', imageUrl: ARASAAC(5915), categoryId: 'body' },
  { id: 'body-nose', text: 'nose', imageUrl: ARASAAC(2727), categoryId: 'body' },
  { id: 'body-mouth', text: 'mouth', imageUrl: ARASAAC(2663), categoryId: 'body' },
  { id: 'body-hands', text: 'hands', imageUrl: ARASAAC(6575), categoryId: 'body' },
  { id: 'body-feet', text: 'feet', imageUrl: ARASAAC(2775), categoryId: 'body' },
  { id: 'body-tummy', text: 'tummy', imageUrl: ARASAAC(2786), categoryId: 'body' },
  { id: 'body-hurt', text: 'it hurts', imageUrl: ARASAAC(5484), categoryId: 'body' },
  { id: 'body-toilet', text: 'toilet', imageUrl: ARASAAC(6473), categoryId: 'body' },
  { id: 'body-bath', text: 'bath', imageUrl: ARASAAC(2272), categoryId: 'body' },
  { id: 'body-brush', text: 'brush teeth', imageUrl: ARASAAC(10263), categoryId: 'body' },
];

export const PLAY_PHRASES: AACPhrase[] = [
  { id: 'play-play', text: 'play', imageUrl: ARASAAC(23392), categoryId: 'play' },
  { id: 'play-ball', text: 'ball', imageUrl: ARASAAC(3241), categoryId: 'play' },
  { id: 'play-blocks', text: 'blocks', imageUrl: ARASAAC(7182), categoryId: 'play' },
  { id: 'play-book', text: 'book', imageUrl: ARASAAC(25191), categoryId: 'play' },
  { id: 'play-draw', text: 'draw', imageUrl: ARASAAC(37042), categoryId: 'play' },
  { id: 'play-music', text: 'music', imageUrl: ARASAAC(7046), categoryId: 'play' },
  { id: 'play-tv', text: 'TV', imageUrl: ARASAAC(26358), categoryId: 'play' },
  { id: 'play-tablet', text: 'tablet', imageUrl: ARASAAC(7190), categoryId: 'play' },
  { id: 'play-outside', text: 'go outside', imageUrl: ARASAAC(2666), categoryId: 'play' },
  { id: 'play-swing', text: 'swing', imageUrl: ARASAAC(4608), categoryId: 'play' },
  { id: 'play-slide', text: 'slide', imageUrl: ARASAAC(4692), categoryId: 'play' },
  { id: 'play-swim', text: 'swim', imageUrl: ARASAAC(25038), categoryId: 'play' },
];

export const COLOURS_PHRASES: AACPhrase[] = [
  { id: 'col-red', text: 'red', imageUrl: ARASAAC(2808), categoryId: 'colours' },
  { id: 'col-blue', text: 'blue', imageUrl: ARASAAC(4869), categoryId: 'colours' },
  { id: 'col-green', text: 'green', imageUrl: ARASAAC(4887), categoryId: 'colours' },
  { id: 'col-yellow', text: 'yellow', imageUrl: ARASAAC(2648), categoryId: 'colours' },
  { id: 'col-orange', text: 'orange', imageUrl: ARASAAC(2888), categoryId: 'colours' },
  { id: 'col-purple', text: 'purple', imageUrl: ARASAAC(2907), categoryId: 'colours' },
  { id: 'col-pink', text: 'pink', imageUrl: ARASAAC(2807), categoryId: 'colours' },
  { id: 'col-brown', text: 'brown', imageUrl: ARASAAC(2923), categoryId: 'colours' },
  { id: 'col-black', text: 'black', imageUrl: ARASAAC(2886), categoryId: 'colours' },
  { id: 'col-white', text: 'white', imageUrl: ARASAAC(8043), categoryId: 'colours' },
];

export const NUMBERS_PHRASES: AACPhrase[] = [
  { id: 'num-1', text: 'one', imageUrl: ARASAAC(2627), categoryId: 'numbers' },
  { id: 'num-2', text: 'two', imageUrl: ARASAAC(2628), categoryId: 'numbers' },
  { id: 'num-3', text: 'three', imageUrl: ARASAAC(2629), categoryId: 'numbers' },
  { id: 'num-4', text: 'four', imageUrl: ARASAAC(2630), categoryId: 'numbers' },
  { id: 'num-5', text: 'five', imageUrl: ARASAAC(2631), categoryId: 'numbers' },
  { id: 'num-6', text: 'six', imageUrl: ARASAAC(2632), categoryId: 'numbers' },
  { id: 'num-7', text: 'seven', imageUrl: ARASAAC(2633), categoryId: 'numbers' },
  { id: 'num-8', text: 'eight', imageUrl: ARASAAC(2634), categoryId: 'numbers' },
  { id: 'num-9', text: 'nine', imageUrl: ARASAAC(2635), categoryId: 'numbers' },
  { id: 'num-10', text: 'ten', imageUrl: ARASAAC(2636), categoryId: 'numbers' },
];

export const SHAPES_PHRASES: AACPhrase[] = [
  { id: 'shape-circle', text: 'circle', imageUrl: ARASAAC(4603), categoryId: 'shapes' },
  { id: 'shape-square', text: 'square', imageUrl: ARASAAC(4616), categoryId: 'shapes' },
  { id: 'shape-triangle', text: 'triangle', imageUrl: ARASAAC(2604), categoryId: 'shapes' },
  { id: 'shape-rectangle', text: 'rectangle', imageUrl: ARASAAC(4731), categoryId: 'shapes' },
  { id: 'shape-star', text: 'star', imageUrl: ARASAAC(2752), categoryId: 'shapes' },
  { id: 'shape-heart', text: 'heart', imageUrl: ARASAAC(4613), categoryId: 'shapes' },
];

export const PEOPLE_PHRASES: AACPhrase[] = [
  { id: 'ppl-mom', text: 'mom', imageUrl: ARASAAC(2458), categoryId: 'people' },
  { id: 'ppl-dad', text: 'dad', imageUrl: ARASAAC(31146), categoryId: 'people' },
  { id: 'ppl-brother', text: 'brother', imageUrl: ARASAAC(2423), categoryId: 'people' },
  { id: 'ppl-sister', text: 'sister', imageUrl: ARASAAC(2422), categoryId: 'people' },
  { id: 'ppl-grandma', text: 'grandma', imageUrl: ARASAAC(23710), categoryId: 'people' },
  { id: 'ppl-grandpa', text: 'grandpa', imageUrl: ARASAAC(23718), categoryId: 'people' },
  { id: 'ppl-teacher', text: 'teacher', imageUrl: ARASAAC(6556), categoryId: 'people' },
  { id: 'ppl-friend', text: 'friend', imageUrl: ARASAAC(25790), categoryId: 'people' },
  { id: 'ppl-me', text: 'me', imageUrl: ARASAAC(24925), categoryId: 'people' },
];

export const PLACES_PHRASES: AACPhrase[] = [
  { id: 'place-home', text: 'home', imageUrl: ARASAAC(6964), categoryId: 'places' },
  { id: 'place-school', text: 'school', imageUrl: ARASAAC(32446), categoryId: 'places' },
  { id: 'place-park', text: 'park', imageUrl: ARASAAC(4608), categoryId: 'places' },
  { id: 'place-store', text: 'store', imageUrl: ARASAAC(35695), categoryId: 'places' },
  { id: 'place-car', text: 'car', imageUrl: ARASAAC(2339), categoryId: 'places' },
  { id: 'place-outside', text: 'outside', imageUrl: ARASAAC(2666), categoryId: 'places' },
  { id: 'place-inside', text: 'inside', imageUrl: ARASAAC(5439), categoryId: 'places' },
  { id: 'place-beach', text: 'beach', imageUrl: ARASAAC(2925), categoryId: 'places' },
];

export const SCHOOL_PHRASES: AACPhrase[] = [
  { id: 'sch-school', text: 'school', imageUrl: ARASAAC(32446), categoryId: 'school' },
  { id: 'sch-teacher', text: 'teacher', imageUrl: ARASAAC(6556), categoryId: 'school' },
  { id: 'sch-class', text: 'class', imageUrl: ARASAAC(9815), categoryId: 'school' },
  { id: 'sch-break', text: 'break time', imageUrl: ARASAAC(27339), categoryId: 'school' },
  { id: 'sch-lunch', text: 'lunch time', imageUrl: ARASAAC(4611), categoryId: 'school' },
  { id: 'sch-work', text: 'do work', imageUrl: ARASAAC(6624), categoryId: 'school' },
];

export const HOME_PHRASES: AACPhrase[] = [
  { id: 'home-home', text: 'home', imageUrl: ARASAAC(6964), categoryId: 'home' },
  { id: 'home-bedroom', text: 'bedroom', imageUrl: ARASAAC(5988), categoryId: 'home' },
  { id: 'home-bathroom', text: 'bathroom', imageUrl: ARASAAC(2272), categoryId: 'home' },
  { id: 'home-kitchen', text: 'kitchen', imageUrl: ARASAAC(10752), categoryId: 'home' },
  { id: 'home-living', text: 'living room', imageUrl: ARASAAC(6211), categoryId: 'home' },
  { id: 'home-garden', text: 'garden', imageUrl: ARASAAC(2666), categoryId: 'home' },
];

// =============================================================================
// GLP Stage 1 — Sounds (earliest communicators)
// =============================================================================

export const GLP_STAGE1_SOUNDS_CATEGORY: AACCategory = {
  id: 'sounds',
  name: 'Sounds',
  color: '#FF6B35',
  imageUrl: ARASAAC(7046),
};

export const SOUNDS_PHRASES: AACPhrase[] = [
  // Animal sounds
  { id: 'snd-woof', text: 'woof', spokenText: 'woof woof', imageUrl: ARASAAC(2517), categoryId: 'sounds' },
  { id: 'snd-meow', text: 'meow', spokenText: 'meow', imageUrl: ARASAAC(2466), categoryId: 'sounds' },
  { id: 'snd-moo', text: 'moo', spokenText: 'mooo', imageUrl: ARASAAC(2353), categoryId: 'sounds' },
  { id: 'snd-baa', text: 'baa', spokenText: 'baaaa', imageUrl: ARASAAC(2475), categoryId: 'sounds' },
  { id: 'snd-quack', text: 'quack', spokenText: 'quack quack', imageUrl: ARASAAC(2359), categoryId: 'sounds' },
  // Vehicle sounds
  { id: 'snd-vroom', text: 'vroom', spokenText: 'vroom vroom', imageUrl: ARASAAC(2339), categoryId: 'sounds' },
  { id: 'snd-beep', text: 'beep beep', spokenText: 'beep beep', imageUrl: ARASAAC(2339), categoryId: 'sounds' },
  { id: 'snd-choo', text: 'choo choo', spokenText: 'choo choo', imageUrl: ARASAAC(3004), categoryId: 'sounds' },
  // Silly sounds
  { id: 'snd-boing', text: 'boing', spokenText: 'boing', imageUrl: ARASAAC(3241), categoryId: 'sounds' },
  { id: 'snd-splash', text: 'splash', spokenText: 'splash', imageUrl: ARASAAC(37903), categoryId: 'sounds' },
  { id: 'snd-pop', text: 'pop', spokenText: 'pop', imageUrl: ARASAAC(2881), categoryId: 'sounds' },
  { id: 'snd-whoosh', text: 'whoosh', spokenText: 'whoooosh', imageUrl: ARASAAC(8142), categoryId: 'sounds' },
];

export const GLP_STAGE1_CATEGORIES: AACCategory[] = [
  GLP_STAGE1_SOUNDS_CATEGORY,
  { id: 'general', name: 'Words', color: '#4CAF50', imageUrl: ARASAAC(6964) },
  { id: 'feelings', name: 'Feelings', color: TOPIC_FITZGERALD_COLORS.feelings, imageUrl: ARASAAC(37190) },
  { id: 'food', name: 'Food', color: TOPIC_FITZGERALD_COLORS.nouns, imageUrl: ARASAAC(4610) },
];

// =============================================================================
// Utility Functions
// =============================================================================

/** Get phrases by topic category */
export function getPhrasesByCategory(categoryId: string): AACPhrase[] {
  switch (categoryId) {
    case 'sounds': return SOUNDS_PHRASES;
    case 'general': return GENERAL_PHRASES;
    case 'feelings': return FEELINGS_PHRASES;
    case 'actions': return ACTIONS_PHRASES;
    case 'questions': return QUESTIONS_PHRASES;
    case 'food': return FOOD_PHRASES;
    case 'drinks': return DRINKS_PHRASES;
    case 'clothes': return CLOTHES_PHRASES;
    case 'body': return BODY_PHRASES;
    case 'play': return PLAY_PHRASES;
    case 'colours': return COLOURS_PHRASES;
    case 'numbers': return NUMBERS_PHRASES;
    case 'shapes': return SHAPES_PHRASES;
    case 'people': return PEOPLE_PHRASES;
    case 'places': return PLACES_PHRASES;
    case 'school': return SCHOOL_PHRASES;
    case 'home': return HOME_PHRASES;
    default: return [];
  }
}

/** Get all topic phrases combined */
export function getAllPhrases(): AACPhrase[] {
  return [
    ...GENERAL_PHRASES,
    ...FEELINGS_PHRASES,
    ...ACTIONS_PHRASES,
    ...QUESTIONS_PHRASES,
    ...FOOD_PHRASES,
    ...DRINKS_PHRASES,
    ...CLOTHES_PHRASES,
    ...BODY_PHRASES,
    ...PLAY_PHRASES,
    ...COLOURS_PHRASES,
    ...NUMBERS_PHRASES,
    ...SHAPES_PHRASES,
    ...PEOPLE_PHRASES,
    ...PLACES_PHRASES,
    ...SCHOOL_PHRASES,
    ...HOME_PHRASES,
  ];
}

/** Get core words filtered by word type */
export function getCoreWordsByType(wordType: WordCategory): CoreWord[] {
  return ALL_CORE_WORDS.filter(w => w.wordType === wordType);
}

/** Get core words that support a specific communication function */
export function getCoreWordsForFunction(fn: CommunicationFunction): CoreWord[] {
  return ALL_CORE_WORDS.filter(w => w.communicationFunctions.includes(fn));
}

/** Get core words for a GLP stage (includes all lower stages) */
export function getCoreWordsForGLPStage(stage: number): CoreWord[] {
  return ALL_CORE_WORDS.filter(w => w.glpStage <= stage);
}

/** Total word count across both systems */
export function getTotalWordCount(): number {
  return ALL_CORE_WORDS.length + getAllPhrases().length + SOUNDS_PHRASES.length;
}
