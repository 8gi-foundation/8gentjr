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
      <div style={{ minHeight: "100vh", background: "#FFF8F0" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #F0DECA" }}>
          <button onClick={() => setActiveGame(null)}
            style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", padding: "4px 8px", color: "#E8610A", fontWeight: 700 }}>
            &larr; Back
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#333", marginLeft: 8 }}>
            {games.find((g) => g.id === activeGame)?.title}
          </span>
        </div>
        <GameComponent />
      </div>
    );
  }

  const filtered = games.filter((g) => g.category === tab);

  return (
    <div style={{ minHeight: "100vh", background: "#FFF8F0", padding: "24px 16px 100px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, color: "#E8610A", textAlign: "center", margin: "0 0 4px" }}>
        SchoolTube Games
      </h1>
      <p style={{ textAlign: "center", color: "#888", fontSize: 14, margin: "0 0 20px" }}>Learn through play!</p>

      {/* Category tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setTab(c.id)}
            style={{
              padding: "8px 20px", borderRadius: 20, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
              background: tab === c.id ? "#E8610A" : "#F0DECA",
              color: tab === c.id ? "#fff" : "#888",
              transition: "all 0.15s",
            }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Game grid */}
      {filtered.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 400, margin: "0 auto" }}>
          {filtered.map((g) => (
            <GameCard key={g.id} emoji={g.emoji} title={g.title} description={g.description} color={g.color}
              onClick={() => setActiveGame(g.id)} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 16px", color: "#bbb" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>&#x1F6A7;</div>
          <p style={{ fontWeight: 600 }}>Coming soon!</p>
        </div>
      )}
    </div>
  );
}
