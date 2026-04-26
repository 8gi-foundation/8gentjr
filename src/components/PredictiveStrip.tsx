'use client';

/**
 * PredictiveStrip: GLP Tier 2.4 next-word prediction.
 *
 * Four cards directly above the locked Supercore grid that recompute on
 * every sentence tap. Source is today's bigrams unioned with the stage
 * word bank - see `src/lib/predictive.ts`.
 *
 * Visual signature is intentionally distinct from neighbours:
 *   - Predictive (this row): solid sky-100 fill + sky-300 border ("what's next")
 *   - Suggested row:         dashed amber-400 border on amber-50
 *   - Your Words row:        solid amber-200 fill + amber-500 border + star
 *   - Locked grid below:     Fitzgerald category colors
 *
 * Cards in this row CAN move - prediction adapts. Motor planning lives
 * in the locked grid below.
 *
 * Issue: #138
 */

import React, { useCallback } from 'react';
import { TapCard } from '@/components/TapCard';
import type { PredictiveCandidate } from '@/lib/predictive';

export interface PredictiveStripProps {
  cards: PredictiveCandidate[];
  cols: number;
  /** Called with the candidate text when a card is tapped. */
  onTap: (text: string) => void;
}

const PredictiveCard = React.memo(function PredictiveCard({
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
      ariaLabel={`Next word suggestion: ${text}`}
      className="flex items-center justify-center rounded-xl border-2 border-sky-300 bg-sky-100 text-sky-900 px-2 py-2 text-center leading-tight"
      style={{ minHeight: 56 }}
    >
      <span className="font-bold text-[13px] leading-tight w-full line-clamp-2">{text}</span>
    </TapCard>
  );
});

export function PredictiveStrip({ cards, cols, onTap }: PredictiveStripProps) {
  if (cards.length === 0) return null;

  // Always 4 cards in the row - cap columns so they stay readable on the
  // 10-col desktop grid without stretching to full width.
  const rowCols = Math.min(cols, cards.length);

  return (
    <div className="px-1.5 pt-2 pb-1">
      <p className="text-[10px] font-semibold text-sky-700/80 uppercase tracking-wider mb-1.5 px-0.5">
        What's next
      </p>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${rowCols}, 1fr)` }}
      >
        {cards.map((c, i) => (
          <PredictiveCard key={`${c.text}-${i}`} text={c.text} onTap={onTap} />
        ))}
      </div>
    </div>
  );
}

export default PredictiveStrip;
