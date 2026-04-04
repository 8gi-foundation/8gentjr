'use client';

/**
 * SharedSentenceBar — consistent sentence display bar used across all Talk screens.
 *
 * Matches the SupercoreGrid design language:
 * - bg-gray-800 bar
 * - ▶ speak (emerald), ✨ magic (purple, optional), ✕ clear (red)
 * - Scrollable chips area; chips accept optional custom className/style for
 *   Fitzgerald Key colours (SupercoreGrid) or category colours (category pages).
 */

import { useRef, useEffect } from 'react';

export interface SentenceChip {
  label: string;
  /** Optional Tailwind classes for chip background/text/border (Fitzgerald Key) */
  className?: string;
  /** Optional inline styles for chip (category colour overrides) */
  style?: React.CSSProperties;
}

export interface SharedSentenceBarProps {
  words: SentenceChip[];
  onSpeak: () => void;
  onClear: () => void;
  /** Tap a chip to remove it */
  onRemoveWord?: (index: number) => void;
  /** Optional magic ✨ button */
  onMagic?: () => void;
  isMagicLoading?: boolean;
  placeholder?: string;
}

export function SharedSentenceBar({
  words,
  onSpeak,
  onClear,
  onRemoveWord,
  onMagic,
  isMagicLoading = false,
  placeholder = 'Tap words to build a sentence...',
}: SharedSentenceBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [words.length]);

  const hasWords = words.length > 0;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 min-h-[56px] bg-gray-800 rounded-xl mx-2 mt-2 shrink-0">
      {/* ▶ Speak */}
      <button
        onClick={onSpeak}
        disabled={!hasWords}
        className={`shrink-0 w-10 h-10 rounded-xl text-white flex items-center justify-center text-lg font-bold transition-colors ${
          hasWords ? 'bg-emerald-500 hover:bg-emerald-400 cursor-pointer' : 'bg-gray-600 cursor-not-allowed'
        }`}
        aria-label="Speak sentence"
      >
        &#9654;
      </button>

      {/* ✨ Magic — only rendered when onMagic is provided */}
      {onMagic && (
        <button
          onClick={onMagic}
          disabled={words.length < 2 || isMagicLoading}
          className={`shrink-0 w-10 h-10 rounded-xl text-white flex items-center justify-center text-base font-bold transition-all ${
            words.length >= 2 && !isMagicLoading
              ? 'bg-purple-500 hover:bg-purple-400 cursor-pointer active:scale-90'
              : 'bg-gray-600 cursor-not-allowed'
          } ${isMagicLoading ? 'animate-pulse' : ''}`}
          aria-label="Improve and speak sentence"
          title="Magic: improve my sentence"
        >
          &#10024;
        </button>
      )}

      {/* Chips / placeholder */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth no-scrollbar"
      >
        {!hasWords ? (
          <span className="text-gray-400 text-base font-medium select-none px-2">
            {placeholder}
          </span>
        ) : (
          words.map((chip, index) => (
            <button
              key={`${chip.label}-${index}`}
              onClick={() => onRemoveWord?.(index)}
              disabled={!onRemoveWord}
              className={`shrink-0 px-3 py-1.5 rounded-lg font-bold text-sm border-2 transition-transform active:scale-95 ${
                onRemoveWord ? 'cursor-pointer' : 'cursor-default'
              } ${chip.className ?? 'bg-gray-600 text-white border-gray-500'}`}
              style={chip.style}
              aria-label={onRemoveWord ? `Remove ${chip.label}` : chip.label}
            >
              {chip.label}
            </button>
          ))
        )}
      </div>

      {/* ✕ Clear */}
      {hasWords && (
        <button
          onClick={onClear}
          className="shrink-0 w-10 h-10 rounded-xl bg-red-500 hover:bg-red-400 text-white cursor-pointer flex items-center justify-center text-lg font-bold transition-colors"
          aria-label="Clear sentence"
        >
          &#10005;
        </button>
      )}
    </div>
  );
}
