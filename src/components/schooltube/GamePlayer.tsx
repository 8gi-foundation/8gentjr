"use client";

/**
 * GamePlayer — fullscreen game dialog for SchoolTube.
 * Renders the selected game component with score tracking and completion celebration.
 * Ported from NickOS — maps to existing game components in 8gent Jr.
 */

import { useState, useEffect, useRef } from "react";
import type { Reel } from "@/lib/reels-data";

// Import existing game components from the 8gentjr codebase
import AnimalSounds from "@/components/games/speech/AnimalSounds";
import WordRepeat from "@/components/games/speech/WordRepeat";
import RhymeTime from "@/components/games/speech/RhymeTime";
import FeelingsExplorer from "@/components/games/speech/FeelingsExplorer";

interface GamePlayerProps {
  reel: Reel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Map gameType strings to available game components */
const AVAILABLE_GAMES: Record<string, React.ComponentType> = {
  animalSounds: AnimalSounds,
  wordRepeat: WordRepeat,
  rhymeTime: RhymeTime,
  feelings: FeelingsExplorer,
};

export default function GamePlayer({
  reel,
  open,
  onOpenChange,
}: GamePlayerProps) {
  const [score, setScore] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
      setScore(0);
      setShowComplete(false);
      setGameKey((k) => k + 1);
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const handleRestart = () => {
    setScore(0);
    setShowComplete(false);
    setGameKey((k) => k + 1);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const GameComponent = AVAILABLE_GAMES[reel.gameType || ""];

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="fixed inset-0 m-0 p-0 w-full h-full max-w-full max-h-full bg-gradient-to-br from-cyan-500 to-teal-600 border-0"
    >
      <div className="relative h-full w-full flex flex-col p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="bg-white rounded-2xl px-4 py-2 shadow-lg">
            <span className="text-xl font-bold text-cyan-600">
              Score: {score}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRestart}
              className="h-12 w-12 rounded-2xl bg-white hover:bg-white/90 shadow-lg flex items-center justify-center"
            >
              <svg
                className="h-5 w-5 text-cyan-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="h-12 w-12 rounded-2xl bg-white hover:bg-white/90 shadow-lg flex items-center justify-center"
            >
              <svg
                className="h-5 w-5 text-cyan-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Game title */}
        <h2 className="text-xl font-bold text-center text-white mb-3 drop-shadow-md">
          {reel.title}
        </h2>

        {/* Game content */}
        <div className="flex-1 bg-white rounded-3xl p-4 shadow-2xl overflow-hidden">
          {GameComponent ? (
            <GameComponent key={gameKey} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400">
              <div className="text-6xl">
                {reel.type === "game" ? "\uD83C\uDFAE" : "\uD83D\uDCFA"}
              </div>
              <p className="text-lg font-semibold">Coming Soon!</p>
              <p className="text-sm">
                This {reel.type} will be available in a future update.
              </p>
              <button
                onClick={handleClose}
                className="mt-4 px-6 py-3 bg-cyan-500 text-white font-bold rounded-2xl hover:bg-cyan-600 transition-colors"
              >
                Go Back
              </button>
            </div>
          )}

          {showComplete && (
            <div className="absolute inset-0 bg-white rounded-3xl flex flex-col items-center justify-center gap-6">
              <div className="text-6xl">
                {"\uD83C\uDF89\uD83C\uDF8A\uD83E\uDD73"}
              </div>
              <h3 className="text-3xl font-bold text-cyan-600">Amazing!</h3>
              <p className="text-xl text-gray-500">
                You scored{" "}
                <span className="font-bold text-cyan-600">{score}</span>{" "}
                points!
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleRestart}
                  className="px-8 py-4 text-lg font-bold rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg"
                >
                  Play Again
                </button>
                <button
                  onClick={handleClose}
                  className="px-8 py-4 text-lg font-bold rounded-2xl border-2 border-cyan-500 text-cyan-500 bg-white shadow-lg"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
