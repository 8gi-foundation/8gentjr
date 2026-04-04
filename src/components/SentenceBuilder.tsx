'use client';

/**
 * 8gent Jr — Sentence Builder Component
 *
 * Sentence strip with word suggestion chips powered by a local sentence engine.
 * Uses ElevenLabs TTS (via tts.ts) for all speech output.
 *
 * Two speak modes:
 *   Speak  — speaks the raw words as-is
 *   ✨ Magic — calls /api/improve-sentence (Groq LLM), shows & speaks the
 *             grammatically corrected version
 *
 * Issue: #22
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  suggestNextWord,
  getWordColor,
  getAllWords,
} from '@/lib/sentence-engine';
import { speak } from '@/lib/tts';
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
  const [isMagicking, setIsMagicking] = useState(false);
  const [magicPreview, setMagicPreview] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local suggestions as baseline (always available)
  const localSuggestions = suggestNextWord(selectedWords);
  const suggestions = aiSuggestions ?? localSuggestions;

  // Fetch AI autocomplete suggestions (with debounce + local fallback)
  useEffect(() => {
    setAiSuggestions(null);
    if (selectedWords.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const lastWord = selectedWords[selectedWords.length - 1];
        const res = await fetch('/api/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: lastWord, existingWords: getAllWords() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions?.length > 0) setAiSuggestions(data.suggestions);
        }
      } catch {
        // Fall back to local suggestions silently
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selectedWords]);

  // Encouragement on milestones
  useEffect(() => {
    const msg = ENCOURAGEMENTS[selectedWords.length];
    if (msg) {
      setEncouragement(msg);
      const timer = setTimeout(() => setEncouragement(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [selectedWords.length]);

  // Clear magic preview when words change
  useEffect(() => {
    setMagicPreview(null);
  }, [selectedWords]);

  const handleAddWord = useCallback((word: string) => {
    setSelectedWords((prev) => [...prev, word]);
  }, []);

  const handleRemoveLast = useCallback(() => {
    setSelectedWords((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setSelectedWords([]);
    setMagicPreview(null);
  }, []);

  // Speak raw words via ElevenLabs
  const handleSpeak = useCallback(async () => {
    if (selectedWords.length === 0 || isSpeaking) return;
    setIsSpeaking(true);
    try {
      await speak({ text: selectedWords.join(' '), rate: settings.ttsRate });
    } finally {
      setIsSpeaking(false);
    }
  }, [selectedWords, isSpeaking, settings.ttsRate]);

  // Magic: AI-improve the sentence, then speak it via ElevenLabs
  const handleMagic = useCallback(async () => {
    if (selectedWords.length === 0 || isMagicking) return;
    setIsMagicking(true);
    try {
      const res = await fetch('/api/improve-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: selectedWords }),
      });
      const improved = res.ok
        ? (await res.json()).improved ?? selectedWords.join(' ')
        : selectedWords.join(' ');
      setMagicPreview(improved);
      await speak({ text: improved, rate: settings.ttsRate });
    } catch {
      await speak({ text: selectedWords.join(' '), rate: settings.ttsRate });
    } finally {
      setIsMagicking(false);
    }
  }, [selectedWords, isMagicking, settings.ttsRate]);

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

      {/* Magic preview */}
      {magicPreview && (
        <div className="px-3.5 py-2 mb-2 bg-purple-50 rounded-[10px] text-sm text-purple-700 italic flex items-center gap-2">
          <span>✨</span>
          <span>{magicPreview}</span>
        </div>
      )}

      {/* Encouragement */}
      {encouragement && (
        <div className="px-3.5 py-2 mb-2 bg-[var(--brand-bg-accent)] rounded-[10px] text-base font-bold text-[var(--brand-accent)] text-center">
          {encouragement}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleRemoveLast}
          disabled={!hasWords}
          className={`flex-1 py-2.5 rounded-[10px] border-none font-semibold text-sm cursor-pointer ${
            hasWords ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400 cursor-default'
          }`}
        >
          Undo
        </button>
        <button
          onClick={handleClear}
          disabled={!hasWords}
          className={`flex-1 py-2.5 rounded-[10px] border-none font-semibold text-sm cursor-pointer ${
            hasWords ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-400 cursor-default'
          }`}
        >
          Clear
        </button>
        <button
          onClick={handleSpeak}
          disabled={!hasWords || isSpeaking || isMagicking}
          className={`flex-1 py-2.5 rounded-[10px] border-none font-bold text-base cursor-pointer ${
            !hasWords
              ? 'bg-gray-200 text-gray-400 cursor-default'
              : isSpeaking
                ? 'bg-green-800 text-white'
                : 'bg-green-500 text-white'
          }`}
        >
          {isSpeaking ? '…' : 'Speak'}
        </button>
        <button
          onClick={handleMagic}
          disabled={!hasWords || isMagicking || isSpeaking}
          className={`flex-[1.4] py-2.5 rounded-[10px] border-none font-bold text-base cursor-pointer ${
            !hasWords
              ? 'bg-gray-200 text-gray-400 cursor-default'
              : isMagicking
                ? 'bg-purple-800 text-white'
                : 'bg-purple-500 text-white'
          }`}
        >
          {isMagicking ? '✨…' : '✨ Magic'}
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
