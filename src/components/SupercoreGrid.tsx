'use client';

/**
 * Supercore 50 Core Word Grid
 * Issue #20: Fixed motor planning grid — words NEVER move.
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
import { FITZGERALD_COLORS, type WordCategory } from '@/lib/fitzgerald-key';
import { logWord } from '@/lib/session-logger';
import { speak as elevenLabsSpeak } from '@/lib/tts';

// =============================================================================
// Fitzgerald Key Color Definitions (mapped from shared vocabulary system)
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

/** Map grid categories to canonical Fitzgerald Key word categories */
const CATEGORY_TO_WORD_TYPE: Record<FitzgeraldCategory, WordCategory> = {
  people: 'pronoun',
  verbs: 'verb',
  descriptors: 'adjective',
  prepositions: 'preposition',
  social: 'social',
  questions: 'question',
  determiners: 'determiner',
  negation: 'negation',
};

/**
 * Maps each Fitzgerald category to Tailwind class strings using CSS variables.
 * bg = background, text = text color, border = border color, chip = sentence strip chip
 */
const FITZGERALD_CLASSES: Record<FitzgeraldCategory, { bg: string; text: string; border: string }> = {
  people:       { bg: 'bg-fitzgerald-yellow', text: 'text-fitzgerald-yellow-text', border: 'border-fitzgerald-yellow-border' },
  verbs:        { bg: 'bg-fitzgerald-green',  text: 'text-fitzgerald-green-text',  border: 'border-fitzgerald-green-border' },
  descriptors:  { bg: 'bg-fitzgerald-blue',   text: 'text-fitzgerald-blue-text',   border: 'border-fitzgerald-blue-border' },
  prepositions: { bg: 'bg-fitzgerald-purple', text: 'text-fitzgerald-purple-text', border: 'border-fitzgerald-purple-border' },
  social:       { bg: 'bg-fitzgerald-pink',   text: 'text-fitzgerald-pink-text',   border: 'border-fitzgerald-pink-border' },
  questions:    { bg: 'bg-fitzgerald-orange',  text: 'text-fitzgerald-orange-text', border: 'border-fitzgerald-orange-border' },
  determiners:  { bg: 'bg-fitzgerald-white',   text: 'text-fitzgerald-white-text',  border: 'border-fitzgerald-white-border' },
  negation:     { bg: 'bg-fitzgerald-red',    text: 'text-fitzgerald-red-text',    border: 'border-fitzgerald-red-border' },
};

/** Get inline Fitzgerald Key color for a grid category (used by non-Tailwind contexts) */
export function getGridCategoryColor(category: FitzgeraldCategory) {
  return FITZGERALD_COLORS[CATEGORY_TO_WORD_TYPE[category]];
}

// =============================================================================
// Core Word Data — FIXED positions, NEVER reorder
// =============================================================================

interface CoreWord {
  id: string;
  label: string;
  category: FitzgeraldCategory;
  arasaacId?: number;
}

