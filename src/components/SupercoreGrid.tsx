'use client';

/**
 * Supercore 50 Core Word Grid
 *
 * Fixed-position AAC grid following Smartbox Supercore design principles.
 * 50 high-frequency words covering ~40-45% of daily communication.
 *
 * CRITICAL AAC RULES:
 * 1. Words NEVER move once positioned (motor planning consistency)
 * 2. Grid layout is fixed (no drag-and-drop, no reordering)
 * 3. Each word has: text label + color category indicator
 * 4. Tapping a word speaks it aloud (Web Speech API) and adds to sentence strip
 *
 * Color coding: Modified Fitzgerald Key
 * - Yellow:  People (pronouns)
 * - Green:   Verbs (actions)
 * - Blue:    Descriptors (adjectives)
 * - Purple:  Prepositions (location words)
 * - Pink:    Social (greetings, manners)
 * - Orange:  Questions
 * - White:   Determiners (articles, misc)
 * - Red:     Negation (no, don't, stop)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

// =============================================================================
// Fitzgerald Key Color Definitions
// =============================================================================

type FitzgeraldCategory =
  | 'people'
  | 'verbs'
  | 'descriptors'
  | 'prepositions'
  | 'social'
  | 'questions'
  | 'determiners'
  | 'negation';

const FITZGERALD_COLORS: Record<FitzgeraldCategory, { bg: string; text: string; border: string }> = {
  people:       { bg: '#FDE68A', text: '#78350F', border: '#F59E0B' },
  verbs:        { bg: '#6EE7B7', text: '#064E3B', border: '#10B981' },
  descriptors:  { bg: '#93C5FD', text: '#1E3A5F', border: '#3B82F6' },
  prepositions: { bg: '#C4B5FD', text: '#3B0764', border: '#8B5CF6' },
  social:       { bg: '#F9A8D4', text: '#831843', border: '#EC4899' },
  questions:    { bg: '#FDBA74', text: '#7C2D12', border: '#F97316' },
  determiners:  { bg: '#F3F4F6', text: '#1F2937', border: '#D1D5DB' },
  negation:     { bg: '#FCA5A5', text: '#7F1D1D', border: '#EF4444' },
};

// =============================================================================
// Core Word Data — FIXED positions, NEVER reorder
// =============================================================================

interface CoreWord {
  id: string;
  label: string;
  category: FitzgeraldCategory;
}

/**
 * THE SUPERCORE 50 GRID
 *
 * Layout: 10 columns x 5 rows = 50 cells
 * Words are ordered LEFT-TO-RIGHT, TOP-TO-BOTTOM.
 * THIS ORDER IS PERMANENT. NEVER CHANGE IT.
 *
 * Word list per issue #20:
 * I, you, want, need, like, don't, help, more, stop, go,
 * come, look, eat, drink, play, yes, no, please, thank you, sorry,
 * happy, sad, angry, tired, hot, cold, big, small, up, down,
 * in, out, on, off, open, close, give, take, put, make,
 * do, have, is, it, that, this, what, where, who, why
 */
