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
      <div className="text-center p-8">
        <div className="text-6xl">&#x1F3A4;</div>
        <h2 className="text-[28px] font-extrabold text-[#9B59B6] mt-4 mb-2">Word Master!</h2>
        <p className="text-gray-500">You practised {TOTAL} words!</p>
        <div className="flex justify-center gap-2 flex-wrap my-3">
          {pool.map((w) => <span key={w.word} className="text-[32px]">{w.emoji}</span>)}
        </div>
        <button onClick={() => { setIndex(0); setReps(0); }}
          className="mt-3 px-8 py-3 rounded-2xl border-none bg-[#9B59B6] text-white font-bold text-lg cursor-pointer">
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="text-center p-6">
      <div className="text-xs text-gray-400 mb-2">{index + 1} / {TOTAL}</div>
      <div className="h-1.5 bg-gray-200 rounded-sm mb-5">
        <div className="h-1.5 rounded-sm bg-gradient-to-r from-[#9B59B6] to-[#E91E9B] transition-[width] duration-300" style={{ width: `${(index / TOTAL) * 100}%` }} />
      </div>

      <div className={`text-[80px] mb-2 ${speaking ? "animate-pulse" : ""}`}>{current.emoji}</div>
      <h3 className="text-4xl font-extrabold text-[#9B59B6] mb-1">{current.word}</h3>
      <p className="text-gray-400 text-sm tracking-widest mb-4">{current.syllables}</p>

      <div className="flex justify-center gap-2.5 mb-4">
        {Array.from({ length: REPEATS }).map((_, i) => (
          <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm transition-all duration-200 ${
            i < reps ? "bg-[#4ECDC4] text-white" : "bg-gray-200 text-gray-300"
          }`}>{i < reps ? "\u2713" : i + 1}</div>
        ))}
      </div>
      <p className="text-gray-400 text-sm mb-4">Say it <strong>{REPEATS - reps}</strong> more {REPEATS - reps === 1 ? "time" : "times"}!</p>

      <button onClick={() => speak(current.word)} disabled={speaking}
        className="px-6 py-2.5 rounded-[14px] border-none bg-[#FFD54F] text-gray-800 font-bold text-base cursor-pointer mr-2 disabled:opacity-50">
        Hear It
      </button>
      <button onClick={saidIt}
        className="px-6 py-2.5 rounded-[14px] border-none bg-[#9B59B6] text-white font-bold text-base cursor-pointer">
        I Said It!
      </button>
    </div>
  );
}
