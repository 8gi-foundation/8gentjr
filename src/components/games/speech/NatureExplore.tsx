"use client";

import { useState, useRef, useEffect } from "react";

type NatureItem = { name: string; emoji: string; fact: string; question: string; answers: { text: string; correct: boolean }[]; color: string; category: string };

const natureItems: NatureItem[] = [
  { name: "Tree", emoji: "\u{1F333}", fact: "Trees give us air to breathe and homes for animals!", question: "What do trees give us?", answers: [{ text: "Fresh air", correct: true }, { text: "Pizza", correct: false }, { text: "Electricity", correct: false }], color: "#2ECC71", category: "plant" },
  { name: "Rain", emoji: "\u{1F327}\uFE0F", fact: "Rain falls from clouds and helps flowers and trees grow!", question: "What does rain help to do?", answers: [{ text: "Make noise", correct: false }, { text: "Grow plants", correct: true }, { text: "Make sunsets", correct: false }], color: "#3498DB", category: "weather" },
  { name: "Butterfly", emoji: "\u{1F98B}", fact: "Butterflies start life as caterpillars!", question: "What do butterflies start as?", answers: [{ text: "A caterpillar", correct: true }, { text: "A fish", correct: false }, { text: "A flower", correct: false }], color: "#9B59B6", category: "animal" },
  { name: "Sun", emoji: "\u2600\uFE0F", fact: "The sun gives us warmth and light!", question: "What does the sun give us?", answers: [{ text: "Rain", correct: false }, { text: "Warmth and light", correct: true }, { text: "Snow", correct: false }], color: "#F1C40F", category: "weather" },
  { name: "Rainbow", emoji: "\u{1F308}", fact: "Rainbows appear when sun shines through rain!", question: "When do rainbows appear?", answers: [{ text: "Only at night", correct: false }, { text: "Sun shines in rain", correct: true }, { text: "When it's windy", correct: false }], color: "#E91E63", category: "weather" },
  { name: "Bird", emoji: "\u{1F426}", fact: "Birds build nests to lay eggs in!", question: "What do birds build?", answers: [{ text: "A nest", correct: true }, { text: "A sandcastle", correct: false }, { text: "A hole", correct: false }], color: "#E74C3C", category: "animal" },
  { name: "Flower", emoji: "\u{1F338}", fact: "Bees visit flowers to collect nectar to make honey!", question: "Why do bees visit flowers?", answers: [{ text: "To sleep", correct: false }, { text: "To collect nectar", correct: true }, { text: "To play", correct: false }], color: "#FF69B4", category: "plant" },
  { name: "Cloud", emoji: "\u2601\uFE0F", fact: "Clouds are made of millions of tiny water droplets!", question: "What are clouds made of?", answers: [{ text: "Cotton", correct: false }, { text: "Tiny water drops", correct: true }, { text: "Smoke", correct: false }], color: "#BDC3C7", category: "weather" },
];
const TOTAL = 8;

