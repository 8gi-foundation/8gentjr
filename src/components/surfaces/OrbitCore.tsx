'use client';

/**
 * OrbitCore (Ζ Orbit Core) - the 8gent jr signature shape. A central speak orb
 * sits at the middle of a ring of category satellites. Tapping a satellite
 * reveals that category's words held close to the centre, in a compact cluster
 * over the orb. Tapping the orb (with words in the strip) speaks the sentence.
 *
 * Same vocabulary (Supercore 50 grouped by the existing Fitzgerald categories)
 * and the same speak/sentence pipeline (useCoreSurface). Selecting a satellite
 * is presentation-only - it never mutates vocabulary, categories, personal words
 * or phrase folders.
 *
 * Chrome (ring guide, centre orb) uses emerald/teal/slate - clear of the banned
 * 270-350 hue band. Satellites and word cards keep the exempt Fitzgerald colours.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { SharedSentenceBar } from '@/components/SharedSentenceBar';
import { TapCard } from '@/components/TapCard';
import {
  CORE_CATEGORY_ORDER,
  FITZGERALD_CLASSES,
  wordsInCategory,
  type FitzgeraldCategory,
} from '@/lib/core-vocab';
import { SurfaceWordCard } from './SurfaceWordCard';
import { useCoreSurface } from './useCoreSurface';
import type { SurfaceProps } from './index';

export function OrbitCore(props: SurfaceProps) {
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

  const [selected, setSelected] = useState<FitzgeraldCategory | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const satellites = CORE_CATEGORY_ORDER;
  const cx = size.w / 2;
  const cy = size.h / 2;
  const ringRadius = Math.max(0, Math.min(size.w, size.h) / 2 - 52);

  const selectedWords = useMemo(
    () => (selected ? wordsInCategory(selected) : []),
    [selected],
  );

  return (
    <div
      className="flex flex-col font-sans bg-slate-50"
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

      <div
        ref={fieldRef}
        className="relative flex-1 min-h-0 overflow-hidden"
        role="group"
        aria-label="Orbit word core"
      >
        {/* Ring guide - decorative. */}
        {ringRadius > 0 && (
          <div
            className="absolute rounded-full border-2 border-dashed pointer-events-none"
            style={{
              width: ringRadius * 2,
              height: ringRadius * 2,
              left: cx,
              top: cy,
              transform: 'translate(-50%, -50%)',
              borderColor: 'rgba(15,118,110,0.25)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Category satellites on the ring. */}
        {size.w > 0 &&
          satellites.map((s, i) => {
            const angle = (-90 + (360 / satellites.length) * i) * (Math.PI / 180);
            const x = cx + ringRadius * Math.cos(angle);
            const y = cy + ringRadius * Math.sin(angle);
            const cls = FITZGERALD_CLASSES[s.category];
            const active = selected === s.category;
            return (
              <div
                key={s.category}
                className="absolute"
                style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
              >
                <TapCard
                  onTap={() => setSelected(active ? null : s.category)}
                  ariaLabel={`${active ? 'Hide' : 'Show'} ${s.label} words`}
                  className={`flex items-center justify-center rounded-full border-[3px] font-bold text-[12px] text-center leading-tight shadow-md px-1 ${cls.bg} ${cls.text} ${cls.border} ${
                    active ? 'ring-2 ring-offset-2 ring-emerald-500' : ''
                  }`}
                  style={{ width: 72, height: 72 }}
                >
                  <span className="line-clamp-2">{s.label}</span>
                </TapCard>
              </div>
            );
          })}

        {/* Centre: speak orb when nothing selected, else the word cluster. */}
        <div
          className="absolute"
          style={{ left: cx, top: cy, transform: 'translate(-50%, -50%)' }}
        >
          {selected === null ? (
            <TapCard
              onTap={handleSpeakAll}
              ariaLabel="Speak sentence"
              className="flex flex-col items-center justify-center rounded-full bg-emerald-500 text-white border-4 border-emerald-600 shadow-lg"
              style={{ width: 108, height: 108 }}
            >
              <span className="text-3xl leading-none">&#9654;</span>
              <span className="text-[12px] font-bold mt-1">Speak</span>
            </TapCard>
          ) : (
            <div
              className="bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-2 w-[min(78vw,320px)] max-h-[60vh] overflow-y-auto"
              role="group"
              aria-label={`${satellites.find((s) => s.category === selected)?.label} words`}
            >
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">
                  {satellites.find((s) => s.category === selected)?.label}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close category"
                  className="w-9 h-9 shrink-0 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center cursor-pointer active:scale-90"
                >
                  &#10005;
                </button>
              </div>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}
              >
                {selectedWords.map((w) => (
                  <SurfaceWordCard key={w.id} word={w} onTap={tapWord} size="small" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrbitCore;
