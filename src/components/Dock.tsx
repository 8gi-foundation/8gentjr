"use client";

import { useState, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────── */

interface DockItem {
  id: string;
  label: string;
  icon: string; // emoji for now — swap for ARASAAC SVGs later
}

/* ── Data ──────────────────────────────────────────────────── */

const CORE_ITEMS: DockItem[] = [
  { id: "aac",      label: "Talk",     icon: "💬" },
  { id: "music",    label: "Music",    icon: "🎵" },
  { id: "games",    label: "Games",    icon: "🎮" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

const MORE_ITEMS: DockItem[] = [
  { id: "draw",   label: "Draw",   icon: "🎨" },
  { id: "timer",  label: "Timer",  icon: "⏱️" },
  { id: "speech", label: "Speech", icon: "🗣️" },
];

/* ── Styles ────────────────────────────────────────────────── */

const DOCK_HEIGHT = 72;
const TAP_SIZE = 56; // well above 48px minimum

const styles = {
  dock: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: DOCK_HEIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    background: "rgba(255,255,255,0.95)",
    borderTop: "1px solid #e0e0e0",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    zIndex: 100,
    padding: "0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
  },
  item: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    width: TAP_SIZE,
    height: TAP_SIZE,
    minWidth: TAP_SIZE,
    minHeight: TAP_SIZE,
    borderRadius: 14,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 24,
    padding: 0,
    WebkitTapHighlightColor: "transparent",
    transition: "transform 0.1s ease, background 0.15s ease",
    touchAction: "manipulation" as const,
  },
  itemActive: {
    background: "rgba(232, 97, 10, 0.12)",
    transform: "scale(0.92)",
  },
  label: {
    fontSize: 10,
    fontWeight: 600 as const,
    marginTop: 2,
    color: "#555",
    letterSpacing: "0.02em",
  },
  labelActive: {
    color: "#E8610A",
  },
  /* More menu overlay */
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.3)",
    zIndex: 99,
    animation: "fadeIn 0.15s ease",
  },
  morePanel: {
    position: "fixed" as const,
    bottom: DOCK_HEIGHT + 8,
    right: 12,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    padding: 8,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    zIndex: 101,
    minWidth: 140,
    animation: "slideUp 0.15s ease",
  },
  moreItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    border: "none",
    background: "transparent",
    borderRadius: 12,
    cursor: "pointer",
    fontSize: 16,
    width: "100%" as const,
    textAlign: "left" as const,
    minHeight: 48,
    WebkitTapHighlightColor: "transparent",
    transition: "background 0.1s ease",
  },
} as const;

/* ── Component ─────────────────────────────────────────────── */

export default function Dock({
  activeId,
  onNavigate,
}: {
  activeId?: string;
  onNavigate?: (id: string) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const handleTap = useCallback(
    (id: string) => {
      // Haptic feedback (if supported)
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
      // Audio click
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.05;
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } catch {
        /* silent fail — audio not critical */
      }

      onNavigate?.(id);
    },
    [onNavigate],
  );

  return (
    <>
      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      {/* More menu overlay + panel */}
      {moreOpen && (
        <>
          <div style={styles.overlay} onClick={() => setMoreOpen(false)} />
          <div style={styles.morePanel}>
            {MORE_ITEMS.map((item) => (
              <button
                key={item.id}
                style={styles.moreItem}
                onClick={() => {
                  setMoreOpen(false);
                  handleTap(item.id);
                }}
                onPointerDown={() => setPressedId(item.id)}
                onPointerUp={() => setPressedId(null)}
                onPointerCancel={() => setPressedId(null)}
                aria-label={item.label}
              >
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <span style={{ fontWeight: 500, color: "#333" }}>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Dock bar */}
      <nav style={styles.dock} role="navigation" aria-label="Main navigation">
        {CORE_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          const isPressed = pressedId === item.id;
          return (
            <button
              key={item.id}
              style={{
                ...styles.item,
                ...(isActive || isPressed ? styles.itemActive : {}),
              }}
              onClick={() => handleTap(item.id)}
              onPointerDown={() => setPressedId(item.id)}
              onPointerUp={() => setPressedId(null)}
              onPointerCancel={() => setPressedId(null)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span>{item.icon}</span>
              <span
                style={{
                  ...styles.label,
                  ...(isActive ? styles.labelActive : {}),
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More button */}
        <button
          style={{
            ...styles.item,
            ...(moreOpen || pressedId === "more" ? styles.itemActive : {}),
          }}
          onClick={() => setMoreOpen((v) => !v)}
          onPointerDown={() => setPressedId("more")}
          onPointerUp={() => setPressedId(null)}
          onPointerCancel={() => setPressedId(null)}
          aria-label="More options"
          aria-expanded={moreOpen}
        >
          <span>•••</span>
          <span style={styles.label}>More</span>
        </button>
      </nav>
    </>
  );
}
