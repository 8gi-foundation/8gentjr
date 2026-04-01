"use client";

import { useState, useMemo } from "react";
import SuggestionCard from "../../components/SuggestionCard";
import {
  suggestByUsage,
  suggestByStage,
  suggestByGrid,
  type Suggestion,
} from "../../lib/suggestions";

// ---------------------------------------------------------------------------
// Sample data — simulates a child's real usage context
// ---------------------------------------------------------------------------

const SAMPLE_USED_WORDS = [
  "want", "want", "want", "want",
  "more", "more", "more",
  "no", "no", "no",
  "go", "go", "go",
  "happy",
];

const SAMPLE_GLP_STAGE = 3;
const SAMPLE_GRID_NAME = "kitchen";
const SAMPLE_EXISTING_CARDS = ["spoon", "water", "eat", "more"];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

type DecisionMap = Record<string, "accepted" | "dismissed">;

export default function SuggestionsPage() {
  const [decisions, setDecisions] = useState<DecisionMap>({});

  const usageSuggestions = useMemo(
    () => suggestByUsage(SAMPLE_USED_WORDS),
    []
  );
  const stageSuggestions = useMemo(
    () => suggestByStage(SAMPLE_GLP_STAGE),
    []
  );
  const gridSuggestions = useMemo(
    () => suggestByGrid(SAMPLE_GRID_NAME, SAMPLE_EXISTING_CARDS),
    []
  );

  const handleAccept = (s: Suggestion) => {
    setDecisions((prev) => ({ ...prev, [key(s)]: "accepted" }));
  };

  const handleDismiss = (s: Suggestion) => {
    setDecisions((prev) => ({ ...prev, [key(s)]: "dismissed" }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--warm-bg-subtle)] font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <a href="/" className="no-underline">
          <button
            className="w-10 h-10 rounded-[10px] border-2 border-gray-200 bg-white text-lg cursor-pointer flex items-center justify-center"
            aria-label="Back to home"
          >
            &larr;
          </button>
        </a>
        <div>
          <div className="text-lg font-bold text-gray-800">
            Smart Suggestions
          </div>
          <div className="text-xs text-[var(--warm-text-muted)]">
            AI-recommended cards based on context
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-6 max-w-[600px] w-full mx-auto">
        {/* Usage-based */}
        <Section
          title="Based on word usage"
          suggestions={usageSuggestions}
          decisions={decisions}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
        />

        {/* Stage-based */}
        <Section
          title={`GLP Stage ${SAMPLE_GLP_STAGE} vocabulary`}
          suggestions={stageSuggestions}
          decisions={decisions}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
        />

        {/* Grid-based */}
        <Section
          title={`Missing from "${SAMPLE_GRID_NAME}" grid`}
          suggestions={gridSuggestions}
          decisions={decisions}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stable key for a suggestion */
function key(s: Suggestion): string {
  return `${s.category}::${s.text}`;
}

function Section({
  title,
  suggestions,
  decisions,
  onAccept,
  onDismiss,
}: {
  title: string;
  suggestions: Suggestion[];
  decisions: DecisionMap;
  onAccept: (s: Suggestion) => void;
  onDismiss: (s: Suggestion) => void;
}) {
  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          {title}
        </div>
        <div className="text-sm text-[var(--warm-text-muted)] italic py-2">
          No suggestions right now
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
        {title}
      </div>
      {suggestions.map((s) => {
        const k = key(s);
        const decision = decisions[k];

        if (decision === "accepted") {
          return (
            <div
              key={k}
              className="text-xs text-emerald-600 font-semibold px-3 py-1.5 bg-emerald-100 rounded-[10px] inline-block"
            >
              &#10003; Added &ldquo;{s.text}&rdquo; to board
            </div>
          );
        }
        if (decision === "dismissed") {
          return (
            <div
              key={k}
              className="text-xs text-red-600 font-semibold px-3 py-1.5 bg-red-100 rounded-[10px] inline-block"
            >
              &#10005; Dismissed &ldquo;{s.text}&rdquo;
            </div>
          );
        }

        return (
          <SuggestionCard
            key={k}
            suggestion={s}
            onAccept={onAccept}
            onDismiss={onDismiss}
          />
        );
      })}
    </div>
  );
}
