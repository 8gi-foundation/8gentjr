'use client';

/**
 * Supercore 50 Core Word Page
 *
 * Fixed-position 50-word AAC grid with Modified Fitzgerald Key colors.
 * Motor planning consistent — words NEVER move.
 *
 * Route: /talk/core
 * Issue: #20
 */

import { SupercoreGrid } from '@/components/SupercoreGrid';

export default function SupercoreCorePage() {
  return (
    <div className="h-screen bg-[var(--brand-bg-warm)]">
      <SupercoreGrid />
    </div>
  );
}
