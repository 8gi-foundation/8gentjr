'use client';

/**
 * SurfaceWordCard - the standard tappable Fitzgerald word card, shared by the
 * Flow Board and Orbit Core surfaces (and any future surface that shows a plain
 * picto + label card). Visually matches the Supercore grid card so a child sees
 * the same word the same way on every surface.
 *
 * Built on TapCard, so it is a real <button>: focusable, aria-labelled, and it
 * carries the app's rapid-tap throttle + press animation.
 */

import React, { useCallback } from 'react';
import { TapCard } from '@/components/TapCard';
import {
  ARASAAC_IMG,
  FITZGERALD_CLASSES,
  type SupercoreWord,
} from '@/lib/core-vocab';

export const SurfaceWordCard = React.memo(function SurfaceWordCard({
  word,
  onTap,
  size = 'medium',
}: {
  word: SupercoreWord;
  onTap: (word: SupercoreWord) => void;
  size?: 'small' | 'medium' | 'large';
}) {
  const cls = FITZGERALD_CLASSES[word.category];
  const handleTap = useCallback(() => onTap(word), [onTap, word]);
  const tok =
    size === 'large'
      ? { minHeight: 96, img: 52, font: 16 }
      : size === 'small'
        ? { minHeight: 60, img: 34, font: 12 }
        : { minHeight: 76, img: 44, font: 14 };
  return (
    <TapCard
      onTap={handleTap}
      ariaLabel={word.label}
      className={`flex flex-col items-center justify-center rounded-xl border-[3px] py-1.5 px-0.5 text-center leading-tight ${cls.bg} ${cls.text} ${cls.border}`}
      style={{ minHeight: tok.minHeight }}
    >
      {word.arasaacId && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={ARASAAC_IMG(word.arasaacId)}
          alt=""
          width={tok.img}
          height={tok.img}
          style={{ width: tok.img, height: tok.img }}
          className="object-contain pointer-events-none"
          loading="lazy"
        />
      )}
      <span
        className="font-bold leading-none mt-0.5 w-full line-clamp-2 px-0.5"
        style={{ fontSize: tok.font }}
      >
        {word.label}
      </span>
    </TapCard>
  );
});
