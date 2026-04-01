"use client";

import { useState } from "react";

const challenges = [
  { target: "Cat", emoji: "\u{1F431}", ending: "-at", color: "#FF6B6B",
    rhymes: [{ w: "Hat", e: "\u{1F3A9}" }, { w: "Bat", e: "\u{1F987}" }],
    fakes:  [{ w: "Dog", e: "\u{1F415}" }, { w: "Car", e: "\u{1F697}" }] },
  { target: "Bee", emoji: "\u{1F41D}", ending: "-ee", color: "#4ECDC4",
    rhymes: [{ w: "Tree", e: "\u{1F333}" }, { w: "Key", e: "\u{1F511}" }],
    fakes:  [{ w: "Bug", e: "\u{1F41B}" }, { w: "Rock", e: "\u{1FAA8}" }] },
  { target: "Star", emoji: "\u2B50", ending: "-ar", color: "#FFD700",
    rhymes: [{ w: "Car", e: "\u{1F697}" }, { w: "Jar", e: "\u{1FAD9}" }],
    fakes:  [{ w: "Sun", e: "\u2600\uFE0F" }, { w: "Moon", e: "\u{1F319}" }] },
  { target: "Moon", emoji: "\u{1F319}", ending: "-oon", color: "#686DE0",
    rhymes: [{ w: "Spoon", e: "\u{1F944}" }, { w: "Balloon", e: "\u{1F388}" }],
    fakes:  [{ w: "Night", e: "\u{1F303}" }, { w: "Dark", e: "\u{1F311}" }] },
  { target: "Fish", emoji: "\u{1F41F}", ending: "-ish", color: "#74B9FF",
    rhymes: [{ w: "Dish", e: "\u{1F37D}\uFE0F" }, { w: "Wish", e: "\u2728" }],
    fakes:  [{ w: "Boat", e: "\u26F5" }, { w: "Wave", e: "\u{1F30A}" }] },
  { target: "Dog", emoji: "\u{1F415}", ending: "-og", color: "#E8A87C",
    rhymes: [{ w: "Log", e: "\u{1FAB5}" }, { w: "Frog", e: "\u{1F438}" }],
    fakes:  [{ w: "Cat", e: "\u{1F431}" }, { w: "Bone", e: "\u{1F9B4}" }] },
];

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

export default function RhymeTime() {
  const [ci, setCi] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [allFound, setAllFound] = useState(false);

  const ch = challenges[ci];
  const done = ci >= challenges.length;

  const options = useState(() => shuffle([
    ...challenges[0].rhymes.map((r) => ({ ...r, rhyme: true })),
    ...challenges[0].fakes.map((f) => ({ ...f, rhyme: false })),
  ]))[0];

  const [opts, setOpts] = useState(() => shuffle([
    ...ch.rhymes.map((r) => ({ ...r, rhyme: true })),
    ...ch.fakes.map((f) => ({ ...f, rhyme: false })),
  ]));

  const tap = (word: string, isRhyme: boolean) => {
    if (found.includes(word) || allFound) return;
    if (isRhyme) {
      const next = [...found, word];
      setFound(next);
      if (next.length >= ch.rhymes.length) setAllFound(true);
    } else {
      setWrong(word);
      setTimeout(() => setWrong(null), 700);
    }
  };

  const next = () => {
    const ni = ci + 1;
    setCi(ni);
    setFound([]);
    setAllFound(false);
    if (ni < challenges.length) {
      const c = challenges[ni];
      setOpts(shuffle([...c.rhymes.map((r) => ({ ...r, rhyme: true })), ...c.fakes.map((f) => ({ ...f, rhyme: false }))]));
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 64 }}>&#x1F3B5;</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#6C5CE7", margin: "16px 0 8px" }}>Rhyme Champion!</h2>
        <p style={{ color: "#777" }}>You found all the rhymes!</p>
        <button onClick={() => { setCi(0); setFound([]); setAllFound(false); const c = challenges[0]; setOpts(shuffle([...c.rhymes.map((r) => ({ ...r, rhyme: true })), ...c.fakes.map((f) => ({ ...f, rhyme: false }))])); }}
          style={{ marginTop: 16, padding: "12px 32px", borderRadius: 16, border: "none", background: "#6C5CE7", color: "#fff", fontWeight: 700, fontSize: 18, cursor: "pointer" }}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>Round {ci + 1} / {challenges.length}</div>
      <div style={{ height: 6, background: "#eee", borderRadius: 3, marginBottom: 16 }}>
        <div style={{ height: 6, borderRadius: 3, background: `linear-gradient(90deg, #6C5CE7, #A29BFE)`, width: `${(ci / challenges.length) * 100}%`, transition: "width 0.3s" }} />
      </div>

      <p style={{ color: "#888", fontSize: 13, margin: "0 0 6px" }}>Find words that rhyme with:</p>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", padding: 16, borderRadius: 20, background: `${ch.color}18`, marginBottom: 8 }}>
        <span style={{ fontSize: 48 }}>{ch.emoji}</span>
        <span style={{ fontSize: 24, fontWeight: 800, color: ch.color }}>{ch.target}</span>
      </div>
      <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 12, background: ch.color, color: "#fff", fontWeight: 800, fontSize: 13, marginBottom: 16 }}>
        ends in {ch.ending}
      </div>

      {!allFound ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 260, margin: "0 auto" }}>
          {opts.map((o) => {
            const isFound = found.includes(o.w);
            const isWrong = wrong === o.w;
            return (
              <button key={o.w} onClick={() => tap(o.w, o.rhyme)}
                style={{ padding: 14, borderRadius: 16, border: isFound ? "3px solid #4CAF50" : isWrong ? "3px solid #EF5350" : "2px solid #ddd",
                  background: isFound ? "#C8E6C9" : isWrong ? "#FFCDD2" : "#fff", cursor: "pointer", textAlign: "center", transition: "all 0.15s", opacity: isFound ? 0.7 : 1 }}>
                <div style={{ fontSize: 32 }}>{o.e}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{o.w}</div>
                {isFound && <div style={{ fontSize: 10, color: "#4CAF50", fontWeight: 700 }}>rhymes!</div>}
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 48, marginBottom: 8 }}>&#x2728;</div>
          <p style={{ fontWeight: 800, color: "#4CAF50", fontSize: 20 }}>All Found!</p>
          <button onClick={next}
            style={{ marginTop: 12, padding: "12px 32px", borderRadius: 16, border: "none", background: "#6C5CE7", color: "#fff", fontWeight: 700, fontSize: 18, cursor: "pointer" }}>
            {ci + 1 >= challenges.length ? "Finish!" : "Next Rhymes"}
          </button>
        </div>
      )}
    </div>
  );
}
