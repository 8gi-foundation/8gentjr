"use client";

import { useState } from "react";

const feelings = [
  { name: "Happy", emoji: "\u{1F60A}", color: "#FFD93D", desc: "Warm and sunny inside!",
    body: "You smile and feel light!", options: ["Opening a birthday present", "Eating broccoli", "Stuck in traffic"], answer: 0 },
  { name: "Sad", emoji: "\u{1F622}", color: "#74B9FF", desc: "Heavy like rain clouds",
    body: "Your eyes feel watery", options: ["Winning a game", "Losing your favourite toy", "Eating cake"], answer: 1 },
  { name: "Angry", emoji: "\u{1F620}", color: "#FF6B6B", desc: "Hot and fiery inside!",
    body: "Your face gets red and hot", options: ["Watching a sunset", "Someone breaks your toy", "Getting a hug"], answer: 1 },
  { name: "Scared", emoji: "\u{1F628}", color: "#A29BFE", desc: "Wobbly and shaky",
    body: "Your heart beats fast!", options: ["Hearing a big thunder crash", "Playing with a puppy", "Eating ice cream"], answer: 0 },
  { name: "Excited", emoji: "\u{1F929}", color: "#FF9F43", desc: "Bouncy and zingy inside!",
    body: "You can't stop moving!", options: ["Going to sleep early", "Your birthday party starts NOW", "Washing dishes"], answer: 1 },
  { name: "Calm", emoji: "\u{1F60C}", color: "#95E1D3", desc: "Peaceful like a quiet lake",
    body: "Your breathing is slow and soft", options: ["Taking deep breaths outside", "Spinning really fast", "Shouting loud"], answer: 0 },
];

export default function FeelingsExplorer() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"learn" | "quiz" | "result">("learn");
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const f = feelings[index];
  const done = index >= feelings.length;

  const tryAnswer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === f.answer) {
      setScore((s) => s + 1);
      setTimeout(() => setPhase("result"), 1000);
    } else {
      setTimeout(() => setPicked(null), 700);
    }
  };

  const next = () => {
    setIndex((i) => i + 1);
    setPhase("learn");
    setPicked(null);
  };

  if (done) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl">&#x1F308;</div>
        <h2 className="text-[28px] font-extrabold text-[#9B59B6] mt-4 mb-2">Feelings Expert!</h2>
        <p className="text-gray-500">You scored {score}/{feelings.length}!</p>
        <div className="flex justify-center gap-2 my-3">
          {feelings.map((fl) => <span key={fl.name} className="text-[32px]">{fl.emoji}</span>)}
        </div>
        <button onClick={() => { setIndex(0); setScore(0); setPhase("learn"); setPicked(null); }}
          className="mt-3 px-8 py-3 rounded-2xl border-none bg-[#9B59B6] text-white font-bold text-lg cursor-pointer">
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="text-center p-6">
      <div className="text-xs text-gray-400 mb-2">{index + 1} / {feelings.length}</div>
      <div className="h-1.5 bg-gray-200 rounded-sm mb-5">
        <div className="h-1.5 rounded-sm bg-gradient-to-r from-[#FFD93D] to-[#FF6B6B] transition-[width] duration-300" style={{ width: `${(index / feelings.length) * 100}%` }} />
      </div>

      <div className="text-7xl mb-1">{f.emoji}</div>
      <h3 className="text-[32px] font-extrabold mb-1" style={{ color: f.color }}>{f.name}</h3>

      {phase === "learn" && (
        <>
          <div className="inline-block px-5 py-2.5 rounded-2xl mb-2" style={{ border: `2px solid ${f.color}`, background: `${f.color}15` }}>
            <p className="m-0 font-bold text-gray-600 text-base">{f.desc}</p>
            <p className="mt-1 mb-0 text-gray-400 text-[13px]">{f.body}</p>
          </div>
          <br />
          <button onClick={() => setPhase("quiz")}
            className="mt-3 px-7 py-3 rounded-[14px] border-none bg-[#4ECDC4] text-white font-bold text-base cursor-pointer">
            Quiz Me!
          </button>
        </>
      )}

      {phase === "quiz" && (
        <>
          <p className="font-bold text-base my-2 mb-3" style={{ color: f.color }}>When do you feel {f.name}?</p>
          <div className="flex flex-col gap-2.5 max-w-[320px] mx-auto">
            {f.options.map((opt, i) => {
              const sel = picked === i;
              const right = sel && i === f.answer;
              const wrong = sel && i !== f.answer;
              return (
                <button key={opt} onClick={() => tryAnswer(i)}
                  className="px-4 py-3.5 rounded-[14px] font-bold text-[15px] cursor-pointer text-left transition-all duration-150"
                  style={{
                    border: right ? "3px solid #4CAF50" : wrong ? "3px solid #EF5350" : "2px solid #ddd",
                    background: right ? "#C8E6C9" : wrong ? "#FFCDD2" : "#fff",
                  }}>
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase === "result" && (
        <>
          <div className="text-5xl my-2">&#x1F31F;</div>
          <p className="text-gray-600 text-base">We feel <strong>{f.name}</strong> when &ldquo;{f.options[f.answer]}&rdquo;</p>
          <button onClick={next}
            className="mt-3 px-7 py-3 rounded-[14px] border-none bg-[#4ECDC4] text-white font-bold text-base cursor-pointer">
            Next Feeling
          </button>
        </>
      )}
    </div>
  );
}
