/**
 * feedback-store — persistence + rate limiting for public feedback form.
 *
 * Storage: append-only JSONL at data/feedback/submissions.jsonl.
 *   - File-based, zero dependencies, matches existing data/ pattern.
 *   - One submission per line. Easy to migrate to SQLite later.
 *
 * Rate limit: per-IP bucket in memory. 5 submissions per 15 minutes.
 *   - Process-local. Good enough for a low-volume feedback endpoint.
 *
 * IP handling: we hash IPs with a rotating daily salt and never store raw.
 *   - Satisfies the DPIA data-minimisation requirement.
 */
import { createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface FeedbackSubmission {
  id: string;
  createdAt: string;
  role: string;
  relationship: string;
  works_well: string;
  should_change: string;
  contact_email: string | null;
  user_agent: string;
  ip_hash: string;
}

export const ALLOWED_ROLES = [
  'parent',
  'carer',
  'adult-user',
  'teacher',
  'speech-therapist',
  'researcher',
  'other',
] as const;

export type FeedbackRole = (typeof ALLOWED_ROLES)[number];

export const LIMITS = {
  relationship: 300,
  worksWell: 1000,
  shouldChange: 1000,
  email: 254,
} as const;

// Per-IP in-memory rate limiter. 5 submits per 15 min window.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const buckets = new Map<string, number[]>();

export function rateLimit(ipHash: string, now: number = Date.now()): boolean {
  const arr = buckets.get(ipHash) ?? [];
  const recent = arr.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    buckets.set(ipHash, recent);
    return false;
  }
  recent.push(now);
  buckets.set(ipHash, recent);
  return true;
}

// Daily salt — prevents cross-day correlation while keeping same-day dedup.
function dailySalt(): string {
  const seed = process.env.FEEDBACK_IP_SALT ?? 'feedback-default-salt';
  const day = new Date().toISOString().slice(0, 10);
  return `${seed}:${day}`;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`${dailySalt()}:${ip}`).digest('hex').slice(0, 32);
}

export function extractIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}

function dataDir(): string {
  return path.join(process.cwd(), 'data', 'feedback');
}

export async function appendSubmission(
  s: Omit<FeedbackSubmission, 'id' | 'createdAt'>,
): Promise<FeedbackSubmission> {
  const full: FeedbackSubmission = {
    id: randomBytes(8).toString('hex'),
    createdAt: new Date().toISOString(),
    ...s,
  };
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  const line = JSON.stringify(full) + '\n';
  await fs.appendFile(path.join(dir, 'submissions.jsonl'), line, 'utf8');
  return full;
}

export async function listSubmissions(limit = 50): Promise<FeedbackSubmission[]> {
  const file = path.join(dataDir(), 'submissions.jsonl');
  try {
    const raw = await fs.readFile(file, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    return lines
      .slice(-limit)
      .reverse()
      .map((l) => JSON.parse(l) as FeedbackSubmission);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw err;
  }
}

/** Exposed for tests only. */
export function __resetRateLimit(): void {
  buckets.clear();
}
