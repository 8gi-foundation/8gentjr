"use client";

import { useState, useCallback, useRef } from "react";

/* ── Bubble grid ─────────────────────────────────────────── */

const ROWS = 6;
const COLS = 5;
const TOTAL = ROWS * COLS;

function makeBubbles() {
  return Array.from({ length: TOTAL }, (_, i) => ({
    id: i,
    popped: false,
  }));
}

const PASTEL = [
  "#A8E6CF", "#DCEDC1", "#FFD3B6", "#FFAAA5",
  "#FF8B94", "#B5EAD7", "#C7CEEA", "#E2F0CB",
];

/* ── Pop sound via Web Audio ─────────────────────────────── */

function playPop(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(600 + Math.random() * 400, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.start(now);
  osc.stop(now + 0.12);
}

/* ── Component ───────────────────────────────────────────── */

export default function BubbleWrap() {
  const [bubbles, setBubbles] = useState(makeBubbles);
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  const pop = useCallback(
    (id: number) => {
      playPop(getCtx());
      setBubbles((prev) =>
        prev.map((b) => (b.id === id ? { ...b, popped: true } : b))
      );
    },
    [getCtx]
  );

  const reset = useCallback(() => setBubbles(makeBubbles()), []);

  const allPopped = bubbles.every((b) => b.popped);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 16 }}>
      <h2 style={{ margin: 0, fontSize: 22, color: "#555" }}>Bubble Wrap</h2>
      <p style={{ margin: 0, fontSize: 14, color: "#888" }}>Tap to pop!</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 8,
          maxWidth: 320,
        }}
      >
        {bubbles.map((b) => (
          <button
            key={b.id}
            onClick={() => !b.popped && pop(b.id)}
            aria-label={b.popped ? "Popped bubble" : "Pop this bubble"}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "none",
              cursor: b.popped ? "default" : "pointer",
              background: b.popped ? "#e0e0e0" : PASTEL[b.id % PASTEL.length],
              boxShadow: b.popped
                ? "inset 0 2px 6px rgba(0,0,0,0.15)"
                : "0 3px 8px rgba(0,0,0,0.12), inset 0 -2px 4px rgba(255,255,255,0.6)",
              transform: b.popped ? "scale(0.85)" : "scale(1)",
              transition: "transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
              opacity: b.popped ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      {allPopped && (
        <button
          onClick={reset}
          style={{
            marginTop: 8,
            padding: "10px 28px",
            borderRadius: 20,
            border: "none",
            background: "#7C4DFF",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          New Sheet
        </button>
      )}
    </div>
  );
}
