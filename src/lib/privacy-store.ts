/**
 * 8gent Jr: Privacy store (GDPR Art 7(3) + Art 17)
 *
 * Parent-facing primitives for:
 *   1. Withdraw consent with a configurable grace period (default 30 days)
 *   2. Delete everything now (hard delete, keeps a deletion-proof record)
 *
 * All state is localStorage-backed today (Clerk + server persistence arrives
 * with a later issue). The module is isomorphic: pure functions that accept an
 * optional storage shim so tests can run under Bun without a DOM.
 *
 * Ref: docs/legal/2026-04-21-8gentjr-dpia-interim.md in 8gi-governance.
 */
import { CONSENT_STORAGE_KEY } from './privacy-constants';

export const PRIVACY_STORAGE_KEY = '8gentjr_privacy_state';
export const DELETION_PROOF_KEY = '8gentjr_deletion_proof';
export const DEFAULT_GRACE_DAYS = 30;

/** Keys we purge on delete-all. Add new child-data keys here as they appear. */
export const CHILD_DATA_KEYS = [
  CONSENT_STORAGE_KEY,
  '8gentjr-app-settings',
  '8gentjr_sentence_history',
  '8gentjr_vocabulary',
  '8gentjr_progress',
  '8gentjr_transcripts',
  '8gentjr_session_log',
  '8gentjr_vpc_audit',
];

export type PrivacyStatus = 'active' | 'withdrawn' | 'deleted';

export interface PrivacyState {
  status: PrivacyStatus;
  withdrawnAt?: string;      // ISO
  gracePeriodDays: number;   // snapshot of env at withdrawal time
  purgeAfter?: string;       // ISO; when grace expires
  parentEmail?: string;      // email to notify
}

export interface DeletionProof {
  /** SHA-256 hex digest of the deleted parent email (so we cannot rebuild PII). */
  emailHash: string;
  deletedAt: string;         // ISO
  reason: 'parent-request-art-17';
  policyVersion: string;
  /** Opaque short id for the parent to reference if they email us. */
  receiptId: string;
}

/** Minimal storage shape we need. Window.localStorage satisfies this. */
export interface KVStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  keys?(): string[];
}

function getStore(shim?: KVStore): KVStore | null {
  if (shim) return shim;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function readPrivacyState(shim?: KVStore): PrivacyState {
  const s = getStore(shim);
  if (!s) return { status: 'active', gracePeriodDays: DEFAULT_GRACE_DAYS };
  try {
    const raw = s.getItem(PRIVACY_STORAGE_KEY);
    if (!raw) return { status: 'active', gracePeriodDays: DEFAULT_GRACE_DAYS };
    return JSON.parse(raw) as PrivacyState;
  } catch {
    return { status: 'active', gracePeriodDays: DEFAULT_GRACE_DAYS };
  }
}

export function writePrivacyState(state: PrivacyState, shim?: KVStore): void {
  const s = getStore(shim);
  if (!s) return;
  s.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(state));
}

export function readDeletionProof(shim?: KVStore): DeletionProof | null {
  const s = getStore(shim);
  if (!s) return null;
  try {
    const raw = s.getItem(DELETION_PROOF_KEY);
    return raw ? (JSON.parse(raw) as DeletionProof) : null;
  } catch {
    return null;
  }
}

/**
 * Withdraw consent. Starts the grace timer. Child data is retained but
 * processing must stop (UI enforces by reading status before showing AAC).
 */
export function withdrawConsent(
  opts: { parentEmail?: string; gracePeriodDays?: number; now?: Date } = {},
  shim?: KVStore,
): PrivacyState {
  const now = opts.now ?? new Date();
  const grace = Math.max(1, opts.gracePeriodDays ?? DEFAULT_GRACE_DAYS);
  const purge = new Date(now.getTime() + grace * 86_400_000);
  const state: PrivacyState = {
    status: 'withdrawn',
    withdrawnAt: now.toISOString(),
    gracePeriodDays: grace,
    purgeAfter: purge.toISOString(),
    parentEmail: opts.parentEmail,
  };
  writePrivacyState(state, shim);
  return state;
}

/** Parent changed their mind inside the grace window. */
export function restoreConsent(shim?: KVStore): PrivacyState {
  const state: PrivacyState = { status: 'active', gracePeriodDays: DEFAULT_GRACE_DAYS };
  writePrivacyState(state, shim);
  return state;
}

/** Days remaining before purge (0 if expired, 0 if not withdrawn). */
export function daysRemaining(state: PrivacyState, now: Date = new Date()): number {
  if (state.status !== 'withdrawn' || !state.purgeAfter) return 0;
  const ms = new Date(state.purgeAfter).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Hard delete of every child-data key. Leaves ONLY a deletion-proof record
 * (SHA-256 hash of email + timestamp + receipt id) per Art 17(3)(e).
 *
 * Idempotent: re-running is a no-op if state is already 'deleted'.
 */
export async function deleteEverything(
  opts: { parentEmail: string; policyVersion?: string; now?: Date },
  shim?: KVStore,
): Promise<DeletionProof> {
  const s = getStore(shim);
  if (!s) throw new Error('privacy-store: no storage available');

  const existing = readDeletionProof(shim);
  if (existing) return existing;

  for (const key of CHILD_DATA_KEYS) {
    try { s.removeItem(key); } catch { /* continue */ }
  }

  const proof: DeletionProof = {
    emailHash: await sha256Hex(opts.parentEmail.trim().toLowerCase()),
    deletedAt: (opts.now ?? new Date()).toISOString(),
    reason: 'parent-request-art-17',
    policyVersion: opts.policyVersion ?? '2026-04-10',
    receiptId: randomReceipt(),
  };

  s.setItem(DELETION_PROOF_KEY, JSON.stringify(proof));
  s.setItem(
    PRIVACY_STORAGE_KEY,
    JSON.stringify({ status: 'deleted', gracePeriodDays: DEFAULT_GRACE_DAYS } as PrivacyState),
  );

  return proof;
}

/** SHA-256 hex via Web Crypto (Node 19+, Bun, all modern browsers). */
export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await globalThis.crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomReceipt(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return 'JR-' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