const SUPERCORE_50: CoreWord[] = [
  // Row 1
  { id: 'w01', label: 'I',         category: 'people' },
  { id: 'w02', label: 'you',       category: 'people' },
  { id: 'w03', label: 'want',      category: 'verbs' },
  { id: 'w04', label: 'need',      category: 'verbs' },
  { id: 'w05', label: 'like',      category: 'verbs' },
  { id: 'w06', label: "don't",     category: 'negation' },
  { id: 'w07', label: 'help',      category: 'social' },
  { id: 'w08', label: 'more',      category: 'determiners' },
  { id: 'w09', label: 'stop',      category: 'negation' },
  { id: 'w10', label: 'go',        category: 'verbs' },

  // Row 2
  { id: 'w11', label: 'come',      category: 'verbs' },
  { id: 'w12', label: 'look',      category: 'verbs' },
  { id: 'w13', label: 'eat',       category: 'verbs' },
  { id: 'w14', label: 'drink',     category: 'verbs' },
  { id: 'w15', label: 'play',      category: 'verbs' },
  { id: 'w16', label: 'yes',       category: 'social' },
  { id: 'w17', label: 'no',        category: 'negation' },
  { id: 'w18', label: 'please',    category: 'social' },
  { id: 'w19', label: 'thank you', category: 'social' },
  { id: 'w20', label: 'sorry',     category: 'social' },

  // Row 3
  { id: 'w21', label: 'happy',     category: 'descriptors' },
  { id: 'w22', label: 'sad',       category: 'descriptors' },
  { id: 'w23', label: 'angry',     category: 'descriptors' },
  { id: 'w24', label: 'tired',     category: 'descriptors' },
  { id: 'w25', label: 'hot',       category: 'descriptors' },
  { id: 'w26', label: 'cold',      category: 'descriptors' },
  { id: 'w27', label: 'big',       category: 'descriptors' },
  { id: 'w28', label: 'small',     category: 'descriptors' },
  { id: 'w29', label: 'up',        category: 'prepositions' },
  { id: 'w30', label: 'down',      category: 'prepositions' },

  // Row 4
  { id: 'w31', label: 'in',        category: 'prepositions' },
  { id: 'w32', label: 'out',       category: 'prepositions' },
  { id: 'w33', label: 'on',        category: 'prepositions' },
  { id: 'w34', label: 'off',       category: 'prepositions' },
  { id: 'w35', label: 'open',      category: 'verbs' },
  { id: 'w36', label: 'close',     category: 'verbs' },
  { id: 'w37', label: 'give',      category: 'verbs' },
  { id: 'w38', label: 'take',      category: 'verbs' },
  { id: 'w39', label: 'put',       category: 'verbs' },
  { id: 'w40', label: 'make',      category: 'verbs' },

  // Row 5
  { id: 'w41', label: 'do',        category: 'verbs' },
  { id: 'w42', label: 'have',      category: 'verbs' },
  { id: 'w43', label: 'is',        category: 'verbs' },
  { id: 'w44', label: 'it',        category: 'determiners' },
  { id: 'w45', label: 'that',      category: 'determiners' },
  { id: 'w46', label: 'this',      category: 'determiners' },
  { id: 'w47', label: 'what',      category: 'questions' },
  { id: 'w48', label: 'where',     category: 'questions' },
  { id: 'w49', label: 'who',       category: 'questions' },
  { id: 'w50', label: 'why',       category: 'questions' },
];

// =============================================================================
// TTS Helper (Web Speech API)
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
// Styles
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    minHeight: '100dvh',
    background: '#F9FAFB',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  sentenceBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    minHeight: '64px',
    background: '#374151',
    borderRadius: '12px',
    margin: '8px 8px 0',
  },
  sentenceChips: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflowX: 'auto' as const,
    scrollBehavior: 'smooth' as const,
  },
  sentencePlaceholder: {
    color: '#9CA3AF',
    fontSize: '16px',
    fontWeight: 500,
    userSelect: 'none' as const,
    padding: '0 8px',
  },
  chip: (colors: { bg: string; text: string; border: string }) => ({
    flexShrink: 0,
    padding: '6px 12px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '14px',
    border: `2px solid ${colors.border}`,
    background: colors.bg,
    color: colors.text,
    cursor: 'pointer',
  }),
  actionBtn: (bg: string) => ({
    flexShrink: 0,
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    border: 'none',
    background: bg,
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 700,
  }),
  legend: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    padding: '6px 12px',
    justifyContent: 'center',
  },
  legendItem: (colors: { bg: string; text: string; border: string }) => ({
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 10px',
    borderRadius: '9999px',
    border: `1px solid ${colors.border}`,
    background: colors.bg,
    color: colors.text,
  }),
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(10, 1fr)',
    gap: '6px',
    padding: '6px 8px 12px',
    overflow: 'auto',
  },
  gridMobile: {
    gridTemplateColumns: 'repeat(5, 1fr)',
  },
  wordButton: (colors: { bg: string; text: string; border: string }) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: '1',
    minWidth: '48px',
    minHeight: '48px',
    borderRadius: '12px',
    border: `3px solid ${colors.border}`,
    background: colors.bg,
    color: colors.text,
    cursor: 'pointer',
    userSelect: 'none' as const,
    touchAction: 'manipulation' as const,
    fontWeight: 700,
    fontSize: 'clamp(11px, 2vw, 16px)',
    padding: '4px',
    textAlign: 'center' as const,
    lineHeight: 1.2,
    transition: 'transform 0.1s',
  }),
} as const;

// =============================================================================
// Sentence Strip
// =============================================================================

