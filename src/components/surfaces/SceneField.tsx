'use client';

/**
 * SceneField (Γ Scene) - a calm, familiar backdrop with a handful of big,
 * tappable word hotspots floating over it. Few, large targets: the opposite of
 * a dense grid, for children who scan a picture rather than a table.
 *
 * The hotspots are real Supercore words (SCENE_HOTSPOTS -> sceneHotspotWords),
 * positioned as percentages so they reflow with the container at any size. Every
 * tap routes through the shared pipeline (useCoreSurface.tapWord): speak, append
 * to the shared sentence strip, log. Nothing here mutates vocabulary.
 *
 * Chrome (the scene gradient) uses sky-blue -> meadow-green, well clear of the
 * banned 270-350 hue band. The word cards keep their Fitzgerald Key colours,
 * which are the exempt AAC standard.
 */

import { SharedSentenceBar } from '@/components/SharedSentenceBar';
import { TapCard } from '@/components/TapCard';
import {
  ARASAAC_IMG,
  FITZGERALD_CLASSES,
  sceneHotspotWords,
} from '@/lib/core-vocab';
import { useCoreSurface } from './useCoreSurface';
import type { SurfaceProps } from './index';

export function SceneField(props: SurfaceProps) {
  const {
    sentence,
    removeWord,
    engineFallback,
    isMagicLoading,
    tapWord,
    handleSpeakAll,
    handleClear,
    handleMagic,
  } = useCoreSurface(props);

  const hotspots = sceneHotspotWords();

  return (
    <div
      className="flex flex-col font-sans"
      style={{ height: 'calc(100dvh - 72px - env(safe-area-inset-bottom, 0px))' }}
    >
      <SharedSentenceBar
        words={sentence}
        onSpeak={handleSpeakAll}
        onMagic={handleMagic}
        isMagicLoading={isMagicLoading}
        onClear={handleClear}
        onRemoveWord={removeWord}
        engineFallback={engineFallback}
      />

      {/* Scene backdrop - sky to meadow. Hotspots float over it. */}
      <div
        className="relative flex-1 min-h-0 overflow-hidden mx-2 my-2 rounded-2xl"
        style={{
          background:
            'linear-gradient(180deg, #BEE3F8 0%, #DCF0FF 42%, #CDEFD3 70%, #A7DDB0 100%)',
        }}
        role="group"
        aria-label="Scene word board"
      >
        {/* Soft sun + horizon accents - decorative only. */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 84, height: 84, top: '8%', left: '78%', background: '#FFE29A', opacity: 0.85 }}
          aria-hidden="true"
        />
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: '66%', height: 2, background: 'rgba(56,142,60,0.25)' }}
          aria-hidden="true"
        />

        {hotspots.map(({ word, x, y }) => {
          const cls = FITZGERALD_CLASSES[word.category];
          return (
            <div
              key={word.id}
              className="absolute"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <TapCard
                onTap={() => tapWord(word)}
                ariaLabel={word.label}
                className={`flex flex-col items-center justify-center rounded-2xl border-[3px] shadow-md px-1.5 py-1 ${cls.bg} ${cls.text} ${cls.border}`}
                style={{ width: 84, minHeight: 84 }}
              >
                {word.arasaacId && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={ARASAAC_IMG(word.arasaacId)}
                    alt=""
                    width={44}
                    height={44}
                    style={{ width: 44, height: 44 }}
                    className="object-contain pointer-events-none"
                    loading="lazy"
                  />
                )}
                <span className="font-bold text-[13px] leading-none mt-0.5 line-clamp-1">
                  {word.label}
                </span>
              </TapCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SceneField;
