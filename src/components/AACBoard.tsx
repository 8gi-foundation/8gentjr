"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Grid density presets — progressive from accessible to advanced
// ---------------------------------------------------------------------------
export const GRID_DENSITY_OPTIONS = [4, 6, 8, 10] as const;
export type GridDensity = (typeof GRID_DENSITY_OPTIONS)[number];

const DEFAULT_COLUMNS: GridDensity = 4;
const CELL_GAP_PX = 10;
const MIN_ICON_SIZE_PX = 60;

// ---------------------------------------------------------------------------
// Sample AAC symbols (placeholder set — will be replaced by real symbol bank)
// ---------------------------------------------------------------------------
const SAMPLE_SYMBOLS = [
  { id: "want", label: "I want", emoji: "👋" },
  { id: "eat", label: "Eat", emoji: "🍽️" },
  { id: "drink", label: "Drink", emoji: "🥤" },
  { id: "play", label: "Play", emoji: "🎮" },
  { id: "help", label: "Help", emoji: "🆘" },
  { id: "more", label: "More", emoji: "➕" },
  { id: "stop", label: "Stop", emoji: "🛑" },
  { id: "yes", label: "Yes", emoji: "✅" },
  { id: "no", label: "No", emoji: "❌" },
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "sad", label: "Sad", emoji: "😢" },
  { id: "tired", label: "Tired", emoji: "😴" },
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
    <div style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
      {/* Sentence strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 48,
          padding: "8px 12px",
          marginBottom: 12,
          background: "#f5f5f5",
          borderRadius: 12,
          fontSize: "1.1rem",
          flexWrap: "wrap",
        }}
      >
        <span style={{ flex: 1, color: selectedSymbols.length ? "#1a1a2e" : "#999" }}>
          {selectedSymbols.length ? selectedSymbols.join(" ") : "Tap symbols to build a sentence..."}
        </span>
        {selectedSymbols.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              background: "#E8610A",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Density selector */}
      {showDensitySelector && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            fontSize: "0.85rem",
            color: "#666",
          }}
        >
          <span>Grid size:</span>
          {GRID_DENSITY_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setColumns(opt)}
              style={{
                background: columns === opt ? "#E8610A" : "#eee",
                color: columns === opt ? "#fff" : "#333",
                border: "none",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                fontWeight: columns === opt ? 700 : 400,
                fontSize: "0.85rem",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Symbol grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: CELL_GAP_PX,
        }}
      >
        {SAMPLE_SYMBOLS.map((sym) => (
          <button
            key={sym.id}
            onClick={() => handleSymbolTap(sym.label)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              background: "#fff",
              border: "2px solid #e0e0e0",
              borderRadius: 12,
              padding: 8,
              cursor: "pointer",
              transition: "transform 0.1s, border-color 0.1s",
              minHeight: MIN_ICON_SIZE_PX + 28, // icon + label
            }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#E8610A";
            }}
            onPointerUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#e0e0e0";
            }}
            onPointerLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#e0e0e0";
            }}
          >
            <span
              style={{
                fontSize: `${MIN_ICON_SIZE_PX * 0.65}px`,
                lineHeight: 1,
                minWidth: MIN_ICON_SIZE_PX,
                minHeight: MIN_ICON_SIZE_PX,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {sym.emoji}
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#333" }}>
              {sym.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
