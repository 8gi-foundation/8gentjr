/**
 * VPC flow tests - run with `bun test`
 *
 * Covers:
 *   - token issue + verify happy path
 *   - expired token rejected
 *   - wrong-step rejected
 *   - audit log insert on initiate / confirmStep1 / sendStep2 / confirmStep2
 *   - single-use enforcement (already_used)
 *   - out-of-order rejection (step-2 before step-1)
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { issueToken, verifyToken } from '../tokens';
import { findBySid, findByEmail } from '../audit-store';
import {
  confirmStep1,
  confirmStep2,
  drainStep2Queue,
  initiate,
  scheduleStep2Send,
  sendStep2,
} from '../flow';
import { __setEmailSenderForTests, type EmailSender } from '../email-sender';
import { __setSchedulerForTests } from '../scheduler';

const CTX = { ip: '127.0.0.1', userAgent: 'test-agent' };

let tmpDir = '';

class CapturingSender implements EmailSender {
  sent: Array<{ to: string; subject: string; text: string; tag?: string; id: string }> = [];
  async send(msg: { to: string; subject: string; text: string; tag?: string }) {
    const id = `test-${this.sent.length + 1}`;
    this.sent.push({ ...msg, id });
    return { id };
  }
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vpc-test-'));
  process.env.VPC_AUDIT_DIR = tmpDir;
  process.env.VPC_TOKEN_SECRET = 'test-secret-do-not-use-in-prod-123456';
  process.env.VPC_STEP2_DELAY_MS = '0';
});

afterEach(async () => {
  __setEmailSenderForTests(null);
  __setSchedulerForTests(null);
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('tokens', () => {
  test('issue and verify happy path', () => {
    const t = issueToken({ sid: 'abc', step: 1, email: 'p@example.com' });
    const v = verifyToken(t, 1);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.payload.email).toBe('p@example.com');
      expect(v.payload.step).toBe(1);
      expect(v.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  test('wrong step is rejected', () => {
    const t = issueToken({ sid: 'abc', step: 1, email: 'p@example.com' });
    const v = verifyToken(t, 2);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toBe('wrong_step');
  });

  test('expired token is rejected', () => {
    const t = issueToken({ sid: 'abc', step: 1, email: 'p@example.com' }, { expiresInDays: -1 });
    const v = verifyToken(t, 1);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toBe('expired');
  });

  test('malformed token is rejected', () => {
    const v = verifyToken('not-a-token', 1);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toBe('malformed');
  });

  test('tampered signature is rejected', () => {
    const t = issueToken({ sid: 'abc', step: 1, email: 'p@example.com' });
    const [body] = t.split('.');
    const tampered = `${body}.AAAAAAAA`;
    const v = verifyToken(tampered, 1);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toBe('bad_signature');
  });
});

describe('flow', () => {
  test('end-to-end happy path', async () => {
    const sender = new CapturingSender();
    __setEmailSenderForTests(sender);

    const init = await initiate({
      email: 'Parent@Example.com',
      childProfileId: 'child-1',
      baseUrl: 'https://8gentjr.com',
      ctx: CTX,
    });
    expect(init.sid).toBeTruthy();
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].tag).toBe('vpc-step-1');
    expect(sender.sent[0].to).toBe('parent@example.com');

    // Step 1 confirm
    const step1Token = init.token;
    const c1 = await confirmStep1(step1Token, CTX);
    expect(c1.ok).toBe(true);

    // Step 2 send
    const s2 = await sendStep2({
      sid: init.sid,
      email: 'parent@example.com',
      baseUrl: 'https://8gentjr.com',
      childProfileId: 'child-1',
      ctx: CTX,
    });
    expect(sender.sent).toHaveLength(2);
    expect(sender.sent[1].tag).toBe('vpc-step-2');

    // Step 2 confirm
    const c2 = await confirmStep2(s2.token, CTX);
    expect(c2.ok).toBe(true);

    const rows = await findBySid(init.sid);
    const events = rows.map((r) => r.event);
    expect(events).toEqual([
      'step1-sent',
      'step1-confirmed',
      'step2-sent',
      'step2-confirmed',
    ]);
    for (const r of rows) {
      expect(r.email).toBe('parent@example.com');
      expect(r.noticeVersion).toBeTruthy();
      expect(r.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  test('audit log captures ip and user-agent', async () => {
    __setEmailSenderForTests(new CapturingSender());
    await initiate({
      email: 'a@b.com',
      childProfileId: null,
      baseUrl: 'https://8gentjr.com',
      ctx: { ip: '10.0.0.5', userAgent: 'UA/1.0' },
    });
    const rows = await findByEmail('a@b.com');
    expect(rows[0].ip).toBe('10.0.0.5');
    expect(rows[0].userAgent).toBe('UA/1.0');
    expect(rows[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('single-use: step-1 token cannot be replayed', async () => {
    __setEmailSenderForTests(new CapturingSender());
    const init = await initiate({
      email: 'x@y.com',
      childProfileId: null,
      baseUrl: 'https://8gentjr.com',
      ctx: CTX,
    });
    const first = await confirmStep1(init.token, CTX);
    expect(first.ok).toBe(true);
    const second = await confirmStep1(init.token, CTX);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('already_used');
  });

  test('step-2 before step-1 is rejected', async () => {
    __setEmailSenderForTests(new CapturingSender());
    const init = await initiate({
      email: 'x@y.com',
      childProfileId: null,
      baseUrl: 'https://8gentjr.com',
      ctx: CTX,
    });
    // Manually forge a step-2 token with same sid/email
    const step2 = issueToken({ sid: init.sid, step: 2, email: 'x@y.com' });
    const res = await confirmStep2(step2, CTX);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('out_of_order');
  });

  test('expired token on confirmStep1 returns expired_token', async () => {
    __setEmailSenderForTests(new CapturingSender());
    const expired = issueToken(
      { sid: 'zzz', step: 1, email: 'p@p.com' },
      { expiresInDays: -1 },
    );
    const res = await confirmStep1(expired, CTX);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('expired_token');
  });
});

describe('scheduler', () => {
  test('scheduleStep2Send with delay=0 fires step-2 via InProcessScheduler', async () => {
    const sender = new CapturingSender();
    __setEmailSenderForTests(sender);

    const init = await initiate({
      email: 'parent@example.com',
      childProfileId: null,
      baseUrl: 'https://8gentjr.com',
      ctx: CTX,
    });
    await confirmStep1(init.token, CTX);
    await scheduleStep2Send({
      sid: init.sid,
      email: 'parent@example.com',
      baseUrl: 'https://8gentjr.com',
      childProfileId: null,
      ctx: CTX,
    });

    // InProcessScheduler fires `void run()` at delay=0; wait one macrotask.
    await new Promise((resolve) => setTimeout(resolve, 20));

    const step2Mail = sender.sent.find((m) => m.tag === 'vpc-step-2');
    expect(step2Mail).toBeDefined();
    const rows = await findBySid(init.sid);
    expect(rows.map((r) => r.event)).toContain('step2-sent');
  });

  test('drainStep2Queue is a no-op on the in-process scheduler', async () => {
    // In-process has no durable queue; drain always reports zero.
    const result = await drainStep2Queue();
    expect(result).toEqual({ delivered: 0, failed: 0 });
  });
});
