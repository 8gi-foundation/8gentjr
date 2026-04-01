"use client";

import { useState } from "react";

type WordOption = { word: string; emoji?: string; isCorrect: boolean };
type Challenge = { prefix: string; suffix: string; hint: string; options: WordOption[]; fullSentence: string };

const challenges: Challenge[] = [
  { prefix: "The", suffix: "is sleeping.", hint: "It purrs and meows", options: [{ word: "cat", emoji: "\u{1F431}", isCorrect: true }, { word: "bus", emoji: "\u{1F68C}", isCorrect: false }, { word: "tree", emoji: "\u{1F333}", isCorrect: false }], fullSentence: "The cat is sleeping." },
  { prefix: "I see a big", suffix: "in the sky.", hint: "It floats and is fluffy", options: [{ word: "cloud", emoji: "\u2601\uFE0F", isCorrect: true }, { word: "fish", emoji: "\u{1F41F}", isCorrect: false }, { word: "chair", emoji: "\u{1FA91}", isCorrect: false }], fullSentence: "I see a big cloud in the sky." },
  { prefix: "The", suffix: "is very cold.", hint: "You make snowballs with it", options: [{ word: "fire", emoji: "\u{1F525}", isCorrect: false }, { word: "snow", emoji: "\u2744\uFE0F", isCorrect: true }, { word: "cake", emoji: "\u{1F382}", isCorrect: false }], fullSentence: "The snow is very cold." },
  { prefix: "I love to eat", suffix: "for breakfast.", hint: "Yellow and sweet fruit", options: [{ word: "banana", emoji: "\u{1F34C}", isCorrect: true }, { word: "car", emoji: "\u{1F697}", isCorrect: false }, { word: "rock", emoji: "\u{1FAA8}", isCorrect: false }], fullSentence: "I love to eat banana for breakfast." },
  { prefix: "The", suffix: "roars very loudly.", hint: "King of the jungle", options: [{ word: "duck", emoji: "\u{1F986}", isCorrect: false }, { word: "butterfly", emoji: "\u{1F98B}", isCorrect: false }, { word: "lion", emoji: "\u{1F981}", isCorrect: true }], fullSentence: "The lion roars very loudly." },
  { prefix: "We play in the", suffix: "after school.", hint: "Swings and slides", options: [{ word: "park", emoji: "\u{1F3DE}\uFE0F", isCorrect: true }, { word: "moon", emoji: "\u{1F319}", isCorrect: false }, { word: "ocean", emoji: "\u{1F30A}", isCorrect: false }], fullSentence: "We play in the park after school." },
  { prefix: "It rains and I use my", suffix: "to stay dry.", hint: "Hold it above your head", options: [{ word: "sandwich", emoji: "\u{1F96A}", isCorrect: false }, { word: "umbrella", emoji: "\u2602\uFE0F", isCorrect: true }, { word: "window", emoji: "\u{1FA9F}", isCorrect: false }], fullSentence: "It rains and I use my umbrella to stay dry." },
  { prefix: "My favourite colour is", suffix: "like the sky.", hint: "Clear sky colour", options: [{ word: "blue", emoji: "\u{1F499}", isCorrect: true }, { word: "loud", emoji: "\u{1F4E3}", isCorrect: false }, { word: "fast", emoji: "\u{1F4A8}", isCorrect: false }], fullSentence: "My favourite colour is blue like the sky." },
];
const TOTAL = challenges.length;

export default function SentenceBuilder() {
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [done, setDone] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const current = challenges[idx] ?? null;
  const progress = idx / TOTAL;

  const handleStart = () => setStarted(true);

  const handleSelect = (option: WordOption) => {
    if (selectedWord) return;
    setSelectedWord(option.word);
    if (option.isCorrect) {
      setIsCorrect(true);
      setWrongAttempts(0);
      setTimeout(() => setShowCelebration(true), 600);
    } else {
      setIsCorrect(false);
      setWrongAttempts((p) => p + 1);
      setTimeout(() => { setSelectedWord(null); setIsCorrect(null); }, 800);
    }
  };

  const handleNext = () => {
    if (idx + 1 >= TOTAL) { setDone(true); return; }
    setIdx((i) => i + 1);
    setSelectedWord(null);
    setIsCorrect(null);
    setShowCelebration(false);
    setWrongAttempts(0);
  };

  if (!started) return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-8xl">&#x1F4D6;</div>
      <h2 className="text-3xl font-extrabold text-center text-amber-500">Sentence Builder!</h2>
      <p className="text-gray-500 text-center text-lg max-w-xs">Pick the right word to complete each sentence!</p>
      <button onClick={handleStart} className="px-10 py-5 rounded-3xl bg-amber-400 text-white font-extrabold text-2xl shadow-xl border-none cursor-pointer">Build It!</button>
    </div>
  );

  if (done) return (
    <div className="h-full flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-8xl">&#x1F4DA;</div>
      <h2 className="text-3xl font-extrabold text-center text-amber-500">Sentence Superstar!</h2>
      <p className="text-gray-500 text-center">You built {TOTAL} perfect sentences!</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col items-center gap-4 p-4 overflow-hidden">
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Sentence {idx + 1} of {TOTAL}</span><span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg, #FBBF24, #FB923C)", transition: "width 0.4s" }} />
        </div>
      </div>
      {current && !showCelebration && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 w-full shadow-lg">
            <p className="text-gray-500 text-xs mb-2 text-center uppercase tracking-wide">Complete the sentence:</p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xl font-bold leading-relaxed text-center">
              <span className="text-gray-700">{current.prefix}</span>
              {selectedWord && isCorrect
                ? <span className="px-3 py-1 rounded-lg bg-green-400 text-white">{selectedWord}</span>
                : <span className="px-4 py-1 rounded-lg bg-amber-200 border-2 border-dashed border-amber-400 text-amber-600 min-w-[80px] text-center">
                    {selectedWord && !isCorrect ? <span className="text-red-400">{selectedWord}</span> : "___?"}
                  </span>}
              <span className="text-gray-700">{current.suffix}</span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <p className="text-blue-500 text-sm font-medium text-center">Hint: {current.hint}</p>
          </div>
          {wrongAttempts >= 2 && <p className="text-orange-400 text-sm text-center font-medium">Keep trying! Look at the hint!</p>}
          <div className="flex gap-4 justify-center flex-wrap">
            {current.options.map((o) => (
              <button key={o.word} onClick={() => handleSelect(o)} disabled={!!(selectedWord && isCorrect)}
                className={`flex flex-col items-center gap-1 w-24 py-4 rounded-2xl font-bold text-lg shadow-lg border-2 cursor-pointer ${
                  selectedWord === o.word && isCorrect ? "bg-green-400 text-white border-green-400" : "bg-white text-gray-700 border-gray-200"
                }`}>
                {o.emoji && <span className="text-4xl">{o.emoji}</span>}
                <span>{o.word}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {current && showCelebration && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 w-full text-center shadow-lg">
            <p className="text-green-600 font-extrabold text-xl">&quot;{current.fullSentence}&quot;</p>
          </div>
          <button onClick={handleNext} className="px-10 py-5 rounded-3xl bg-teal-400 text-white font-extrabold text-xl shadow-xl border-none cursor-pointer">
            {idx + 1 >= TOTAL ? "Finish!" : "Next Sentence"}
          </button>
        </div>
      )}
    </div>
  );
}
