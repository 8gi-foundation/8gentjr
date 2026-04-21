// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the feedback submit path. Runs via `bun test`.
 *
 * Covers the two behaviours the endpoint must get right:
 *   1. honeypot detection — filled `website` field = silent 202, no DB write
 *   2. valid submission   — returns 201, row written to JSONL with hashed IP
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { __resetRateLimit, hashIp, rateLimit } from './feedback-store';
import { POST } from '../app/api/feedback/route';

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.5',
      'user-agent': 'bun-test/1.0',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/feedback', () => {
  const origCwd = process.cwd();
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'fb-test-'));
    process.chdir(workDir);
    __resetRateLimit();
  });

  afterEach(async () => {
    process.chdir(origCwd);
    await rm(workDir, { recursive: true, force: true });
  });

  test('honeypot submission is silently accepted with no DB write', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(jsonRequest({
      role: 'parent',
      works_well: 'great app',
      consent: true,
      website: 'http://spam.example', // honeypot tripped
    }) as any);
    expect(res.status).toBe(202);
    // No file should have been created.
    const file = path.join(workDir, 'data', 'feedback', 'submissions.jsonl');
    await expect(readFile(file, 'utf8')).rejects.toThrow();
  });

  test('valid submission returns 201 and writes a row with hashed IP', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(jsonRequest({
      role: 'teacher',
      relationship: 'classroom teacher',
      works_well: 'the core board is clear',
      should_change: 'more verbs',
      contact_email: '',
      consent: true,
    }) as any);
    expect(res.status).toBe(201);
    const json = (await res.json()) as { ok: boolean; id: string };
    expect(json.ok).toBe(true);
    expect(json.id).toMatch(/^[a-f0-9]{16}$/);

    const file = path.join(workDir, 'data', 'feedback', 'submissions.jsonl');
    const contents = await readFile(file, 'utf8');
    const row = JSON.parse(contents.trim());
    expect(row.role).toBe('teacher');
    expect(row.works_well).toBe('the core board is clear');
    expect(row.contact_email).toBeNull();
    expect(row.ip_hash).toHaveLength(32);
    expect(row.ip_hash).not.toContain('203.0.113.5');
  });

  test('missing consent is rejected with 400', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(jsonRequest({
      role: 'parent',
      works_well: 'hi',
      consent: false,
    }) as any);
    expect(res.status).toBe(400);
  });

  test('invalid role is rejected with 400', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(jsonRequest({
      role: 'hacker',
      works_well: 'hi',
      consent: true,
    }) as any);
    expect(res.status).toBe(400);
  });

  test('rate limiter allows 5 then blocks', () => {
    __resetRateLimit();
    const h = hashIp('198.51.100.1');
    for (let i = 0; i < 5; i++) expect(rateLimit(h)).toBe(true);
    expect(rateLimit(h)).toBe(false);
  });
});
