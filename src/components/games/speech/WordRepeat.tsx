"use client";

import { useState } from "react";

const words = [
  { word: "Ball", emoji: "\u{1F3C0}", syllables: "ball" },
  { word: "Cat", emoji: "\u{1F431}", syllables: "cat" },
  { word: "Apple", emoji: "\u{1F34E}", syllables: "ap-ple" },
  { word: "Banana", emoji: "\u{1F34C}", syllables: "ba-na-na" },
  { word: "Elephant", emoji: "\u{1F418}", syllables: "el-e-phant" },
  { word: "Rainbow", emoji: "\u{1F308}", syllables: "rain-bow" },
  { word: "Butterfly", emoji: "\u{1F98B}", syllables: "but-ter-fly" },
  { word: "Dinosaur", emoji: "\u{1F995}", syllables: "di-no-saur" },
  { word: "Octopus", emoji: "\u{1F419}", syllables: "oc-to-pus" },
  { word: "Strawberry", emoji: "\u{1F353}", syllables: "straw-ber-ry" },
];

const REPEATS = 3;
const TOTAL = 8;

export default function WordRepeat() {
  const [pool] = useState(() => [...words].sort(() => Math.random() - 0.5).slice(0, TOTAL));
  const [index, setIndex] = useState(0);
  const [reps, setReps] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const current = pool[index];
  const done = index >= TOTAL;

  const speak = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.7;
      u.pitch = 1.1;
      setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { setSpeaking(false); }
  };

  const saidIt = () => {
    const next = reps + 1;
    setReps(next);
    if (next >= REPEATS) {
      setTimeout(() => { setIndex((i) => i + 1); setReps(0); }, 1000);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 64 }}>&#x1F3A4;</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#9B59B6", margin: "16px 0 8px" }}>Word Master!</h2>
        <p style={{ color: "#777" }}>You practised {TOTAL} words!</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
          {pool.map((w) => <span key={w.word} style={{ fontSize: 32 }}>{w.emoji}</span>)}
        </div>
        <button onClick={() => { setIndex(0); setReps(0); }}
          style={{ marginTop: 12, padding: "12px 32px", borderRadius: 16, border: "none", background: "#9B59B6", color: "#fff", fontWeight: 700, fontSize: 18, cursor: "pointer" }}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>{index + 1} / {TOTAL}</div>
      <div style={{ height: 6, background: "#eee", borderRadius: 3, marginBottom: 20 }}>
        <div style={{ height: 6, borderRadius: 3, background: "linear-gradient(90deg, #9B59B6, #E91E9B)", width: `${(index / TOTAL) * 100}%`, transition: "width 0.3s" }} />
      </div>

      <div style={{ fontSize: 80, marginBottom: 8, animation: speaking ? "pulse 0.5s infinite" : "none" }}>{current.emoji}</div>
      <h3 style={{ fontSize: 36, fontWeight: 800, color: "#9B59B6", margin: "0 0 4px" }}>{current.word}</h3>
      <p style={{ color: "#aaa", fontSize: 14, letterSpacing: 2, margin: "0 0 16px" }}>{current.syllables}</p>

      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 16 }}>
        {Array.from({ length: REPEATS }).map((_, i) => (
          <div key={i} style={{
            width: 36, height: 36, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center",
            background: i < reps ? "#4ECDC4" : "#eee", color: i < reps ? "#fff" : "#bbb", fontWeight: 800, fontSize: 14, transition: "all 0.2s",
          }}>{i < reps ? "\u2713" : i + 1}</div>
        ))}
      </div>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 16 }}>Say it <strong>{REPEATS - reps}</strong> more {REPEATS - reps === 1 ? "time" : "times"}!</p>

      <button onClick={() => speak(current.word)} disabled={speaking}
        style={{ padding: "10px 24px", borderRadius: 14, border: "none", background: "#FFD54F", color: "#333", fontWeight: 700, fontSize: 16, cursor: "pointer", marginRight: 8, opacity: speaking ? 0.5 : 1 }}>
        Hear It
      </button>
      <button onClick={saidIt}
        style={{ padding: "10px 24px", borderRadius: 14, border: "none", background: "#9B59B6", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
        I Said It!
      </button>

      <style>{`@keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08) } }`}</style>
    </div>
  );
}
