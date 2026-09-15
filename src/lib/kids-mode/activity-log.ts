/**
 * Kids-Mode Activity Log
 *
 * Append-only JSONL store of every capability decision. Lives at
 * `data/kids-mode/activity.jsonl` to match the existing data/ pattern
 * (see feedback-store, consent audit-store).
 *
 * The log is meant for parent review, not surveillance. We never write
 * the raw text the child typed, never the agent's response body — only
 * the capability name, an optional opaque resource string, and the
 * decision outcome.
 */
import { createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ActivityLogEntry } from './types';

function dataDir(): string {
  // Tests override CWD; production resolves to repo root at runtime.
  const override = process.env.KIDS_MODE_DATA_DIR;
  if (override) return override;
  return path.join(process.cwd(), 'data', 'kids-mode');
}

function logFile(): string {
  return path.join(dataDir(), 'activity.jsonl');
}

export function newEntryId(): string {
  return randomBytes(8).toString('hex');
}

/** Hash a parent identifier so the raw id never lands on disk. */
export function hashParentId(parentId: string): string {
  const salt = process.env.KIDS_MODE_PARENT_SALT ?? 'kids-mode-default-salt';
  return createHash('sha256').update(`${salt}:${parentId}`).digest('hex').slice(0, 32);
}

export async function appendActivity(entry: ActivityLogEntry): Promise<void> {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(logFile(), JSON.stringify(entry) + '\n', 'utf8');
}

export async function readActivity(limit = 200): Promise<ActivityLogEntry[]> {
  try {
    const raw = await fs.readFile(logFile(), 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    return lines
      .slice(-limit)
      .reverse()
      .map((l) => JSON.parse(l) as ActivityLogEntry);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw err;
  }
}

/** Test helper: wipe the log file. Not exposed via the public barrel. */
export async function __resetActivityLogForTests(): Promise<void> {
  try {
    await fs.rm(logFile());
  } catch {
    /* file may not exist; ignore */
  }
}
