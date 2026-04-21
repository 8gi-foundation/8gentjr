/**
 * Unit tests for privacy-store. Runs under `bun test`.
 *
 * We use a tiny in-memory KV shim so the store can be exercised without a DOM.
 */
import { describe, it, expect } from 'bun:test';
import {
  CHILD_DATA_KEYS,
  daysRemaining,
  deleteEverything,
  readDeletionProof,
  readPrivacyState,
  restoreConsent,
  withdrawConsent,
  type KVStore,
} from './privacy-store';
import { CONSENT_STORAGE_KEY } from './privacy-constants';

function memoryStore(seed: Record<string, string> = {}): KVStore {
  const data = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); },
    removeItem: (k) => { data.delete(k); },
    keys: () => Array.from(data.keys()),
  };
}

describe('privacy-store', () => {
  it('defaults to active', () => {
    const shim = memoryStore();
    expect(readPrivacyState(shim).status).toBe('active');
  });

  it('withdraws and starts the grace countdown', () => {
    const shim = memoryStore();
    const now = new Date('2026-04-21T12:00:00Z');
    const state = withdrawConsent({ parentEmail: 'p@x.com', gracePeriodDays: 30, now }, shim);
    expect(state.status).toBe('withdrawn');
    expect(state.purgeAfter).toBe(new Date(now.getTime() + 30 * 86_400_000).toISOString());

    const later = new Date(now.getTime() + 9 * 86_400_000);
    expect(daysRemaining(state, later)).toBe(21);

    const expired = new Date(now.getTime() + 31 * 86_400_000);
    expect(daysRemaining(state, expired)).toBe(0);
  });

  it('honours a configurable grace period', () => {
    const shim = memoryStore();
    const state = withdrawConsent({ parentEmail: 'p@x.com', gracePeriodDays: 7 }, shim);
    expect(state.gracePeriodDays).toBe(7);
  });

  it('restore flips back to active', () => {
    const shim = memoryStore();
    withdrawConsent({ parentEmail: 'p@x.com' }, shim);
    const state = restoreConsent(shim);
    expect(state.status).toBe('active');
  });

  it('delete-all happy path: purges child-data keys and writes proof', async () => {
    const seed: Record<string, string> = { [CONSENT_STORAGE_KEY]: JSON.stringify({ parentEmail: 'p@x.com' }) };
    for (const key of CHILD_DATA_KEYS) seed[key] = 'sensitive';
    const shim = memoryStore(seed);

    const proof = await deleteEverything({ parentEmail: 'p@x.com', policyVersion: '2026-04-10' }, shim);

    for (const key of CHILD_DATA_KEYS) {
      expect(shim.getItem(key)).toBeNull();
    }
    expect(proof.emailHash).toMatch(/^[a-f0-9]{64}$/);
    expect(proof.emailHash).not.toContain('p@x.com');
    expect(proof.receiptId.startsWith('JR-')).toBe(true);
    const readBack = readDeletionProof(shim);
    expect(readBack?.emailHash).toBe(proof.emailHash);
    expect(readPrivacyState(shim).status).toBe('deleted');
  });

  it('delete-all is idempotent', async () => {
    const shim = memoryStore();
    const first = await deleteEverything({ parentEmail: 'p@x.com' }, shim);
    const second = await deleteEverything({ parentEmail: 'p@x.com' }, shim);
    expect(second.receiptId).toBe(first.receiptId);
    expect(second.deletedAt).toBe(first.deletedAt);
  });

  it('deletion-proof record persists across reads', async () => {
    const shim = memoryStore();
    await deleteEverything({ parentEmail: 'p@x.com' }, shim);
    const proof1 = readDeletionProof(shim);
    const proof2 = readDeletionProof(shim);
    expect(proof1).not.toBeNull();
    expect(proof1?.receiptId).toBe(proof2?.receiptId);
  });

  it('email is stored only as SHA-256 hash', async () => {
    const shim = memoryStore();
    await deleteEverything({ parentEmail: 'Parent@Example.COM' }, shim);
    const rawProof = shim.getItem('8gentjr_deletion_proof') ?? '';
    expect(rawProof).not.toContain('Parent');
    expect(rawProof).not.toContain('example.com');
  });
});
