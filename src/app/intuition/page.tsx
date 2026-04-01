'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { speak } from '@/lib/tts';

/**
 * Intuition Game — color card pattern recognition with scoring.
 * Pick which color you "feel" — tracks score, streak, and accuracy.
 * CSS-only (no Framer Motion).
 */

const COLORS = [
  { name: 'red', hex: '#F44336' },
  { name: 'blue', hex: '#2196F3' },
  { name: 'green', hex: '#4CAF50' },
  { name: 'yellow', hex: '#FFC107' },
];

const PRIMARY = '#E8610A';

interface GameState {
  targetColor: number;
  score: number;
  streak: number;
  totalGuesses: number;
  correctGuesses: number;
  lastResult: 'correct' | 'wrong' | null;
  isRevealing: boolean;
}

export default function IntuitionPage() {
  const router = useRouter();
  const [game, setGame] = useState<GameState>({
    targetColor: Math.floor(Math.random() * 4),
    score: 0,
    streak: 0,
    totalGuesses: 0,
    correctGuesses: 0,
    lastResult: null,
    isRevealing: false,
  });
  const [showCelebration, setShowCelebration] = useState(false);

  const pickNewTarget = useCallback(() => {
    setGame((prev) => ({
      ...prev,
      targetColor: Math.floor(Math.random() * 4),
      isRevealing: false,
      lastResult: null,
    }));
  }, []);

  const handleGuess = useCallback(
    (colorIndex: number) => {
      if (game.isRevealing) return;

      const isCorrect = colorIndex === game.targetColor;

      if (navigator.vibrate) {
        navigator.vibrate(isCorrect ? [50, 50, 50] : 100);
      }

      if (isCorrect) {
        const phrases = ['Great job!', 'You got it!', 'Amazing!', 'Correct!'];
        speak({ text: phrases[Math.floor(Math.random() * phrases.length)] });
      }

      setGame((prev) => ({
        ...prev,
        score: isCorrect ? prev.score + 10 * (prev.streak + 1) : prev.score,
        streak: isCorrect ? prev.streak + 1 : 0,
        totalGuesses: prev.totalGuesses + 1,
        correctGuesses: isCorrect ? prev.correctGuesses + 1 : prev.correctGuesses,
        lastResult: isCorrect ? 'correct' : 'wrong',
        isRevealing: true,
      }));

      if (isCorrect && game.streak + 1 >= 3) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 1500);
      }

      setTimeout(pickNewTarget, 1500);
    },
    [game.targetColor, game.streak, game.isRevealing, pickNewTarget],
  );

  const resetGame = useCallback(() => {
    setGame({
      targetColor: Math.floor(Math.random() * 4),
      score: 0,
      streak: 0,
      totalGuesses: 0,
      correctGuesses: 0,
      lastResult: null,
      isRevealing: false,
    });
  }, []);

  const accuracy =
    game.totalGuesses > 0 ? Math.round((game.correctGuesses / game.totalGuesses) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: '#ECEFF1' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative" style={{ backgroundColor: PRIMARY }}>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-0.5 text-white font-medium text-lg"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Home</span>
        </button>

        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-semibold text-xl">
          Intuition
        </span>

        <button onClick={resetGame} className="text-white p-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      {/* Score Bar */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="text-center">
          <div className="text-3xl font-bold" style={{ color: PRIMARY }}>{game.score}</div>
          <div className="text-sm text-gray-500">Score</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-500">{game.streak}🔥</div>
          <div className="text-sm text-gray-500">Streak</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-500">{accuracy}%</div>
          <div className="text-sm text-gray-500">Accuracy</div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Celebration */}
        {showCelebration && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-8xl animate-celebration">🎉</span>
          </div>
        )}

        {/* Instructions */}
        <div className={`text-center mb-8 transition-transform ${game.isRevealing ? 'scale-110' : ''}`}>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            {game.isRevealing
              ? game.lastResult === 'correct'
                ? 'You got it!'
                : `It was ${COLORS[game.targetColor].name}`
              : 'Which color do you feel?'}
          </h2>
          <p className="text-gray-500">Trust your intuition!</p>
        </div>

        {/* Color Cards */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {COLORS.map((color, index) => (
            <button
              key={color.name}
              onClick={() => handleGuess(index)}
              disabled={game.isRevealing}
              className={`
                aspect-square rounded-3xl shadow-lg relative overflow-hidden
                active:scale-95 transition-all
                ${game.isRevealing && index === game.targetColor ? 'ring-4 ring-white scale-105' : ''}
              `}
              style={{ backgroundColor: color.hex }}
            >
              {game.isRevealing && game.lastResult === 'wrong' && index !== game.targetColor && (
                <div className="absolute inset-0 bg-black/30 rounded-3xl" />
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-8 text-center text-gray-500">
          <p>{game.totalGuesses} guesses · {game.correctGuesses} correct</p>
        </div>
      </div>

      <style>{`
        @keyframes celebration {
          0%   { transform: scale(1) rotate(0deg); }
          25%  { transform: scale(1.5) rotate(10deg); }
          50%  { transform: scale(1.5) rotate(-10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .animate-celebration { animation: celebration 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
