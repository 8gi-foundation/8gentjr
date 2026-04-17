'use client';

/**
 * Paginated AAC Grid
 *
 * Swipe-navigable grid for motor-impaired children.
 * Breaks a large set of AAC cards into pages so children don't
 * need fine-grained scrolling — just a broad left/right swipe.
 *
 * Key design decisions:
 * - Touch threshold of 50px prevents accidental page changes
 * - CSS transform transitions (no JS animation libraries)
 * - Page indicator dots are large enough for assisted tapping (24px)
 * - Keyboard arrow keys supported for switch-access users
 *
 * @see https://github.com/8gi-foundation/8gentjr/issues/6
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TapCard } from '@/components/TapCard';

// =============================================================================
// Types
// =============================================================================

export interface AACCardData {
  id: string;
  label: string;
  emoji?: string;
  symbolUrl?: string;
  bgColor?: string;
}

export interface PaginatedGridProps {
  /** Array of card data to display across pages */
  cards: AACCardData[];
  /** Number of cards per page. Defaults to 8. */
  itemsPerPage?: number;
  /** Callback when a card is tapped */
  onCardTap?: (card: AACCardData) => void;
  /** Number of grid columns. Defaults to 4. */
  columns?: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Minimum swipe distance (px) to trigger page change — prevents accidental swipes */
const SWIPE_THRESHOLD = 50;
/** Transition duration in ms */
const TRANSITION_MS = 300;

// =============================================================================
// Component
// =============================================================================

export default function PaginatedGrid({
  cards,
  itemsPerPage = 8,
  onCardTap,
  columns = 4,
}: PaginatedGridProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Chunk cards into pages
  const pages: AACCardData[][] = [];
  for (let i = 0; i < cards.length; i += itemsPerPage) {
    pages.push(cards.slice(i, i + itemsPerPage));
  }
  const totalPages = Math.max(pages.length, 1);

  // Clamp page if cards array shrinks
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(totalPages - 1, 0));
    }
  }, [totalPages, currentPage]);

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(0, Math.min(page, totalPages - 1));
      setIsTransitioning(true);
      setCurrentPage(clamped);
      setOffsetX(0);
      setTimeout(() => setIsTransitioning(false), TRANSITION_MS);
    },
    [totalPages],
  );

  // --- Touch handlers (kept as inline style for dynamic transform) ---

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    setIsTransitioning(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // If vertical scroll is dominant, don't hijack
    if (!isSwiping.current && Math.abs(dy) > Math.abs(dx)) return;
    isSwiping.current = true;

    setOffsetX(dx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(offsetX) > SWIPE_THRESHOLD) {
      if (offsetX < 0) {
        goToPage(currentPage + 1);
      } else {
        goToPage(currentPage - 1);
      }
    } else {
      // Snap back
      setIsTransitioning(true);
      setOffsetX(0);
      setTimeout(() => setIsTransitioning(false), TRANSITION_MS);
    }
  }, [offsetX, currentPage, goToPage]);

  // --- Keyboard navigation for switch-access ---

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToPage(currentPage + 1);
      if (e.key === 'ArrowLeft') goToPage(currentPage - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentPage, goToPage]);

  return (
    <div>
      {/* Swipeable track */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden relative touch-pan-y select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label={`AAC grid page ${currentPage + 1} of ${totalPages}`}
        aria-roledescription="carousel"
      >
        {/* Track needs dynamic transform for swipe offset — inline style required */}
        <div
          className="flex"
          style={{
            width: `${totalPages * 100}%`,
            transform: `translateX(calc(-${(currentPage * 100) / totalPages}% + ${offsetX}px))`,
            transition: isTransitioning ? `transform ${TRANSITION_MS}ms ease-out` : 'none',
          }}
        >
          {pages.map((pageCards, pageIndex) => (
            <div
              key={pageIndex}
              className="shrink-0"
              style={{ width: `${100 / totalPages}%` }}
              role="group"
              aria-label={`Page ${pageIndex + 1}`}
            >
              <div
                className="grid gap-2.5 p-2"
                style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
              >
                {pageCards.map((card) => (
                  <TapCard
                    key={card.id}
                    onTap={() => onCardTap?.(card)}
                    ariaLabel={card.label}
                    pressScale={0.93}
                    className="flex flex-col items-center justify-center gap-1 border-2 border-gray-300 rounded-xl px-2 py-3 min-h-[88px]"
                    style={{ backgroundColor: card.bgColor ?? '#ffffff' }}
                  >
                    {card.symbolUrl ? (
                      <img src={card.symbolUrl} alt={card.label} className="w-12 h-12 object-contain" />
                    ) : card.emoji ? (
                      <span className="text-4xl leading-none">{card.emoji}</span>
                    ) : (
                      <span className="text-4xl leading-none">{card.label.charAt(0).toUpperCase()}</span>
                    )}
                    <span className="text-base font-semibold text-[var(--warm-text)] text-center leading-tight overflow-hidden line-clamp-2 break-words">
                      {card.label}
                    </span>
                  </TapCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page indicator dots */}
      {totalPages > 1 && (
        <>
          <div className="flex justify-center items-center gap-2.5 py-3">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => goToPage(i)}
                className={`w-6 h-6 rounded-full border-none cursor-pointer p-0 transition-all duration-200 ${
                  i === currentPage
                    ? 'bg-[var(--brand-accent)] scale-[1.15]'
                    : 'bg-gray-300 scale-100'
                }`}
                aria-label={`Go to page ${i + 1}`}
                aria-current={i === currentPage ? 'true' : undefined}
              />
            ))}
          </div>
          <p className="text-center text-[13px] text-[var(--warm-text-muted)] pb-2 select-none">
            Swipe or use arrow keys &bull; Page {currentPage + 1} of {totalPages}
          </p>
        </>
      )}
    </div>
  );
}
