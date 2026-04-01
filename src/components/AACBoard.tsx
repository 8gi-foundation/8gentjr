"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Grid density presets — progressive from accessible to advanced
// ---------------------------------------------------------------------------
export const GRID_DENSITY_OPTIONS = [4, 6, 8, 10] as const;
export type GridDensity = (typeof GRID_DENSITY_OPTIONS)[number];

const DEFAULT_COLUMNS: GridDensity = 4;

// ---------------------------------------------------------------------------
// Sample AAC symbols (placeholder set — will be replaced by real symbol bank)
// ---------------------------------------------------------------------------
const SAMPLE_SYMBOLS = [
  { id: "want", label: "I want", emoji: "\u{1F44B}" },
  { id: "eat", label: "Eat", emoji: "\u{1F37D}\uFE0F" },
  { id: "drink", label: "Drink", emoji: "\u{1F964}" },
  { id: "play", label: "Play", emoji: "\u{1F3AE}" },
  { id: "help", label: "Help", emoji: "\u{1F198}" },
  { id: "more", label: "More", emoji: "\u2795" },
  { id: "stop", label: "Stop", emoji: "\u{1F6D1}" },
  { id: "yes", label: "Yes", emoji: "\u2705" },
  { id: "no", label: "No", emoji: "\u274C" },
  { id: "happy", label: "Happy", emoji: "\u{1F60A}" },
  { id: "sad", label: "Sad", emoji: "\u{1F622}" },
  { id: "tired", label: "Tired", emoji: "\u{1F634}" },
];

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
  };

  const handleClear = () => setSelectedSymbols([]);

  return (
    <div className="w-full max-w-[900px] mx-auto">
      {/* Sentence strip */}
      <div className="flex items-center gap-2 min-h-12 px-3 py-2 mb-3 bg-[--warm-bg-subtle] rounded-xl text-lg flex-wrap">
        <span className={`flex-1 ${selectedSymbols.length ? "text-[--brand-text]" : "text-[--brand-text-muted]"}`}>
          {selectedSymbols.length ? selectedSymbols.join(" ") : "Tap symbols to build a sentence..."}
        </span>
        {selectedSymbols.length > 0 && (
          <button
            onClick={handleClear}
            className="bg-[--brand-accent] hover:bg-[--brand-accent-hover] text-white border-none rounded-lg px-3.5 py-1.5 cursor-pointer font-semibold text-sm transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Density selector */}
      {showDensitySelector && (
        <div className="flex items-center gap-2 mb-3 text-sm text-[--brand-text-soft]">
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

      {/* Symbol grid */}
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {SAMPLE_SYMBOLS.map((sym) => (
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
            <span className="text-[39px] leading-none min-w-[60px] min-h-[60px] flex items-center justify-center">
              {sym.emoji}
            </span>
            <span className="text-xs font-semibold text-[--brand-text-soft]">
              {sym.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
