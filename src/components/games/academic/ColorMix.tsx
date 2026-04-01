"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const COLOR_MIXES = [
  { colors: ["Red", "Yellow"], result: "Orange", hex1: "#FF6B6B", hex2: "#FFE66D", hexResult: "#FFB347", emoji1: "red", emoji2: "yellow" },
  { colors: ["Blue", "Yellow"], result: "Green", hex1: "#4169E1", hex2: "#FFE66D", hexResult: "#4CAF50", emoji1: "blue", emoji2: "yellow" },
  { colors: ["Red", "Blue"], result: "Purple", hex1: "#FF6B6B", hex2: "#4169E1", hexResult: "#9C27B0", emoji1: "red", emoji2: "blue" },
  { colors: ["White", "Red"], result: "Pink", hex1: "#F5F5F5", hex2: "#FF6B6B", hexResult: "#FFB6C1", emoji1: "white", emoji2: "red" },
  { colors: ["Red", "Orange"], result: "Dark Orange", hex1: "#FF6B6B", hex2: "#FFB347", hexResult: "#FF7043", emoji1: "red", emoji2: "orange" },
];
const ALL_RESULTS = ["Orange", "Green", "Purple", "Pink", "Dark Orange", "Blue", "Yellow", "Red"];
const MAX_ROUNDS = 5;

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }
function randInt(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }

function interpolate(c1: string, c2: string, t: number) {
  const h1 = parseInt(c1.slice(1), 16), h2 = parseInt(c2.slice(1), 16);
  const r = Math.round(((h1 >> 16) & 0xff) + (((h2 >> 16) & 0xff) - ((h1 >> 16) & 0xff)) * t);
  const g = Math.round(((h1 >> 8) & 0xff) + (((h2 >> 8) & 0xff) - ((h1 >> 8) & 0xff)) * t);
  const b = Math.round((h1 & 0xff) + ((h2 & 0xff) - (h1 & 0xff)) * t);
  return `rgb(${r},${g},${b})`;
}

export default function ColorMix() {
  const [phase, setPhase] = useState<"start" | "mixing" | "play" | "done">("start");
  const [mix, setMix] = useState(COLOR_MIXES[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [mixProgress, setMixProgress] = useState(0);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const generate = useCallback(() => {
    setFeedback(null);
    setMixProgress(0);
    const m = COLOR_MIXES[randInt(0, COLOR_MIXES.length - 1)];
    setMix(m);
    const wrong = shuffle(ALL_RESULTS.filter((r) => r !== m.result)).slice(0, 3);
    setOptions(shuffle([m.result, ...wrong]));
    setPhase("mixing");
    let progress = 0;
    intervalRef.current = setInterval(() => {
      progress += 0.04;
      setMixProgress(Math.min(progress, 1));
      if (progress >= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => setPhase("play"), 200);
      }
    }, 50);
  }, []);

  const handleStart = () => { setRound(1); setScore(0); setTimeout(generate, 100); };

  const answer = (a: string) => {
    if (feedback) return;
    if (a === mix.result) {
      setFeedback("correct");
      setScore((s) => s + 1);
      setTimeout(() => {
        setFeedback(null);
        if (round >= MAX_ROUNDS) setPhase("done");
        else { setRound((r) => r + 1); generate(); }
      }, 1000);
    } else {
      setFeedback("wrong");
      setTimeout(() => setFeedback(null), 800);
    }
  };

  const midColor = interpolate(mix.hex1, mix.hex2, 0.5);
  const displayColor = mixProgress < 0.5
    ? interpolate(mix.hex1, midColor, mixProgress * 2)
    : interpolate(midColor, mix.hexResult, (mixProgress - 0.5) * 2);

  if (phase === "start") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-7xl">&#x1F3A8;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#FFB347" }}>Color Mix!</h2>
      <p className="text-lg text-center text-gray-600 max-w-xs">Watch colors mix together and guess the result!</p>
      <button onClick={handleStart} className="px-10 py-5 text-white text-2xl font-bold rounded-3xl shadow-xl border-none cursor-pointer" style={{ backgroundColor: "#FFB347" }}>Mix Colors!</button>
    </div>
  );

  if (phase === "done") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-8xl">&#x1F308;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#FFB347" }}>Color Scientist!</h2>
      <p className="text-xl text-center text-gray-700">Got <span className="font-bold text-2xl" style={{ color: "#FF6B6B" }}>{score}</span> of {MAX_ROUNDS} right!</p>
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
      <p className="text-center text-lg font-bold" style={{ color: "#4ECDC4" }}>What color do you get?</p>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-2">
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full shadow-lg" style={{ backgroundColor: mix.hex1 }} />
            <span className="text-sm font-bold text-gray-600">{mix.colors[0]}</span>
          </div>
          <span className="text-2xl font-bold text-gray-400">+</span>
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full shadow-lg" style={{ backgroundColor: mix.hex2 }} />
            <span className="text-sm font-bold text-gray-600">{mix.colors[1]}</span>
          </div>
        </div>
        <div className="text-3xl">{phase === "mixing" ? "\u{1F300}" : "\u2B07\uFE0F"}</div>
        <div className="w-28 h-28 rounded-full shadow-xl flex items-center justify-center"
          style={{ backgroundColor: phase === "play" ? mix.hexResult : displayColor }}>
          {phase === "play" && <span className="text-4xl">&#x1F3A8;</span>}
        </div>
        {phase === "mixing" && <p className="text-sm font-medium text-gray-400">Mixing...</p>}
      </div>
      {phase === "play" && (
        <div className="grid grid-cols-2 gap-3">
          {options.map((color) => (
            <button key={color} onClick={() => answer(color)} disabled={feedback === "correct"}
              className={`h-14 text-base font-bold rounded-2xl border-2 shadow-md capitalize cursor-pointer transition-all ${
                feedback === "correct" && color === mix.result ? "border-green-400 bg-green-50 text-green-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-orange-200"
              }`}>
              {color}
            </button>
          ))}
        </div>
      )}
      {feedback && (
        <p className={`text-center text-xl font-bold ${feedback === "correct" ? "text-green-500" : "text-red-500"}`}>
          {feedback === "correct" ? `Yes! ${mix.result}!` : "Try again!"}
        </p>
      )}
    </div>
  );
}
