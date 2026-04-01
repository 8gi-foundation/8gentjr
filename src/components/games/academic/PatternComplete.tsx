"use client";

import { useState, useCallback } from "react";

const PATTERN_SETS = [
  ["\u{1F534}", "\u{1F535}"],
  ["\u2B50", "\u{1F319}"],
  ["\u{1F431}", "\u{1F436}"],
  ["\u{1F338}", "\u{1F340}"],
  ["\u{1F53A}", "\u{1F537}"],
  ["\u{1F34E}", "\u{1F34A}", "\u{1F34B}"],
  ["\u2764\uFE0F", "\u{1F49B}", "\u{1F499}"],
  ["\u{1F41F}", "\u{1F420}", "\u{1F421}"],
  ["\u{1F31E}", "\u{1F327}\uFE0F", "\u26C5"],
  ["\u{1F7E2}", "\u{1F7E1}", "\u{1F534}", "\u{1F535}"],
];

function pickRound() {
  const set = PATTERN_SETS[Math.floor(Math.random() * PATTERN_SETS.length)];
  const repeatCount = Math.floor(Math.random() * 2) + 2;
  const full: string[] = [];
  for (let i = 0; i < repeatCount; i++) full.push(...set);
  const extra = set.length > 2 ? Math.floor(Math.random() * (set.length - 1)) : 0;
  for (let i = 0; i < extra; i++) full.push(set[i]);

  const answer = set[(full.length) % set.length];
  const shown = [...full];

  const wrongOptions = set.filter((s) => s !== answer);
  const decoy = PATTERN_SETS.flat().find((s) => !set.includes(s)) ?? "\u{1F388}";
  const options = [answer, ...wrongOptions.slice(0, 2), decoy]
    .sort(() => Math.random() - 0.5);

  return { shown, answer, options };
}

export default function PatternComplete() {
  const [round, setRound] = useState(pickRound);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const [wrongPick, setWrongPick] = useState<string | null>(null);

  const handlePick = useCallback((pick: string) => {
    if (celebration) return;
    setTotal((t) => t + 1);
    if (pick === round.answer) {
      setScore((s) => s + 1);
      setCelebration(true);
      setTimeout(() => {
        setCelebration(false);
        setRound(pickRound());
      }, 1400);
    } else {
      setWrongPick(pick);
      setTimeout(() => setWrongPick(null), 500);
    }
  }, [round, celebration]);

  return (
    <div className="text-center p-6 font-sans">
      <h2 className="text-[28px] mb-2">{"\u{1F9E9}"} Pattern Complete</h2>
      <p className="text-gray-500 mb-4">What comes next in the pattern?</p>

      <div className="text-sm mb-4 text-gray-400">
        Score: <strong className="text-green-600">{score}</strong> / {total}
      </div>

      {celebration && <div className="text-5xl mb-3">{"\u{1F389}"} Perfect! {"\u{1F389}"}</div>}

      <div className="flex gap-2 justify-center flex-wrap items-center mb-6 p-4 bg-gray-100 rounded-2xl">
        {round.shown.map((emoji, i) => (
          <span key={i} className="text-4xl">{emoji}</span>
        ))}
        <span className="text-4xl w-12 h-12 inline-flex items-center justify-center border-[3px] border-dashed border-gray-400 rounded-xl bg-white">
          {celebration ? round.answer : "\u2753"}
        </span>
      </div>

      <p className="text-gray-400 text-sm mb-3">Pick the next item:</p>

      <div className="flex gap-4 justify-center flex-wrap">
        {round.options.map((opt, i) => (
          <button
            key={`${opt}-${i}`}
            onClick={() => handlePick(opt)}
            className="text-[44px] px-4 py-2.5 rounded-2xl cursor-pointer transition-all duration-200"
            style={{
              border: wrongPick === opt ? "3px solid #F44336" : "3px solid #E0E0E0",
              background: wrongPick === opt ? "#FFEBEE" : "#FFF",
              transform: wrongPick === opt ? "scale(0.9)" : "scale(1)",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
