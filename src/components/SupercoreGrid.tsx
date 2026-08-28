'use client';

/**
 * Supercore 50 Core Word Grid
 * Issue #20: Fixed motor planning grid - words NEVER move.
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

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  SUPERCORE_50,
  ARASAAC_IMG,
  FITZGERALD_CLASSES,
  getGridCategoryColor,
  performCoreTap,
  type SupercoreWord as CoreWord,
  type FitzgeraldCategory,
} from '@/lib/core-vocab';
import { logWord } from '@/lib/session-logger';
import { speak as elevenLabsSpeak, preloadAudio } from '@/lib/tts';
import { SharedSentenceBar } from '@/components/SharedSentenceBar';
import { SuggestedRow } from '@/components/SuggestedRow';
import { PredictiveStrip } from '@/components/PredictiveStrip';
import { TapCard } from '@/components/TapCard';
import { YourWordsRow, type YourWordsCard } from '@/components/YourWordsRow';
import { useSentence } from '@/hooks/useSentence';
import { useApp } from '@/context/AppContext';
import { getPersonalVocab } from '@/lib/personal-vocab';
import { predictNext, PREDICTIVE_CARD_COUNT } from '@/lib/predictive';
import { CARD_SIZE_TOKENS, type CardSize } from '@/lib/layout-presets';

// Core vocabulary, Fitzgerald Key colours, the pictogram URL helper and the
// shared "tap a core word" action now live in @/lib/core-vocab so every Layout
// Primitive surface reads the SAME data and writes through the SAME pipeline.
// getGridCategoryColor is re-exported for backward compatibility.
export { getGridCategoryColor };

// =============================================================================
// TTS Helper - ElevenLabs via tts.ts
// =============================================================================

// =============================================================================
// Sentence Strip - now uses SharedSentenceBar
// =============================================================================

// =============================================================================
// Single Core Word Button
// =============================================================================

const CoreWordButton = React.memo(function CoreWordButton({ word, onTap, cardSize }: { word: CoreWord; onTap: (w: CoreWord) => void; cardSize: CardSize }) {
  const cls = FITZGERALD_CLASSES[word.category];
  const tok = CARD_SIZE_TOKENS[cardSize];
  const handleTap = useCallback(() => onTap(word), [onTap, word]);
  return (
    <TapCard
      onTap={handleTap}
      ariaLabel={word.label}
      className={`flex flex-col items-center justify-center rounded-xl border-[3px] py-1.5 px-0.5 text-center leading-tight ${cls.bg} ${cls.text} ${cls.border}`}
      style={{ minHeight: tok.minHeight }}
    >
      {word.arasaacId && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={ARASAAC_IMG(word.arasaacId)}
          alt={word.label}
          width={tok.imgPx}
          height={tok.imgPx}
          style={{ width: tok.imgPx, height: tok.imgPx }}
          className="object-contain pointer-events-none"
          loading="lazy"
        />
      )}
      <span className="font-bold leading-none mt-0.5 w-full line-clamp-2 px-0.5" style={{ fontSize: tok.fontPx }}>{word.label}</span>
    </TapCard>
  );
});

// =============================================================================
// Intro Card Button - for personalised greeting cards
// =============================================================================

const IntroCardButton = React.memo(function IntroCardButton({
  label,
  arasaacId,
  onTap,
}: {
  label: string;
  arasaacId?: number;
  onTap: (label: string, arasaacId?: number) => void;
}) {
  const cls = FITZGERALD_CLASSES['social'];
  const handleTap = useCallback(() => onTap(label, arasaacId), [onTap, label, arasaacId]);
  return (
    <TapCard
      onTap={handleTap}
      ariaLabel={label}
      className={`flex flex-col items-center justify-center rounded-xl border-[3px] py-1.5 px-1 text-center leading-tight ${cls.bg} ${cls.text} ${cls.border}`}
      style={{ minHeight: 80 }}
    >
      {arasaacId && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={ARASAAC_IMG(arasaacId)}
          alt=""
          width={44}
          height={44}
          className="w-[44px] h-[44px] object-contain pointer-events-none"
          loading="lazy"
        />
      )}
      <span className="font-bold text-[12px] leading-tight mt-0.5 w-full line-clamp-2 px-0.5">{label}</span>
    </TapCard>
  );
});

// =============================================================================
// Main Supercore Grid Component
// =============================================================================

export interface SupercoreGridProps {
  /** Optional external speak handler. Falls back to Web Speech API. */
  onSpeak?: (text: string) => void;
}

