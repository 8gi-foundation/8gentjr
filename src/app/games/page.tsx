"use client";

import { useState } from "react";
import GameCard from "@/components/games/GameCard";
import AnimalSounds from "@/components/games/speech/AnimalSounds";
import WordRepeat from "@/components/games/speech/WordRepeat";
import RhymeTime from "@/components/games/speech/RhymeTime";
import FeelingsExplorer from "@/components/games/speech/FeelingsExplorer";

type Category = "speech" | "maths" | "music";
type GameId = "animal-sounds" | "word-repeat" | "rhyme-time" | "feelings";

const categories: { id: Category; label: string; emoji: string }[] = [
  { id: "speech", label: "Speech", emoji: "\u{1F5E3}\uFE0F" },
  { id: "maths", label: "Maths", emoji: "\u{1F522}" },
  { id: "music", label: "Music", emoji: "\u{1F3B5}" },
];

const games: { id: GameId; category: Category; emoji: string; title: string; description: string; color: string }[] = [
  { id: "animal-sounds", category: "speech", emoji: "\u{1F43E}", title: "Animal Sounds", description: "Match animals to their sounds!", color: "#E8A87C" },
  { id: "word-repeat", category: "speech", emoji: "\u{1F3A4}", title: "Word Repeat", description: "Hear a word and say it 3 times!", color: "#9B59B6" },
  { id: "rhyme-time", category: "speech", emoji: "\u{1F3B5}", title: "Rhyme Time", description: "Find the words that rhyme!", color: "#6C5CE7" },
  { id: "feelings", category: "speech", emoji: "\u{1F60A}", title: "Feelings Explorer", description: "Learn about emotions and feelings!", color: "#FFD93D" },
];

const gameComponents: Record<GameId, React.ComponentType> = {
  "animal-sounds": AnimalSounds,
  "word-repeat": WordRepeat,
  "rhyme-time": RhymeTime,
  "feelings": FeelingsExplorer,
};

export default function GamesPage() {
  const [tab, setTab] = useState<Category>("speech");
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  if (activeGame) {
    const GameComponent = gameComponents[activeGame];
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <div className="flex items-center px-4 py-3 border-b border-[#F0DECA]">
          <button onClick={() => setActiveGame(null)}
            className="border-none bg-transparent text-xl cursor-pointer px-2 py-1 text-[#E8610A] font-bold">
            &larr; Back
          </button>
          <span className="font-bold text-base text-gray-800 ml-2">
            {games.find((g) => g.id === activeGame)?.title}
          </span>
        </div>
        <GameComponent />
      </div>
    );
  }

  const filtered = games.filter((g) => g.category === tab);

  return (
    <div className="min-h-screen bg-[#FFF8F0] px-4 pt-6 pb-24">
      <h1 className="text-[32px] font-extrabold text-[#E8610A] text-center mb-1">
        SchoolTube Games
      </h1>
      <p className="text-center text-gray-400 text-sm mb-5">Learn through play!</p>

      {/* Category tabs */}
      <div className="flex justify-center gap-2 mb-6">
        {categories.map((c) => (
          <button key={c.id} onClick={() => setTab(c.id)}
            className={`px-5 py-2 rounded-[20px] border-none font-bold text-sm cursor-pointer transition-all duration-150 ${
              tab === c.id
                ? "bg-[#E8610A] text-white"
                : "bg-[#F0DECA] text-gray-400"
            }`}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Game grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3.5 max-w-[400px] mx-auto">
          {filtered.map((g) => (
            <GameCard key={g.id} emoji={g.emoji} title={g.title} description={g.description} color={g.color}
              onClick={() => setActiveGame(g.id)} />
          ))}
        </div>
      ) : (
        <div className="text-center px-4 py-12 text-gray-300">
          <div className="text-5xl mb-2">&#x1F6A7;</div>
          <p className="font-semibold">Coming soon!</p>
        </div>
      )}
    </div>
  );
}
