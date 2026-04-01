'use client';

/**
 * 8gent Jr — Sentence Builder Component
 *
 * Sentence strip with word suggestion chips powered by a local sentence engine.
 * Uses Web Speech API for TTS. Encouragement messages on milestones.
 *
 * Issue: #22
 */

import { useState, useCallback, useEffect } from 'react';
import {
  suggestNextWord,
  improveSentence,
  getWordColor,
} from '@/lib/sentence-engine';

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

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const text = improvedPreview || selectedWords.join(' ');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [selectedWords, improvedPreview]);

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: 16 }}>
      {/* Header */}
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#1a1a2e',
          marginBottom: 4,
          textAlign: 'center',
        }}
      >
        Sentence Builder
      </h1>
      <p
        style={{
          fontSize: '0.9rem',
          color: '#888',
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        Tap words to build a sentence, then press Speak
      </p>

      {/* Sentence strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 56,
          padding: '10px 14px',
          marginBottom: 8,
          background: '#f5f5f5',
          borderRadius: 14,
          fontSize: '1.15rem',
          flexWrap: 'wrap',
          border: '2px solid #e0e0e0',
        }}
      >
        {selectedWords.length === 0 ? (
          <span style={{ color: '#aaa', fontStyle: 'italic' }}>
            Tap words below to start...
          </span>
        ) : (
          selectedWords.map((word, i) => (
            <span
              key={`${word}-${i}`}
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 8,
                background: getWordColor(word) + '22',
                border: `2px solid ${getWordColor(word)}`,
                fontWeight: 600,
                color: '#1a1a2e',
                fontSize: '1rem',
              }}
            >
              {word}
            </span>
          ))
        )}
      </div>

      {/* Improved preview */}
      {improvedPreview && (
        <div
          style={{
            padding: '8px 14px',
            marginBottom: 8,
            background: '#e8f5e9',
            borderRadius: 10,
            fontSize: '0.9rem',
            color: '#2e7d32',
            fontStyle: 'italic',
          }}
        >
          {improvedPreview}
        </div>
      )}

      {/* Encouragement */}
      {encouragement && (
        <div
          style={{
            padding: '8px 14px',
            marginBottom: 8,
            background: '#fff3e0',
            borderRadius: 10,
            fontSize: '1rem',
            fontWeight: 700,
            color: '#E8610A',
            textAlign: 'center',
            animation: 'fadeIn 0.3s ease-in',
          }}
        >
          {encouragement}
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <button
          onClick={handleRemoveLast}
          disabled={selectedWords.length === 0}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            background: selectedWords.length > 0 ? '#ff9800' : '#e0e0e0',
            color: selectedWords.length > 0 ? '#fff' : '#999',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: selectedWords.length > 0 ? 'pointer' : 'default',
          }}
        >
          Undo
        </button>
        <button
          onClick={handleClear}
          disabled={selectedWords.length === 0}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            background: selectedWords.length > 0 ? '#f44336' : '#e0e0e0',
            color: selectedWords.length > 0 ? '#fff' : '#999',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: selectedWords.length > 0 ? 'pointer' : 'default',
          }}
        >
          Clear
        </button>
        <button
          onClick={handleSpeak}
          disabled={selectedWords.length === 0 || isSpeaking}
          style={{
            flex: 2,
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            background:
              selectedWords.length === 0
                ? '#e0e0e0'
                : isSpeaking
                  ? '#1b5e20'
                  : '#4CAF50',
            color: selectedWords.length > 0 ? '#fff' : '#999',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: selectedWords.length > 0 && !isSpeaking ? 'pointer' : 'default',
          }}
        >
          {isSpeaking ? 'Speaking...' : 'Speak'}
        </button>
      </div>

      {/* Word suggestion chips */}
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            fontSize: '0.8rem',
            color: '#888',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {selectedWords.length === 0 ? 'Start with' : 'Next word'}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {suggestions.map((word) => (
          <button
            key={word}
            onClick={() => handleAddWord(word)}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              border: `2px solid ${getWordColor(word)}`,
              background: '#fff',
              color: '#1a1a2e',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'transform 0.1s, background 0.1s',
            }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.93)';
              (e.currentTarget as HTMLButtonElement).style.background = getWordColor(word) + '22';
            }}
            onPointerUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.background = '#fff';
            }}
            onPointerLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.background = '#fff';
            }}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
