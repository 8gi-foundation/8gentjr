"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Move = { action: string; emoji: string; instruction: string; color: string };

const moves: Move[] = [
  { action: "Clap", emoji: "\u{1F44F}", instruction: "Clap your hands 3 times!", color: "#FF6B6B" },
  { action: "Wave", emoji: "\u{1F44B}", instruction: "Wave hello to me!", color: "#FFE66D" },
  { action: "Jump", emoji: "\u{1F998}", instruction: "Jump up high!", color: "#4ECDC4" },
  { action: "Spin", emoji: "\u{1F300}", instruction: "Spin all the way around!", color: "#DDA0DD" },
  { action: "Touch Head", emoji: "\u{1F646}", instruction: "Touch the top of your head!", color: "#FF9F43" },
  { action: "Touch Toes", emoji: "\u{1F9B6}", instruction: "Reach down and touch your toes!", color: "#95E1D3" },
  { action: "Stomp", emoji: "\u{1F463}", instruction: "Stomp your feet like an elephant!", color: "#A8E6CF" },
  { action: "Stretch", emoji: "\u{1F938}", instruction: "Stretch both arms up high!", color: "#686DE0" },
  { action: "Wiggle", emoji: "\u{1F41B}", instruction: "Wiggle your whole body!", color: "#22A6B3" },
  { action: "Star Jump", emoji: "\u2B50", instruction: "Do a star jump!", color: "#F8B500" },
  { action: "March", emoji: "\u{1F6B6}", instruction: "March on the spot!", color: "#E056FD" },
  { action: "Roar", emoji: "\u{1F981}", instruction: "Roar like a lion!", color: "#DAA520" },
];
const TOTAL_MOVES = 10;

export default function CopyMove() {
  const [started, setStarted] = useState(false);
  const [currentMove, setCurrentMove] = useState<Move | null>(null);
  const [movesCompleted, setMovesCompleted] = useState(0);
  const [phase, setPhase] = useState<"show" | "do">("show");
  const [celebration, setCelebration] = useState(false);
  const [completedEmojis, setCompletedEmojis] = useState<string[]>([]);
  const poolRef = useRef([...moves].sort(() => Math.random() - 0.5));
  const idxRef = useRef(0);
  const countRef = useRef(0);

  const pickNext = useCallback(() => {
    if (countRef.current >= TOTAL_MOVES) { setCelebration(true); return; }
    if (idxRef.current >= poolRef.current.length) {
      poolRef.current = [...moves].sort(() => Math.random() - 0.5);
      idxRef.current = 0;
    }
    const next = poolRef.current[idxRef.current];
    idxRef.current += 1;
    setCurrentMove(next);
    setPhase("show");
    setTimeout(() => setPhase("do"), 2000);
  }, []);

  const handleStart = () => { setStarted(true); pickNext(); };

  const handleDidIt = () => {
    if (!currentMove) return;
    countRef.current += 1;
    setMovesCompleted(countRef.current);
    setCompletedEmojis((prev) => [...prev, currentMove.emoji]);
    setTimeout(pickNext, 600);
  };

  const handleShowAgain = () => { setPhase("show"); setTimeout(() => setPhase("do"), 2000); };

  const progress = movesCompleted / TOTAL_MOVES;

  if (!started) return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-8xl">&#x1F57A;</div>
      <h2 className="text-3xl font-extrabold text-center text-teal-500">Copy The Move!</h2>
      <p className="text-gray-500 text-center text-lg max-w-xs">Watch the instruction, then copy the move!</p>
      <button onClick={handleStart} className="px-10 py-5 rounded-3xl bg-teal-500 text-white font-extrabold text-2xl shadow-xl border-none cursor-pointer">Let&apos;s Move!</button>
    </div>
  );

  if (celebration) return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-8xl">&#x1F3C6;</div>
      <h2 className="text-3xl font-extrabold text-center text-teal-500">Move Champion!</h2>
      <p className="text-gray-500 text-center">You completed {TOTAL_MOVES} moves!</p>
      <div className="flex flex-wrap justify-center gap-2">
        {completedEmojis.map((e, i) => <span key={i} className="text-3xl">{e}</span>)}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col items-center gap-4 p-4 overflow-hidden">
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{movesCompleted} moves done</span><span>{TOTAL_MOVES - movesCompleted} left</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg, #2DD4BF, #4ADE80)", transition: "width 0.4s" }} />
        </div>
      </div>
      {currentMove && (
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="w-44 h-44 rounded-3xl flex items-center justify-center shadow-2xl" style={{ backgroundColor: `${currentMove.color}25`, fontSize: 100 }}>
            {currentMove.emoji}
          </div>
          <h2 className="text-2xl font-extrabold text-center px-4" style={{ color: currentMove.color }}>{currentMove.instruction}</h2>
          {phase === "do" && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="text-2xl font-extrabold text-gray-500">Now YOU do it!</div>
              <div className="flex gap-4">
                <button onClick={handleShowAgain} className="px-5 py-4 rounded-2xl bg-gray-200 text-gray-700 font-bold text-lg shadow-lg border-none cursor-pointer">Show Again</button>
                <button onClick={handleDidIt} className="px-7 py-4 rounded-2xl text-white font-extrabold text-xl shadow-xl border-none cursor-pointer" style={{ backgroundColor: currentMove.color }}>I Did It! &#x2713;</button>
              </div>
            </div>
          )}
          {phase === "show" && <p className="text-gray-400 font-medium">Watch carefully...</p>}
        </div>
      )}
      {completedEmojis.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-auto">
          {completedEmojis.slice(-8).map((e, i) => <span key={i} className="text-2xl">{e}</span>)}
        </div>
      )}
    </div>
  );
}
