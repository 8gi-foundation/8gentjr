'use client';

/**
 * Talk Core surface router.
 *
 * Maps a structural LayoutKind (see src/lib/layout-primitives) to the React
 * component that renders it. This is the seam a later PR will use to introduce
 * genuine scene / text / flow / orbit surfaces.
 *
 * FRAMEWORK CONTRACT: the two grid kinds (fixedGrid / adaptiveGrid) render the
 * EXISTING SupercoreGrid, unchanged. The four structural kinds now render their
 * REAL surfaces (Scene / Word Rail / Flow Board / Orbit Core). Every surface
 * reads the same Supercore 50 vocabulary and writes to the same speak +
 * sentence-strip pipeline as the grid (see ./useCoreSurface + @/lib/core-vocab).
 *
 * With the layoutPrimitives flag OFF the active primitive is always 'alpha'
 * (fixedGrid), which renders the bare grid - byte-for-byte the current
 * behaviour. The four surfaces are only ever reachable with the flag ON.
 */

import type { ComponentType } from 'react';
import { SupercoreGrid, type SupercoreGridProps } from '@/components/SupercoreGrid';
import type { LayoutKind } from '@/lib/layout-primitives';
import { SceneField } from './SceneField';
import { TextRail } from './TextRail';
import { FlowBoard } from './FlowBoard';
import { OrbitCore } from './OrbitCore';

export type SurfaceProps = SupercoreGridProps;

/** Alpha / fixedGrid: the current Talk Core, unchanged. */
function FixedGridSurface(props: SurfaceProps) {
  return <SupercoreGrid {...props} />;
}

/** Beta / adaptiveGrid: same grid today; the bundle widens the columns. */
function AdaptiveGridSurface(props: SurfaceProps) {
  return <SupercoreGrid {...props} />;
}

/** kind -> surface component. Exhaustive over LayoutKind (compile-checked). */
export const SURFACE_BY_KIND: Record<LayoutKind, ComponentType<SurfaceProps>> = {
  fixedGrid: FixedGridSurface,
  adaptiveGrid: AdaptiveGridSurface,
  sceneField: SceneField,
  textRail: TextRail,
  flowBoard: FlowBoard,
  orbitCore: OrbitCore,
};

/** Resolve the surface component for a kind. */
export function getSurfaceForKind(kind: LayoutKind): ComponentType<SurfaceProps> {
  return SURFACE_BY_KIND[kind] ?? FixedGridSurface;
}
