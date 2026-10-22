'use client';

/**
 * FlowBoard (Ε Flow Board) - a fluid, auto-reflowing board of word cards with a
 * category filter. The filter is a vertical side-rail on wide screens and
 * collapses to a horizontal bottom bar on narrow phones, so the same board
 * works from phone to desktop. The card area uses an auto-fill grid, so cards
 * flow to fit whatever width is available - no fixed column count.
 *
 * Same vocabulary (Supercore 50, grouped by the existing Fitzgerald categories)
 * and the same speak/sentence pipeline (useCoreSurface). Filtering is
 * presentation-only: it never reorders or mutates the underlying vocabulary.
 */

import { useMemo, useState } from 'react';
import { SharedSentenceBar } from '@/components/SharedSentenceBar';
import { TapCard } from '@/components/TapCard';
import {
  SUPERCORE_50,
  CORE_CATEGORY_ORDER,
  FITZGERALD_CLASSES,
  wordsInCategory,
  type FitzgeraldCategory,
} from '@/lib/core-vocab';
import { SurfaceWordCard } from './SurfaceWordCard';
import { useCoreSurface } from './useCoreSurface';
import type { SurfaceProps } from './index';

type Filter = 'all' | FitzgeraldCategory;

export function FlowBoard(props: SurfaceProps) {
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

  const [filter, setFilter] = useState<Filter>('all');

  const words = useMemo(
    () => (filter === 'all' ? [...SUPERCORE_50] : wordsInCategory(filter)),
    [filter],
  );

  const railItems: { key: Filter; label: string; category?: FitzgeraldCategory }[] = [
    { key: 'all', label: 'All' },
    ...CORE_CATEGORY_ORDER.map((c) => ({ key: c.category as Filter, label: c.label, category: c.category })),
  ];

  const railButton = (item: { key: Filter; label: string; category?: FitzgeraldCategory }) => {
    const active = filter === item.key;
    const cls = item.category ? FITZGERALD_CLASSES[item.category] : null;
    return (
      <TapCard
        key={item.key}
        onTap={() => setFilter(item.key)}
        ariaLabel={`Show ${item.label}`}
        className={`shrink-0 min-h-[44px] px-3 rounded-xl border-[3px] font-bold text-[13px] flex items-center justify-center ${
          cls ? `${cls.bg} ${cls.text} ${cls.border}` : 'bg-gray-100 text-gray-800 border-gray-400'
        } ${active ? 'ring-2 ring-offset-1 ring-emerald-500' : ''}`}
      >
        {item.label}
      </TapCard>
    );
  };

  return (
    <div
      className="flex flex-col font-sans bg-gray-50"
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

      <div className="flex-1 min-h-0 flex flex-row">
        {/* Side-rail (wide screens) */}
        <nav
          className="hidden md:flex md:flex-col gap-2 w-40 shrink-0 overflow-y-auto p-2 border-r border-gray-200"
          aria-label="Word categories"
        >
          {railItems.map(railButton)}
        </nav>

        {/* Flowing card area */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y p-2">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))' }}
          >
            {words.map((w) => (
              <SurfaceWordCard key={w.id} word={w} onTap={tapWord} size="medium" />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar (narrow screens) */}
      <nav
        className="flex md:hidden gap-2 overflow-x-auto no-scrollbar p-2 border-t border-gray-200 bg-white shrink-0"
        aria-label="Word categories"
      >
        {railItems.map(railButton)}
      </nav>
    </div>
  );
}

export default FlowBoard;
