// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Kids-Mode policy tests — run with `bun test`.
 *
 * Covers:
 *   - safe / moderate / dangerous / admin tier behaviour
 *   - network allowlist + subdomain matching
 *   - filesystem safe-root enforcement
 *   - parental override grant + expiry + revoke
 *   - admin override is rejected
 *   - content filter integration
 *   - activity log captures every decision
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { __resetActivityLogForTests, readActivity } from '../activity-log';
import { KidsModePolicy, createDefaultConfig } from '../policy';

let tmp = '';

beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'kids-mode-test-'));
  process.env.KIDS_MODE_DATA_DIR = tmp;
  process.env.KIDS_MODE_PARENT_SALT = 'test-salt';
  await __resetActivityLogForTests();
});

afterEach(async () => {
  delete process.env.KIDS_MODE_DATA_DIR;
  delete process.env.KIDS_MODE_PARENT_SALT;
  await rm(tmp, { recursive: true, force: true });
});

describe('tier defaults', () => {
  test('safe capabilities are always allowed', async () => {
    const p = new KidsModePolicy();
    const d = await p.check({ capability: 'fs.read', resource: '/anywhere' });
    expect(d.allowed).toBe(true);
    if (d.allowed) {
      expect(d.tier).toBe('safe');
      expect(d.viaOverride).toBe(false);
    }
  });

  test('admin capabilities are hard-blocked even with override attempt', async () => {
    const p = new KidsModePolicy();
    expect(() =>
      p.grantOverride({
        capability: 'admin.policy',
        durationMs: 60_000,
        grantedBy: 'parent-1',
      }),
    ).toThrow();
    const d = await p.check({ capability: 'admin.account' });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('admin_forbidden');
  });

  test('disabled policy passes everything without logging', async () => {
    const cfg = { ...createDefaultConfig(), enabled: false };
    const p = new KidsModePolicy(cfg);
    const d = await p.check({ capability: 'admin.billing' });
    expect(d.allowed).toBe(true);
    const log = await readActivity();
    expect(log).toHaveLength(0);
  });
});

describe('network allowlist', () => {
  test('allowlisted host passes', async () => {
    const p = new KidsModePolicy();
    const d = await p.check({ capability: 'net.http', resource: 'https://arasaac.org/api/x' });
    expect(d.allowed).toBe(true);
  });

  test('subdomain of allowlisted host passes', async () => {
    const p = new KidsModePolicy();
    const d = await p.check({
      capability: 'net.http',
      resource: 'https://api.arasaac.org/some/path',
    });
    expect(d.allowed).toBe(true);
  });

  test('non-allowlisted host is denied with not_allowlisted', async () => {
    const p = new KidsModePolicy();
    const d = await p.check({ capability: 'net.http', resource: 'https://evil.example/x' });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('not_allowlisted');
  });

  test('missing url on a network capability is denied', async () => {
    const p = new KidsModePolicy();
    const d = await p.check({ capability: 'net.http' });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('not_allowlisted');
  });

  test('malformed url is denied', async () => {
    const p = new KidsModePolicy();
    const d = await p.check({ capability: 'net.http', resource: 'not-a-url' });
    expect(d.allowed).toBe(false);
  });
});

describe('filesystem safe roots', () => {
  test('write under a safe root passes', async () => {
    const cfg = createDefaultConfig();
    cfg.safeWriteRoots = ['/tmp/jr-sandbox'];
    const p = new KidsModePolicy(cfg);
    const d = await p.check({ capability: 'fs.write', resource: '/tmp/jr-sandbox/draw.png' });
    expect(d.allowed).toBe(true);
  });

  test('write outside safe root is denied', async () => {
    const cfg = createDefaultConfig();
    cfg.safeWriteRoots = ['/tmp/jr-sandbox'];
    const p = new KidsModePolicy(cfg);
    const d = await p.check({ capability: 'fs.write', resource: '/etc/passwd' });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('fs_outside_safe_root');
  });

  test('write with no resource is denied', async () => {
    const p = new KidsModePolicy();
    const d = await p.check({ capability: 'fs.write' });
    expect(d.allowed).toBe(false);
  });
});

