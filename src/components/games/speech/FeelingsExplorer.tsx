"use client";

import { useState } from "react";

const feelings = [
  { name: "Happy", emoji: "\u{1F60A}", color: "#FFD93D", desc: "Warm and sunny inside!",
    body: "You smile and feel light!", options: ["Opening a birthday present", "Eating broccoli", "Stuck in traffic"], answer: 0 },
  { name: "Sad", emoji: "\u{1F622}", color: "#74B9FF", desc: "Heavy like rain clouds",
    body: "Your eyes feel watery", options: ["Winning a game", "Losing your favourite toy", "Eating cake"], answer: 1 },
  { name: "Angry", emoji: "\u{1F620}", color: "#FF6B6B", desc: "Hot and fiery inside!",
    body: "Your face gets red and hot", options: ["Watching a sunset", "Someone breaks your toy", "Getting a hug"], answer: 1 },
  { name: "Scared", emoji: "\u{1F628}", color: "#A29BFE", desc: "Wobbly and shaky",
    body: "Your heart beats fast!", options: ["Hearing a big thunder crash", "Playing with a puppy", "Eating ice cream"], answer: 0 },
  { name: "Excited", emoji: "\u{1F929}", color: "#FF9F43", desc: "Bouncy and zingy inside!",
    body: "You can't stop moving!", options: ["Going to sleep early", "Your birthday party starts NOW", "Washing dishes"], answer: 1 },
  { name: "Calm", emoji: "\u{1F60C}", color: "#95E1D3", desc: "Peaceful like a quiet lake",
    body: "Your breathing is slow and soft", options: ["Taking deep breaths outside", "Spinning really fast", "Shouting loud"], answer: 0 },
];

export default function FeelingsExplorer() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"learn" | "quiz" | "result">("learn");
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const f = feelings[index];
  const done = index >= feelings.length;

  const tryAnswer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === f.answer) {
      setScore((s) => s + 1);
      setTimeout(() => setPhase("result"), 1000);
    } else {
      setTimeout(() => setPicked(null), 700);
    }
  };

  const next = () => {
    setIndex((i) => i + 1);
    setPhase("learn");
    setPicked(null);
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 64 }}>&#x1F308;</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#9B59B6", margin: "16px 0 8px" }}>Feelings Expert!</h2>
        <p style={{ color: "#777" }}>You scored {score}/{feelings.length}!</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "12px 0" }}>
          {feelings.map((fl) => <span key={fl.name} style={{ fontSize: 32 }}>{fl.emoji}</span>)}
        </div>
        <button onClick={() => { setIndex(0); setScore(0); setPhase("learn"); setPicked(null); }}
          style={{ marginTop: 12, padding: "12px 32px", borderRadius: 16, border: "none", background: "#9B59B6", color: "#fff", fontWeight: 700, fontSize: 18, cursor: "pointer" }}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>{index + 1} / {feelings.length}</div>
      <div style={{ height: 6, background: "#eee", borderRadius: 3, marginBottom: 20 }}>
        <div style={{ height: 6, borderRadius: 3, background: `linear-gradient(90deg, #FFD93D, #FF6B6B)`, width: `${(index / feelings.length) * 100}%`, transition: "width 0.3s" }} />
      </div>

      <div style={{ fontSize: 72, marginBottom: 4 }}>{f.emoji}</div>
      <h3 style={{ fontSize: 32, fontWeight: 800, color: f.color, margin: "0 0 4px" }}>{f.name}</h3>

      {phase === "learn" && (
        <>
          <div style={{ display: "inline-block", padding: "10px 20px", borderRadius: 16, border: `2px solid ${f.color}`, background: `${f.color}15`, marginBottom: 8 }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#444", fontSize: 16 }}>{f.desc}</p>
            <p style={{ margin: "4px 0 0", color: "#999", fontSize: 13 }}>{f.body}</p>
          </div>
          <br />
          <button onClick={() => setPhase("quiz")}
            style={{ marginTop: 12, padding: "12px 28px", borderRadius: 14, border: "none", background: "#4ECDC4", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            Quiz Me!
          </button>
        </>
      )}

      {phase === "quiz" && (
        <>
          <p style={{ fontWeight: 700, color: f.color, fontSize: 16, margin: "8px 0 12px" }}>When do you feel {f.name}?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
            {f.options.map((opt, i) => {
              const sel = picked === i;
              const right = sel && i === f.answer;
              const wrong = sel && i !== f.answer;
              return (
                <button key={opt} onClick={() => tryAnswer(i)}
                  style={{ padding: "14px 18px", borderRadius: 14, border: right ? "3px solid #4CAF50" : wrong ? "3px solid #EF5350" : "2px solid #ddd",
                    background: right ? "#C8E6C9" : wrong ? "#FFCDD2" : "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase === "result" && (
        <>
          <div style={{ fontSize: 48, margin: "8px 0" }}>&#x1F31F;</div>
          <p style={{ color: "#555", fontSize: 16 }}>We feel <strong>{f.name}</strong> when &ldquo;{f.options[f.answer]}&rdquo;</p>
          <button onClick={next}
            style={{ marginTop: 12, padding: "12px 28px", borderRadius: 14, border: "none", background: "#4ECDC4", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            Next Feeling
          </button>
        </>
      )}
    </div>
  );
}
