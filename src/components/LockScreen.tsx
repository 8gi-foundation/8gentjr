'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Lock Screen — tap-to-unlock overlay.
 * Simplified port from NickOS (no Framer Motion, CSS transitions only).
 */

interface LockScreenProps {
  onUnlock: () => void;
  childName?: string;
}

export function LockScreen({ onUnlock, childName = 'Friend' }: LockScreenProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unlocking, setUnlocking] = useState(false);
  const hasUnlockedRef = useRef(false);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleUnlock = useCallback(() => {
    if (hasUnlockedRef.current) return;
    hasUnlockedRef.current = true;
    setUnlocking(true);
    setTimeout(onUnlock, 350);
  }, [onUnlock]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        handleUnlock();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUnlock]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div
      className={`
        fixed inset-0 z-[60] flex flex-col items-center justify-between
        bg-gradient-to-b from-blue-600 via-teal-500 to-green-500
        overflow-hidden cursor-pointer select-none
        transition-all duration-300
        ${unlocking ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
      `}
      onClick={handleUnlock}
      onTouchEnd={handleUnlock}
      tabIndex={0}
      role="button"
      aria-label="Tap anywhere to unlock"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/10 animate-float" />
        <div className="absolute bottom-40 right-10 w-24 h-24 rounded-full bg-white/10 animate-float-delayed" />
      </div>

      {/* Top — Time */}
      <div className="flex flex-col items-center pt-16 sm:pt-24 animate-fade-in">
        <div className="text-white/80 text-lg sm:text-xl font-medium">
          {formatDate(currentTime)}
        </div>
        <div className="text-white text-6xl sm:text-8xl font-bold mt-2">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Center — Avatar/Greeting */}
      <div className="flex flex-col items-center animate-fade-in">
        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/20 border-4 border-white/30 shadow-2xl flex items-center justify-center">
          <span className="text-6xl">👋</span>
        </div>
        <h1 className="text-white text-3xl sm:text-4xl font-bold mt-4">
          Hi {childName}!
        </h1>
        <p className="text-white/70 text-lg mt-2">Ready to talk?</p>
      </div>

      {/* Bottom — Hint */}
      <div className="pb-12 sm:pb-16 flex flex-col items-center">
        <div className="animate-bounce-slow">
          <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          <svg className="w-8 h-8 text-white/60 -mt-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </div>
        <p className="text-white/80 text-xl font-medium mt-2">
          Tap anywhere to start
        </p>
      </div>

      {/* Drag handle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/30 rounded-full" />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes floatDelayed {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(20px) translateX(-10px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: floatDelayed 5s ease-in-out infinite; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-bounce-slow { animation: bounceSlow 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
