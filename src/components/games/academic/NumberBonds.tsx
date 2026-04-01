"use client";

import { useState, useCallback } from "react";

const MAX_ROUNDS = 6;
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }
function randInt(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }

export default function NumberBonds() {
  const [phase, setPhase] = useState<"start" | "play" | "done">("start");
  const [targetSum, setTargetSum] = useState(5);
  const [firstNumber, setFirstNumber] = useState(2);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);

  const generate = useCallback((r: number) => {
    setFeedback(null);
    setSelected(null);
    const maxSum = Math.min(5 + Math.floor(r / 2), 10);
    const sum = randInt(3, maxSum);
    const first = randInt(1, sum - 1);
    const answer = sum - first;
    setTargetSum(sum);
    setFirstNumber(first);
    const wrong = shuffle([answer - 2, answer - 1, answer + 1, answer + 2, answer + 3].filter((n) => n > 0 && n !== answer && n <= 10)).slice(0, 3);
    setOptions(shuffle([answer, ...wrong]));
  }, []);

  const handleStart = () => { setPhase("play"); setRound(1); setScore(0); setTimeout(() => generate(1), 100); };

  const answer = (num: number) => {
    if (feedback) return;
    setSelected(num);
    const correct = targetSum - firstNumber;
    if (num === correct) {
      setFeedback("correct");
      const s = score + 1;
      setScore(s);
      setTimeout(() => {
        setFeedback(null);
        setSelected(null);
        if (round >= MAX_ROUNDS) setPhase("done");
        else { const next = round + 1; setRound(next); generate(next); }
      }, 1100);
    } else {
      setFeedback("wrong");
      setTimeout(() => { setFeedback(null); setSelected(null); }, 800);
    }
  };

  const correctAnswer = targetSum - firstNumber;

  if (phase === "start") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-7xl">&#x1F9EE;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#4ECDC4" }}>Number Bonds!</h2>
      <p className="text-lg text-center text-gray-600 max-w-xs">Figure out which number is missing to make the equation work!</p>
      <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3 shadow-md">
        <div className="w-12 h-12 rounded-full bg-[#FF6B6B] flex items-center justify-center text-xl font-bold text-white">3</div>
        <span className="text-xl font-bold text-gray-500">+</span>
        <div className="w-12 h-12 rounded-full bg-[#4ECDC4] flex items-center justify-center text-xl font-bold text-white">?</div>
        <span className="text-xl font-bold text-gray-500">=</span>
        <div className="w-12 h-12 rounded-full bg-[#FFE66D] flex items-center justify-center text-xl font-bold text-gray-700">5</div>
      </div>
      <button onClick={handleStart} className="px-10 py-5 bg-[#4ECDC4] text-white text-2xl font-bold rounded-3xl shadow-xl border-none cursor-pointer">Start Adding!</button>
    </div>
  );

  if (phase === "done") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-8xl">&#x1F9EE;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#4ECDC4" }}>Math Wizard!</h2>
      <p className="text-xl text-center text-gray-700">Solved <span className="font-bold text-2xl" style={{ color: "#FF6B6B" }}>{score}</span> of {MAX_ROUNDS} number bonds!</p>
      <button onClick={handleStart} className="px-8 py-3 rounded-2xl border-none bg-[#4ECDC4] text-white font-bold text-lg cursor-pointer">Play Again</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-4 p-2">
      <div className="flex gap-1 justify-center">
        {Array.from({ length: MAX_ROUNDS }, (_, i) => (
          <div key={i} className="h-2 w-8 rounded-full" style={{ backgroundColor: i < round ? "#4ECDC4" : "#E5E7EB" }} />
        ))}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="relative flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-[#FFE66D] flex flex-col items-center justify-center shadow-xl mb-2">
            <span className="text-4xl font-black text-gray-700">{targetSum}</span>
            <span className="text-xs text-gray-500 font-medium">total</span>
          </div>
          <div className="flex justify-center gap-16 mt-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-[#FF6B6B] flex items-center justify-center shadow-lg">
                <span className="text-3xl font-black text-white">{firstNumber}</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg border-4 border-dashed border-[#4ECDC4]">
                {feedback === "correct"
                  ? <span className="text-3xl font-black text-[#4ECDC4]">{correctAnswer}</span>
                  : <span className="text-3xl font-black text-[#4ECDC4]">?</span>}
              </div>
            </div>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-600 mt-2">
          {firstNumber} + <span className="text-[#4ECDC4]">?</span> = {targetSum}
        </p>
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        {options.map((num) => (
          <button key={num} onClick={() => answer(num)} disabled={feedback !== null}
            className="h-16 w-16 text-2xl font-bold rounded-2xl shadow-lg border-none cursor-pointer disabled:opacity-60"
            style={{
              backgroundColor: selected === num && feedback === "correct" ? "#22C55E" : selected === num && feedback === "wrong" ? "#EF4444" : "#FF6B6B",
              color: "white",
            }}>
            {num}
          </button>
        ))}
      </div>
      {feedback && (
        <p className={`text-center text-lg font-bold ${feedback === "correct" ? "text-green-500" : "text-red-500"}`}>
          {feedback === "correct" ? `${firstNumber} + ${correctAnswer} = ${targetSum}!` : "Try a different number!"}
        </p>
      )}
    </div>
  );
}
