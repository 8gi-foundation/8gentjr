"use client";

import { useState } from "react";
import { GENERAL_PHRASES, FEELINGS_PHRASES, ACTIONS_PHRASES } from "@/lib/vocabulary";
import { speak } from "@/lib/tts";
import { SharedSentenceBar } from "@/components/SharedSentenceBar";

// ---------------------------------------------------------------------------
// Grid density presets — progressive from accessible to advanced
// ---------------------------------------------------------------------------
export const GRID_DENSITY_OPTIONS = [4, 6, 8, 10] as const;
export type GridDensity = (typeof GRID_DENSITY_OPTIONS)[number];

const DEFAULT_COLUMNS: GridDensity = 4;

// ---------------------------------------------------------------------------
// AAC symbols from vocabulary system (replaces hardcoded placeholder set)
// ---------------------------------------------------------------------------
const AAC_SYMBOLS = [
  ...GENERAL_PHRASES,
  ...FEELINGS_PHRASES,
  ...ACTIONS_PHRASES,
].map((phrase) => ({
  id: phrase.id,
  label: phrase.text,
  imageUrl: phrase.imageUrl,
}));

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface AACBoardProps {
  /** Number of columns in the grid (4 | 6 | 8 | 10). Defaults to 4. */
  columns?: GridDensity;
  /** Show the density selector so users can adjust on the fly. */
  showDensitySelector?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AACBoard({
  columns: initialColumns = DEFAULT_COLUMNS,
  showDensitySelector = true,
}: AACBoardProps) {
  const [columns, setColumns] = useState<GridDensity>(initialColumns);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);

  const handleSymbolTap = (label: string) => {
    setSelectedSymbols((prev) => [...prev, label]);
    speak({ text: label });
  };

  const handleSpeakSentence = () => {
    if (selectedSymbols.length > 0) {
      speak({ text: selectedSymbols.join(" ") });
    }
  };

  const handleClear = () => setSelectedSymbols([]);

  const handleRemoveWord = (index: number) =>
    setSelectedSymbols((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="w-full max-w-[900px] mx-auto">
      {/* Sentence strip — shared design */}
      <SharedSentenceBar
        words={selectedSymbols.map((label) => ({ label }))}
        onSpeak={handleSpeakSentence}
        onClear={handleClear}
        onRemoveWord={handleRemoveWord}
      />

      {/* Density selector */}
      {showDensitySelector && (
        <div className="flex items-center gap-2 my-3 text-sm text-[--brand-text-soft]">
          <span>Grid size:</span>
          {GRID_DENSITY_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setColumns(opt)}
              className={`
                border-none rounded-md px-2.5 py-1 cursor-pointer text-sm transition-colors
                ${columns === opt
                  ? "bg-[--brand-accent] text-white font-bold"
                  : "bg-[--warm-bg-page] text-[--brand-text-soft] hover:bg-[--warm-border-light]"
                }
              `}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Symbol grid — uses ARASAAC pictograms from vocabulary system */}
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {AAC_SYMBOLS.map((sym) => (
          <button
            key={sym.id}
            onClick={() => handleSymbolTap(sym.label)}
            className="
              aac-card flex flex-col items-center justify-center gap-1
              bg-white border-2 border-[--brand-border] rounded-xl p-2
              cursor-pointer transition-all duration-100
              active:scale-95 active:border-[--brand-accent]
              hover:shadow-md
            "
            style={{ minHeight: 88 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sym.imageUrl}
              alt={sym.label}
              className="w-[60px] h-[60px] object-contain"
            />
            <span className="text-sm font-semibold text-[--brand-text-soft]">
              {sym.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