export function SupercoreGrid({ onSpeak }: SupercoreGridProps) {
  const { words: sentence, addWord, removeWord, clear } = useSentence();
  const { settings } = useApp();
  const childName = settings.childName?.trim() || '';
  const showPersonalVocab = settings.showPersonalVocab !== false;
  // Layout preset knobs. cardSize sizes the Core grid buttons; showPredictions
  // (default true for legacy settings without the field) toggles the next-word
  // strip. settings.gridColumns caps the desktop column count (see below).
  const cardSize: CardSize = settings.cardSize ?? 'medium';
  const showPredictions = settings.showPredictions !== false;
  const preferredCols = settings.gridColumns;
  const [cols, setCols] = useState(10);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [isBlendLoading, setIsBlendLoading] = useState(false);
  const [engineFallback, setEngineFallback] = useState(false);
  const [yourWords, setYourWords] = useState<YourWordsCard[]>([]);

  // Lowercase label -> Supercore entry, for hydrating Your Words cards with
  // pictograms when the tapped word lives on the locked grid. Built once.
  const supercoreByLabel = useMemo(() => {
    const map = new Map<string, CoreWord>();
    for (const w of SUPERCORE_50) map.set(w.label.toLowerCase(), w);
    return map;
  }, []);

  // Kill-switch read once at mount. localStorage 8gentjr-glp-disable=true
  // hides the Suggested row and forces the magic button on regardless of stage.
  const [glpDisabled, setGlpDisabled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setGlpDisabled(window.localStorage.getItem('8gentjr-glp-disable') === 'true');
  }, []);

  const stage = settings.glpStage ?? 3;
  const stageMirrorMode = !glpDisabled && stage <= 2;
  // T2.6 - any gestalt chip in the sentence forces mirror at any stage.
  // glpDisabled (kill switch) overrides everything, so respect it.
  const gestaltMode = !glpDisabled && sentence.some(c => c.isGestalt);
  /**
   * T3.8 - Blend mode (NLA stage 2 Mitigated Gestalts).
   *
   * Active when stage === 2 AND the sentence contains 2+ gestalt chips.
   * Precedence (highest wins):
   *   blendMode  -> button is "Blend" (LLM fuses gestalts).
   *   mirrorMode -> button is "Mirror" (re-speak verbatim).
   *   default    -> button is "Magic" (analytic improve, stage 3+).
   *
   * Stage 2 with only 1 gestalt + a single word still falls back to
   * mirrorMode because stageMirrorMode (stage <= 2) covers that case.
   * The kill switch (`!glpDisabled`) suppresses both blend and mirror.
   */
  const gestaltCount = sentence.filter(c => c.isGestalt).length;
  const blendMode = !glpDisabled && stage === 2 && gestaltCount >= 2;
  const mirrorMode = !blendMode && (stageMirrorMode || gestaltMode);

  // Responsive column count. Small screens stay capped for tap-target safety;
  // on tablet/desktop the user's chosen grid size (settings.gridColumns, set
  // directly or via a layout preset) drives the column count. Phones never
  // exceed the preference but also never go below a readable minimum.
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      // Hard ceilings per breakpoint so cards stay tappable on small screens.
      const ceiling = w < 480 ? 4 : w < 768 ? 6 : 10;
      setCols(Math.max(1, Math.min(preferredCols, ceiling)));
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [preferredCols]);

  // Preload all 50 core word audio clips so taps play instantly
  useEffect(() => {
    preloadAudio(SUPERCORE_50.map(w => w.label));
  }, []);

  // Recompute Your Words on mount and after every sentence-strip change
  // (each tap appends a word, which may push something past the threshold).
  // Skipped entirely when the parent has hidden the row.
  useEffect(() => {
    if (!showPersonalVocab) {
      setYourWords([]);
      return;
    }
    const entries = getPersonalVocab();
    const cards: YourWordsCard[] = entries.map(({ word, count }) => {
      const match = supercoreByLabel.get(word);
      return {
        word,
        count,
        imageUrl: match?.arasaacId ? ARASAAC_IMG(match.arasaacId) : undefined,
      };
    });
    setYourWords(cards);
  }, [showPersonalVocab, sentence.length, supercoreByLabel]);

  const speakText = useCallback(async (text: string) => {
    if (onSpeak) { onSpeak(text); return; }
    const engine = await elevenLabsSpeak({
      text,
      voiceId: settings.selectedVoiceId ?? undefined,
      rate: settings.ttsRate,
    });
    setEngineFallback(engine === 'browser');
  }, [onSpeak, settings.selectedVoiceId, settings.ttsRate]);

  const handleWordTap = useCallback((word: CoreWord) => {
    performCoreTap(word, { speak: speakText, add: addWord, log: logWord });
  }, [speakText, addWord]);

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
        speakText(sentence.map(w => w.label).join(' '));
      }
    } catch {
      speakText(sentence.map(w => w.label).join(' '));
    } finally {
      setIsMagicLoading(false);
    }
  }, [sentence, speakText]);

  const handleClear = useCallback(() => {
    clear();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, [clear]);

  const handleIntroTap = useCallback((label: string, arasaacId?: number) => {
    speakText(label);
    addWord({
      label,
      imageUrl: arasaacId ? ARASAAC_IMG(arasaacId) : undefined,
      className: `${FITZGERALD_CLASSES['social'].bg} ${FITZGERALD_CLASSES['social'].text} ${FITZGERALD_CLASSES['social'].border}`,
    });
    logWord(label);
  }, [speakText, addWord]);

  const handleYourWordsTap = useCallback((word: string, imageUrl?: string) => {
    speakText(word);
    // If the word lives on the locked grid, reuse its Fitzgerald chip so the
    // sentence strip stays consistent with grid taps. Otherwise fall back to
    // the amber chip (matches the Your Words row's visual signature).
    const match = supercoreByLabel.get(word);
    const className = match
      ? `${FITZGERALD_CLASSES[match.category].bg} ${FITZGERALD_CLASSES[match.category].text} ${FITZGERALD_CLASSES[match.category].border}`
      : 'bg-amber-200 text-amber-950 border-amber-500';
    addWord({
      label: match ? match.label : word,
      imageUrl,
      className,
    });
    logWord(word);
  }, [speakText, addWord, supercoreByLabel]);

  const handleSuggestedTap = useCallback((text: string) => {
    speakText(text);
    addWord({
      label: text,
      // Amber chip distinguishes adaptive suggestions from locked-grid words.
      className: 'bg-amber-100 text-amber-900 border-amber-400',
    });
    logWord(text);
  }, [speakText, addWord]);

  // T2.4 - predictive next-word strip. Recomputes on every sentence change
  // (sentence.length covers add/remove/clear; lastWord covers identity).
  // The bigram read inside predictNext is O(events-today) and runs <50ms
  // for realistic logs; keeping it inside useMemo means it never blocks
  // the tap path itself.
  const lastWord = sentence.length > 0 ? sentence[sentence.length - 1].label : null;
  const predictiveCards = useMemo(() => {
    if (glpDisabled) return [];
    return predictNext(lastWord, stage, PREDICTIVE_CARD_COUNT);
    // sentence.length is intentional - bigrams are derived from the event
    // log which appends on every tap, so we want the memo to recompute on
    // any sentence change, not just last-word identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glpDisabled, stage, lastWord, sentence.length]);

  const handlePredictiveTap = useCallback((text: string) => {
    speakText(text);
    // Predictive chips reuse the locked-grid look when the candidate maps
    // to a Supercore word, so the sentence strip stays consistent. Otherwise
    // fall back to a sky chip (matches the strip's visual signature).
    const match = supercoreByLabel.get(text.toLowerCase());
    const className = match
      ? `${FITZGERALD_CLASSES[match.category].bg} ${FITZGERALD_CLASSES[match.category].text} ${FITZGERALD_CLASSES[match.category].border}`
      : 'bg-sky-100 text-sky-900 border-sky-300';
    addWord({
      label: match ? match.label : text,
      imageUrl: match?.arasaacId ? ARASAAC_IMG(match.arasaacId) : undefined,
      className,
    });
    logWord(text);
  }, [speakText, addWord, supercoreByLabel]);

  const handleMirrorSpeak = useCallback(() => {
    if (sentence.length === 0) return;
    speakText(sentence.map(w => w.label).join(' '));
  }, [sentence, speakText]);

  // T3.8 - Blend handler. Calls /api/improve-sentence in 'blend' mode and
  // speaks the fused gestalt. Falls back to plain concatenation on error.
  const handleBlendSpeak = useCallback(async () => {
    if (sentence.length < 2) return;
    setIsBlendLoading(true);
    const words = sentence.map(w => w.label);
    try {
      const res = await fetch('/api/improve-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'blend', words }),
      });
      if (res.ok) {
        const data = await res.json();
        const blended = (data.blended as string | undefined) || words.join(' ');
        speakText(blended);
      } else {
        speakText(words.join(' '));
      }
    } catch {
      speakText(words.join(' '));
    } finally {
      setIsBlendLoading(false);
    }
  }, [sentence, speakText]);

  // Intro cards - only when child name is known
  const introCols = Math.min(cols, 4);
  const introCards: { label: string; arasaacId?: number }[] = childName ? [
    { label: `Hi! I'm ${childName}`, arasaacId: 27507 },
    { label: `My name is ${childName}`, arasaacId: 9853 },
    { label: 'Nice to meet you!', arasaacId: 11554 },
    { label: 'Hello!', arasaacId: 6449 },
  ] : [];

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
    <div
      className="flex flex-col bg-gray-50 font-sans"
      style={{ height: 'calc(100dvh - 72px - env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Sentence Strip */}
      <SharedSentenceBar
        words={sentence}
        onSpeak={handleSpeakAll}
        onMagic={blendMode || mirrorMode ? undefined : handleMagicSpeak}
        onMirror={blendMode ? undefined : (mirrorMode ? handleMirrorSpeak : undefined)}
        onBlend={blendMode ? handleBlendSpeak : undefined}
        isMagicLoading={isMagicLoading}
        isBlendLoading={isBlendLoading}
        onClear={handleClear}
        onRemoveWord={removeWord}
        engineFallback={engineFallback}
      />

      {/* Color Legend - single scrollable row */}
      <div className="flex gap-1 px-2 py-1 overflow-x-auto no-scrollbar shrink-0">
        {legendItems.map(({ category, label }) => {
          const cls = FITZGERALD_CLASSES[category];
          return (
            <span
              key={category}
              className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls.bg} ${cls.text} ${cls.border}`}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Scrollable grid area */}
      <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y">

        {/* T2.4 Predictive next-word strip - 4 cards, recomputes on every
            tap. Sits above Your Words (frequency) + Suggested (stage) +
            locked grid. Hidden by the GLP kill switch. */}
        {!glpDisabled && showPredictions && (
          <PredictiveStrip cards={predictiveCards} cols={cols} onTap={handlePredictiveTap} />
        )}

        {/* Your Words: frequency-sorted personal vocab pinned at the very top.
            Sits above SuggestedRow + intro + locked grid. Hidden entirely
            when the threshold yields zero qualifying words (handled inside
            YourWordsRow via empty cards). */}
        {showPersonalVocab && (
          <YourWordsRow cards={yourWords} cols={cols} onTap={handleYourWordsTap} />
        )}

        {/* Adaptive Suggested row sits above intro + locked grid */}
        {!glpDisabled && (
          <SuggestedRow glpStage={stage} cols={cols} onTap={handleSuggestedTap} />
        )}

        {/* Personalised intro row */}
        {introCards.length > 0 && (
          <div className="px-1.5 pt-2 pb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">
              Say hello - {childName}
            </p>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${introCols}, 1fr)` }}>
              {introCards.map((card, i) => (
                <IntroCardButton
                  key={i}
                  label={card.label}
                  arasaacId={card.arasaacId}
                  onTap={handleIntroTap}
                />
              ))}
            </div>
          </div>
        )}

        {/* Core Word Grid */}
        <div
          className="grid gap-1 px-1.5 pb-2 pt-1"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {SUPERCORE_50.map(word => (
            <CoreWordButton key={word.id} word={word} onTap={handleWordTap} cardSize={cardSize} />
          ))}
        </div>

      </div>
    </div>
  );
}

export default SupercoreGrid;
