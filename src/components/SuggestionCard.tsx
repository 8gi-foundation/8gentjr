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
// Styles — matches ChangePreview confirm/undo pattern
// ---------------------------------------------------------------------------

const styles = {
  container: {
    background: "#FFF8F0",
    border: "2px solid #FDBA74",
    borderRadius: 16,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center" as const,
    gap: 12,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  text: {
    fontSize: "1rem",
    fontWeight: 700 as const,
    color: "#1F2937",
  },
  reason: {
    fontSize: "0.8rem",
    color: "#92400E",
    lineHeight: 1.4,
  },
  categoryBadge: (category: Suggestion["category"]) => {
    const colors = {
      usage: { bg: "#EDE9FE", color: "#5B21B6", border: "#C4B5FD" },
      stage: { bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
      grid: { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
    };
    const c = colors[category];
    return {
      fontSize: "0.65rem",
      fontWeight: 600 as const,
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      padding: "2px 8px",
      borderRadius: 6,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      alignSelf: "flex-start" as const,
    };
  },
  acceptBtn: {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
    borderRadius: 14,
    border: "3px solid #10B981",
    background: "#D1FAE5",
    color: "#065F46",
    fontSize: 24,
    fontWeight: 700 as const,
    cursor: "pointer",
    display: "flex",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    transition: "transform 0.1s",
  },
  dismissBtn: {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
    borderRadius: 14,
    border: "3px solid #EF4444",
    background: "#FEE2E2",
    color: "#991B1B",
    fontSize: 24,
    fontWeight: 700 as const,
    cursor: "pointer",
    display: "flex",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    transition: "transform 0.1s",
  },
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
    <div style={styles.container}>
      <div style={styles.content}>
        <span style={styles.categoryBadge(suggestion.category)}>
          {suggestion.category}
        </span>
        <span style={styles.text}>{suggestion.text}</span>
        <span style={styles.reason}>{suggestion.reason}</span>
      </div>
      <button
        onClick={() => onAccept(suggestion)}
        style={styles.acceptBtn}
        aria-label={`Accept suggestion: ${suggestion.text}`}
      >
        &#10003;
      </button>
      <button
        onClick={() => onDismiss(suggestion)}
        style={styles.dismissBtn}
        aria-label={`Dismiss suggestion: ${suggestion.text}`}
      >
        &#10005;
      </button>
    </div>
  );
}
