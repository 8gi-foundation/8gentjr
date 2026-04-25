/**
 * POST /api/consent/initiate
 *
 * Begins email-plus VPC flow for a child-under-13 signup. Caller MUST
 * only invoke this when accountType === 'child_under_13' (age gate,
 * #116). Body: { email, childProfileId? }.
 */

import { NextRequest } from 'next/server';
import { initiate } from '@/lib/consent/flow';

export const runtime = 'nodejs';

interface Body {
  email?: string;
  childProfileId?: string | null;
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

function isValidEmail(v: string): boolean {
  // RFC-lite: local@domain.tld, 5..254 chars, no spaces
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  const email = (body.email ?? '').trim();
  if (!email || !isValidEmail(email)) {
    return Response.json({ error: 'invalid_email' }, { status: 400 });
  }
  try {
    const { sid } = await initiate({
      email,
      childProfileId: body.childProfileId ?? null,
      baseUrl: getBaseUrl(req),
      ctx: { ip: getIp(req), userAgent: req.headers.get('user-agent') },
    });
    return Response.json({ ok: true, sid, status: 'email-sent' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[vpc:initiate] failed', err);
    const detail = err instanceof Error ? err.message : String(err);
    return Response.json({ error: 'internal_error', detail }, { status: 500 });
  }
}
