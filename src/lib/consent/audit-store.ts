/**
 * VPC Audit Store
 *
 * Immutable, append-only JSONL audit log for COPPA parental consent events.
 * File-backed for now (data/consent/vpc-audit.jsonl). Each row captures:
 *   timestamp, event, sid, email (lowercased), step, tokenHash, ip, userAgent.
 *
 * Read path supports the admin audit route. Single-use tracking is enforced
 * via the consumedTokenHashes() lookup - a token hash that already appears
 * in a 'step-N-confirmed' or 'step-N-consumed' row is invalid.
 *
 * Swap this for a real DB row-by-row when we move off file storage.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type VpcEvent =
  | 'step1-sent'
  | 'step1-confirmed'
  | 'step2-sent'
  | 'step2-confirmed'
  | 'expired'
  | 'withdrawn';

export interface VpcAuditRow {
  ts: string;              // ISO8601
  event: VpcEvent;
  sid: string;             // consent session id
  email: string;           // lowercased parent email
  step: 1 | 2 | null;      // step index where relevant
  tokenHash: string | null;
  ip: string | null;
  userAgent: string | null;
  noticeVersion: string;
  childProfileId: string | null;
}

const DEFAULT_NOTICE_VERSION = '2026-04-10';

function auditPath(): string {
  const dir =
    process.env.VPC_AUDIT_DIR ||
    path.join(process.cwd(), 'data', 'consent');
  return path.join(dir, 'vpc-audit.jsonl');
}

async function ensureDir(): Promise<void> {
  const dir = path.dirname(auditPath());
  await fs.mkdir(dir, { recursive: true });
}

export async function appendAudit(
  row: Omit<VpcAuditRow, 'ts' | 'noticeVersion'> & { noticeVersion?: string },
): Promise<VpcAuditRow> {
  await ensureDir();
  const { noticeVersion, ...rest } = row;
  const full: VpcAuditRow = {
    ts: new Date().toISOString(),
    noticeVersion: noticeVersion ?? DEFAULT_NOTICE_VERSION,
    ...rest,
  };
  await fs.appendFile(auditPath(), JSON.stringify(full) + '\n', 'utf8');
  return full;
}

export async function readAudit(): Promise<VpcAuditRow[]> {
  try {
    const raw = await fs.readFile(auditPath(), 'utf8');
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as VpcAuditRow);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

export async function findByEmail(email: string): Promise<VpcAuditRow[]> {
  const all = await readAudit();
  const lower = email.toLowerCase();
  return all.filter((r) => r.email === lower);
}

export async function findBySid(sid: string): Promise<VpcAuditRow[]> {
  const all = await readAudit();
  return all.filter((r) => r.sid === sid);
}

export async function consumedTokenHashes(): Promise<Set<string>> {
  const all = await readAudit();
  const s = new Set<string>();
  for (const r of all) {
    if (
      r.tokenHash &&
      (r.event === 'step1-confirmed' || r.event === 'step2-confirmed')
    ) {
      s.add(r.tokenHash);
    }
  }
  return s;
}

export async function isStep1Confirmed(sid: string): Promise<boolean> {
  const rows = await findBySid(sid);
  return rows.some((r) => r.event === 'step1-confirmed');
}

export async function isStep2Confirmed(sid: string): Promise<boolean> {
  const rows = await findBySid(sid);
  return rows.some((r) => r.event === 'step2-confirmed');
}
