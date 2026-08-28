/**
 * Kids-Mode Capability Policy
 *
 * Deny-by-default capability gate for 8gent Jr. Every privileged action —
 * tool execution, network call, filesystem write, agent spawn — runs
 * through `KidsModePolicy.check()` first. The policy returns a structured
 * decision and writes one entry to the activity log per call.
 *
 * Design:
 *   - Capabilities map to one of four tiers (`safe`, `moderate`, `dangerous`,
 *     `admin`). `admin` is never granted in kids mode, period.
 *   - Network requests must hit an allowlisted host or be denied.
 *   - Filesystem writes must land under one of `safeWriteRoots`.
 *   - A parent can issue a time-bounded `ParentalOverride` to lift a single
 *     capability for a specific window. Overrides expire and cannot grant
 *     `admin`. Issuing an override is itself an admin action that happens
 *     in the parent UI, not from the child surface.
 *   - The `contentFilter` hook lets callers run age-appropriate redaction
 *     on agent output before it reaches the child. The policy treats it
 *     as a separate concern from capability gating.
 *
 * Reference: github.com/8gi-foundation/8gentjr/issues/164
 */

import {
  appendActivity,
  hashParentId,
  newEntryId,
} from './activity-log';
import type {
  ActivityLogEntry,
  CapabilityDecision,
  CapabilityRequest,
  ContentFilterResult,
  KidsCapability,
  KidsCapabilityTier,
  KidsModeConfig,
  ParentalOverride,
} from './types';

// ---------------------------------------------------------------------------
// Default tier map
// ---------------------------------------------------------------------------

/**
 * Default tier assignment. Conservative on purpose — anything that could
 * surprise a parent starts at `dangerous` or above.
 */
export const DEFAULT_TIER_MAP: Partial<Record<KidsCapability, KidsCapabilityTier>> = {
  // safe surfaces
  'tool.read': 'safe',
  'fs.read': 'safe',
  'media.audio': 'safe',

  // moderate — gated by allowlist or safe roots
  'fs.write': 'moderate',
  'net.http': 'moderate',
  'net.websocket': 'moderate',
  'tool.write': 'moderate',
  'tool.execute': 'moderate',

  // dangerous — needs parental override
  'media.camera': 'dangerous',
  'media.microphone': 'dangerous',
  'agent.spawn': 'dangerous',
  'agent.stop': 'dangerous',

  // admin — never granted in kids mode
  'admin.policy': 'admin',
  'admin.account': 'admin',
  'admin.billing': 'admin',
};

/**
 * Default config used when 8gent Jr boots into kids mode. Production code
 * should call `createDefaultConfig()` and override only the fields it
 * cares about — this guarantees forward-compat as new fields are added.
 */
