"use client";

import { useState, useCallback } from "react";

/* ── Counting Balls ─────────────────────────────────────── */
/* Tap the balls to count them. Score a point per correct answer. */

const BALL_EMOJIS = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"];

function generateRound() {
  const count = Math.floor(Math.random() * 5) + 1; // 1-5 balls
  const emoji = BALL_EMOJIS[Math.floor(Math.random() * BALL_EMOJIS.length)];
  return { count, emoji };
}

export default function CountingBalls() {
  const [round, setRound] = useState(generateRound);
  const [tapped, setTapped] = useState(0);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const [shake, setShake] = useState(false);

  const handleTap = useCallback((idx: number) => {
    if (celebration) return;
    if (idx === tapped) {
      setTapped((t) => t + 1);
    }
  }, [tapped, celebration]);

  const handleAnswer = useCallback((choice: number) => {
    if (celebration) return;
    setTotal((t) => t + 1);
    if (choice === round.count) {
      setScore((s) => s + 1);
      setCelebration(true);
      setTimeout(() => {
        setCelebration(false);
        setTapped(0);
        setRound(generateRound());
      }, 1500);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }, [round, celebration]);

  const choices = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <div style={{ textAlign: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 28, margin: "0 0 8px" }}>🧮 Counting Balls</h2>
      <p style={{ color: "#666", margin: "0 0 16px" }}>
        Tap each ball, then pick the right number!
      </p>

      <div style={{ fontSize: 14, marginBottom: 16, color: "#888" }}>
        Score: <strong style={{ color: "#4CAF50" }}>{score}</strong> / {total}
      </div>

      {celebration && (
        <div style={{ fontSize: 48, marginBottom: 16, animation: "none" }}>
          🎉 Correct! 🎉
        </div>
      )}

      <div
        style={{
          display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap",
          marginBottom: 24, minHeight: 80,
          transform: shake ? "translateX(8px)" : "none",
          transition: "transform 0.1s",
        }}
      >
        {Array.from({ length: round.count }, (_, i) => (
          <button
            key={i}
            onClick={() => handleTap(i)}
            style={{
              fontSize: 48, background: "none", border: "none", cursor: "pointer",
              opacity: i < tapped ? 0.4 : 1,
              transform: i < tapped ? "scale(0.8)" : "scale(1)",
              transition: "all 0.2s",
              filter: i < tapped ? "grayscale(0.5)" : "none",
            }}
            aria-label={`Ball ${i + 1}`}
          >
            {round.emoji}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {choices.map((n) => (
          <button
            key={n}
            onClick={() => handleAnswer(n)}
            style={{
              width: 56, height: 56, borderRadius: "50%", fontSize: 24, fontWeight: 700,
              border: "3px solid #2196F3", background: "#E3F2FD", color: "#1565C0",
              cursor: "pointer", transition: "transform 0.15s",
            }}
            onPointerDown={(e) => ((e.target as HTMLElement).style.transform = "scale(0.9)")}
            onPointerUp={(e) => ((e.target as HTMLElement).style.transform = "scale(1)")}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
