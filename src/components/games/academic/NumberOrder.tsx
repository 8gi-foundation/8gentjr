"use client";

import { useState, useCallback } from "react";

const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#DDA0DD"];
const MAX_ROUNDS = 4;

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }
function randInt(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }

export default function NumberOrder() {
  const [phase, setPhase] = useState<"start" | "play" | "done">("start");
  const [numbers, setNumbers] = useState<number[]>([]);
  const [ascending, setAscending] = useState(true);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [checked, setChecked] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const generate = useCallback(() => {
    const asc = Math.random() > 0.5;
    setAscending(asc);
    setChecked(false);
    setFeedback(null);
    const start = randInt(1, 6);
    setNumbers(shuffle([start, start + 1, start + 2, start + 3]));
  }, []);

  const handleStart = () => { setPhase("play"); setRound(1); setScore(0); setTimeout(generate, 100); };

  const swap = (i: number, j: number) => {
    setNumbers((prev) => { const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n; });
    setFeedback(null); setChecked(false);
  };

  const check = () => {
    if (checked) return;
    setChecked(true);
    const ok = ascending
      ? numbers.every((n, i) => i === 0 || n > numbers[i - 1])
      : numbers.every((n, i) => i === 0 || n < numbers[i - 1]);
    if (ok) {
      setFeedback("correct");
      setScore((s) => s + 1);
      setTimeout(() => {
        setFeedback(null);
        if (round >= MAX_ROUNDS) setPhase("done");
        else { setRound((r) => r + 1); generate(); }
      }, 1000);
    } else {
      setFeedback("wrong");
      setTimeout(() => { setFeedback(null); setChecked(false); }, 900);
    }
  };

  if (phase === "start") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-7xl">&#x1F522;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#FFE66D" }}>Number Order!</h2>
      <p className="text-lg text-center text-gray-600 max-w-xs">Tap cards to swap them and put numbers in the right order!</p>
      <button onClick={handleStart} className="px-10 py-5 text-gray-800 text-2xl font-bold rounded-3xl shadow-xl border-none cursor-pointer" style={{ backgroundColor: "#FFE66D" }}>Order Up!</button>
    </div>
  );

  if (phase === "done") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-8xl">&#x1F947;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#FFE66D" }}>Number Ninja!</h2>
      <p className="text-xl text-center text-gray-700">Ordered <span className="font-bold text-2xl" style={{ color: "#FF6B6B" }}>{score}</span> of {MAX_ROUNDS} correctly!</p>
      <button onClick={handleStart} className="px-8 py-3 rounded-2xl border-none text-white font-bold text-lg cursor-pointer" style={{ backgroundColor: "#4ECDC4" }}>Play Again</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-4 p-2">
      <div className="flex gap-1 justify-center">
        {Array.from({ length: MAX_ROUNDS }, (_, i) => (
          <div key={i} className="h-2 w-8 rounded-full" style={{ backgroundColor: i < round ? "#FFE66D" : "#E5E7EB" }} />
        ))}
      </div>
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-white rounded-2xl px-4 py-2 shadow-md">
          <span className="text-xl">{ascending ? "\u2B06\uFE0F" : "\u2B07\uFE0F"}</span>
          <span className="text-lg font-bold text-gray-700">{ascending ? "Smallest to Biggest" : "Biggest to Smallest"}</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">Tap two cards to swap them</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-3 items-center justify-center flex-wrap">
          {numbers.map((num, idx) => (
            <button key={`${num}-${idx}`} onClick={() => {
              if (dragIdx === null) setDragIdx(idx);
              else { swap(dragIdx, idx); setDragIdx(null); }
            }}
              className="select-none border-none cursor-pointer"
              style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: COLORS[idx % COLORS.length], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: dragIdx === idx ? "0 0 0 4px #333" : "0 4px 12px rgba(0,0,0,0.2)" }}>
              <span className="text-4xl font-bold text-white" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>{num}</span>
              <span className="text-white/60 text-xs mt-0.5">{dragIdx === idx ? "selected" : "tap me"}</span>
            </button>
          ))}
        </div>
      </div>
      {feedback && (
        <p className={`text-center text-lg font-bold ${feedback === "correct" ? "text-green-500" : "text-red-500"}`}>
          {feedback === "correct" ? "Perfect order!" : "Not quite! Try again!"}
        </p>
      )}
      <button onClick={check} disabled={checked && feedback !== null}
        className="mx-auto px-10 py-4 bg-[#4ECDC4] text-white text-xl font-bold rounded-2xl shadow-lg border-none cursor-pointer disabled:opacity-60">
        Check! &#x2713;
      </button>
    </div>
  );
}
