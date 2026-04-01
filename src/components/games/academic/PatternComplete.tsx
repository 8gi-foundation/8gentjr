"use client";

import { useState, useCallback } from "react";

/* ── Pattern Complete ───────────────────────────────────── */
/* Complete the repeating pattern sequence. */

const PATTERN_SETS = [
  ["🔴", "🔵"],
  ["⭐", "🌙"],
  ["🐱", "🐶"],
  ["🌸", "🍀"],
  ["🔺", "🔷"],
  ["🍎", "🍊", "🍋"],
  ["❤️", "💛", "💙"],
  ["🐟", "🐠", "🐡"],
  ["🌞", "🌧️", "⛅"],
  ["🟢", "🟡", "🔴", "🔵"],
];

function pickRound() {
  const set = PATTERN_SETS[Math.floor(Math.random() * PATTERN_SETS.length)];
  const repeatCount = Math.floor(Math.random() * 2) + 2; // 2-3 full cycles
  const full: string[] = [];
  for (let i = 0; i < repeatCount; i++) full.push(...set);
  // Add partial next cycle (show all but last)
  const extra = set.length > 2 ? Math.floor(Math.random() * (set.length - 1)) : 0;
  for (let i = 0; i < extra; i++) full.push(set[i]);

  const answer = set[(full.length) % set.length];
  const shown = [...full];

  // Build wrong options from the set + one random
  const wrongOptions = set.filter((s) => s !== answer);
  const decoy = PATTERN_SETS.flat().find((s) => !set.includes(s)) ?? "🎈";
  const options = [answer, ...wrongOptions.slice(0, 2), decoy]
    .sort(() => Math.random() - 0.5);

  return { shown, answer, options };
}

export default function PatternComplete() {
  const [round, setRound] = useState(pickRound);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const [wrongPick, setWrongPick] = useState<string | null>(null);

  const handlePick = useCallback((pick: string) => {
    if (celebration) return;
    setTotal((t) => t + 1);
    if (pick === round.answer) {
      setScore((s) => s + 1);
      setCelebration(true);
      setTimeout(() => {
        setCelebration(false);
        setRound(pickRound());
      }, 1400);
    } else {
      setWrongPick(pick);
      setTimeout(() => setWrongPick(null), 500);
    }
  }, [round, celebration]);

  return (
    <div style={{ textAlign: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 28, margin: "0 0 8px" }}>🧩 Pattern Complete</h2>
      <p style={{ color: "#666", margin: "0 0 16px" }}>
        What comes next in the pattern?
      </p>

      <div style={{ fontSize: 14, marginBottom: 16, color: "#888" }}>
        Score: <strong style={{ color: "#4CAF50" }}>{score}</strong> / {total}
      </div>

      {celebration && (
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉 Perfect! 🎉</div>
      )}

      <div style={{
        display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
        alignItems: "center", marginBottom: 24, padding: 16,
        background: "#F5F5F5", borderRadius: 16,
      }}>
        {round.shown.map((emoji, i) => (
          <span key={i} style={{ fontSize: 36 }}>{emoji}</span>
        ))}
        <span style={{
          fontSize: 36, width: 48, height: 48, display: "inline-flex",
          alignItems: "center", justifyContent: "center",
          border: "3px dashed #BDBDBD", borderRadius: 12, background: "#FFF",
        }}>
          {celebration ? round.answer : "❓"}
        </span>
      </div>

      <p style={{ color: "#999", fontSize: 14, marginBottom: 12 }}>
        Pick the next item:
      </p>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {round.options.map((opt, i) => (
          <button
            key={`${opt}-${i}`}
            onClick={() => handlePick(opt)}
            style={{
              fontSize: 44, padding: "10px 16px", borderRadius: 16, cursor: "pointer",
              border: wrongPick === opt ? "3px solid #F44336" : "3px solid #E0E0E0",
              background: wrongPick === opt ? "#FFEBEE" : "#FFF",
              transition: "all 0.2s",
              transform: wrongPick === opt ? "scale(0.9)" : "scale(1)",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
