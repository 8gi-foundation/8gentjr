/**
 * Feature flags for 8gent Jr.
 *
 * The repo has no prior flag abstraction - flags to date have been plain
 * NEXT_PUBLIC_* env reads. This keeps that convention but centralises the
 * layoutPrimitives flag so the check reads the same way everywhere.
 *
 * NEXT_PUBLIC_* vars are inlined at build time, so this evaluates identically
 * on the server and in the browser. Default is OFF: unless the env var is the
 * exact string 'true', the flag is disabled and the app behaves as it does
 * today (only the four existing presets show; the Core screen renders the
 * current grid).
 */

/**
 * layoutPrimitives - the structural layout dimension (see ./layout-primitives).
 * DEFAULT OFF. Enable by setting NEXT_PUBLIC_FF_LAYOUT_PRIMITIVES=true.
 */
export function isLayoutPrimitivesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FF_LAYOUT_PRIMITIVES === 'true';
}