export function createDefaultConfig(): KidsModeConfig {
  return {
    enabled: true,
    defaultTier: 'dangerous',
    tierMap: { ...DEFAULT_TIER_MAP },
    networkAllowlist: [
      // educational + 8gent first-party only by default
      '8gentjr.com',
      '8gent.app',
      'arasaac.org', // pictogram library already used by toolshed
    ],
    safeWriteRoots: [],
    activityBufferSize: 50,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hostMatches(allowlist: string[], url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowlist.some((entry) => {
    const norm = entry.trim().toLowerCase();
    if (!norm) return false;
    return host === norm || host.endsWith(`.${norm}`);
  });
}

function pathInRoot(path: string, root: string): boolean {
  // Naive prefix check is fine here — callers are expected to pass
  // resolved absolute paths. We never operate on user-supplied raw input.
  const normRoot = root.replace(/\/+$/, '');
  return path === normRoot || path.startsWith(`${normRoot}/`);
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export class KidsModePolicy {
  private config: KidsModeConfig;
  private overrides: ParentalOverride[] = [];

  constructor(config: KidsModeConfig = createDefaultConfig()) {
    this.config = config;
  }

  /** Replace the whole config. Triggered from parent settings. */
  setConfig(config: KidsModeConfig): void {
    this.config = config;
  }

  getConfig(): Readonly<KidsModeConfig> {
    return this.config;
  }

  /** Tier for a capability, after applying the user's tierMap overrides. */
  tierFor(capability: KidsCapability): KidsCapabilityTier {
    return this.config.tierMap[capability] ?? this.config.defaultTier;
  }

  /**
   * Decide whether a capability request is allowed. Always writes one
   * entry to the activity log. The caller is responsible for honouring
   * the decision — the policy does not perform the action itself.
   */
  async check(req: CapabilityRequest): Promise<CapabilityDecision> {
    // Master switch off = adult mode, everything passes without logging.
    if (!this.config.enabled) {
      return { allowed: true, tier: 'safe', viaOverride: false };
    }

    const tier = this.tierFor(req.capability);
    const decision = this.decide(req, tier);
    await this.log(req, tier, decision);
    return decision;
  }

  private decide(req: CapabilityRequest, tier: KidsCapabilityTier): CapabilityDecision {
    // admin is hard-blocked, override or not.
    if (tier === 'admin') {
      return {
        allowed: false,
        tier,
        code: 'admin_forbidden',
        message: `Capability '${req.capability}' is admin-only and cannot run in kids mode.`,
      };
    }

    // safe is always allowed.
    if (tier === 'safe') {
      return { allowed: true, tier, viaOverride: false };
    }

    // moderate: needs allowlist match (network) or safe-root match (fs writes).
    if (tier === 'moderate') {
      if (req.capability === 'net.http' || req.capability === 'net.websocket') {
        if (!req.resource) {
          return {
            allowed: false,
            tier,
            code: 'not_allowlisted',
            message: 'Network capability requires a resource URL.',
          };
        }
        if (!hostMatches(this.config.networkAllowlist, req.resource)) {
          // network can still be lifted via override
          if (this.findActiveOverride(req.capability, req.resource)) {
            return { allowed: true, tier, viaOverride: true };
          }
          return {
            allowed: false,
            tier,
            code: 'not_allowlisted',
            message: `Host for '${req.resource}' is not in the kids-mode network allowlist.`,
          };
        }
        return { allowed: true, tier, viaOverride: false };
      }

      if (req.capability === 'fs.write') {
        if (!req.resource) {
          return {
            allowed: false,
            tier,
            code: 'fs_outside_safe_root',
            message: 'Filesystem write requires a target path.',
          };
        }
        const inSafeRoot = this.config.safeWriteRoots.some((r) => pathInRoot(req.resource as string, r));
        if (!inSafeRoot) {
          if (this.findActiveOverride(req.capability, req.resource)) {
            return { allowed: true, tier, viaOverride: true };
          }
          return {
            allowed: false,
            tier,
            code: 'fs_outside_safe_root',
            message: `Path '${req.resource}' is outside the kids-mode safe write roots.`,
          };
        }
        return { allowed: true, tier, viaOverride: false };
      }

      // Other moderate capabilities (tool.execute, tool.write) pass.
      return { allowed: true, tier, viaOverride: false };
    }

    // dangerous: requires an active, scoped override.
    const ovr = this.findActiveOverride(req.capability, req.resource);
    if (ovr) {
      return { allowed: true, tier, viaOverride: true };
    }
    return {
      allowed: false,
      tier,
      code: 'override_required',
      message: `Capability '${req.capability}' is dangerous and needs a parental override.`,
    };
  }

  // -------------------------------------------------------------------------
  // Parental overrides
  // -------------------------------------------------------------------------

  /**
   * Register a parental override. The caller — typically a server-side
   * route gated by Clerk auth — is responsible for verifying that
   * `grantedBy` actually corresponds to the authenticated parent. The
   * policy only checks structural validity and trims expired overrides.
   *
   * Returns the override that was registered, with an `expiresAt` clamped
   * to a maximum of 24 hours from `grantedAt`.
   */
  grantOverride(input: {
    capability: KidsCapability;
    durationMs: number;
    grantedBy: string;
    resource?: string;
  }): ParentalOverride {
    const tier = this.tierFor(input.capability);
    if (tier === 'admin') {
      throw new Error(`Cannot grant override for admin capability '${input.capability}'.`);
    }
    const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
    const duration = Math.max(0, Math.min(input.durationMs, MAX_DURATION_MS));
    const grantedAt = Date.now();
    const expiresAt = grantedAt + duration;
    const ovr: ParentalOverride = {
      capability: input.capability,
      grantedAt: new Date(grantedAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      grantedBy: input.grantedBy,
      resource: input.resource,
    };
    // Drop any existing override for the same (capability, resource) pair.
    this.overrides = this.overrides.filter(
      (o) => !(o.capability === input.capability && o.resource === input.resource),
    );
    this.overrides.push(ovr);
    return ovr;
  }

  revokeOverride(capability: KidsCapability, resource?: string): boolean {
    const before = this.overrides.length;
    this.overrides = this.overrides.filter(
      (o) => !(o.capability === capability && o.resource === resource),
    );
    return this.overrides.length < before;
  }

  listOverrides(): ParentalOverride[] {
    this.pruneExpired();
    return [...this.overrides];
  }

  private findActiveOverride(
    capability: KidsCapability,
    resource: string | undefined,
  ): ParentalOverride | undefined {
    this.pruneExpired();
    return this.overrides.find((o) => {
      if (o.capability !== capability) return false;
      // Empty override resource matches any; otherwise require exact match.
      if (!o.resource) return true;
      return o.resource === resource;
    });
  }

  private pruneExpired(): void {
    const now = Date.now();
    this.overrides = this.overrides.filter((o) => Date.parse(o.expiresAt) > now);
  }

  // -------------------------------------------------------------------------
  // Content filter
  // -------------------------------------------------------------------------

  /**
   * Run the configured content filter on agent output. Returns the
   * original text untouched when no filter is set. Always logs whether
   * the filter modified the text so parent review can spot patterns.
   */
  async filterContent(text: string, source = 'agent'): Promise<ContentFilterResult> {
    const filter = this.config.contentFilter;
    if (!filter) {
      return { text, modified: false };
    }
    const result = await filter(text);
    if (result.modified) {
      const entry: ActivityLogEntry = {
        id: newEntryId(),
        ts: nowIso(),
        capability: `content.${source}`,
        outcome: 'denied',
        tier: 'moderate',
        denyCode: 'tier_blocked',
        reason: result.flags?.join(',') ?? 'content_filtered',
      };
      await appendActivity(entry);
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Activity log
  // -------------------------------------------------------------------------

  private async log(
    req: CapabilityRequest,
    tier: KidsCapabilityTier,
    decision: CapabilityDecision,
  ): Promise<void> {
    const entry: ActivityLogEntry = {
      id: newEntryId(),
      ts: nowIso(),
      capability: req.capability,
      resource: req.resource,
      reason: req.reason,
      outcome: decision.allowed ? (decision.viaOverride ? 'override_used' : 'allowed') : 'denied',
      tier,
    };
    if (!decision.allowed) entry.denyCode = decision.code;
    if (decision.allowed && decision.viaOverride) {
      const ovr = this.findActiveOverride(req.capability, req.resource);
      if (ovr) entry.parentHash = hashParentId(ovr.grantedBy);
    }
    await appendActivity(entry);
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton helpers
// ---------------------------------------------------------------------------

let _instance: KidsModePolicy | null = null;

/** Get (and lazily create) the process-wide kids-mode policy. */
export function getKidsModePolicy(): KidsModePolicy {
  if (!_instance) _instance = new KidsModePolicy();
  return _instance;
}

/** Replace the singleton — used by tests and by parent settings flows. */
export function setKidsModePolicy(policy: KidsModePolicy): void {
  _instance = policy;
}
