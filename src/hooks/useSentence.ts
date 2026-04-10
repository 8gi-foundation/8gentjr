'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { sentenceStore, type SentenceWord } from '@/lib/sentence-store';

/**
 * React hook for the shared persistent sentence store.
 * Works across all AAC surfaces — Core grid, Browse categories, etc.
 */
export function useSentence() {
  const words = useSyncExternalStore(
    sentenceStore.subscribe,
    sentenceStore.getWords,
    // Server snapshot — empty
    () => [] as SentenceWord[],
  );

  const addWord = useCallback((word: SentenceWord) => {
    sentenceStore.addWord(word);
  }, []);

  const removeWord = useCallback((index: number) => {
    sentenceStore.removeWord(index);
  }, []);

  const clear = useCallback(() => {
    sentenceStore.clear();
  }, []);

  return { words, addWord, removeWord, clear };
}
