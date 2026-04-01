"use client";

import { useState } from "react";

const animals = [
  { name: "Dog", sound: "Woof woof!", emoji: "\u{1F415}", color: "#E8A87C" },
  { name: "Cat", sound: "Meow!", emoji: "\u{1F431}", color: "#FFB347" },
  { name: "Cow", sound: "Moo!", emoji: "\u{1F404}", color: "#C8A87A" },
  { name: "Duck", sound: "Quack quack!", emoji: "\u{1F986}", color: "#FFD700" },
  { name: "Pig", sound: "Oink oink!", emoji: "\u{1F437}", color: "#FFB6C1" },
  { name: "Sheep", sound: "Baa baa!", emoji: "\u{1F411}", color: "#D4C5A0" },
  { name: "Frog", sound: "Ribbit!", emoji: "\u{1F438}", color: "#5DBB63" },
  { name: "Lion", sound: "Roar!", emoji: "\u{1F981}", color: "#DAA520" },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function AnimalSounds() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"learn" | "quiz">("learn");
  const [options, setOptions] = useState<typeof animals>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const animal = animals[index];
  const done = index >= animals.length;

  const startQuiz = () => {
    const others = shuffle(animals.filter((a) => a.name !== animal.name)).slice(0, 3);
    setOptions(shuffle([animal, ...others]));
    setPhase("quiz");
    setPicked(null);
  };

  const answer = (name: string) => {
    if (picked) return;
    setPicked(name);
    if (name === animal.name) {
      setScore((s) => s + 1);
      setTimeout(() => { setIndex((i) => i + 1); setPhase("learn"); setPicked(null); }, 1200);
    } else {
      setTimeout(() => setPicked(null), 800);
    }
  };

  if (done) {
    return (
      <div className="text-center p-8">
        <div className="text-6xl">&#x1F3C6;</div>
        <h2 className="text-[28px] font-extrabold text-[#E8610A] mt-4 mb-2">
          All Done! {score}/{animals.length}
        </h2>
        <p className="text-gray-500">You learned all the animal sounds!</p>
        <button onClick={() => { setIndex(0); setScore(0); setPhase("learn"); }}
          className="mt-4 px-8 py-3 rounded-2xl border-none bg-[#E8610A] text-white font-bold text-lg cursor-pointer">
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="text-center p-6">
      <div className="text-xs text-gray-400 mb-2">{index + 1} / {animals.length}</div>
      <div className="h-1.5 bg-gray-200 rounded-sm mb-5">
        <div className="h-1.5 rounded-sm bg-gradient-to-r from-[#E8610A] to-[#FFB347] transition-[width] duration-300" style={{ width: `${(index / animals.length) * 100}%` }} />
      </div>

      {phase === "learn" ? (
        <>
          <div className="text-[80px] mb-2">{animal.emoji}</div>
          <h3 className="text-[32px] font-extrabold mb-1" style={{ color: animal.color }}>{animal.name}</h3>
          <div className="inline-block px-5 py-2 rounded-2xl text-xl font-bold text-gray-600 mb-4" style={{ border: `2px solid ${animal.color}`, background: `${animal.color}15` }}>
            &ldquo;{animal.sound}&rdquo;
          </div>
          <br />
          <button onClick={() => { try { speechSynthesis.speak(new SpeechSynthesisUtterance(`The ${animal.name} says ${animal.sound}`)); } catch {} }}
            className="px-6 py-2.5 rounded-[14px] border-none text-white font-bold text-base cursor-pointer mr-2" style={{ background: animal.color }}>
            Hear It
          </button>
          <button onClick={startQuiz}
            className="px-6 py-2.5 rounded-[14px] border-none bg-[#4ECDC4] text-white font-bold text-base cursor-pointer">
            Quiz Me!
          </button>
        </>
      ) : (
        <>
          <div className="inline-block px-5 py-3 rounded-2xl bg-[#FFF8E1] border-2 border-[#FFD54F] mb-4">
            <span className="font-extrabold text-[#F57F17] text-lg">Which animal says &ldquo;{animal.sound}&rdquo;?</span>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-[280px] mx-auto">
            {options.map((o) => {
              const isThis = picked === o.name;
              const right = isThis && o.name === animal.name;
              const wrong = isThis && o.name !== animal.name;
              return (
                <button key={o.name} onClick={() => answer(o.name)}
                  className="p-4 rounded-2xl cursor-pointer text-center transition-all duration-150"
                  style={{
                    border: right ? "3px solid #4CAF50" : wrong ? "3px solid #EF5350" : "2px solid #ddd",
                    background: right ? "#C8E6C9" : wrong ? "#FFCDD2" : "#fff",
                  }}>
                  <div className="text-[40px]">{o.emoji}</div>
                  <div className="font-bold text-sm mt-1">{o.name}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