const ARASAAC_IMG = (id: number) => `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;

/**
 * THE SUPERCORE 50 GRID
 *
 * Layout: 10 columns x 5 rows = 50 cells
 * Words are ordered LEFT-TO-RIGHT, TOP-TO-BOTTOM.
 * THIS ORDER IS PERMANENT. NEVER CHANGE IT.
 */
const SUPERCORE_50: CoreWord[] = [
  // Row 1
  { id: 'w01', label: 'I',         category: 'people',      arasaacId: 6632 },
  { id: 'w02', label: 'you',       category: 'people',      arasaacId: 6625 },
  { id: 'w03', label: 'want',      category: 'verbs',       arasaacId: 5441 },
  { id: 'w04', label: 'need',      category: 'verbs',       arasaacId: 37160 },
  { id: 'w05', label: 'like',      category: 'verbs',       arasaacId: 37826 },
  { id: 'w06', label: "don't",     category: 'negation',    arasaacId: 5525 },
  { id: 'w07', label: 'help',      category: 'social',      arasaacId: 32648 },
  { id: 'w08', label: 'more',      category: 'determiners', arasaacId: 5508 },
  { id: 'w09', label: 'stop',      category: 'negation',    arasaacId: 7196 },
  { id: 'w10', label: 'go',        category: 'verbs',       arasaacId: 8142 },

  // Row 2
  { id: 'w11', label: 'come',      category: 'verbs',       arasaacId: 32669 },
  { id: 'w12', label: 'look',      category: 'verbs',       arasaacId: 6564 },
  { id: 'w13', label: 'eat',       category: 'verbs',       arasaacId: 6456 },
  { id: 'w14', label: 'drink',     category: 'verbs',       arasaacId: 6061 },
  { id: 'w15', label: 'play',      category: 'verbs',       arasaacId: 23392 },
  { id: 'w16', label: 'yes',       category: 'social',      arasaacId: 5584 },
  { id: 'w17', label: 'no',        category: 'negation',    arasaacId: 5526 },
  { id: 'w18', label: 'please',    category: 'social',      arasaacId: 8195 },
  { id: 'w19', label: 'thank you', category: 'social',      arasaacId: 8129 },
  { id: 'w20', label: 'sorry',     category: 'social',      arasaacId: 11625 },

  // Row 3
  { id: 'w21', label: 'happy',     category: 'descriptors', arasaacId: 35533 },
  { id: 'w22', label: 'sad',       category: 'descriptors', arasaacId: 35545 },
  { id: 'w23', label: 'angry',     category: 'descriptors', arasaacId: 35539 },
  { id: 'w24', label: 'tired',     category: 'descriptors', arasaacId: 35537 },
  { id: 'w25', label: 'hot',       category: 'descriptors', arasaacId: 2300 },
  { id: 'w26', label: 'cold',      category: 'descriptors', arasaacId: 4652 },
  { id: 'w27', label: 'big',       category: 'descriptors', arasaacId: 4658 },
  { id: 'w28', label: 'small',     category: 'descriptors', arasaacId: 4716 },
  { id: 'w29', label: 'up',        category: 'prepositions', arasaacId: 5388 },
  { id: 'w30', label: 'down',      category: 'prepositions', arasaacId: 37428 },

  // Row 4
  { id: 'w31', label: 'in',        category: 'prepositions', arasaacId: 7034 },
  { id: 'w32', label: 'out',       category: 'prepositions', arasaacId: 8252 },
  { id: 'w33', label: 'on',        category: 'prepositions', arasaacId: 7814 },
  { id: 'w34', label: 'off',       category: 'prepositions', arasaacId: 7020 },
  { id: 'w35', label: 'open',      category: 'verbs',       arasaacId: 24825 },
  { id: 'w36', label: 'close',     category: 'verbs',       arasaacId: 30383 },
  { id: 'w37', label: 'give',      category: 'verbs',       arasaacId: 28431 },
  { id: 'w38', label: 'take',      category: 'verbs',       arasaacId: 10148 },
  { id: 'w39', label: 'put',       category: 'verbs',       arasaacId: 32757 },
  { id: 'w40', label: 'make',      category: 'verbs',       arasaacId: 32751 },

  // Row 5
  { id: 'w41', label: 'do',        category: 'verbs',       arasaacId: 32751 },
  { id: 'w42', label: 'have',      category: 'verbs',       arasaacId: 32761 },
  { id: 'w43', label: 'is',        category: 'verbs',       arasaacId: 8115 },
  { id: 'w44', label: 'it',        category: 'determiners', arasaacId: 31670 },
  { id: 'w45', label: 'that',      category: 'determiners', arasaacId: 6906 },
  { id: 'w46', label: 'this',      category: 'determiners', arasaacId: 7095 },
  { id: 'w47', label: 'what',      category: 'questions',   arasaacId: 22620 },
  { id: 'w48', label: 'where',     category: 'questions',   arasaacId: 7764 },
  { id: 'w49', label: 'who',       category: 'questions',   arasaacId: 9853 },
  { id: 'w50', label: 'why',       category: 'questions',   arasaacId: 36719 },
];

// =============================================================================
// TTS Helper — ElevenLabs via tts.ts
// =============================================================================

function speak(text: string) {
  elevenLabsSpeak({ text });
}

// =============================================================================
// Sentence Strip
// =============================================================================

interface SentenceStripProps {
  words: CoreWord[];
  onSpeakAll: () => void;
  onMagicSpeak: () => void;
  isMagicLoading: boolean;
  onClear: () => void;
  onRemoveWord: (index: number) => void;
}

function SentenceStrip({ words, onSpeakAll, onMagicSpeak, isMagicLoading, onClear, onRemoveWord }: SentenceStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [words.length]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 min-h-[64px] bg-gray-700 rounded-xl mx-2 mt-2">
      {/* Speak All (exact words) */}
      <button
        onClick={onSpeakAll}
        disabled={words.length === 0}
        className={`shrink-0 w-12 h-12 rounded-xl border-none text-white flex items-center justify-center text-xl font-bold ${
          words.length > 0
            ? 'bg-emerald-500 cursor-pointer'
            : 'bg-gray-500 cursor-not-allowed'
        }`}
        aria-label="Speak sentence"
      >
        &#9654;
      </button>

      {/* Magic sparkle button — sends to Groq for grammar improvement */}
      <button
        onClick={onMagicSpeak}
        disabled={words.length < 2 || isMagicLoading}
        className={`shrink-0 w-12 h-12 rounded-xl border-none text-white flex items-center justify-center text-lg font-bold transition-all ${
          words.length >= 2 && !isMagicLoading
            ? 'bg-purple-500 cursor-pointer hover:bg-purple-400 active:scale-90'
            : 'bg-gray-500 cursor-not-allowed'
        } ${isMagicLoading ? 'animate-pulse' : ''}`}
        aria-label="Improve and speak sentence"
        title="Magic: improve my sentence"
      >
        &#10024;
      </button>

      {/* Word chips */}
      <div ref={scrollRef} className="flex-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth">
        {words.length === 0 ? (
          <span className="text-gray-400 text-base font-medium select-none px-2">
            Tap words to build a sentence...
          </span>
        ) : (
          words.map((word, index) => {
            const cls = FITZGERALD_CLASSES[word.category];
            return (
              <button
                key={`${word.id}-${index}`}
                onClick={() => onRemoveWord(index)}
                className={`shrink-0 px-3 py-1.5 rounded-lg font-bold text-sm border-2 cursor-pointer ${cls.bg} ${cls.text} ${cls.border}`}
                aria-label={`Remove ${word.label}`}
              >
                {word.label}
              </button>
            );
          })
        )}
      </div>

      {/* Clear */}
      {words.length > 0 && (
        <button
          onClick={onClear}
          className="shrink-0 w-12 h-12 rounded-xl border-none bg-red-500 text-white cursor-pointer flex items-center justify-center text-xl font-bold"
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
  const cls = FITZGERALD_CLASSES[word.category];
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); onTap(word); }}
      onPointerLeave={() => setPressed(false)}
      className={`flex flex-col items-center justify-center aspect-square min-w-[48px] min-h-[48px] rounded-xl border-[3px] cursor-pointer select-none touch-manipulation p-1 text-center leading-tight transition-transform duration-100 ${cls.bg} ${cls.text} ${cls.border} ${pressed ? 'scale-[0.92]' : 'scale-100'}`}
      aria-label={word.label}
      role="button"
    >
      {word.arasaacId && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={ARASAAC_IMG(word.arasaacId)}
          alt={word.label}
          width={56}
          height={56}
          className="w-[clamp(32px,5vw,56px)] h-[clamp(32px,5vw,56px)] object-contain pointer-events-none"
          loading="lazy"
        />
      )}
      <span className="font-bold text-[clamp(10px,1.5vw,14px)] mt-0.5 truncate max-w-full">{word.label}</span>
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
  const [isMagicLoading, setIsMagicLoading] = useState(false);

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
    logWord(word.label);
  }, [speakText]);

  const handleSpeakAll = useCallback(() => {
    if (sentence.length === 0) return;
    speakText(sentence.map(w => w.label).join(' '));
  }, [sentence, speakText]);

  const handleMagicSpeak = useCallback(async () => {
    if (sentence.length < 2) return;
    setIsMagicLoading(true);
    try {
      const words = sentence.map(w => w.label);
      const res = await fetch('/api/improve-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: words }),
      });
      if (res.ok) {
        const data = await res.json();
        const improved = data.improved || data.sentence || words.join(' ');
        speakText(improved);
      } else {
        // Fallback: just speak the raw words
        speakText(sentence.map(w => w.label).join(' '));
      }
    } catch {
      speakText(sentence.map(w => w.label).join(' '));
    } finally {
      setIsMagicLoading(false);
    }
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
    <div className="flex flex-col h-screen min-h-[100dvh] bg-gray-50 font-sans">
      {/* Sentence Strip */}
      <SentenceStrip
        words={sentence}
        onSpeakAll={handleSpeakAll}
        onMagicSpeak={handleMagicSpeak}
        isMagicLoading={isMagicLoading}
        onClear={handleClear}
        onRemoveWord={handleRemoveWord}
      />

      {/* Color Legend */}
      <div className="flex flex-wrap gap-1.5 px-3 py-1.5 justify-center">
        {legendItems.map(({ category, label }) => {
          const cls = FITZGERALD_CLASSES[category];
          return (
            <span
              key={category}
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cls.bg} ${cls.text} ${cls.border}`}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Core Word Grid: 10x5 desktop, 5x10 mobile */}
      <div className={`flex-1 grid gap-1.5 px-2 pb-3 pt-1.5 overflow-auto ${
        isMobile ? 'grid-cols-5' : 'grid-cols-10'
      }`}>
        {SUPERCORE_50.map(word => (
          <CoreWordButton key={word.id} word={word} onTap={handleWordTap} />
        ))}
      </div>
    </div>
  );
}

export default SupercoreGrid;
