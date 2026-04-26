'use client';

/**
 * SharedSentenceBar - consistent sentence display bar used across all Talk screens.
 *
 * Matches the SupercoreGrid design language:
 * - bg-gray-800 bar
 * - ▶ speak (emerald), ✨ magic (purple, optional), ✕ clear (red)
 * - Scrollable chips area; chips accept optional custom className/style for
 *   Fitzgerald Key colours (SupercoreGrid) or category colours (category pages).
 * - engineFallback: shows a subtle amber glow when browser TTS fallback is active
 */

import { useRef, useEffect, useState } from 'react';

export interface SentenceChip {
  label: string;
  /** Optional ARASAAC or other pictogram URL */
  imageUrl?: string;
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
  /**
   * Optional mirror 🪞 button. Re-speaks the current sentence verbatim.
   * Replaces the magic button at GLP stages 1-2 to avoid corrective rewrites.
   * If both onMagic and onMirror are provided, mirror takes precedence.
   */
  onMirror?: () => void;
  placeholder?: string;
  /**
   * Set to true briefly when browser TTS fallback fired (ElevenLabs was unavailable).
   * Shows a subtle amber glow on the bar for 3 seconds.
   */
  engineFallback?: boolean;
}

export function SharedSentenceBar({
  words,
  onSpeak,
  onClear,
  onRemoveWord,
  onMagic,
  isMagicLoading = false,
  onMirror,
  placeholder = 'Tap words to build a sentence...',
  engineFallback = false,
}: SharedSentenceBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFallbackGlow, setShowFallbackGlow] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [words.length]);

  // Pulse the amber glow for 3s whenever engineFallback fires
  useEffect(() => {
    if (!engineFallback) return;
    setShowFallbackGlow(true);
    const t = setTimeout(() => setShowFallbackGlow(false), 3000);
    return () => clearTimeout(t);
  }, [engineFallback]);

  const hasWords = words.length > 0;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 min-h-[56px] bg-gray-800 rounded-xl mx-2 mt-2 shrink-0 transition-shadow duration-500 ${
        showFallbackGlow ? 'ring-2 ring-amber-400/70 shadow-[0_0_12px_2px_rgba(251,191,36,0.35)]' : ''
      }`}
      title={showFallbackGlow ? 'Using backup voice (ElevenLabs unavailable)' : undefined}
    >
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

      {/* 🪞 Mirror replaces magic at GLP stages 1-2 (no LLM rewrite, just re-speak) */}
      {onMirror ? (
        <button
          onClick={onMirror}
          disabled={words.length < 1}
          className={`shrink-0 w-10 h-10 rounded-xl text-white flex items-center justify-center text-base font-bold transition-all ${
            words.length >= 1
              ? 'bg-sky-500 hover:bg-sky-400 cursor-pointer active:scale-90'
              : 'bg-gray-600 cursor-not-allowed'
          }`}
          aria-label="Mirror: re-speak sentence as is"
          title="Mirror: say it back exactly"
        >
          &#129690;
        </button>
      ) : onMagic && (
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
              className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg font-bold text-sm border-2 transition-transform active:scale-95 ${
                onRemoveWord ? 'cursor-pointer' : 'cursor-default'
              } ${chip.className ?? 'bg-gray-600 text-white border-gray-500'}`}
              style={chip.style}
              aria-label={onRemoveWord ? `Remove ${chip.label}` : chip.label}
            >
              {chip.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={chip.imageUrl} alt="" className="w-7 h-7 object-contain shrink-0" />
              )}
              <span>{chip.label}</span>
            </button>
          ))
        )}
      </div>

      {/* Fallback indicator dot */}
      {showFallbackGlow && (
        <div
          className="shrink-0 w-2 h-2 rounded-full bg-amber-400 animate-pulse"
          aria-hidden="true"
          title="Backup voice active"
        />
      )}

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
