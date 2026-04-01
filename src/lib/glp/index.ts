/**
 * 8gent Jr — GLP (Graded Language Proficiency) module
 *
 * Re-exports stages and vocabulary for clean imports:
 *   import { getStage, getWordsForStage } from '@/lib/glp';
 *
 * Issue: #53
 */

export { GLP_STAGES, getStage, isCategoryAvailable, getMaxWords } from './stages';
export type { GLPStage } from './stages';

export { VOCABULARY, getWordsForStage, getWordsByCategory, getWordStringsForStage, getStageWordCounts } from './vocabulary';
export type { VocabWord } from './vocabulary';
