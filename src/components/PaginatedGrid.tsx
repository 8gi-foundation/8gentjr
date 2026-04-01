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

import React, { useState, useRef, useCallback, useEffect, CSSProperties } from 'react';

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
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  width: '100%',
  overflow: 'hidden',
  position: 'relative',
  touchAction: 'pan-y',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const trackStyle = (
  currentPage: number,
  totalPages: number,
  offsetX: number,
  isTransitioning: boolean,
): CSSProperties => ({
  display: 'flex',
  width: `${totalPages * 100}%`,
  transform: `translateX(calc(-${(currentPage * 100) / totalPages}% + ${offsetX}px))`,
  transition: isTransitioning ? `transform ${TRANSITION_MS}ms ease-out` : 'none',
});

const pageStyle = (totalPages: number): CSSProperties => ({
  width: `${100 / totalPages}%`,
  flexShrink: 0,
});

const gridStyle = (columns: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, 1fr)`,
  gap: '10px',
  padding: '8px',
});

const cardButtonStyle = (bgColor: string): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  background: bgColor,
  border: '2px solid #e0e0e0',
  borderRadius: '12px',
  padding: '12px 8px',
  cursor: 'pointer',
  minHeight: '88px',
  transition: 'transform 0.1s, border-color 0.1s',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
});

const emojiStyle: CSSProperties = {
  fontSize: '36px',
  lineHeight: 1,
};

const labelTextStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#1a1a2e',
  textAlign: 'center',
  lineHeight: 1.2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  wordBreak: 'break-word',
};

const symbolImgStyle: CSSProperties = {
  width: '48px',
  height: '48px',
  objectFit: 'contain',
};

const dotsContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 0',
};

const dotStyle = (active: boolean): CSSProperties => ({
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  border: 'none',
  background: active ? '#E8610A' : '#D1D5DB',
  cursor: 'pointer',
  transition: 'background 0.2s, transform 0.2s',
  transform: active ? 'scale(1.15)' : 'scale(1)',
  padding: 0,
});

const navHintStyle: CSSProperties = {
  textAlign: 'center',
  fontSize: '13px',
  color: '#9CA3AF',
  padding: '0 0 8px',
  userSelect: 'none',
};

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

  // --- Touch handlers ---

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

  // --- Card press feedback ---

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(0.93)';
    e.currentTarget.style.borderColor = '#E8610A';
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.borderColor = '#e0e0e0';
  };

  return (
    <div>
      {/* Swipeable track */}
      <div
        ref={containerRef}
        style={containerStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label={`AAC grid page ${currentPage + 1} of ${totalPages}`}
        aria-roledescription="carousel"
      >
        <div style={trackStyle(currentPage, totalPages, offsetX, isTransitioning)}>
          {pages.map((pageCards, pageIndex) => (
            <div key={pageIndex} style={pageStyle(totalPages)} role="group" aria-label={`Page ${pageIndex + 1}`}>
              <div style={gridStyle(columns)}>
                {pageCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => onCardTap?.(card)}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={cardButtonStyle(card.bgColor ?? '#ffffff')}
                    aria-label={card.label}
                  >
                    {card.symbolUrl ? (
                      <img src={card.symbolUrl} alt={card.label} style={symbolImgStyle} />
                    ) : card.emoji ? (
                      <span style={emojiStyle}>{card.emoji}</span>
                    ) : (
                      <span style={emojiStyle}>{card.label.charAt(0).toUpperCase()}</span>
                    )}
                    <span style={labelTextStyle}>{card.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page indicator dots */}
      {totalPages > 1 && (
        <>
          <div style={dotsContainerStyle}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => goToPage(i)}
                style={dotStyle(i === currentPage)}
                aria-label={`Go to page ${i + 1}`}
                aria-current={i === currentPage ? 'true' : undefined}
              />
            ))}
          </div>
          <p style={navHintStyle}>
            Swipe or use arrow keys &bull; Page {currentPage + 1} of {totalPages}
          </p>
        </>
      )}
    </div>
  );
}
