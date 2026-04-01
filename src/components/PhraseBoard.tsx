"use client";

import { CSSProperties } from "react";
import AACCard from "./AACCard";

/**
 * PhraseBoard — grid of AAC cards for sentence building.
 *
 * Grid is responsive and maintains readable card labels (16px min)
 * without truncation at standard grid sizes.
 */

export interface PhraseBoardProps {
  cards: { label: string; symbolUrl?: string; bgColor?: string }[];
  onCardTap?: (label: string) => void;
}

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
  gap: 12,
  padding: 16,
  width: "100%",
  maxWidth: 800,
};

export default function PhraseBoard({ cards, onCardTap }: PhraseBoardProps) {
  return (
    <div style={gridStyle} role="group" aria-label="AAC phrase board">
      {cards.map((card) => (
        <AACCard
          key={card.label}
          label={card.label}
          symbolUrl={card.symbolUrl}
          bgColor={card.bgColor}
          onClick={() => onCardTap?.(card.label)}
        />
      ))}
    </div>
  );
}
