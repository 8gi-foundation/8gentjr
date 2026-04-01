"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const BALL_COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#DDA0DD", "#FFB347", "#87CEEB", "#FFB6C1"];
const MAX_NUMBER = 6;
const MAX_ROUNDS = 3;

function randInt(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }

type Bubble = { id: number; number: number; color: string; x: number; y: number; popped: boolean; size: number };

export default function BubblePopNumbers() {
  const [phase, setPhase] = useState<"start" | "play" | "done">("start");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [nextTarget, setNextTarget] = useState(1);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [showWrong, setShowWrong] = useState(false);

  const generate = useCallback(() => {
    setNextTarget(1);
    const newBubbles: Bubble[] = Array.from({ length: MAX_NUMBER }, (_, i) => ({
      id: i, number: i + 1, color: BALL_COLORS[randInt(0, BALL_COLORS.length - 1)],
      x: randInt(6, 76), y: randInt(6, 66), popped: false, size: randInt(60, 75),
    }));
    setBubbles(newBubbles);
  }, []);

  const handleStart = () => { setPhase("play"); setRound(1); setScore(0); setTimeout(generate, 100); };

  const handleTap = (bubble: Bubble) => {
    if (bubble.popped) return;
    if (bubble.number === nextTarget) {
      setBubbles((prev) => prev.map((b) => b.id === bubble.id ? { ...b, popped: true } : b));
      setScore((s) => s + 1);
      const next = nextTarget + 1;
      if (next <= MAX_NUMBER) {
        setNextTarget(next);
      } else {
        setTimeout(() => {
          if (round >= MAX_ROUNDS) setPhase("done");
          else { setRound((r) => r + 1); generate(); }
        }, 600);
      }
    } else {
      setShowWrong(true);
      setTimeout(() => setShowWrong(false), 600);
    }
  };

  if (phase === "start") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-7xl">&#x1FAE7;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#4ECDC4" }}>Bubble Pop!</h2>
      <p className="text-lg text-center text-gray-600 max-w-xs">Pop the bubbles in order from 1 to {MAX_NUMBER}!</p>
      <button onClick={handleStart} className="px-10 py-5 bg-[#4ECDC4] text-white text-2xl font-bold rounded-3xl shadow-xl border-none cursor-pointer">Pop!</button>
    </div>
  );

  if (phase === "done") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-8xl">&#x1F31F;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#4ECDC4" }}>You did it!</h2>
      <p className="text-xl text-center text-gray-700">Popped <span className="font-bold text-2xl" style={{ color: "#FF6B6B" }}>{score}</span> bubbles!</p>
      <button onClick={handleStart} className="px-8 py-3 rounded-2xl border-none bg-[#4ECDC4] text-white font-bold text-lg cursor-pointer">Play Again</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-3 p-2">
      <div className="flex gap-1 justify-center">
        {Array.from({ length: MAX_ROUNDS }, (_, i) => (
          <div key={i} className="h-2 w-8 rounded-full" style={{ backgroundColor: i < round ? "#4ECDC4" : "#E5E7EB" }} />
        ))}
      </div>
      <div className="text-center">
        <p className="text-base font-medium text-gray-500">Pop in order! Find:</p>
        <div className="inline-flex items-center justify-center mt-1">
          <div className="w-14 h-14 rounded-full bg-[#FF6B6B] flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">{nextTarget}</span>
          </div>
        </div>
      </div>
      <div className="relative flex-1 rounded-3xl overflow-hidden border-2 border-cyan-200 min-h-[200px]" style={{ background: "linear-gradient(135deg, #E0F7FA, #BBDEFB)" }}>
        {bubbles.map((b) => !b.popped && (
          <button key={b.id} onClick={() => handleTap(b)}
            className="absolute rounded-full flex items-center justify-center border-none cursor-pointer"
            style={{
              left: `${b.x}%`, top: `${b.y}%`, width: b.size, height: b.size,
              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, ${b.color} 40%, ${b.color}cc 100%)`,
              boxShadow: `0 4px 15px ${b.color}66, inset 0 -4px 12px rgba(0,0,0,0.1)`,
              transform: "translate(-50%, -50%)",
            }}>
            <span className="text-xl font-bold text-white" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>{b.number}</span>
          </button>
        ))}
        {showWrong && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-400/20 rounded-3xl pointer-events-none">
            <span className="text-5xl">&#x1F645;</span>
          </div>
        )}
      </div>
    </div>
  );
}
