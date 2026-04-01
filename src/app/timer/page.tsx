'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { speak } from '@/lib/tts';

/**
 * Bubble Timer — visual countdown with presets (1, 2, 5, 10 min),
 * progress circle, and completion celebration.
 * CSS-only animations (no Framer Motion).
 */

const PRESETS = [
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
];

const PRIMARY = '#E8610A';

interface Bubble {
  id: number;
  x: number;
  size: number;
  duration: number;
}

export default function TimerPage() {
  const router = useRouter();
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(PRESETS[0].seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bubbleId = useRef(0);

  const totalTime = PRESETS[selectedPreset].seconds;

  // Bubbles while running
  useEffect(() => {
    if (!isRunning) return;
    const bi = setInterval(() => {
      setBubbles((prev) => [
        ...prev.slice(-20),
        {
          id: bubbleId.current++,
          x: Math.random() * 80 + 10,
          size: Math.random() * 40 + 20,
          duration: Math.random() * 2 + 3,
        },
      ]);
    }, 500);
    return () => clearInterval(bi);
  }, [isRunning]);

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            speak({ text: 'Time is up!' });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStart = useCallback(() => {
    if (isComplete) {
      setTimeRemaining(totalTime);
      setIsComplete(false);
    }
    setIsRunning(true);
  }, [isComplete, totalTime]);

  const handlePause = useCallback(() => setIsRunning(false), []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsComplete(false);
    setTimeRemaining(totalTime);
    setBubbles([]);
  }, [totalTime]);

  const handlePresetChange = useCallback((i: number) => {
    setSelectedPreset(i);
    setTimeRemaining(PRESETS[i].seconds);
    setIsRunning(false);
    setIsComplete(false);
    setBubbles([]);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = ((totalTime - timeRemaining) / totalTime) * 100;
  const circumference = 2 * Math.PI * 140;

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
          Timer
        </span>
        <div className="w-12" />
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Bubbles */}
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="absolute rounded-full animate-bubble-rise"
            style={{
              left: `${b.x}%`,
              width: b.size,
              height: b.size,
              backgroundColor: `${PRIMARY}40`,
              border: `2px solid ${PRIMARY}60`,
              animationDuration: `${b.duration}s`,
            }}
          />
        ))}

        {/* Progress Circle */}
        <div className="relative w-80 h-80">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 320 320">
            <circle cx="160" cy="160" r="140" fill="none" stroke="#E0E0E0" strokeWidth="16" />
            <circle
              cx="160"
              cy="160"
              r="140"
              fill="none"
              stroke={isComplete ? '#4CAF50' : PRIMARY}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
              className="transition-[stroke-dashoffset] duration-500"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-6xl font-bold transition-transform ${isComplete ? 'scale-110' : ''}`}
              style={{ color: isComplete ? '#4CAF50' : PRIMARY }}
            >
              {formatTime(timeRemaining)}
            </span>
            {isComplete && (
              <span className="text-2xl font-medium text-green-600 mt-2 animate-fade-in-up">
                Done!
              </span>
            )}
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-3 mt-8">
          {PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              onClick={() => handlePresetChange(i)}
              disabled={isRunning}
              className="px-5 py-3 rounded-full text-lg font-medium transition-colors active:scale-95"
              style={{
                backgroundColor: selectedPreset === i ? PRIMARY : 'white',
                color: selectedPreset === i ? 'white' : '#666',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleReset}
            className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center active:scale-90 transition-transform"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>

          <button
            onClick={isRunning ? handlePause : handleStart}
            className="w-24 h-24 rounded-full shadow-xl flex items-center justify-center text-white active:scale-90 transition-transform"
            style={{ backgroundColor: PRIMARY }}
          >
            {isRunning ? (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <div className="w-16 h-16" />
        </div>
      </div>

      <style>{`
        @keyframes bubbleRise {
          from { bottom: -50px; transform: scale(0); }
          to   { bottom: 100%; transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-bubble-rise { animation: bubbleRise linear forwards; bottom: -50px; }
        .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
