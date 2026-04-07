'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import { speak } from '@/lib/tts';
import type { VisualScene, Hotspot } from '@/lib/vsd/types';
import { DEFAULT_SCENES } from '@/lib/vsd/scenes';

/**
 * Visual Scene Display — scene-based vocabulary.
 * Tap hotspots on scene images to hear gestalt phrases.
 * CSS-only (no Framer Motion).
 */

const SCENE_GRADIENTS: Record<string, string> = {
  kitchen: 'from-amber-200 via-orange-100 to-yellow-50',
  playground: 'from-sky-300 via-green-200 to-emerald-100',
  bedroom: 'from-indigo-200 via-purple-100 to-blue-50',
  school: 'from-yellow-200 via-amber-100 to-orange-50',
  park: 'from-green-300 via-lime-200 to-emerald-100',
};

const SCENE_ICONS: Record<string, string> = {
  kitchen: '🍳',
  playground: '🛝',
  bedroom: '🛏️',
  school: '🏫',
  park: '🌳',
};

export default function VSDPage() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenes = DEFAULT_SCENES;
  const scene = scenes[activeIndex];

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleHotspotTap = useCallback(async (hotspot: Hotspot) => {
    setActiveHotspot(hotspot.id);

    if (hotspot.audioUrl) {
      try {
        const audio = new Audio(hotspot.audioUrl);
        audio.onended = () => {
          timeoutRef.current = setTimeout(() => setActiveHotspot(null), 400);
        };
        await audio.play();
        return;
      } catch { /* fall through to TTS */ }
    }

    await speak({ text: hotspot.phrase });
    timeoutRef.current = setTimeout(() => setActiveHotspot(null), 400);
  }, []);

  const goNext = useCallback(() => {
    setActiveHotspot(null);
    setActiveIndex((i) => (i + 1) % scenes.length);
  }, [scenes.length]);

  const goPrev = useCallback(() => {
    setActiveHotspot(null);
    setActiveIndex((i) => (i - 1 + scenes.length) % scenes.length);
  }, [scenes.length]);

  const hasImage = imgLoaded[scene.id] === true;
  const gradient = SCENE_GRADIENTS[scene.id] ?? 'from-slate-300 via-slate-200 to-slate-100';

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1 text-white/80 hover:text-white active:scale-95 transition-transform"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-lg font-medium">Back</span>
        </button>

        <h1 className="text-white text-xl font-bold flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          {scene.title}
        </h1>

        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="p-2 text-white/60 hover:text-white active:scale-90 transition-transform" aria-label="Previous scene">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-white/40 text-sm font-medium tabular-nums">
            {activeIndex + 1}/{scenes.length}
          </span>
          <button onClick={goNext} className="p-2 text-white/60 hover:text-white active:scale-90 transition-transform" aria-label="Next scene">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scene Area */}
      <div className="flex-1 px-4 pb-2">
        <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl min-h-[300px]">
          {/* Background */}
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={scene.imageUrl} alt={scene.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <span className="text-[120px]">{SCENE_ICONS[scene.id] ?? '📷'}</span>
              </div>
            </div>
          )}

          {/* Hidden img to detect load */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={scene.imageUrl}
            alt=""
            className="hidden"
            onLoad={() => setImgLoaded((prev) => ({ ...prev, [scene.id]: true }))}
            onError={() => setImgLoaded((prev) => ({ ...prev, [scene.id]: false }))}
          />

          {/* Hotspots */}
          {scene.hotspots.map((hotspot) => {
            const isActive = activeHotspot === hotspot.id;
            return (
              <button
                key={hotspot.id}
                onClick={() => handleHotspotTap(hotspot)}
                className={`
                  absolute rounded-2xl border-4 transition-all
                  flex items-center justify-center
                  focus:outline-none focus-visible:ring-4 focus-visible:ring-white
                  ${isActive
                    ? 'border-white bg-black/20 shadow-lg shadow-black/20'
                    : 'border-white/70 bg-black/10 hover:bg-black/20 hover:border-white'
                  }
                `}
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                }}
                aria-label={hotspot.phrase}
              >
                {isActive && (
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-gray-900 font-bold text-base px-4 py-2 rounded-xl shadow-lg pointer-events-none z-10 animate-fade-in-up">
                    {hotspot.phrase}
                  </div>
                )}
                <span className={`bg-black/65 text-white font-semibold text-sm rounded-xl px-2.5 py-1 text-center leading-tight select-none pointer-events-none backdrop-blur-sm ${isActive ? 'opacity-0' : 'opacity-100'}`}>
                  {hotspot.phrase}
                </span>
              </button>
            );
          })}

          {/* Instruction hint */}
          {activeHotspot === null && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm font-medium px-4 py-2 rounded-full backdrop-blur-sm animate-hint">
              Tap a spot to hear a phrase
            </div>
          )}
        </div>
      </div>

      {/* Scene Picker */}
      <div className="flex items-center gap-3 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>
        {scenes.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setActiveHotspot(null); setActiveIndex(i); }}
            className={`
              flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-base transition-colors active:scale-95
              ${i === activeIndex ? 'bg-white text-gray-900 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}
            `}
          >
            <span className="text-xl">{SCENE_ICONS[s.id] ?? '📷'}</span>
            {s.title}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 6px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes hint { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-up { animation: fadeInUp 0.2s ease-out forwards; }
        .animate-hint { animation: hint 0.5s ease-out 1.5s both; }
      `}</style>
    </div>
  );
}
