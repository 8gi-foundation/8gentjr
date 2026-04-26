/**
 * 8gent Jr - Gestalt Language Processing (GLP) Stages
 *
 * Six stages modelled on Marge Blanc's Natural Language Acquisition (NLA)
 * framework for gestalt language processors:
 *   1. Echolalia / whole gestalts (scripted chunks repeated as a unit)
 *   2. Mitigated gestalts (chunks trimmed, mixed, recombined)
 *   3. Isolated single words breaking out from gestalts
 *   4. Early original sentences (2-3 word novel combinations)
 *   5. Complex grammar (questions, conjunctions, articles, prepositions)
 *   6. Full conversation (multi-turn, narrative, social-pragmatic)
 *
 * Each stage defines the typical max utterance length, grammar features,
 * and the vocabulary tier the child can access.
 *
 * Issues: #53, #143
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GLPStage {
  /** Stage number 1-6 (NLA order) */
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
// Stage definitions (Marge Blanc NLA)
// ---------------------------------------------------------------------------

export const GLP_STAGES: GLPStage[] = [
  {
    id: 1,
    name: 'Echolalia / Whole Gestalts',
    description:
      'Whole scripted chunks repeated as a single unit. The child uses memorised phrases (often from songs, shows, or caregivers) to communicate intent. Treat each gestalt as one indivisible message.',
    maxWords: 6,
    grammarFeatures: ['whole-gestalt', 'scripted-chunk'],
    wordCategories: ['gestalt', 'social'],
    examples: ["let's go", 'all done', 'time to eat', 'I love you', 'see you later'],
  },
  {
    id: 2,
    name: 'Mitigated Gestalts',
    description:
      'Gestalts begin to be trimmed, mixed, and recombined. The child swaps parts of one script with parts of another, producing partial scripts that point toward flexibility.',
    maxWords: 6,
    grammarFeatures: ['whole-gestalt', 'scripted-chunk', 'gestalt-mix', 'partial-script'],
    wordCategories: ['gestalt', 'social', 'noun', 'verb'],
    examples: ["let's eat", 'all done play', 'time to go', 'I love water', 'see you home'],
  },
  {
    id: 3,
    name: 'Single Words from Gestalts',
    description:
      'Isolated single words begin to break free of gestalts. The child labels, requests, and refuses with one word at a time. Focus on high-frequency core vocabulary.',
    maxWords: 1,
    grammarFeatures: ['single-word'],
    wordCategories: ['noun', 'verb', 'social', 'pronoun'],
    examples: ['more', 'stop', 'help', 'water', 'play', 'yes', 'no'],
  },
  {
    id: 4,
    name: 'Early Original Sentences',
    description:
      'Novel 2-3 word combinations the child has never heard as a script. Agent + action, action + object, attribute + object, subject + verb + object.',
    maxWords: 3,
    grammarFeatures: ['agent-action', 'action-object', 'subject-verb-object'],
    wordCategories: ['noun', 'verb', 'social', 'pronoun', 'adjective', 'determiner'],
    examples: ['want more', 'go home', 'big toy', 'I want water', 'play the game', 'I feel sad'],
  },
  {
    id: 5,
    name: 'Complex Grammar',
    description:
      'Questions, conjunctions, articles, prepositions, and longer expressions. The child applies grammatical rules to build flexible original sentences.',
    maxWords: 8,
    grammarFeatures: [
      'agent-action',
      'action-object',
      'subject-verb-object',
      'prepositions',
      'articles',
      'questions',
      'conjunctions',
      'temporal',
    ],
    wordCategories: [
      'noun',
      'verb',
      'social',
      'pronoun',
      'adjective',
      'determiner',
      'preposition',
      'question',
      'adverb',
    ],
    examples: [
      'what do you want to play',
      'I want to go outside and play',
      'can we have food now please',
    ],
  },
  {
    id: 6,
    name: 'Full Conversation',
    description:
      'Multi-turn conversation, narrative, social-pragmatic language, and open expression. The child sustains topics, takes turns, and shares experience.',
    maxWords: 12,
    grammarFeatures: [
      'agent-action',
      'action-object',
      'subject-verb-object',
      'prepositions',
      'articles',
      'questions',
      'conjunctions',
      'temporal',
      'narrative',
      'social-pragmatic',
    ],
    wordCategories: [
      'noun',
      'verb',
      'social',
      'pronoun',
      'adjective',
      'determiner',
      'preposition',
      'question',
      'adverb',
    ],
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

/** Get a stage by ID (1-6). Returns stage 3 (single-word emergence) as safe default. */
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
