"use client";

import { useState, useCallback } from "react";

/* ── Color Sort ─────────────────────────────────────────── */
/* Sort items into the correct color bucket. */

const BUCKETS = [
  { color: "Red",    hex: "#F44336", emoji: "🔴" },
  { color: "Blue",   hex: "#2196F3", emoji: "🔵" },
  { color: "Green",  hex: "#4CAF50", emoji: "🟢" },
  { color: "Yellow", hex: "#FFEB3B", emoji: "🟡" },
];

const ITEMS: { emoji: string; color: string }[] = [
  { emoji: "🍎", color: "Red" },    { emoji: "🌹", color: "Red" },
  { emoji: "🚗", color: "Red" },    { emoji: "🫐", color: "Blue" },
  { emoji: "🦋", color: "Blue" },   { emoji: "🧢", color: "Blue" },
  { emoji: "🥦", color: "Green" },  { emoji: "🐸", color: "Green" },
  { emoji: "🌲", color: "Green" },  { emoji: "⭐", color: "Yellow" },
  { emoji: "🌻", color: "Yellow" }, { emoji: "🍋", color: "Yellow" },
];

function pickItems() {
  const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6);
}

export default function ColorSort() {
  const [items, setItems] = useState(pickItems);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const item = items[current];
  const done = current >= items.length;

  const handleBucket = useCallback((bucketColor: string) => {
    if (done || celebration) return;
    setTotal((t) => t + 1);
    if (bucketColor === item.color) {
      setScore((s) => s + 1);
      setCelebration(true);
      setTimeout(() => {
        setCelebration(false);
        setCurrent((c) => c + 1);
      }, 800);
    } else {
      setFlash(bucketColor);
      setTimeout(() => setFlash(null), 400);
    }
  }, [item, done, celebration]);

  const restart = useCallback(() => {
    setItems(pickItems());
    setCurrent(0);
    setScore(0);
    setTotal(0);
    setCelebration(false);
  }, []);

  return (
    <div style={{ textAlign: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 28, margin: "0 0 8px" }}>🎨 Color Sort</h2>
      <p style={{ color: "#666", margin: "0 0 16px" }}>
        Put each item in the right color bucket!
      </p>

      <div style={{ fontSize: 14, marginBottom: 16, color: "#888" }}>
        Score: <strong style={{ color: "#4CAF50" }}>{score}</strong> / {total}
        {" · "} {current}/{items.length} sorted
      </div>

      {done ? (
        <div>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏆 All sorted! 🏆</div>
          <p style={{ fontSize: 20, color: "#4CAF50", fontWeight: 700 }}>
            {score}/{total} correct
          </p>
          <button
            onClick={restart}
            style={{
              marginTop: 16, padding: "12px 32px", fontSize: 18, borderRadius: 12,
              border: "none", background: "#4CAF50", color: "#FFF",
              cursor: "pointer", fontWeight: 700,
            }}
          >
            Play Again
          </button>
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 72, marginBottom: 24, padding: 16,
            background: "#FAFAFA", borderRadius: 20, display: "inline-block",
          }}>
            {celebration ? "✅" : item.emoji}
          </div>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {BUCKETS.map((b) => (
              <button
                key={b.color}
                onClick={() => handleBucket(b.color)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  padding: "16px 20px", borderRadius: 16, fontSize: 36, cursor: "pointer",
                  border: flash === b.color ? "3px solid #F44336" : `3px solid ${b.hex}`,
                  background: flash === b.color ? "#FFEBEE" : `${b.hex}20`,
                  transition: "all 0.2s",
                }}
                aria-label={`${b.color} bucket`}
              >
                {b.emoji}
                <span style={{ fontSize: 14, fontWeight: 600, color: b.hex }}>{b.color}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