describe('parental override', () => {
  test('override lifts a dangerous capability for the configured window', async () => {
    const p = new KidsModePolicy();
    const ovr = p.grantOverride({
      capability: 'media.camera',
      durationMs: 60_000,
      grantedBy: 'parent-clerk-id',
    });
    expect(ovr.capability).toBe('media.camera');

    const d = await p.check({ capability: 'media.camera', reason: 'video-call' });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.viaOverride).toBe(true);

    const log = await readActivity();
    const entry = log.find((e) => e.capability === 'media.camera');
    expect(entry?.outcome).toBe('override_used');
    expect(entry?.parentHash).toMatch(/^[a-f0-9]{32}$/);
    // raw parent id never leaks
    expect(entry?.parentHash).not.toContain('parent-clerk-id');
  });

  test('expired override no longer lifts the capability', async () => {
    const p = new KidsModePolicy();
    p.grantOverride({
      capability: 'agent.spawn',
      durationMs: 1, // expires almost immediately
      grantedBy: 'parent-1',
    });
    await new Promise((r) => setTimeout(r, 5));
    const d = await p.check({ capability: 'agent.spawn' });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('override_required');
  });

  test('override duration is clamped to 24h', () => {
    const p = new KidsModePolicy();
    const ovr = p.grantOverride({
      capability: 'media.camera',
      durationMs: 10 * 24 * 60 * 60 * 1000,
      grantedBy: 'parent-1',
    });
    const span = Date.parse(ovr.expiresAt) - Date.parse(ovr.grantedAt);
    expect(span).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  test('revokeOverride removes the grant', async () => {
    const p = new KidsModePolicy();
    p.grantOverride({
      capability: 'media.camera',
      durationMs: 60_000,
      grantedBy: 'parent-1',
    });
    expect(p.revokeOverride('media.camera')).toBe(true);
    const d = await p.check({ capability: 'media.camera' });
    expect(d.allowed).toBe(false);
  });

  test('resource-scoped override only matches the same resource', async () => {
    const p = new KidsModePolicy();
    p.grantOverride({
      capability: 'net.http',
      durationMs: 60_000,
      grantedBy: 'parent-1',
      resource: 'https://specific.example/x',
    });
    const a = await p.check({ capability: 'net.http', resource: 'https://specific.example/x' });
    const b = await p.check({ capability: 'net.http', resource: 'https://other.example/y' });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(false);
  });
});

describe('content filter', () => {
  test('returns text untouched when no filter configured', async () => {
    const p = new KidsModePolicy();
    const r = await p.filterContent('hello world');
    expect(r.text).toBe('hello world');
    expect(r.modified).toBe(false);
  });

  test('logs a denial when the filter modifies output', async () => {
    const cfg = createDefaultConfig();
    cfg.contentFilter = (text) => ({
      text: text.replace(/badword/g, '****'),
      modified: text.includes('badword'),
      flags: ['profanity'],
    });
    const p = new KidsModePolicy(cfg);
    const r = await p.filterContent('this has badword in it');
    expect(r.text).toBe('this has **** in it');
    expect(r.modified).toBe(true);
    const log = await readActivity();
    const entry = log.find((e) => e.capability === 'content.agent');
    expect(entry).toBeTruthy();
    expect(entry?.reason).toContain('profanity');
  });
});

describe('activity log', () => {
  test('every decision writes one entry', async () => {
    const p = new KidsModePolicy();
    await p.check({ capability: 'fs.read', resource: '/ok' });
    await p.check({ capability: 'net.http', resource: 'https://evil.example' });
    await p.check({ capability: 'admin.policy' });
    const log = await readActivity();
    // entries are returned newest-first
    expect(log).toHaveLength(3);
    expect(log[0].outcome).toBe('denied');
    expect(log[0].denyCode).toBe('admin_forbidden');
    expect(log[2].outcome).toBe('allowed');
  });
});
