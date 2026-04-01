"use client";

import { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChangeDetail {
  /** Human-readable description of what changed */
  description: string;
  /** What the state was before (e.g. "Grid: 4 columns") */
  before: string;
  /** What the state will be after (e.g. "Grid: 6 columns") */
  after: string;
}

export interface ChangePreviewProps {
  change: ChangeDetail;
  /** Called when the user confirms the change */
  onConfirm: () => void;
  /** Called when the user undoes/rejects the change */
  onUndo: () => void;
  /** Auto-accept timeout in ms. Default 30000 (30s). */
  autoAcceptMs?: number;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    background: "#FFF8F0",
    border: "2px solid #FDBA74",
    borderRadius: 16,
    padding: "12px 16px",
    marginTop: 8,
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  description: {
    fontSize: "0.9rem",
    fontWeight: 600 as const,
    color: "#92400E",
  },
  diffRow: {
    display: "flex",
    gap: 12,
    fontSize: "0.85rem",
    alignItems: "center" as const,
    flexWrap: "wrap" as const,
  },
  beforeBadge: {
    background: "#FEE2E2",
    color: "#991B1B",
    borderRadius: 8,
    padding: "4px 10px",
    fontWeight: 600 as const,
    fontSize: "0.8rem",
    textDecoration: "line-through" as const,
  },
  afterBadge: {
    background: "#D1FAE5",
    color: "#065F46",
    borderRadius: 8,
    padding: "4px 10px",
    fontWeight: 600 as const,
    fontSize: "0.8rem",
  },
  arrow: {
    fontSize: "1rem",
    color: "#9CA3AF",
  },
  actions: {
    display: "flex",
    gap: 10,
    alignItems: "center" as const,
  },
  confirmBtn: {
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
  undoBtn: {
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
  timer: {
    fontSize: "0.75rem",
    color: "#9CA3AF",
    marginLeft: 4,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChangePreview({
  change,
  onConfirm,
  onUndo,
  autoAcceptMs = 30_000,
}: ChangePreviewProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(autoAcceptMs / 1000));
  const confirmedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!confirmedRef.current) {
            confirmedRef.current = true;
            onConfirm();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onConfirm]);

  const handleConfirm = () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm();
  };

  const handleUndo = () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onUndo();
  };

  return (
    <div style={styles.container}>
      <div style={styles.description}>{change.description}</div>
      <div style={styles.diffRow}>
        <span style={styles.beforeBadge}>{change.before}</span>
        <span style={styles.arrow}>&rarr;</span>
        <span style={styles.afterBadge}>{change.after}</span>
      </div>
      <div style={styles.actions}>
        <button
          onClick={handleConfirm}
          style={styles.confirmBtn}
          aria-label="Confirm change"
        >
          &#10003;
        </button>
        <button
          onClick={handleUndo}
          style={styles.undoBtn}
          aria-label="Undo change"
        >
          &#10005;
        </button>
        <span style={styles.timer}>
          Auto-accepts in {secondsLeft}s
        </span>
      </div>
    </div>
  );
}
