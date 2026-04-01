"use client";

import { useState, useCallback } from "react";

const BALL_EMOJIS = ["\u{1F534}", "\u{1F535}", "\u{1F7E2}", "\u{1F7E1}", "\u{1F7E3}", "\u{1F7E0}"];

function generateRound() {
  const count = Math.floor(Math.random() * 5) + 1;
  const emoji = BALL_EMOJIS[Math.floor(Math.random() * BALL_EMOJIS.length)];
  return { count, emoji };
}

export default function CountingBalls() {
  const [round, setRound] = useState(generateRound);
  const [tapped, setTapped] = useState(0);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const [shake, setShake] = useState(false);

  const handleTap = useCallback((idx: number) => {
    if (celebration) return;
    if (idx === tapped) {
      setTapped((t) => t + 1);
    }
  }, [tapped, celebration]);

  const handleAnswer = useCallback((choice: number) => {
    if (celebration) return;
    setTotal((t) => t + 1);
    if (choice === round.count) {
      setScore((s) => s + 1);
      setCelebration(true);
      setTimeout(() => {
        setCelebration(false);
        setTapped(0);
        setRound(generateRound());
      }, 1500);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }, [round, celebration]);

  const choices = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <div className="text-center p-6 font-sans">
      <h2 className="text-[28px] mb-2">{"\u{1F9EE}"} Counting Balls</h2>
      <p className="text-gray-500 mb-4">Tap each ball, then pick the right number!</p>

      <div className="text-sm mb-4 text-gray-400">
        Score: <strong className="text-green-600">{score}</strong> / {total}
      </div>

      {celebration && <div className="text-5xl mb-4">{"\u{1F389}"} Correct! {"\u{1F389}"}</div>}

      <div
        className="flex gap-4 justify-center flex-wrap mb-6 min-h-[80px] transition-transform duration-100"
        style={{ transform: shake ? "translateX(8px)" : "none" }}
      >
        {Array.from({ length: round.count }, (_, i) => (
          <button
            key={i}
            onClick={() => handleTap(i)}
            className="text-5xl bg-transparent border-none cursor-pointer transition-all duration-200"
            style={{
              opacity: i < tapped ? 0.4 : 1,
              transform: i < tapped ? "scale(0.8)" : "scale(1)",
              filter: i < tapped ? "grayscale(0.5)" : "none",
            }}
            aria-label={`Ball ${i + 1}`}
          >
            {round.emoji}
          </button>
        ))}
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        {choices.map((n) => (
          <button
            key={n}
            onClick={() => handleAnswer(n)}
            className="w-14 h-14 rounded-full text-2xl font-bold border-[3px] border-blue-500 bg-blue-50 text-blue-800 cursor-pointer transition-transform duration-150 active:scale-90"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
