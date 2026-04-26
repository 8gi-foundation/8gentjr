'use client';

/**
 * SuggestedRow: adaptive layer above the locked Supercore grid.
 *
 * Cards CAN reorder/refresh between sessions. Locked grid below NEVER moves.
 * Tinted background + soft pulse border signals "these can change" to children
 * while preserving motor planning of the fixed grid.
 *
 * Issue: #136
 */

import React, { useCallback } from 'react';
import { TapCard } from '@/components/TapCard';
import { suggestByStage } from '@/lib/suggestions';

export interface SuggestedRowProps {
  glpStage: number;
  cols: number;
  /** Called with the suggestion text when a card is tapped. */
  onTap: (text: string) => void;
}

const ROW_COUNT = 6;

const SuggestedCard = React.memo(function SuggestedCard({
  text,
  onTap,
}: {
  text: string;
  onTap: (text: string) => void;
}) {
  const handleTap = useCallback(() => onTap(text), [onTap, text]);
  return (
    <TapCard
      onTap={handleTap}
      ariaLabel={text}
      className="flex items-center justify-center rounded-xl border-2 border-dashed border-amber-400/70 bg-amber-50 text-amber-900 px-2 py-2 text-center leading-tight animate-[pulse_3.5s_ease-in-out_infinite]"
      style={{ minHeight: 56 }}
    >
      <span className="font-bold text-[13px] leading-tight w-full line-clamp-2">{text}</span>
    </TapCard>
  );
});

export function SuggestedRow({ glpStage, cols, onTap }: SuggestedRowProps) {
  const suggestions = suggestByStage(glpStage).slice(0, ROW_COUNT);
  if (suggestions.length === 0) return null;

  // Cap columns so cards stay readable on the 10-col desktop grid.
  const rowCols = Math.min(cols, ROW_COUNT);

  return (
    <div className="px-1.5 pt-2 pb-1">
      <p className="text-[10px] font-semibold text-amber-700/80 uppercase tracking-wider mb-1.5 px-0.5">
        Suggested for you
      </p>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${rowCols}, 1fr)` }}
      >
        {suggestions.map((s, i) => (
          <SuggestedCard key={`${s.text}-${i}`} text={s.text} onTap={onTap} />
        ))}
      </div>
    </div>
  );
}

export default SuggestedRow;
