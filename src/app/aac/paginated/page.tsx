'use client';

/**
 * Paginated AAC Grid — Demo Route
 *
 * Demonstrates the PaginatedGrid component with sample AAC symbols.
 * Tapping a card speaks it aloud via Web Speech API and adds it
 * to a sentence strip.
 *
 * Route: /aac/paginated
 * @see https://github.com/8gi-foundation/8gentjr/issues/6
 */

import React, { useState, useCallback } from 'react';
import PaginatedGrid, { AACCardData } from '@/components/PaginatedGrid';

// =============================================================================
// Sample cards — covers core AAC vocabulary
// =============================================================================

const DEMO_CARDS: AACCardData[] = [
  { id: 'want',    label: 'I want',    emoji: '👋' },
  { id: 'eat',     label: 'Eat',       emoji: '🍽️' },
  { id: 'drink',   label: 'Drink',     emoji: '🥤' },
  { id: 'play',    label: 'Play',      emoji: '🎮' },
  { id: 'help',    label: 'Help',      emoji: '🆘' },
  { id: 'more',    label: 'More',      emoji: '➕' },
  { id: 'stop',    label: 'Stop',      emoji: '🛑' },
  { id: 'yes',     label: 'Yes',       emoji: '✅' },
  { id: 'no',      label: 'No',        emoji: '❌' },
  { id: 'happy',   label: 'Happy',     emoji: '😊' },
  { id: 'sad',     label: 'Sad',       emoji: '😢' },
  { id: 'tired',   label: 'Tired',     emoji: '😴' },
  { id: 'toilet',  label: 'Toilet',    emoji: '🚽' },
  { id: 'water',   label: 'Water',     emoji: '💧' },
  { id: 'home',    label: 'Home',      emoji: '🏠' },
  { id: 'outside', label: 'Outside',   emoji: '🌳' },
  { id: 'music',   label: 'Music',     emoji: '🎵' },
  { id: 'book',    label: 'Book',      emoji: '📖' },
  { id: 'hug',     label: 'Hug',       emoji: '🤗' },
  { id: 'sleep',   label: 'Sleep',     emoji: '😴' },
  { id: 'hot',     label: 'Hot',       emoji: '🔥' },
  { id: 'cold',    label: 'Cold',      emoji: '🥶' },
  { id: 'hurt',    label: 'Hurt',      emoji: '🤕' },
  { id: 'love',    label: 'Love',      emoji: '❤️' },
];

// =============================================================================
// TTS helper
// =============================================================================

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
}

// =============================================================================
// Page component
// =============================================================================

export default function PaginatedAACPage() {
  const [sentence, setSentence] = useState<string[]>([]);

  const handleCardTap = useCallback((card: AACCardData) => {
    speak(card.label);
    setSentence((prev) => [...prev, card.label]);
  }, []);

  const handleClear = useCallback(() => {
    setSentence([]);
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  const handleSpeakAll = useCallback(() => {
    if (sentence.length === 0) return;
    speak(sentence.join(' '));
  }, [sentence]);

  return (
    <div className="min-h-screen bg-[var(--brand-bg-warm)] font-sans">
      {/* Header */}
      <header className="p-4 text-center border-b border-[var(--warm-border-light)]">
        <h1 className="m-0 text-xl text-[var(--warm-text)]">
          Paginated AAC Grid
        </h1>
        <p className="mt-1 mb-0 text-sm text-[var(--warm-text-secondary)]">
          Swipe between pages of symbols
        </p>
      </header>

      {/* Sentence strip */}
      <div className="flex items-center gap-2 min-h-[56px] px-3 py-2 m-3 bg-gray-700 rounded-xl">
        <button
          onClick={handleSpeakAll}
          disabled={sentence.length === 0}
          className={`shrink-0 w-11 h-11 rounded-[10px] border-none text-white text-lg font-bold ${
            sentence.length > 0
              ? 'bg-emerald-500 cursor-pointer'
              : 'bg-gray-500 cursor-not-allowed'
          }`}
          aria-label="Speak sentence"
        >
          &#9654;
        </button>

        <div className="flex-1 flex gap-1.5 overflow-x-auto items-center">
          {sentence.length === 0 ? (
            <span className="text-gray-400 text-[15px] px-2">
              Tap symbols to build a sentence...
            </span>
          ) : (
            sentence.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--brand-accent)] text-white font-semibold text-sm"
              >
                {word}
              </span>
            ))
          )}
        </div>

        {sentence.length > 0 && (
          <button
            onClick={handleClear}
            className="shrink-0 w-11 h-11 rounded-[10px] border-none bg-red-500 text-white cursor-pointer text-lg font-bold"
            aria-label="Clear sentence"
          >
            &#10005;
          </button>
        )}
      </div>

      {/* Paginated grid */}
      <div className="px-1">
        <PaginatedGrid
          cards={DEMO_CARDS}
          itemsPerPage={8}
          columns={4}
          onCardTap={handleCardTap}
        />
      </div>
    </div>
  );
}
