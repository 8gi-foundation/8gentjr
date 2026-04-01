"use client";

import { useState, useCallback } from "react";

const ITEM_COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#DDA0DD"];
const SIZE_LABELS = ["tiny", "small", "medium", "large"];
const SIZES = [32, 48, 64, 80];
const MAX_ROUNDS = 4;

type SizeItem = { id: number; size: number; color: string; label: string };

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

export default function SizeSort() {
  const [phase, setPhase] = useState<"start" | "play" | "done">("start");
  const [items, setItems] = useState<SizeItem[]>([]);
  const [ascending, setAscending] = useState(true);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [checked, setChecked] = useState(false);
  const [selIdx, setSelIdx] = useState<number | null>(null);

  const generate = useCallback(() => {
    const asc = Math.random() > 0.5;
    setAscending(asc);
    setChecked(false);
    setFeedback(null);
    setSelIdx(null);
    const colors = shuffle([...ITEM_COLORS]);
    const newItems: SizeItem[] = SIZES.map((s, i) => ({ id: i, size: s, color: colors[i], label: SIZE_LABELS[i] }));
    setItems(shuffle(newItems));
  }, []);

  const handleStart = () => { setPhase("play"); setRound(1); setScore(0); setTimeout(generate, 100); };

  const swap = (i: number, j: number) => {
    setItems((prev) => { const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n; });
    setFeedback(null); setChecked(false);
  };

  const check = () => {
    if (checked) return;
    setChecked(true);
    const sizes = items.map((i) => i.size);
    const ok = ascending
      ? sizes.every((s, i) => i === 0 || s > sizes[i - 1])
      : sizes.every((s, i) => i === 0 || s < sizes[i - 1]);
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
      <div className="text-6xl">&#x1F41B; &#x1F415; &#x1F981; &#x1F418;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#FFB347" }}>Size Sort!</h2>
      <p className="text-lg text-center text-gray-600 max-w-xs">Tap two shapes to swap them and sort by size!</p>
      <button onClick={handleStart} className="px-10 py-5 text-white text-2xl font-bold rounded-3xl shadow-xl border-none cursor-pointer" style={{ backgroundColor: "#FFB347" }}>Sort Sizes!</button>
    </div>
  );

  if (phase === "done") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-8xl">&#x1F4CF;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#FFB347" }}>Size Expert!</h2>
      <p className="text-xl text-center text-gray-700">Sorted <span className="font-bold text-2xl" style={{ color: "#FF6B6B" }}>{score}</span> of {MAX_ROUNDS} correctly!</p>
      <button onClick={handleStart} className="px-8 py-3 rounded-2xl border-none text-white font-bold text-lg cursor-pointer" style={{ backgroundColor: "#FFB347" }}>Play Again</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-4 p-2">
      <div className="flex gap-1 justify-center">
        {Array.from({ length: MAX_ROUNDS }, (_, i) => (
          <div key={i} className="h-2 w-8 rounded-full" style={{ backgroundColor: i < round ? "#FFB347" : "#E5E7EB" }} />
        ))}
      </div>
      <div className="text-center">
        <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-5 py-2 shadow-md">
          {ascending
            ? <><span className="text-2xl">&#x1F41B;</span><span className="text-base font-bold text-gray-600">smallest to biggest</span><span className="text-2xl">&#x1F418;</span></>
            : <><span className="text-2xl">&#x1F418;</span><span className="text-base font-bold text-gray-600">biggest to smallest</span><span className="text-2xl">&#x1F41B;</span></>}
        </div>
        <p className="text-sm text-gray-400 mt-1">Tap two shapes to swap them</p>
      </div>
      <div className="flex-1 flex items-end justify-center pb-4 rounded-3xl border-2 border-orange-100 p-4" style={{ background: "linear-gradient(135deg, #FFF8E1, #FFFDE7)" }}>
        <div className="flex gap-4 items-end justify-center w-full">
          {items.map((item, idx) => (
            <button key={item.id} onClick={() => {
              if (selIdx === null) setSelIdx(idx);
              else { swap(selIdx, idx); setSelIdx(null); }
            }}
              className="border-none cursor-pointer rounded-2xl shadow-lg"
              style={{ width: item.size, height: item.size, backgroundColor: item.color, outline: selIdx === idx ? "3px solid #333" : "none" }}>
            </button>
          ))}
        </div>
      </div>
      {feedback && (
        <p className={`text-center text-lg font-bold ${feedback === "correct" ? "text-green-500" : "text-red-500"}`}>
          {feedback === "correct" ? "Perfect sorting!" : "Look at the sizes carefully!"}
        </p>
      )}
      <button onClick={check} disabled={checked && feedback !== null}
        className="mx-auto px-10 py-4 text-white text-xl font-bold rounded-2xl shadow-lg border-none cursor-pointer disabled:opacity-60" style={{ backgroundColor: "#FFB347" }}>
        Check Order! &#x2713;
      </button>
    </div>
  );
}
