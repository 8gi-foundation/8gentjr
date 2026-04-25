/**
 * VPC Audit Store
 *
 * Immutable, append-only audit log for COPPA parental consent events.
 *
 * Two backends, selected at runtime:
 *   - Vercel Blob (private store) when BLOB_READ_WRITE_TOKEN is present
 *     — one blob per row under prefix `vpc-audit/`. Works on Vercel's
 *     read-only serverless filesystem. Rows survive cold starts.
 *   - JSONL file at data/consent/vpc-audit.jsonl otherwise
 *     — dev default; tests override VPC_AUDIT_DIR to a tmp dir.
 *
 * Single-use token enforcement and step ordering depend on every row
 * being durably persisted — never swallow errors from appendAudit.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { get, list, put } from '@vercel/blob';

export type VpcEvent =
  | 'step1-sent'
  | 'step1-confirmed'
  | 'step2-sent'
  | 'step2-confirmed'
  | 'expired'
  | 'withdrawn';

export interface VpcAuditRow {
  ts: string;
  event: VpcEvent;
  sid: string;
  email: string;
  step: 1 | 2 | null;
  tokenHash: string | null;
  ip: string | null;
  userAgent: string | null;
  noticeVersion: string;
  childProfileId: string | null;
}

const DEFAULT_NOTICE_VERSION = '2026-04-10';
const BLOB_PREFIX = 'vpc-audit/';

interface Backend {
  append(row: VpcAuditRow): Promise<void>;
  readAll(): Promise<VpcAuditRow[]>;
}

// ---------------------------------------------------------------------------
// Filesystem backend — local dev + tests
// ---------------------------------------------------------------------------

function auditPath(): string {
  const dir =
    process.env.VPC_AUDIT_DIR ||
    path.join(process.cwd(), 'data', 'consent');
  return path.join(dir, 'vpc-audit.jsonl');
}

const fileBackend: Backend = {
  async append(row) {
    const file = auditPath();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, JSON.stringify(row) + '\n', 'utf8');
  },
  async readAll() {
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
  },
};

// ---------------------------------------------------------------------------
// Vercel Blob backend — prod / anywhere the store is linked
// ---------------------------------------------------------------------------

function rowPathname(row: VpcAuditRow): string {
  // ts sorts lexicographically, sid+event disambiguate parallel rows.
  const safeTs = row.ts.replace(/[:.]/g, '-');
  return `${BLOB_PREFIX}${safeTs}__${row.sid}__${row.event}.json`;
}

const blobBackend: Backend = {
  async append(row) {
    await put(rowPathname(row), JSON.stringify(row), {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json',
      allowOverwrite: false,
    });
  },
  async readAll() {
    const rows: VpcAuditRow[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: BLOB_PREFIX, cursor, limit: 1000 });
      const fetched = await Promise.all(
        page.blobs.map(async (b) => {
          const result = await get(b.pathname, { access: 'private' });
          if (!result || result.statusCode !== 200) {
            throw new Error(`blob get failed for ${b.pathname}`);
          }
          const text = await new Response(result.stream).text();
          return JSON.parse(text) as VpcAuditRow;
        }),
      );
      rows.push(...fetched);
      cursor = page.cursor;
    } while (cursor);
    rows.sort((a, b) => a.ts.localeCompare(b.ts));
    return rows;
  },
};

// ---------------------------------------------------------------------------
// Backend selection
// ---------------------------------------------------------------------------

function pickBackend(): Backend {
  // Tests force the filesystem path by setting VPC_AUDIT_DIR; honor that
  // even if a Blob token happens to be in the dev env.
  if (process.env.VPC_AUDIT_DIR) return fileBackend;
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobBackend;
  return fileBackend;
}

let backendSingleton: Backend | null = null;
function getBackend(): Backend {
  if (!backendSingleton) backendSingleton = pickBackend();
  return backendSingleton;
}

/** Test helper: reset the backend selection cache (honors env changes between tests). */
export function __resetBackendForTests(): void {
  backendSingleton = null;
}

// ---------------------------------------------------------------------------
// Public API — unchanged signatures
// ---------------------------------------------------------------------------

export async function appendAudit(
  row: Omit<VpcAuditRow, 'ts' | 'noticeVersion'> & { noticeVersion?: string },
): Promise<VpcAuditRow> {
  const { noticeVersion, ...rest } = row;
  const full: VpcAuditRow = {
    ts: new Date().toISOString(),
    noticeVersion: noticeVersion ?? DEFAULT_NOTICE_VERSION,
    ...rest,
  };
  await getBackend().append(full);
  return full;
}

export async function readAudit(): Promise<VpcAuditRow[]> {
  return getBackend().readAll();
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
