/**
 * 8gent Jr — Graded Language Proficiency (GLP) Stages
 *
 * Six stages modelled on typical AAC/SLP progression:
 *   1. Single words (requesting, labelling)
 *   2. Two-word combinations (agent + action, action + object)
 *   3. Three-word sentences (subject + verb + object)
 *   4. Simple sentences (4-5 words with grammar)
 *   5. Complex sentences (conjunctions, questions, temporal)
 *   6. Conversation (multi-turn, narrative, social)
 *
 * Each stage defines the max utterance length, grammar features,
 * and the vocabulary tier the child can access.
 *
 * Issue: #53
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GLPStage {
  /** Stage number 1-6 */
  id: number;
  /** Short label */
  name: string;
  /** Description for parents/therapists */
  description: string;
  /** Max words per utterance at this stage */
  maxWords: number;
  /** Grammar features unlocked */
  grammarFeatures: string[];
  /** Word categories available */
  wordCategories: string[];
  /** Example utterances */
  examples: string[];
}

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

export const GLP_STAGES: GLPStage[] = [
  {
    id: 1,
    name: 'Single Words',
    description: 'Requesting and labelling with single words. Focus on high-frequency core vocabulary.',
    maxWords: 1,
    grammarFeatures: [],
    wordCategories: ['noun', 'verb', 'social'],
    examples: ['more', 'stop', 'help', 'water', 'play', 'yes', 'no'],
  },
  {
    id: 2,
    name: 'Two-Word Combinations',
    description: 'Combining two words: agent+action, action+object, attribute+object.',
    maxWords: 2,
    grammarFeatures: ['agent-action', 'action-object'],
    wordCategories: ['noun', 'verb', 'social', 'pronoun', 'adjective'],
    examples: ['want more', 'go home', 'big toy', 'I want', 'help me', 'play music'],
  },
  {
    id: 3,
    name: 'Three-Word Sentences',
    description: 'Subject + verb + object structures. Basic sentence formation.',
    maxWords: 3,
    grammarFeatures: ['agent-action', 'action-object', 'subject-verb-object'],
    wordCategories: ['noun', 'verb', 'social', 'pronoun', 'adjective', 'determiner'],
    examples: ['I want water', 'she is happy', 'play the game', 'I feel sad'],
  },
  {
    id: 4,
    name: 'Simple Sentences',
    description: 'Full simple sentences with articles, prepositions, and basic grammar.',
    maxWords: 5,
    grammarFeatures: ['agent-action', 'action-object', 'subject-verb-object', 'prepositions', 'articles'],
    wordCategories: ['noun', 'verb', 'social', 'pronoun', 'adjective', 'determiner', 'preposition'],
    examples: ['I want to go home', 'can I have more water', 'I am happy today'],
  },
  {
    id: 5,
    name: 'Complex Sentences',
    description: 'Questions, conjunctions, temporal words, and longer expressions.',
    maxWords: 8,
    grammarFeatures: [
      'agent-action', 'action-object', 'subject-verb-object',
      'prepositions', 'articles', 'questions', 'conjunctions', 'temporal',
    ],
    wordCategories: ['noun', 'verb', 'social', 'pronoun', 'adjective', 'determiner', 'preposition', 'question', 'adverb'],
    examples: [
      'what do you want to play',
      'I want to go outside and play',
      'can we have food now please',
    ],
  },
  {
    id: 6,
    name: 'Conversation',
    description: 'Multi-turn conversation, narrative, social language, and open expression.',
    maxWords: 12,
    grammarFeatures: [
      'agent-action', 'action-object', 'subject-verb-object',
      'prepositions', 'articles', 'questions', 'conjunctions', 'temporal',
      'narrative', 'social-pragmatic',
    ],
    wordCategories: ['noun', 'verb', 'social', 'pronoun', 'adjective', 'determiner', 'preposition', 'question', 'adverb'],
    examples: [
      'hello, I am happy today because we played outside',
      'can you help me with the big book please',
      'I liked the game but I feel tired now',
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get a stage by ID (1-6). Returns stage 3 as safe default. */
export function getStage(id: number): GLPStage {
  return GLP_STAGES.find((s) => s.id === id) ?? GLP_STAGES[2];
}

/** Check if a word category is available at a given stage */
export function isCategoryAvailable(stageId: number, category: string): boolean {
  const stage = getStage(stageId);
  return stage.wordCategories.includes(category);
}

/** Get max words allowed for a stage */
export function getMaxWords(stageId: number): number {
  return getStage(stageId).maxWords;
}
