'use client';

import Link from 'next/link';
import LightMixer from '@/components/LightMixer';

/**
 * Light Mixer - a sandbox under the existing Science hub (issue #225).
 *
 * Not a new top-level nav entry: /science already lists its activities, and
 * this joins that list exactly as Shape World and Physics Lab do.
 */
export default function LightMixerPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: '#FFF8F0' }}>
      <header
        className="flex items-center px-4 py-3 relative shrink-0"
        style={{ backgroundColor: '#E8610A' }}
      >
        <Link
          href="/science"
          className="flex items-center gap-0.5 text-white font-medium text-lg no-underline"
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
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-semibold text-xl">
          Light Mixer
        </span>
      </header>

      <main className="flex-1 min-h-0">
        <LightMixer />
      </main>
    </div>
  );
}
