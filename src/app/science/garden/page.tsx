'use client';

import Link from 'next/link';
import PatternGarden from '@/components/PatternGarden';

/**
 * Pattern Garden - a sandbox under the existing Science hub (issue #225, wave 3).
 *
 * Not a new top-level nav entry: /science already lists its activities, and this
 * joins that list exactly as Shape World, Physics Lab, Light Mixer and Water
 * Sphere do.
 *
 * The chrome is dark for the same reason Water Sphere's is. This activity is a
 * place rather than a panel, and a cream header above a bed of soil would put a
 * window frame around the one thing that is supposed to feel like somewhere.
 * The back control keeps the same shape and the same words as every other
 * science surface, so nothing has to be relearned.
 */
export default function PatternGardenPage() {
  return (
    /* Height, not min-height. The app shell puts a dock across the bottom, and
       a min-height container lets the canvas claim the whole viewport and push
       the controls underneath it, where a child cannot reach them. */
    <div
      className="flex flex-col"
      style={{ height: 'calc(100dvh - 80px)', backgroundColor: '#050D0B' }}
    >
      <header
        className="relative flex shrink-0 items-center px-4 py-3"
        style={{ backgroundColor: '#0A1A16' }}
      >
        <Link
          href="/science"
          className="flex items-center gap-0.5 text-lg font-medium text-[#7FD3B8] no-underline"
          aria-label="Back to science"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Science</span>
        </Link>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-white">
          Pattern Garden
        </span>
      </header>

      <main className="min-h-0 flex-1">
        <PatternGarden />
      </main>
    </div>
  );
}
