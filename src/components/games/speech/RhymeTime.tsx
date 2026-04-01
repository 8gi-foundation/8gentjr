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
      <div className="text-center p-8">
        <div className="text-6xl">&#x1F3B5;</div>
        <h2 className="text-[28px] font-extrabold text-[#6C5CE7] mt-4 mb-2">Rhyme Champion!</h2>
        <p className="text-gray-500">You found all the rhymes!</p>
        <button onClick={() => { setCi(0); setFound([]); setAllFound(false); const c = challenges[0]; setOpts(shuffle([...c.rhymes.map((r) => ({ ...r, rhyme: true })), ...c.fakes.map((f) => ({ ...f, rhyme: false }))])); }}
          className="mt-4 px-8 py-3 rounded-2xl border-none bg-[#6C5CE7] text-white font-bold text-lg cursor-pointer">
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="text-center p-6">
      <div className="text-xs text-gray-400 mb-2">Round {ci + 1} / {challenges.length}</div>
      <div className="h-1.5 bg-gray-200 rounded-sm mb-4">
        <div className="h-1.5 rounded-sm bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] transition-[width] duration-300" style={{ width: `${(ci / challenges.length) * 100}%` }} />
      </div>

      <p className="text-gray-400 text-[13px] mb-1.5">Find words that rhyme with:</p>
      <div className="inline-flex flex-col items-center p-4 rounded-[20px] mb-2" style={{ background: `${ch.color}18` }}>
        <span className="text-5xl">{ch.emoji}</span>
        <span className="text-2xl font-extrabold" style={{ color: ch.color }}>{ch.target}</span>
      </div>
      <div className="inline-block px-3.5 py-1 rounded-xl text-white font-extrabold text-[13px] mb-4" style={{ background: ch.color }}>
        ends in {ch.ending}
      </div>

      {!allFound ? (
        <div className="grid grid-cols-2 gap-2.5 max-w-[260px] mx-auto">
          {opts.map((o) => {
            const isFound = found.includes(o.w);
            const isWrong = wrong === o.w;
            return (
              <button key={o.w} onClick={() => tap(o.w, o.rhyme)}
                className="p-3.5 rounded-2xl cursor-pointer text-center transition-all duration-150"
                style={{
                  border: isFound ? "3px solid #4CAF50" : isWrong ? "3px solid #EF5350" : "2px solid #ddd",
                  background: isFound ? "#C8E6C9" : isWrong ? "#FFCDD2" : "#fff",
                  opacity: isFound ? 0.7 : 1,
                }}>
                <div className="text-[32px]">{o.e}</div>
                <div className="font-bold text-[13px] mt-0.5">{o.w}</div>
                {isFound && <div className="text-[10px] text-green-600 font-bold">rhymes!</div>}
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="text-5xl mb-2">&#x2728;</div>
          <p className="font-extrabold text-green-600 text-xl">All Found!</p>
          <button onClick={next}
            className="mt-3 px-8 py-3 rounded-2xl border-none bg-[#6C5CE7] text-white font-bold text-lg cursor-pointer">
            {ci + 1 >= challenges.length ? "Finish!" : "Next Rhymes"}
          </button>
        </div>
      )}
    </div>
  );
}
