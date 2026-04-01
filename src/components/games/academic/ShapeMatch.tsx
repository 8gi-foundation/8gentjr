"use client";

import { useState, useCallback } from "react";

const SHAPES = [
  { name: "Circle",   solid: "\u{1F534}", outline: "\u2B55" },
  { name: "Square",   solid: "\u{1F7E6}", outline: "\u2B1C" },
  { name: "Triangle", solid: "\u{1F53A}", outline: "\u25B3" },
  { name: "Diamond",  solid: "\u{1F537}", outline: "\u25C7" },
  { name: "Star",     solid: "\u2B50", outline: "\u2606" },
  { name: "Heart",    solid: "\u2764\uFE0F", outline: "\u2661" },
];

function pickRound() {
  const shuffled = [...SHAPES].sort(() => Math.random() - 0.5);
  const target = shuffled[0];
  const options = shuffled.slice(0, 4).sort(() => Math.random() - 0.5);
  return { target, options };
}

export default function ShapeMatch() {
  const [round, setRound] = useState(pickRound);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);

  const handlePick = useCallback((shape: typeof SHAPES[number]) => {
    if (celebration) return;
    setTotal((t) => t + 1);
    if (shape.name === round.target.name) {
      setScore((s) => s + 1);
      setCelebration(true);
      setTimeout(() => {
        setCelebration(false);
        setRound(pickRound());
      }, 1400);
    } else {
      setWrongId(shape.name);
      setTimeout(() => setWrongId(null), 500);
    }
  }, [round, celebration]);

  return (
    <div className="text-center p-6 font-sans">
      <h2 className="text-[28px] mb-2">{"\u{1F537}"} Shape Match</h2>
      <p className="text-gray-500 mb-4">Find the shape that matches the outline!</p>

      <div className="text-sm mb-4 text-gray-400">
        Score: <strong className="text-green-600">{score}</strong> / {total}
      </div>

      {celebration && <div className="text-5xl mb-3">{"\u{1F389}"} Great match! {"\u{1F389}"}</div>}

      <div className="text-[80px] mb-6 p-6 bg-gray-100 rounded-[20px] inline-block border-[3px] border-dashed border-gray-400">
        {round.target.outline}
      </div>

      <p className="text-gray-400 text-sm mb-3">Which shape fits? Tap it!</p>

      <div className="flex gap-4 justify-center flex-wrap">
        {round.options.map((s) => (
          <button
            key={s.name}
            onClick={() => handlePick(s)}
            className="text-[52px] px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200"
            style={{
              border: wrongId === s.name ? "3px solid #F44336" : "3px solid #E0E0E0",
              background: wrongId === s.name ? "#FFEBEE" : "#FFF",
              transform: wrongId === s.name ? "scale(0.9)" : "scale(1)",
            }}
            aria-label={s.name}
          >
            {s.solid}
          </button>
        ))}
      </div>
    </div>
  );
}
