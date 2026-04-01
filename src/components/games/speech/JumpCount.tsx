"use client";

import { useState, useRef, useCallback } from "react";

type Action = { verb: string; emoji: string; color: string };

const actions: Action[] = [
  { verb: "Jump", emoji: "\u{1F998}", color: "#FF6B6B" },
  { verb: "Clap", emoji: "\u{1F44F}", color: "#FFE66D" },
  { verb: "Stomp", emoji: "\u{1F463}", color: "#4ECDC4" },
  { verb: "Spin", emoji: "\u{1F300}", color: "#DDA0DD" },
  { verb: "Wave", emoji: "\u{1F44B}", color: "#FF9F43" },
  { verb: "Hop", emoji: "\u{1F430}", color: "#95E1D3" },
  { verb: "Star Jump", emoji: "\u2B50", color: "#F8B500" },
];
const TOTAL_ROUNDS = 10;

export default function JumpCount() {
  const [started, setStarted] = useState(false);
  const [currentAction, setCurrentAction] = useState<Action | null>(null);
  const [targetCount, setTargetCount] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [celebration, setCelebration] = useState(false);
  const [totalTaps, setTotalTaps] = useState(0);
  const roundsRef = useRef(0);

  const pickNext = useCallback(() => {
    if (roundsRef.current >= TOTAL_ROUNDS) { setCelebration(true); return; }
    const action = actions[Math.floor(Math.random() * actions.length)];
    const round = roundsRef.current;
    const min = round < 3 ? 2 : round < 6 ? 3 : 4;
    const max = round < 3 ? 4 : round < 6 ? 6 : 8;
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    setCurrentAction(action);
    setTargetCount(count);
    setCurrentCount(0);
    setShowRoundComplete(false);
  }, []);

  const handleStart = () => { setStarted(true); pickNext(); };

  const handleTap = () => {
    if (!currentAction || currentCount >= targetCount) return;
    const newCount = currentCount + 1;
    setCurrentCount(newCount);
    setTotalTaps((p) => p + 1);
    if (newCount >= targetCount) {
      setTimeout(() => setShowRoundComplete(true), 400);
    }
  };

  const handleNextRound = () => {
    roundsRef.current += 1;
    setRoundsCompleted(roundsRef.current);
    pickNext();
  };

  const progress = roundsCompleted / TOTAL_ROUNDS;

  if (!started) return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-8xl">&#x1F522;</div>
      <h2 className="text-3xl font-extrabold text-center text-pink-500">Jump &amp; Count!</h2>
      <p className="text-gray-500 text-center text-lg max-w-xs">Move your body and count! Tap the button each time!</p>
      <button onClick={handleStart} className="px-10 py-5 rounded-3xl bg-pink-500 text-white font-extrabold text-2xl shadow-xl border-none cursor-pointer">Let&apos;s Count!</button>
    </div>
  );

  if (celebration) return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-8xl">&#x1F3C6;</div>
      <h2 className="text-3xl font-extrabold text-center text-pink-500">Count Champion!</h2>
      <p className="text-gray-500 text-center text-lg">You did <strong>{totalTaps}</strong> moves total!</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col items-center gap-4 p-4 overflow-hidden">
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Round {roundsCompleted + 1} of {TOTAL_ROUNDS}</span><span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg, #F472B6, #EF4444)", transition: "width 0.4s" }} />
        </div>
      </div>
      {currentAction && !showRoundComplete && (
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="px-5 py-3 rounded-2xl text-white font-extrabold text-xl text-center shadow-lg" style={{ backgroundColor: currentAction.color }}>
            {currentAction.verb} <span className="text-3xl">{targetCount}</span> times!
          </div>
          <button onClick={handleTap} disabled={currentCount >= targetCount}
            className="w-48 h-48 rounded-3xl flex flex-col items-center justify-center shadow-2xl border-none cursor-pointer disabled:opacity-50 select-none"
            style={{ backgroundColor: `${currentAction.color}25`, borderWidth: 3, borderStyle: "solid", borderColor: `${currentAction.color}60`, fontSize: 90 }}>
            {currentAction.emoji}
          </button>
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-extrabold" style={{ color: currentAction.color }}>{currentCount}</div>
            <div className="flex flex-wrap justify-center gap-2 max-w-xs">
              {Array.from({ length: targetCount }).map((_, i) => (
                <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold shadow"
                  style={{ backgroundColor: i < currentCount ? currentAction.color : "#E5E7EB", color: i < currentCount ? "white" : "#9CA3AF" }}>
                  {i + 1}
                </div>
              ))}
            </div>
            {currentCount < targetCount && <p className="text-gray-500 text-base font-medium">{targetCount - currentCount} more to go!</p>}
          </div>
        </div>
      )}
      {currentAction && showRoundComplete && (
        <div className="flex flex-col items-center gap-5">
          <div className="text-7xl">{currentAction.emoji}</div>
          <h3 className="text-4xl font-extrabold" style={{ color: currentAction.color }}>{targetCount} {currentAction.verb}s!</h3>
          <p className="text-gray-500 text-xl">Amazing!</p>
          <button onClick={handleNextRound} className="px-10 py-5 rounded-3xl bg-pink-500 text-white font-extrabold text-xl shadow-xl border-none cursor-pointer">
            {roundsRef.current + 1 >= TOTAL_ROUNDS ? "Finish!" : "Next Challenge!"}
          </button>
        </div>
      )}
    </div>
  );
}
