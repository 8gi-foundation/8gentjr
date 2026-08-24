'use client';

import Link from 'next/link';
import WaterSphere from '@/components/WaterSphere';

/**
 * Water Sphere - a sandbox under the existing Science hub (issue #225, wave 3).
 *
 * Not a new top-level nav entry: /science already lists its activities, and this
 * joins that list exactly as Shape World, Physics Lab and Light Mixer do.
 *
 * The chrome is deliberately darker than its siblings. This activity is a place
 * rather than a panel, and a cream header above a drop floating in deep space
 * would put a window frame around the one thing that is supposed to feel like
 * somewhere. The back control keeps the same shape and the same words as every
 * other science surface, so nothing has to be relearned.
 */
export default function WaterSpherePage() {
  return (
    /* Height, not min-height. The app shell puts a dock across the bottom, and
       a min-height container let the canvas claim the whole viewport and push
       the frequency control underneath it, where a child could not reach it. */
    <div
      className="flex flex-col"
      style={{ height: 'calc(100dvh - 80px)', backgroundColor: '#04090C' }}
    >
      <header
        className="relative flex shrink-0 items-center px-4 py-3"
        style={{ backgroundColor: '#07161B' }}
      >
        <Link
          href="/science"
          className="flex items-center gap-0.5 text-lg font-medium text-[#7FD3D6] no-underline"
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
          Water Sphere
        </span>
      </header>

      <main className="min-h-0 flex-1">
        <WaterSphere />
      </main>
    </div>
  );
}
