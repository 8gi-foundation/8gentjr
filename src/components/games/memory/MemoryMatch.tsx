"use client";

import { useState, useEffect, useRef } from "react";

const EMOJIS = ["\u{1F436}", "\u{1F431}", "\u{1F42D}", "\u{1F430}", "\u{1F43B}", "\u{1F43C}", "\u{1F428}", "\u{1F981}"];
const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#DDA0DD", "#95E1D3", "#FFB347", "#87CEEB", "#FFB6C1"];

type Card = { id: number; emoji: string; color: string; flipped: boolean; matched: boolean };

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

export default function MemoryMatch() {
  const [phase, setPhase] = useState<"start" | "play" | "done">("start");
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const lockRef = useRef(false);

  const initCards = () => {
    const pairs = EMOJIS.slice(0, 6);
    const deck: Card[] = shuffle(
      pairs.flatMap((emoji, i) => [
        { id: i * 2, emoji, color: COLORS[i], flipped: false, matched: false },
        { id: i * 2 + 1, emoji, color: COLORS[i], flipped: false, matched: false },
      ])
    );
    setCards(deck);
    setFlippedIds([]);
    setMoves(0);
    setMatches(0);
    lockRef.current = false;
  };

  const handleStart = () => { setPhase("play"); initCards(); };

  const handleFlip = (id: number) => {
    if (lockRef.current) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);
    setCards((prev) => prev.map((c) => c.id === id ? { ...c, flipped: true } : c));

    if (newFlipped.length === 2) {
      lockRef.current = true;
      setMoves((m) => m + 1);
      const [first, second] = newFlipped;
      const c1 = cards.find((c) => c.id === first)!;
      const c2 = cards.find((c) => c.id === id)!;

      if (c1.emoji === c2.emoji) {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => c.emoji === c1.emoji ? { ...c, matched: true } : c));
          setFlippedIds([]);
          const newMatches = matches + 1;
          setMatches(newMatches);
          lockRef.current = false;
          if (newMatches >= 6) setTimeout(() => setPhase("done"), 600);
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => newFlipped.includes(c.id) ? { ...c, flipped: false } : c));
          setFlippedIds([]);
          lockRef.current = false;
        }, 800);
      }
    }
  };

  if (phase === "start") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-7xl">&#x1F0CF;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#4ECDC4" }}>Memory Match!</h2>
      <p className="text-lg text-center text-gray-600 max-w-xs">Find all the matching pairs by flipping cards!</p>
      <button onClick={handleStart} className="px-10 py-5 bg-[#4ECDC4] text-white text-2xl font-bold rounded-3xl shadow-xl border-none cursor-pointer">Play!</button>
    </div>
  );

  if (phase === "done") return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
      <div className="text-8xl">&#x1F3C6;</div>
      <h2 className="text-3xl font-bold text-center" style={{ color: "#4ECDC4" }}>All Matched!</h2>
      <p className="text-xl text-center text-gray-700">You found all pairs in <span className="font-bold text-2xl" style={{ color: "#FF6B6B" }}>{moves}</span> moves!</p>
      <button onClick={handleStart} className="px-8 py-3 rounded-2xl border-none bg-[#4ECDC4] text-white font-bold text-lg cursor-pointer">Play Again</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-4 p-3">
      <div className="flex justify-between items-center">
        <span className="font-bold text-gray-600">Moves: {moves}</span>
        <span className="font-bold text-gray-600">Matches: {matches}/6</span>
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-[320px] mx-auto flex-1 content-center">
        {cards.map((card) => (
          <button key={card.id} onClick={() => handleFlip(card.id)}
            className="aspect-square rounded-2xl shadow-lg border-none cursor-pointer flex items-center justify-center text-4xl font-bold transition-all duration-300"
            style={{
              backgroundColor: card.flipped || card.matched ? card.color : "#E5E7EB",
              transform: card.flipped || card.matched ? "rotateY(0deg)" : "rotateY(0deg)",
              opacity: card.matched ? 0.6 : 1,
            }}>
            {card.flipped || card.matched ? card.emoji : "?"}
          </button>
        ))}
      </div>
    </div>
  );
}
