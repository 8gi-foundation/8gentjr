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
    <div style={{
      minHeight: '100vh',
      background: '#FFF8F0',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px',
        textAlign: 'center',
        borderBottom: '1px solid #eee',
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#1a1a2e' }}>
          Paginated AAC Grid
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>
          Swipe between pages of symbols
        </p>
      </header>

      {/* Sentence strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minHeight: '56px',
        padding: '8px 12px',
        margin: '12px',
        background: '#374151',
        borderRadius: '12px',
      }}>
        <button
          onClick={handleSpeakAll}
          disabled={sentence.length === 0}
          style={{
            flexShrink: 0,
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            border: 'none',
            background: sentence.length > 0 ? '#10B981' : '#6B7280',
            color: '#fff',
            cursor: sentence.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '18px',
            fontWeight: 700,
          }}
          aria-label="Speak sentence"
        >
          &#9654;
        </button>

        <div style={{
          flex: 1,
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          alignItems: 'center',
        }}>
          {sentence.length === 0 ? (
            <span style={{ color: '#9CA3AF', fontSize: '15px', padding: '0 8px' }}>
              Tap symbols to build a sentence...
            </span>
          ) : (
            sentence.map((word, i) => (
              <span key={`${word}-${i}`} style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#E8610A',
                color: '#fff',
                fontWeight: 600,
                fontSize: '14px',
              }}>
                {word}
              </span>
            ))
          )}
        </div>

        {sentence.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              flexShrink: 0,
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              border: 'none',
              background: '#EF4444',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 700,
            }}
            aria-label="Clear sentence"
          >
            &#10005;
          </button>
        )}
      </div>

      {/* Paginated grid */}
      <div style={{ padding: '0 4px' }}>
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
