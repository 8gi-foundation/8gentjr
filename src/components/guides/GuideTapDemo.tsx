'use client';

/**
 * GuideTapDemo - small mini-grid of TapCards for /guides/talk walkthrough.
 *
 * Each tap calls real /api/tts via speak(). Words are preloaded on mount so
 * the first tap returns audio instantly. No global sentence state is touched.
 */

import { useCallback, useEffect } from 'react';
import { TapCard } from '@/components/TapCard';
import { speak, preloadAudio } from '@/lib/tts';

export interface GuideTapDemoProps {
  words: string[];
  /** Tailwind grid columns. Defaults to 4. */
  cols?: number;
}

// Safe Fitzgerald-inspired tones for the demo grid - no banned hues (270-350).
const DEMO_TONES = [
  'bg-yellow-100 border-yellow-400 text-yellow-900',
  'bg-sky-100 border-sky-400 text-sky-900',
  'bg-emerald-100 border-emerald-500 text-emerald-900',
  'bg-orange-100 border-orange-400 text-orange-900',
];

export function GuideTapDemo({ words, cols = 4 }: GuideTapDemoProps) {
  useEffect(() => {
    preloadAudio(words);
  }, [words]);

  const handleTap = useCallback((word: string) => {
    void speak({ text: word });
  }, []);

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      role="group"
      aria-label="Word card demo"
    >
      {words.map((word, i) => (
        <TapCard
          key={word}
          onTap={() => handleTap(word)}
          ariaLabel={`Tap to hear ${word}`}
          className={`rounded-2xl border-2 px-2 py-4 text-center font-bold text-base shadow-sm ${DEMO_TONES[i % DEMO_TONES.length]}`}
        >
          {word}
        </TapCard>
      ))}
    </div>
  );
}

export default GuideTapDemo;
