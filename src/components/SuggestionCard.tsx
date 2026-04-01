"use client";

import type { Suggestion } from "../lib/suggestions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SuggestionCardProps {
  suggestion: Suggestion;
  /** Called when the parent accepts the suggestion */
  onAccept: (suggestion: Suggestion) => void;
  /** Called when the parent dismisses the suggestion */
  onDismiss: (suggestion: Suggestion) => void;
}

// ---------------------------------------------------------------------------
// Category badge color classes
// ---------------------------------------------------------------------------

const CATEGORY_CLASSES: Record<Suggestion['category'], string> = {
  usage: 'bg-violet-100 text-violet-800 border-violet-300',
  stage: 'bg-blue-100 text-blue-800 border-blue-300',
  grid:  'bg-amber-100 text-amber-800 border-amber-300',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: SuggestionCardProps) {
  return (
    <div className="bg-[var(--brand-bg-warm)] border-2 border-orange-300 rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className="flex-1 flex flex-col gap-1">
        <span
          className={`text-[0.65rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border self-start ${CATEGORY_CLASSES[suggestion.category]}`}
        >
          {suggestion.category}
        </span>
        <span className="text-base font-bold text-gray-800">
          {suggestion.text}
        </span>
        <span className="text-xs text-amber-800 leading-snug">
          {suggestion.reason}
        </span>
      </div>
      <button
        onClick={() => onAccept(suggestion)}
        className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-[14px] border-[3px] border-emerald-500 bg-emerald-100 text-emerald-800 text-2xl font-bold cursor-pointer flex items-center justify-center transition-transform duration-100 active:scale-95"
        aria-label={`Accept suggestion: ${suggestion.text}`}
      >
        &#10003;
      </button>
      <button
        onClick={() => onDismiss(suggestion)}
        className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-[14px] border-[3px] border-red-500 bg-red-100 text-red-800 text-2xl font-bold cursor-pointer flex items-center justify-center transition-transform duration-100 active:scale-95"
        aria-label={`Dismiss suggestion: ${suggestion.text}`}
      >
        &#10005;
      </button>
    </div>
  );
}
