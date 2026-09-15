'use client';

/**
 * Supercore 50 Core Word Page
 *
 * Fixed-position 50-word AAC grid with Modified Fitzgerald Key colors.
 * Motor planning consistent — words NEVER move.
 *
 * Route: /talk/core
 * Issue: #20
 *
 * Layout primitives: when the layoutPrimitives feature flag is ON, the active
 * structural primitive (AppSettings.activeLayoutPrimitive) selects which
 * SURFACE renders. When the flag is OFF the surface is always the current
 * fixed grid - this file renders exactly what it did before the flag existed.
 */

import { SupercoreGrid } from '@/components/SupercoreGrid';
import { getSurfaceForKind } from '@/components/surfaces';
import { useApp } from '@/context/AppContext';
import { isLayoutPrimitivesEnabled } from '@/lib/feature-flags';
import { getPrimitive, resolveActivePrimitiveId } from '@/lib/layout-primitives';

export default function SupercoreCorePage() {
  const { settings } = useApp();

  // Flag OFF: render the current grid, unchanged. This branch is a build-time
  // constant (NEXT_PUBLIC_* is inlined), so with the flag off the surface
  // router and primitive resolution are never reached.
  if (!isLayoutPrimitivesEnabled()) {
    return (
      <div className="h-screen bg-[var(--brand-bg-warm)]">
        <SupercoreGrid />
      </div>
    );
  }

  // Flag ON: resolve the active primitive to a structural surface. In this
  // framework PR every kind still renders the Supercore grid (with a "coming
  // soon" banner for the four not-yet-built kinds).
  const activeId = resolveActivePrimitiveId(true, settings.activeLayoutPrimitive);
  const primitive = getPrimitive(activeId);
  const Surface = getSurfaceForKind(primitive.kind);

  return (
    <div className="h-screen bg-[var(--brand-bg-warm)]">
      <Surface />
    </div>
  );
}
