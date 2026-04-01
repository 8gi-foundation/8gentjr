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
  "want",
  "want",
  "want",
  "want",
  "more",
  "more",
  "more",
  "no",
  "no",
  "no",
  "go",
  "go",
  "go",
  "happy",
];

const SAMPLE_GLP_STAGE = 3;

const SAMPLE_GRID_NAME = "kitchen";
const SAMPLE_EXISTING_CARDS = ["spoon", "water", "eat", "more"];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    minHeight: "100vh",
    background: "#FAFAF8",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderBottom: "1px solid #E5E7EB",
    background: "#fff",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "2px solid #E5E7EB",
    background: "#fff",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    fontSize: "1.1rem",
    fontWeight: 700 as const,
    color: "#1F2937",
  },
  headerSub: {
    fontSize: "0.75rem",
    color: "#9CA3AF",
  },
  main: {
    flex: 1,
    padding: 16,
    display: "flex",
    flexDirection: "column" as const,
    gap: 24,
    maxWidth: 600,
    width: "100%",
    margin: "0 auto",
  },
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  sectionTitle: {
    fontSize: "0.85rem",
    fontWeight: 700 as const,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  empty: {
    fontSize: "0.85rem",
    color: "#9CA3AF",
    fontStyle: "italic" as const,
    padding: "8px 0",
  },
  acceptedBanner: {
    fontSize: "0.8rem",
    color: "#059669",
    fontWeight: 600 as const,
    padding: "6px 12px",
    background: "#D1FAE5",
    borderRadius: 10,
    display: "inline-block",
  },
  dismissedBanner: {
    fontSize: "0.8rem",
    color: "#DC2626",
    fontWeight: 600 as const,
    padding: "6px 12px",
    background: "#FEE2E2",
    borderRadius: 10,
    display: "inline-block",
  },
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

type DecisionMap = Record<string, "accepted" | "dismissed">;

export default function SuggestionsPage() {
  const [decisions, setDecisions] = useState<DecisionMap>({});

  // Generate all suggestions from the three engines
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
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <a href="/" style={{ textDecoration: "none" }}>
          <button style={styles.backBtn} aria-label="Back to home">
            &larr;
          </button>
        </a>
        <div>
          <div style={styles.headerTitle}>Smart Suggestions</div>
          <div style={styles.headerSub}>
            AI-recommended cards based on context
          </div>
        </div>
      </div>

      <div style={styles.main}>
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
      <div style={styles.section}>
        <div style={styles.sectionTitle}>{title}</div>
        <div style={styles.empty}>No suggestions right now</div>
      </div>
    );
  }

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {suggestions.map((s) => {
        const k = key(s);
        const decision = decisions[k];

        if (decision === "accepted") {
          return (
            <div key={k} style={styles.acceptedBanner}>
              &#10003; Added &ldquo;{s.text}&rdquo; to board
            </div>
          );
        }
        if (decision === "dismissed") {
          return (
            <div key={k} style={styles.dismissedBanner}>
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
