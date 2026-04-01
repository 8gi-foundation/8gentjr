"use client";

import { useState, useCallback } from "react";

const BUCKETS = [
  { color: "Red",    hex: "#F44336", emoji: "\u{1F534}" },
  { color: "Blue",   hex: "#2196F3", emoji: "\u{1F535}" },
  { color: "Green",  hex: "#4CAF50", emoji: "\u{1F7E2}" },
  { color: "Yellow", hex: "#FFEB3B", emoji: "\u{1F7E1}" },
];

const ITEMS: { emoji: string; color: string }[] = [
  { emoji: "\u{1F34E}", color: "Red" },    { emoji: "\u{1F339}", color: "Red" },
  { emoji: "\u{1F697}", color: "Red" },    { emoji: "\u{1FAD0}", color: "Blue" },
  { emoji: "\u{1F98B}", color: "Blue" },   { emoji: "\u{1F9E2}", color: "Blue" },
  { emoji: "\u{1F966}", color: "Green" },  { emoji: "\u{1F438}", color: "Green" },
  { emoji: "\u{1F332}", color: "Green" },  { emoji: "\u2B50", color: "Yellow" },
  { emoji: "\u{1F33B}", color: "Yellow" }, { emoji: "\u{1F34B}", color: "Yellow" },
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
    <div className="text-center p-6 font-sans">
      <h2 className="text-[28px] mb-2">{"\u{1F3A8}"} Color Sort</h2>
      <p className="text-gray-500 mb-4">Put each item in the right color bucket!</p>

      <div className="text-sm mb-4 text-gray-400">
        Score: <strong className="text-green-600">{score}</strong> / {total}
        {" \u00B7 "} {current}/{items.length} sorted
      </div>

      {done ? (
        <div>
          <div className="text-5xl mb-4">{"\u{1F3C6}"} All sorted! {"\u{1F3C6}"}</div>
          <p className="text-xl text-green-600 font-bold">{score}/{total} correct</p>
          <button onClick={restart}
            className="mt-4 px-8 py-3 text-lg rounded-xl border-none bg-green-600 text-white cursor-pointer font-bold">
            Play Again
          </button>
        </div>
      ) : (
        <>
          <div className="text-7xl mb-6 p-4 bg-gray-50 rounded-[20px] inline-block">
            {celebration ? "\u2705" : item.emoji}
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            {BUCKETS.map((b) => (
              <button
                key={b.color}
                onClick={() => handleBucket(b.color)}
                className="flex flex-col items-center gap-1 px-5 py-4 rounded-2xl text-4xl cursor-pointer transition-all duration-200"
                style={{
                  border: flash === b.color ? "3px solid #F44336" : `3px solid ${b.hex}`,
                  background: flash === b.color ? "#FFEBEE" : `${b.hex}20`,
                }}
                aria-label={`${b.color} bucket`}
              >
                {b.emoji}
                <span className="text-sm font-semibold" style={{ color: b.hex }}>{b.color}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
