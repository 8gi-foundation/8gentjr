/**
 * Server-side ledger for privacy actions.
 *
 * Records every withdrawal + deletion so a regulator can audit compliance even
 * when all client-side data is gone. Emails are stored ONLY as SHA-256 hashes.
 *
 * Storage: append-only JSONL at data/privacy/ledger.jsonl. Fine for low volume
 * and survives redeploys on Fly volumes / persistent disks. Swap for Postgres
 * when #117 adds the email-plus-VPC backend.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { sha256Hex } from './privacy-store';

export type PrivacyLedgerKind = 'withdraw' | 'withdraw-restored' | 'delete';

export interface PrivacyLedgerEntry {
  kind: PrivacyLedgerKind;
  at: string;
  emailHash: string;
  purgeAfter?: string;
  gracePeriodDays?: number;
  receiptId?: string;
  policyVersion?: string;
}

function ledgerPath(): string {
  return path.join(process.cwd(), 'data', 'privacy', 'ledger.jsonl');
}

export async function appendLedger(
  kind: PrivacyLedgerKind,
  opts: { email: string; purgeAfter?: string; gracePeriodDays?: number; receiptId?: string; policyVersion?: string },
): Promise<PrivacyLedgerEntry> {
  const entry: PrivacyLedgerEntry = {
    kind,
    at: new Date().toISOString(),
    emailHash: await sha256Hex(opts.email.trim().toLowerCase()),
    purgeAfter: opts.purgeAfter,
    gracePeriodDays: opts.gracePeriodDays,
    receiptId: opts.receiptId,
    policyVersion: opts.policyVersion,
  };
  const p = ledgerPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.appendFile(p, JSON.stringify(entry) + '\n', 'utf8');
  return entry;
}

export async function readLedger(): Promise<PrivacyLedgerEntry[]> {
  const p = ledgerPath();
  try {
    const raw = await fs.readFile(p, 'utf8');
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as PrivacyLedgerEntry);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

export interface PendingDeletion {
  emailHash: string;
  withdrawnAt: string;
  purgeAfter: string;
  daysRemaining: number;
}

export async function listPendingDeletions(now: Date = new Date()): Promise<PendingDeletion[]> {
  const entries = await readLedger();
  const latest = new Map<string, PrivacyLedgerEntry>();
  for (const e of entries) {
    latest.set(e.emailHash, e);
  }
  const out: PendingDeletion[] = [];
  for (const e of latest.values()) {
    if (e.kind !== 'withdraw' || !e.purgeAfter) continue;
    const ms = new Date(e.purgeAfter).getTime() - now.getTime();
    out.push({
      emailHash: e.emailHash,
      withdrawnAt: e.at,
      purgeAfter: e.purgeAfter,
      daysRemaining: Math.max(0, Math.ceil(ms / 86_400_000)),
    });
  }
  out.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return out;
}

export function gracePeriodDaysFromEnv(): number {
  const raw = process.env.PRIVACY_GRACE_PERIOD_DAYS;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 30;
}