interface SentenceStripProps {
  words: CoreWord[];
  onSpeakAll: () => void;
  onClear: () => void;
  onRemoveWord: (index: number) => void;
}

function SentenceStrip({ words, onSpeakAll, onClear, onRemoveWord }: SentenceStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [words.length]);

  return (
    <div style={styles.sentenceBar}>
      {/* Speak All */}
      <button
        onClick={onSpeakAll}
        disabled={words.length === 0}
        style={{
          ...styles.actionBtn(words.length > 0 ? '#10B981' : '#6B7280'),
          cursor: words.length > 0 ? 'pointer' : 'not-allowed',
        }}
        aria-label="Speak sentence"
      >
        &#9654;
      </button>

      {/* Word chips */}
      <div ref={scrollRef} style={styles.sentenceChips}>
        {words.length === 0 ? (
          <span style={styles.sentencePlaceholder}>
            Tap words to build a sentence...
          </span>
        ) : (
          words.map((word, index) => (
            <button
              key={`${word.id}-${index}`}
              onClick={() => onRemoveWord(index)}
              style={styles.chip(FITZGERALD_COLORS[word.category])}
              aria-label={`Remove ${word.label}`}
            >
              {word.label}
            </button>
          ))
        )}
      </div>

      {/* Clear */}
      {words.length > 0 && (
        <button
          onClick={onClear}
          style={styles.actionBtn('#EF4444')}
          aria-label="Clear sentence"
        >
          &#10005;
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Single Core Word Button
// =============================================================================

function CoreWordButton({ word, onTap }: { word: CoreWord; onTap: (w: CoreWord) => void }) {
  const colors = FITZGERALD_COLORS[word.category];
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); onTap(word); }}
      onPointerLeave={() => setPressed(false)}
      style={{
        ...styles.wordButton(colors),
        transform: pressed ? 'scale(0.92)' : 'scale(1)',
      }}
      aria-label={word.label}
      role="button"
    >
      {word.label}
    </button>
  );
}

// =============================================================================
// Main Supercore Grid Component
// =============================================================================

export interface SupercoreGridProps {
  /** Optional external speak handler. Falls back to Web Speech API. */
  onSpeak?: (text: string) => void;
}

export function SupercoreGrid({ onSpeak }: SupercoreGridProps) {
  const [sentence, setSentence] = useState<CoreWord[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile for responsive grid
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const speakText = useCallback((text: string) => {
    if (onSpeak) { onSpeak(text); return; }
    speak(text);
  }, [onSpeak]);

  const handleWordTap = useCallback((word: CoreWord) => {
    speakText(word.label);
    setSentence(prev => [...prev, word]);
  }, [speakText]);

  const handleSpeakAll = useCallback(() => {
    if (sentence.length === 0) return;
    speakText(sentence.map(w => w.label).join(' '));
  }, [sentence, speakText]);

  const handleClear = useCallback(() => {
    setSentence([]);
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  const handleRemoveWord = useCallback((index: number) => {
    setSentence(prev => prev.filter((_, i) => i !== index));
  }, []);

  const legendItems: { category: FitzgeraldCategory; label: string }[] = [
    { category: 'people', label: 'people' },
    { category: 'verbs', label: 'verbs' },
    { category: 'descriptors', label: 'descriptors' },
    { category: 'prepositions', label: 'prepositions' },
    { category: 'social', label: 'social' },
    { category: 'questions', label: 'questions' },
    { category: 'determiners', label: 'determiners' },
    { category: 'negation', label: 'negation' },
  ];

  return (
    <div style={styles.container}>
      {/* Sentence Strip */}
      <SentenceStrip
        words={sentence}
        onSpeakAll={handleSpeakAll}
        onClear={handleClear}
        onRemoveWord={handleRemoveWord}
      />

      {/* Color Legend */}
      <div style={styles.legend}>
        {legendItems.map(({ category, label }) => (
          <span key={category} style={styles.legendItem(FITZGERALD_COLORS[category])}>
            {label}
          </span>
        ))}
      </div>

      {/* Core Word Grid: 10x5 desktop, 5x10 mobile */}
      <div style={{
        ...styles.grid,
        ...(isMobile ? styles.gridMobile : {}),
      }}>
        {SUPERCORE_50.map(word => (
          <CoreWordButton key={word.id} word={word} onTap={handleWordTap} />
        ))}
      </div>
    </div>
  );
}

export default SupercoreGrid;
