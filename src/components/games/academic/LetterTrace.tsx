"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LETTER_WORDS: Record<string, string> = {
  A: "Apple", B: "Ball", C: "Cat", D: "Dog", E: "Elephant", F: "Fish",
  G: "Grapes", H: "House", I: "Ice cream", J: "Jellyfish", K: "Kite",
  L: "Lion", M: "Moon", N: "Nest", O: "Orange", P: "Penguin", Q: "Queen",
  R: "Rainbow", S: "Star", T: "Tiger", U: "Umbrella", V: "Volcano",
  W: "Whale", X: "Xylophone", Y: "Yo-yo", Z: "Zebra",
};
const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#DDA0DD", "#FFB347"];
const MAX_ROUNDS = 5;

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }
function randInt(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }

export default function LetterTrace() {
  const [phase, setPhase] = useState<"start" | "play" | "done">("start");
  const [letter, setLetter] = useState("A");
  const [color, setColor] = useState(COLORS[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = useCallback(() => {
    const l = LETTERS[randInt(0, 25)];
    const c = COLORS[randInt(0, 5)];
    setLetter(l);
    setColor(c);
    setPoints([]);
    setHasDrawn(false);
    setFeedback(null);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    const wrong = shuffle(LETTERS.filter((x) => x !== l)).slice(0, 3);
    setOptions(shuffle([l, ...wrong]));
  }, []);

  const handleStart = () => { setPhase("play"); setRound(1); setScore(0); setTimeout(generate, 100); };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }, [points, color]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const onDown = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); setIsDrawing(true); setHasDrawn(true); setPoints([getPos(e)]);
  };
  const onMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); if (!isDrawing) return; setPoints((p) => [...p, getPos(e)]);
  };
  const onUp = () => setIsDrawing(false);

  const clearTrace = () => {
    setPoints([]); setHasDrawn(false);
    canvasRef.current?.getContext("2d")?.clearRect(0, 0, 400, 300);
  };

  const answer = (l: string) => {
    if (feedback) return;
    if (l === letter) {
      setFeedback("correct");
      const s = score + 1;
      setScore(s);
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

  if (phase === "start") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-7xl">&#x270F;&#xFE0F;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#4ECDC4" }}>Letter Trace!</h2>
      <p className="text-lg text-center text-gray-600 max-w-xs">Trace the letter with your finger, then tap the matching letter below!</p>
      <button onClick={handleStart} className="px-10 py-5 text-white text-2xl font-bold rounded-3xl shadow-xl border-none cursor-pointer" style={{ backgroundColor: "#4ECDC4" }}>Start Tracing!</button>
    </div>
  );

  if (phase === "done") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-8xl">&#x1F393;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#4ECDC4" }}>Letter Champion!</h2>
      <p className="text-xl text-center text-gray-700">You traced <span className="font-bold text-2xl" style={{ color: "#FF6B6B" }}>{score}</span> letters perfectly!</p>
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
      <p className="text-center text-sm font-medium text-gray-500">{letter} for {LETTER_WORDS[letter]}</p>
      <div className="relative flex-1 rounded-3xl overflow-hidden border-2 border-yellow-200 min-h-[160px]" style={{ background: "linear-gradient(135deg, #FFFDE7, #FFF3E0)" }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="font-black" style={{ fontSize: "min(45vw, 160px)", color: color, opacity: 0.18, lineHeight: 1 }}>{letter}</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="font-black" style={{ fontSize: "min(45vw, 160px)", color: "transparent", WebkitTextStroke: `3px ${color}44`, lineHeight: 1 }}>{letter}</span>
        </div>
        <canvas ref={canvasRef} width={400} height={300} className="absolute inset-0 w-full h-full" style={{ touchAction: "none" }}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} />
        {!hasDrawn && <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none"><span className="text-sm font-medium text-gray-400" style={{ animation: "pulse 1.5s infinite" }}>Trace the letter!</span></div>}
        {hasDrawn && <button onClick={clearTrace} className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 text-sm font-bold border-none cursor-pointer">&#x2715;</button>}
        {feedback && (
          <div className="absolute inset-0 flex items-center justify-center rounded-3xl" style={{ backgroundColor: feedback === "correct" ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)" }}>
            <span className="text-7xl">{feedback === "correct" ? "\u2705" : "\u274C"}</span>
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-base font-bold mb-2" style={{ color: "#4ECDC4" }}>Which letter is that?</p>
        <div className="flex gap-3 justify-center">
          {options.map((l) => (
            <button key={l} onClick={() => answer(l)} className="h-14 w-14 text-2xl font-bold rounded-2xl text-white shadow-lg border-none cursor-pointer" style={{ backgroundColor: color }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
