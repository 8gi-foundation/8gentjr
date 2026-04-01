'use client';

/**
 * 8gent Jr — Sentence Builder Component
 *
 * Sentence strip with word suggestion chips powered by a local sentence engine.
 * Uses Web Speech API for TTS with AppContext ttsRate.
 * Encouragement messages on milestones.
 *
 * Issue: #22
 */

import { useState, useCallback, useEffect } from 'react';
import {
  suggestNextWord,
  improveSentence,
  getWordColor,
} from '@/lib/sentence-engine';
import { useApp } from '@/context/AppContext';

// ---------------------------------------------------------------------------
// Encouragement messages
// ---------------------------------------------------------------------------

const ENCOURAGEMENTS: Record<number, string> = {
  2: 'Nice start!',
  3: 'Great sentence!',
  5: 'Amazing work!',
  7: 'You are on fire!',
  10: 'Incredible sentence!',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SentenceBuilder() {
  const { settings } = useApp();
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [improvedPreview, setImprovedPreview] = useState<string | null>(null);

  const suggestions = suggestNextWord(selectedWords);

  // Show encouragement on milestones
  useEffect(() => {
    const msg = ENCOURAGEMENTS[selectedWords.length];
    if (msg) {
      setEncouragement(msg);
      const timer = setTimeout(() => setEncouragement(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [selectedWords.length]);

  // Update improved preview when words change
  useEffect(() => {
    if (selectedWords.length >= 2) {
      setImprovedPreview(improveSentence(selectedWords));
    } else {
      setImprovedPreview(null);
    }
  }, [selectedWords]);

  const handleAddWord = useCallback((word: string) => {
    setSelectedWords((prev) => [...prev, word]);
  }, []);

  const handleRemoveLast = useCallback(() => {
    setSelectedWords((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setSelectedWords([]);
    setImprovedPreview(null);
  }, []);

  const handleSpeak = useCallback(() => {
    if (selectedWords.length === 0) return;
    if (!('speechSynthesis' in window)) {
      alert('Speech is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    const text = improvedPreview || selectedWords.join(' ');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.ttsRate;
    utterance.pitch = 1.1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [selectedWords, improvedPreview, settings.ttsRate]);

  const hasWords = selectedWords.length > 0;

  return (
    <div className="w-full max-w-[600px] mx-auto p-4">
      {/* Header */}
      <h1 className="text-2xl font-bold text-[var(--warm-text)] mb-1 text-center">
        Sentence Builder
      </h1>
      <p className="text-sm text-[var(--warm-text-muted)] mb-4 text-center">
        Tap words to build a sentence, then press Speak
      </p>

      {/* Sentence strip */}
      <div className="flex items-center gap-2 min-h-[56px] px-3.5 py-2.5 mb-2 bg-gray-100 rounded-[14px] text-lg flex-wrap border-2 border-gray-300">
        {!hasWords ? (
          <span className="text-[var(--warm-text-placeholder)] italic">
            Tap words below to start...
          </span>
        ) : (
          selectedWords.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="inline-block px-2.5 py-1 rounded-lg font-semibold text-[var(--warm-text)] text-base"
              style={{
                backgroundColor: getWordColor(word) + '22',
                border: `2px solid ${getWordColor(word)}`,
              }}
            >
              {word}
            </span>
          ))
        )}
      </div>

      {/* Improved preview */}
      {improvedPreview && (
        <div className="px-3.5 py-2 mb-2 bg-green-50 rounded-[10px] text-sm text-green-700 italic">
          {improvedPreview}
        </div>
      )}

      {/* Encouragement */}
      {encouragement && (
        <div className="px-3.5 py-2 mb-2 bg-[var(--brand-bg-accent)] rounded-[10px] text-base font-bold text-[var(--brand-accent)] text-center animate-[fadeIn_0.3s_ease-in]">
          {encouragement}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleRemoveLast}
          disabled={!hasWords}
          className={`flex-1 py-2.5 rounded-[10px] border-none font-semibold text-sm cursor-pointer ${
            hasWords
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-400 cursor-default'
          }`}
        >
          Undo
        </button>
        <button
          onClick={handleClear}
          disabled={!hasWords}
          className={`flex-1 py-2.5 rounded-[10px] border-none font-semibold text-sm cursor-pointer ${
            hasWords
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-400 cursor-default'
          }`}
        >
          Clear
        </button>
        <button
          onClick={handleSpeak}
          disabled={!hasWords || isSpeaking}
          className={`flex-[2] py-2.5 rounded-[10px] border-none font-bold text-base cursor-pointer ${
            !hasWords
              ? 'bg-gray-200 text-gray-400 cursor-default'
              : isSpeaking
                ? 'bg-green-800 text-white'
                : 'bg-green-500 text-white'
          }`}
        >
          {isSpeaking ? 'Speaking...' : 'Speak'}
        </button>
      </div>

      {/* Word suggestion chips */}
      <div className="mb-2">
        <span className="text-xs text-[var(--warm-text-muted)] font-semibold uppercase tracking-wide">
          {selectedWords.length === 0 ? 'Start with' : 'Next word'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((word) => (
          <button
            key={word}
            onClick={() => handleAddWord(word)}
            className="px-4 py-2.5 rounded-xl bg-white text-[var(--warm-text)] font-semibold text-base cursor-pointer transition-transform duration-100 active:scale-[0.93]"
            style={{ border: `2px solid ${getWordColor(word)}` }}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
