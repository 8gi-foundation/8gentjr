"use client";

import { useState } from "react";

const animals = [
  { name: "Dog", sound: "Woof woof!", emoji: "\u{1F415}", color: "#E8A87C" },
  { name: "Cat", sound: "Meow!", emoji: "\u{1F431}", color: "#FFB347" },
  { name: "Cow", sound: "Moo!", emoji: "\u{1F404}", color: "#C8A87A" },
  { name: "Duck", sound: "Quack quack!", emoji: "\u{1F986}", color: "#FFD700" },
  { name: "Pig", sound: "Oink oink!", emoji: "\u{1F437}", color: "#FFB6C1" },
  { name: "Sheep", sound: "Baa baa!", emoji: "\u{1F411}", color: "#D4C5A0" },
  { name: "Frog", sound: "Ribbit!", emoji: "\u{1F438}", color: "#5DBB63" },
  { name: "Lion", sound: "Roar!", emoji: "\u{1F981}", color: "#DAA520" },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function AnimalSounds() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"learn" | "quiz">("learn");
  const [options, setOptions] = useState<typeof animals>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const animal = animals[index];
  const done = index >= animals.length;

  const startQuiz = () => {
    const others = shuffle(animals.filter((a) => a.name !== animal.name)).slice(0, 3);
    setOptions(shuffle([animal, ...others]));
    setPhase("quiz");
    setPicked(null);
  };

  const answer = (name: string) => {
    if (picked) return;
    setPicked(name);
    if (name === animal.name) {
      setScore((s) => s + 1);
      setTimeout(() => { setIndex((i) => i + 1); setPhase("learn"); setPicked(null); }, 1200);
    } else {
      setTimeout(() => setPicked(null), 800);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 64 }}>&#x1F3C6;</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#E8610A", margin: "16px 0 8px" }}>
          All Done! {score}/{animals.length}
        </h2>
        <p style={{ color: "#777" }}>You learned all the animal sounds!</p>
        <button onClick={() => { setIndex(0); setScore(0); setPhase("learn"); }}
          style={{ marginTop: 16, padding: "12px 32px", borderRadius: 16, border: "none", background: "#E8610A", color: "#fff", fontWeight: 700, fontSize: 18, cursor: "pointer" }}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>{index + 1} / {animals.length}</div>
      <div style={{ height: 6, background: "#eee", borderRadius: 3, marginBottom: 20 }}>
        <div style={{ height: 6, borderRadius: 3, background: `linear-gradient(90deg, #E8610A, #FFB347)`, width: `${(index / animals.length) * 100}%`, transition: "width 0.3s" }} />
      </div>

      {phase === "learn" ? (
        <>
          <div style={{ fontSize: 80, marginBottom: 8 }}>{animal.emoji}</div>
          <h3 style={{ fontSize: 32, fontWeight: 800, color: animal.color, margin: "0 0 4px" }}>{animal.name}</h3>
          <div style={{ display: "inline-block", padding: "8px 20px", borderRadius: 16, border: `2px solid ${animal.color}`, background: `${animal.color}15`, fontSize: 20, fontWeight: 700, color: "#444", marginBottom: 16 }}>
            &ldquo;{animal.sound}&rdquo;
          </div>
          <br />
          <button onClick={() => { try { speechSynthesis.speak(new SpeechSynthesisUtterance(`The ${animal.name} says ${animal.sound}`)); } catch {} }}
            style={{ padding: "10px 24px", borderRadius: 14, border: "none", background: animal.color, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", marginRight: 8 }}>
            Hear It
          </button>
          <button onClick={startQuiz}
            style={{ padding: "10px 24px", borderRadius: 14, border: "none", background: "#4ECDC4", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            Quiz Me!
          </button>
        </>
      ) : (
        <>
          <div style={{ padding: "12px 20px", borderRadius: 16, background: "#FFF8E1", border: "2px solid #FFD54F", display: "inline-block", marginBottom: 16 }}>
            <span style={{ fontWeight: 800, color: "#F57F17", fontSize: 18 }}>Which animal says &ldquo;{animal.sound}&rdquo;?</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 280, margin: "0 auto" }}>
            {options.map((o) => {
              const isThis = picked === o.name;
              const right = isThis && o.name === animal.name;
              const wrong = isThis && o.name !== animal.name;
              return (
                <button key={o.name} onClick={() => answer(o.name)}
                  style={{ padding: 16, borderRadius: 16, border: right ? "3px solid #4CAF50" : wrong ? "3px solid #EF5350" : "2px solid #ddd", background: right ? "#C8E6C9" : wrong ? "#FFCDD2" : "#fff", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 40 }}>{o.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{o.name}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
