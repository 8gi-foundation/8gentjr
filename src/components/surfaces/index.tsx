'use client';

/**
 * Talk Core surface router.
 *
 * Maps a structural LayoutKind (see src/lib/layout-primitives) to the React
 * component that renders it. This is the seam a later PR will use to introduce
 * genuine scene / text / flow / orbit surfaces.
 *
 * FRAMEWORK PR CONTRACT: every kind renders the EXISTING SupercoreGrid so
 * nothing breaks. The four not-yet-built kinds additionally show a slim,
 * non-blocking "coming soon" banner ABOVE the same grid, so selecting one is
 * honest about what it is while still giving the child a fully working board.
 *
 * The banner only ever appears when the layoutPrimitives flag is ON and a
 * non-default primitive is selected. With the flag off the active primitive is
 * always 'alpha' (fixedGrid), which renders the bare grid - byte-for-byte the
 * current behaviour.
 */

import type { ComponentType } from 'react';
import { SupercoreGrid, type SupercoreGridProps } from '@/components/SupercoreGrid';
import type { LayoutKind } from '@/lib/layout-primitives';

export type SurfaceProps = SupercoreGridProps;

/** Alpha / fixedGrid: the current Talk Core, unchanged. */
function FixedGridSurface(props: SurfaceProps) {
  return <SupercoreGrid {...props} />;
}

/** Beta / adaptiveGrid: same grid today; the bundle widens the columns. */
function AdaptiveGridSurface(props: SurfaceProps) {
  return <SupercoreGrid {...props} />;
}

/**
 * Placeholder for a not-yet-built structural surface. Renders the existing,
 * fully-working grid beneath a slim banner so the child can always talk while
 * the real surface is in development.
 */
function PlaceholderSurface({ label, props }: { label: string; props: SurfaceProps }) {
  return (
    <div className="flex flex-col h-full">
      <div
        className="shrink-0 px-3 py-1.5 text-[11px] font-semibold text-center"
        style={{ backgroundColor: '#FFF4E5', color: '#8A5200' }}
        role="status"
        aria-live="polite"
      >
        {label} is coming soon - showing the Steady Grid for now.
      </div>
      <div className="flex-1 min-h-0">
        <SupercoreGrid {...props} />
      </div>
    </div>
  );
}

function SceneFieldSurface(props: SurfaceProps) {
  return <PlaceholderSurface label="Scene" props={props} />;
}
function TextRailSurface(props: SurfaceProps) {
  return <PlaceholderSurface label="Word Rail" props={props} />;
}
function FlowBoardSurface(props: SurfaceProps) {
  return <PlaceholderSurface label="Flow Board" props={props} />;
}
function OrbitCoreSurface(props: SurfaceProps) {
  return <PlaceholderSurface label="Orbit Core" props={props} />;
}

/** kind -> surface component. Exhaustive over LayoutKind (compile-checked). */
export const SURFACE_BY_KIND: Record<LayoutKind, ComponentType<SurfaceProps>> = {
  fixedGrid: FixedGridSurface,
  adaptiveGrid: AdaptiveGridSurface,
  sceneField: SceneFieldSurface,
  textRail: TextRailSurface,
  flowBoard: FlowBoardSurface,
  orbitCore: OrbitCoreSurface,
};

/** Resolve the surface component for a kind. */
export function getSurfaceForKind(kind: LayoutKind): ComponentType<SurfaceProps> {
  return SURFACE_BY_KIND[kind] ?? FixedGridSurface;
}
