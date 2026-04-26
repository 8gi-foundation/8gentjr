'use client';

/**
 * YourWordsRow: GLP Tier 2.5 personal vocab promotion.
 *
 * Surfaces the child's most-tapped words (frequency-sorted) above the
 * Suggested row and the locked Supercore grid. Cards CAN reorder by
 * frequency between sessions; this is a separate motor zone from the
 * locked grid below.
 *
 * Visual signature is distinct from both neighbours:
 *   - Suggested row: dashed amber-400 border on amber-50 (changes-allowed)
 *   - Locked grid:   solid Fitzgerald category colors (never moves)
 *   - Your Words:    solid amber-200 fill + amber-500 border + favorite star
 *
 * Empty input hides the row entirely (no header, no container).
 *
 * Issue: #139
 */

import React, { useCallback } from 'react';
import { TapCard } from '@/components/TapCard';

export interface YourWordsCard {
  /** Lowercase word as logged. */
  word: string;
  /** Tap count in the recency window (debug + future analytics; not rendered). */
  count: number;
  /** Optional ARASAAC pictogram URL when the word maps to a Supercore entry. */
  imageUrl?: string;
}

export interface YourWordsRowProps {
  cards: YourWordsCard[];
  cols: number;
  /** Called with the word text when a card is tapped. */
  onTap: (word: string, imageUrl?: string) => void;
}

const ROW_MAX = 6;

const YourWordsCardButton = React.memo(function YourWordsCardButton({
  card,
  onTap,
}: {
  card: YourWordsCard;
  onTap: (word: string, imageUrl?: string) => void;
}) {
  const handleTap = useCallback(() => onTap(card.word, card.imageUrl), [onTap, card.word, card.imageUrl]);
  return (
    <TapCard
      onTap={handleTap}
      ariaLabel={`${card.word}, your favourite word`}
      className="relative flex flex-col items-center justify-center rounded-xl border-[3px] border-amber-500 bg-amber-200 text-amber-950 py-1.5 px-0.5 text-center leading-tight"
      style={{ minHeight: 80 }}
    >
      {/* Favourite star indicator - top-right corner */}
      <span
        aria-hidden="true"
        className="absolute top-1 right-1 text-[14px] leading-none text-amber-700"
        title="Favourite"
      >
        {'\u2605'}
      </span>
      {card.imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={card.imageUrl}
          alt={card.word}
          width={52}
          height={52}
          className="w-[52px] h-[52px] object-contain pointer-events-none"
          loading="lazy"
        />
      )}
      <span className="font-bold text-[14px] leading-none mt-0.5 w-full line-clamp-2 px-0.5">
        {card.word}
      </span>
    </TapCard>
  );
});

export function YourWordsRow({ cards, cols, onTap }: YourWordsRowProps) {
  if (cards.length === 0) return null;

  // Cap columns so cards stay readable on the 10-col desktop grid.
  const rowCols = Math.min(cols, ROW_MAX);

  return (
    <div className="px-1.5 pt-2 pb-1">
      <p className="text-[10px] font-semibold text-amber-800/90 uppercase tracking-wider mb-1.5 px-0.5">
        Your Words
      </p>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${rowCols}, 1fr)` }}
      >
        {cards.map((c) => (
          <YourWordsCardButton key={c.word} card={c} onTap={onTap} />
        ))}
      </div>
    </div>
  );
}

export default YourWordsRow;
