/**
 * Kids-Mode Capability Policy — Types
 *
 * Defines the capability vocabulary used to gate every privileged action in
 * 8gent Jr. Mirrors the tier system being added to 8gent-code (#2087) so a
 * single policy concept covers both the parent agent kernel and the kids OS.
 *
 * Reference: docs/specs/HOLAOS-EXTRACTIONS.md Section 8
 *            github.com/8gi-foundation/8gentjr/issues/164
 */

// ---------------------------------------------------------------------------
// Capability tiers
// ---------------------------------------------------------------------------

/**
 * Tier of a capability. Ordered from least to most privileged.
 *
 * - `safe`      always allowed in kids mode (drawing, AAC, local playback)
 * - `moderate`  allowed when the policy explicitly lists the resource
 *               (e.g. an allowlisted educational domain)
 * - `dangerous` denied by default; can only be granted via a time-limited
 *               parental override
 * - `admin`     never granted in kids mode, override or not
 *               (deleting account data, billing, changing the policy itself)
 */
export type KidsCapabilityTier = 'safe' | 'moderate' | 'dangerous' | 'admin';

/** Fixed names for capabilities the policy knows about. Extend as new
 *  surfaces are added; unknown names fall through to `defaultTier`. */
export type KidsCapability =
  | 'tool.read'
  | 'tool.write'
  | 'tool.execute'
  | 'fs.read'
  | 'fs.write'
  | 'net.http'
  | 'net.websocket'
  | 'media.audio'
  | 'media.camera'
  | 'media.microphone'
  | 'agent.spawn'
  | 'agent.stop'
  | 'admin.policy'
  | 'admin.account'
  | 'admin.billing'
  | (string & {}); // allow forward-compatible extension without losing autocomplete

// ---------------------------------------------------------------------------
// Policy decisions
// ---------------------------------------------------------------------------

export interface CapabilityRequest {
  capability: KidsCapability;
  /** Optional resource string (URL, path, tool id) the capability acts on. */
  resource?: string;
  /** Free-form context for the activity log. Never log PII. */
  reason?: string;
}

export type DenyCode =
  | 'tier_blocked'
  | 'not_allowlisted'
  | 'admin_forbidden'
  | 'override_required'
  | 'override_expired'
  | 'fs_outside_safe_root';

export type CapabilityDecision =
  | { allowed: true; tier: KidsCapabilityTier; viaOverride: boolean }
  | { allowed: false; tier: KidsCapabilityTier; code: DenyCode; message: string };

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface KidsModeConfig {
  /** Master switch. If false, the module is a no-op (8gent OS adult flow). */
  enabled: boolean;
  /** Tier assigned to capabilities not explicitly named in `tierMap`. */
  defaultTier: KidsCapabilityTier;
  /** Per-capability tier overrides. */
  tierMap: Partial<Record<KidsCapability, KidsCapabilityTier>>;
  /** Hostnames (no scheme, no port) that are always reachable at the `moderate`
   *  tier. Subdomains match by suffix. */
  networkAllowlist: string[];
  /** Filesystem roots (absolute, no trailing slash) the child may write to.
   *  Reads are allowed everywhere within the project sandbox; writes are
   *  denied unless the path lives under one of these. */
  safeWriteRoots: string[];
  /** Optional content filter. Returns the (possibly redacted) text plus a
   *  flag indicating whether the original was modified. */
  contentFilter?: (text: string) => Promise<ContentFilterResult> | ContentFilterResult;
  /** Maximum activity log entries kept in memory before flushing to the
   *  store. The store still receives every entry; this only bounds RAM. */
  activityBufferSize: number;
}

export interface ContentFilterResult {
  text: string;
  modified: boolean;
  /** Optional categories the filter flagged (e.g. `violence`, `adult`). */
  flags?: string[];
}

// ---------------------------------------------------------------------------
// Parental override
// ---------------------------------------------------------------------------

/**
 * A time-bounded grant that elevates a single capability past its default
 * tier. The grant is created server-side after parent auth (Clerk session
 * or VPC-style email token) and has a hard expiry.
 */
export interface ParentalOverride {
  capability: KidsCapability;
  /** ISO-8601 timestamp when the override starts. */
  grantedAt: string;
  /** ISO-8601 timestamp when the override expires. */
  expiresAt: string;
  /** Opaque identifier for the parent who granted it (e.g. Clerk user id).
   *  Stored hashed in the activity log; raw form is never written to disk. */
  grantedBy: string;
  /** Optional resource string this override is scoped to. Empty = any
   *  resource for that capability. */
  resource?: string;
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export interface ActivityLogEntry {
  /** ISO-8601 timestamp. */
  ts: string;
  /** Random 16-hex id, unique per entry. */
  id: string;
  capability: KidsCapability;
  resource?: string;
  reason?: string;
  outcome: 'allowed' | 'denied' | 'override_used';
  tier: KidsCapabilityTier;
  /** Present when outcome is `denied`. */
  denyCode?: DenyCode;
  /** Hashed parent id when `outcome === 'override_used'`. */
  parentHash?: string;
}
