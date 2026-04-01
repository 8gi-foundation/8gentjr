"use client";

import { useState, useCallback } from "react";

/* ── Shape Match ────────────────────────────────────────── */
/* Match shapes to their outlines. Drag/tap the shape that fits. */

const SHAPES = [
  { name: "Circle",   solid: "🔴", outline: "⭕" },
  { name: "Square",   solid: "🟦", outline: "⬜" },
  { name: "Triangle", solid: "🔺", outline: "△" },
  { name: "Diamond",  solid: "🔷", outline: "◇" },
  { name: "Star",     solid: "⭐", outline: "☆" },
  { name: "Heart",    solid: "❤️", outline: "♡" },
];

function pickRound() {
  const shuffled = [...SHAPES].sort(() => Math.random() - 0.5);
  const target = shuffled[0];
  const options = shuffled.slice(0, 4).sort(() => Math.random() - 0.5);
  return { target, options };
}

export default function ShapeMatch() {
  const [round, setRound] = useState(pickRound);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);

  const handlePick = useCallback((shape: typeof SHAPES[number]) => {
    if (celebration) return;
    setTotal((t) => t + 1);
    if (shape.name === round.target.name) {
      setScore((s) => s + 1);
      setCelebration(true);
      setTimeout(() => {
        setCelebration(false);
        setRound(pickRound());
      }, 1400);
    } else {
      setWrongId(shape.name);
      setTimeout(() => setWrongId(null), 500);
    }
  }, [round, celebration]);

  return (
    <div style={{ textAlign: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 28, margin: "0 0 8px" }}>🔷 Shape Match</h2>
      <p style={{ color: "#666", margin: "0 0 16px" }}>
        Find the shape that matches the outline!
      </p>

      <div style={{ fontSize: 14, marginBottom: 16, color: "#888" }}>
        Score: <strong style={{ color: "#4CAF50" }}>{score}</strong> / {total}
      </div>

      {celebration && (
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉 Great match! 🎉</div>
      )}

      <div style={{
        fontSize: 80, marginBottom: 24, padding: 24,
        background: "#F5F5F5", borderRadius: 20, display: "inline-block",
        border: "3px dashed #BDBDBD",
      }}>
        {round.target.outline}
      </div>

      <p style={{ color: "#999", fontSize: 14, marginBottom: 12 }}>
        Which shape fits? Tap it!
      </p>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {round.options.map((s) => (
          <button
            key={s.name}
            onClick={() => handlePick(s)}
            style={{
              fontSize: 52, padding: "12px 16px", borderRadius: 16,
              border: wrongId === s.name ? "3px solid #F44336" : "3px solid #E0E0E0",
              background: wrongId === s.name ? "#FFEBEE" : "#FFF",
              cursor: "pointer", transition: "all 0.2s",
              transform: wrongId === s.name ? "scale(0.9)" : "scale(1)",
            }}
            aria-label={s.name}
          >
            {s.solid}
          </button>
        ))}
      </div>
    </div>
  );
}