export default function NatureExplore() {
  const [started, setStarted] = useState(false);
  const [pool] = useState(() => [...natureItems].sort(() => Math.random() - 0.5).slice(0, TOTAL));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"explore" | "quiz" | "result">("explore");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [exploredEmojis, setExploredEmojis] = useState<string[]>([]);

  const currentItem = pool[index] ?? null;

  const handleStart = () => setStarted(true);
  const handleQuiz = () => { setPhase("quiz"); setSelectedAnswer(null); setIsCorrect(null); };

  const handleAnswer = (answer: { text: string; correct: boolean }) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer.text);
    if (answer.correct) {
      setIsCorrect(true);
      setTimeout(() => setPhase("result"), 1000);
    } else {
      setIsCorrect(false);
      setTimeout(() => { setSelectedAnswer(null); setIsCorrect(null); }, 800);
    }
  };

  const handleNext = () => {
    if (!currentItem) return;
    setExploredEmojis((prev) => [...prev, currentItem.emoji]);
    if (index + 1 >= TOTAL) { setDone(true); return; }
    setIndex((i) => i + 1);
    setPhase("explore");
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  if (!started) return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-8xl">&#x1F33F;</div>
      <h2 className="text-3xl font-extrabold text-center text-green-600">Nature Explorer!</h2>
      <p className="text-gray-500 text-center text-lg max-w-xs">Discover amazing facts about nature!</p>
      <button onClick={handleStart} className="px-10 py-5 rounded-3xl bg-green-500 text-white font-extrabold text-2xl shadow-xl border-none cursor-pointer">Explore Nature!</button>
    </div>
  );

  if (done) return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-8xl">&#x1F30D;</div>
      <h2 className="text-3xl font-extrabold text-center text-green-600">Nature Expert!</h2>
      <p className="text-gray-500 text-center">You explored {TOTAL} amazing things!</p>
      <div className="flex flex-wrap justify-center gap-3">
        {exploredEmojis.map((e, i) => <span key={i} className="text-4xl">{e}</span>)}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col items-center gap-4 p-4 overflow-hidden">
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Exploring {index + 1} of {TOTAL}</span><span>{exploredEmojis.length} explored</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${(index / TOTAL) * 100}%`, background: "linear-gradient(90deg, #4ADE80, #2DD4BF)", transition: "width 0.4s" }} />
        </div>
      </div>
      {currentItem && phase === "explore" && (
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          <div className="w-40 h-40 rounded-3xl flex items-center justify-center shadow-2xl" style={{ backgroundColor: `${currentItem.color}25`, fontSize: 90 }}>
            {currentItem.emoji}
          </div>
          <h3 className="text-4xl font-extrabold" style={{ color: currentItem.color }}>{currentItem.name}</h3>
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white capitalize" style={{ backgroundColor: currentItem.color }}>{currentItem.category}</span>
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 max-w-xs text-center" style={{ borderColor: currentItem.color }}>
            <p className="text-base font-medium text-gray-700">{currentItem.fact}</p>
          </div>
          <button onClick={handleQuiz} className="px-5 py-3 rounded-2xl bg-teal-400 text-white font-extrabold shadow-xl text-base border-none cursor-pointer">Quiz Me!</button>
        </div>
      )}
      {currentItem && phase === "quiz" && (
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{currentItem.emoji}</span>
            <div className="bg-white rounded-2xl px-4 py-3 shadow border-2 flex-1" style={{ borderColor: currentItem.color }}>
              <p className="font-extrabold text-base" style={{ color: currentItem.color }}>{currentItem.question}</p>
            </div>
          </div>
          <div className="space-y-3 w-full">
            {currentItem.answers.map((a) => (
              <button key={a.text} onClick={() => handleAnswer(a)} disabled={!!(selectedAnswer && isCorrect)}
                className={`w-full p-4 rounded-xl text-left font-bold shadow-md text-base border-2 cursor-pointer ${
                  selectedAnswer === a.text && a.correct ? "bg-green-400 text-white border-green-400"
                  : selectedAnswer === a.text && !a.correct ? "bg-red-100 text-gray-400 border-red-200"
                  : "bg-white text-gray-700 border-gray-200"
                }`}>
                {a.text}
              </button>
            ))}
          </div>
        </div>
      )}
      {currentItem && phase === "result" && (
        <div className="flex flex-col items-center gap-5 max-w-xs">
          <div className="text-8xl">{currentItem.emoji}</div>
          <h3 className="text-3xl font-extrabold" style={{ color: currentItem.color }}>Nature Expert!</h3>
          <button onClick={handleNext} className="px-10 py-5 rounded-3xl bg-teal-400 text-white font-extrabold text-xl shadow-xl border-none cursor-pointer">
            {index + 1 >= TOTAL ? "Finish!" : "Next Discovery"}
          </button>
        </div>
      )}
      {exploredEmojis.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-auto">
          {exploredEmojis.map((e, i) => <span key={i} className="text-2xl">{e}</span>)}
        </div>
      )}
    </div>
  );
}
