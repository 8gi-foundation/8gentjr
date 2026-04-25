/**
 * GET  /api/consent/admin?email=parent@example.com  → audit rows
 * POST /api/consent/admin                            → retry step 2 send
 *
 * POST body: { action: 'retry-step2', email: 'parent@example.com' }
 * Finds the latest step1-confirmed sid for that email and triggers
 * sendStep2 immediately. Used to recover sessions where the in-process
 * setTimeout died on Vercel before the durable-queue swap landed.
 *
 * Header-gated via VPC_ADMIN_TOKEN (Bearer).
 */

import { NextRequest } from 'next/server';
import { findByEmail } from '@/lib/consent/audit-store';
import { sendStep2 } from '@/lib/consent/flow';

export const runtime = 'nodejs';

function authorised(req: NextRequest): boolean {
  const expected = process.env.VPC_ADMIN_TOKEN;
  if (!expected) return false;
  const got = req.headers.get('authorization');
  if (!got) return false;
  const m = got.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  return m[1] === expected;
}

function getIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

function getBaseUrl(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env;
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? '8gentjr.com';
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return Response.json({ error: 'unauthorised' }, { status: 401 });
  }
  const email = new URL(req.url).searchParams.get('email');
  if (!email) {
    return Response.json({ error: 'missing_email' }, { status: 400 });
  }
  const rows = await findByEmail(email);
  return Response.json({
    email: email.toLowerCase(),
    count: rows.length,
    rows,
  });
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) {
    return Response.json({ error: 'unauthorised' }, { status: 401 });
  }
  let body: { action?: string; email?: string };
  try {
    body = (await req.json()) as { action?: string; email?: string };
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (body.action !== 'retry-step2') {
    return Response.json({ error: 'unsupported_action' }, { status: 400 });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  if (!email) {
    return Response.json({ error: 'missing_email' }, { status: 400 });
  }
  const rows = await findByEmail(email);
  const step1Confirmed = rows
    .filter((r) => r.event === 'step1-confirmed')
    .sort((a, b) => b.ts.localeCompare(a.ts))[0];
  if (!step1Confirmed) {
    return Response.json({ error: 'no_step1_confirmed' }, { status: 404 });
  }
  const alreadyStep2 = rows.some(
    (r) => r.sid === step1Confirmed.sid && (r.event === 'step2-sent' || r.event === 'step2-confirmed'),
  );
  if (alreadyStep2) {
    return Response.json({ ok: true, sid: step1Confirmed.sid, status: 'already-sent' });
  }
  const result = await sendStep2({
    sid: step1Confirmed.sid,
    email: step1Confirmed.email,
    baseUrl: getBaseUrl(req),
    childProfileId: step1Confirmed.childProfileId,
    ctx: { ip: getIp(req), userAgent: req.headers.get('user-agent') },
  });
  return Response.json({ ok: true, sid: step1Confirmed.sid, emailId: result.emailId });
}
