/**
 * Kids-Mode Capability Policy — public barrel.
 *
 * Import from `@/lib/kids-mode` to reach the policy object, types,
 * and read helpers. Internal helpers (activity log writers, hash
 * functions) are not re-exported.
 */

export {
  KidsModePolicy,
  createDefaultConfig,
  DEFAULT_TIER_MAP,
  getKidsModePolicy,
  setKidsModePolicy,
} from './policy';

export { readActivity } from './activity-log';

export type {
  ActivityLogEntry,
  CapabilityDecision,
  CapabilityRequest,
  ContentFilterResult,
  DenyCode,
  KidsCapability,
  KidsCapabilityTier,
  KidsModeConfig,
  ParentalOverride,
} from './types';
