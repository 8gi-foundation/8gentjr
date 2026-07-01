'use client';

/**
 * TextRail (Δ Word Rail) - a keyboard-forward surface for children (and
 * partners) who are faster typing than scanning a grid. A text compose box
 * feeds straight into the shared sentence strip; a next-word prediction rail and
 * a row of quick social words sit above it for one-tap building.
 *
 * Everything writes to the SAME sentence pipeline (useCoreSurface) and reads the
 * SAME vocabulary (Supercore 50 + the existing predictive engine). No surface
 * state mutates vocabulary, categories, personal words or phrase folders.
 */

import { useCallback, useMemo, useState } from 'react';
import { SharedSentenceBar } from '@/components/SharedSentenceBar';
import { predictNext, PREDICTIVE_CARD_COUNT } from '@/lib/predictive';
import {
  SUPERCORE_BY_LABEL,
  FITZGERALD_CLASSES,
  wordsInCategory,
} from '@/lib/core-vocab';
import { useCoreSurface } from './useCoreSurface';
import type { SurfaceProps } from './index';

const SKY_CHIP = 'bg-sky-100 text-sky-900 border-sky-300';

export function TextRail(props: SurfaceProps) {
  const {
    settings,
    sentence,
    removeWord,
    engineFallback,
    isMagicLoading,
    tapWord,
    tapText,
    handleSpeakAll,
    handleClear,
    handleMagic,
  } = useCoreSurface(props);

  const [draft, setDraft] = useState('');

  const stage = settings.glpStage ?? 3;
  const lastWord = sentence.length > 0 ? sentence[sentence.length - 1].label : null;

  const predictions = useMemo(
    () => predictNext(lastWord, stage, PREDICTIVE_CARD_COUNT),
    [lastWord, stage],
  );

  // Quick words: the real social-category Supercore words (help, yes, please...).
  const quickWords = useMemo(() => wordsInCategory('social'), []);

  // A prediction that maps to a locked-grid word routes through the identical
  // grid tap (Fitzgerald chip + log); otherwise it is a plain sky chip.
  const handlePrediction = useCallback(
    (text: string) => {
      const match = SUPERCORE_BY_LABEL.get(text.toLowerCase());
      if (match) tapWord(match);
      else tapText(text, { className: SKY_CHIP, log: true });
    },
    [tapWord, tapText],
  );

  const commitDraft = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const match = SUPERCORE_BY_LABEL.get(text.toLowerCase());
    if (match) tapWord(match);
    else tapText(text);
    setDraft('');
  }, [draft, tapWord, tapText]);

  return (
    <div
      className="flex flex-col font-sans bg-gray-50"
      style={{ height: 'calc(100dvh - 72px - env(safe-area-inset-bottom, 0px))' }}
    >
      <SharedSentenceBar
        words={sentence}
        onSpeak={handleSpeakAll}
        onMagic={handleMagic}
        isMagicLoading={isMagicLoading}
        onClear={handleClear}
        onRemoveWord={removeWord}
        engineFallback={engineFallback}
      />

      <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y px-2 py-3 flex flex-col gap-4">
        {/* Prediction rail */}
        <section aria-label="Next word suggestions">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Next word
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {predictions.length === 0 && (
              <span className="text-sm text-gray-400 py-2">Start typing to see suggestions</span>
            )}
            {predictions.map((c) => {
              const match = SUPERCORE_BY_LABEL.get(c.text.toLowerCase());
              const cls = match ? FITZGERALD_CLASSES[match.category] : null;
              return (
                <button
                  key={`${c.source}-${c.text}`}
                  onClick={() => handlePrediction(c.text)}
                  className={`shrink-0 min-h-[44px] px-4 rounded-xl border-[3px] font-bold text-[15px] cursor-pointer active:scale-95 transition-transform ${
                    cls ? `${cls.bg} ${cls.text} ${cls.border}` : `${SKY_CHIP}`
                  }`}
                  aria-label={`Add word ${c.text}`}
                >
                  {match ? match.label : c.text}
                </button>
              );
            })}
          </div>
        </section>

        {/* Quick words */}
        <section aria-label="Quick words">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Quick words
          </p>
          <div className="flex flex-wrap gap-2">
            {quickWords.map((w) => {
              const cls = FITZGERALD_CLASSES[w.category];
              return (
                <button
                  key={w.id}
                  onClick={() => tapWord(w)}
                  className={`min-h-[44px] px-4 rounded-xl border-[3px] font-bold text-[15px] cursor-pointer active:scale-95 transition-transform ${cls.bg} ${cls.text} ${cls.border}`}
                  aria-label={`Add word ${w.label}`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Compose box - the keyboard-forward core of this surface. */}
      <form
        className="shrink-0 flex items-center gap-2 px-2 py-2 border-t border-gray-200 bg-white"
        onSubmit={(e) => {
          e.preventDefault();
          commitDraft();
        }}
      >
        <label htmlFor="word-rail-input" className="sr-only">
          Type a word
        </label>
        <input
          id="word-rail-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a word, then Add"
          autoComplete="off"
          className="flex-1 min-h-[48px] px-3 rounded-xl border-2 border-gray-300 text-[16px] focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className={`shrink-0 min-h-[48px] px-5 rounded-xl font-bold text-white text-[15px] transition-colors ${
            draft.trim().length > 0
              ? 'bg-emerald-500 hover:bg-emerald-400 cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
          aria-label="Add typed word to sentence"
        >
          Add
        </button>
      </form>
    </div>
  );
}

export default TextRail;
