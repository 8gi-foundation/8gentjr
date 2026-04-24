/**
 * GET /api/consent/confirm-step1?token=...
 *
 * Records step-1 confirmation and schedules step-2 email after the
 * configured delay. Redirects the parent browser to a friendly page.
 */

import { NextRequest } from 'next/server';
import { confirmStep1, scheduleStep2Send } from '@/lib/consent/flow';

export const runtime = 'nodejs';

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
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const baseUrl = getBaseUrl(req);
  const result = await confirmStep1(token, {
    ip: getIp(req),
    userAgent: req.headers.get('user-agent'),
  });

  if (!result.ok) {
    const where = result.error === 'expired_token' ? '/consent/expired' : '/consent/expired?reason=invalid';
    return Response.redirect(`${baseUrl}${where}`, 302);
  }

  await scheduleStep2Send({
    sid: result.sid,
    email: result.email,
    baseUrl,
    childProfileId: result.childProfileId,
    ctx: { ip: getIp(req), userAgent: req.headers.get('user-agent') },
  });

  return Response.redirect(`${baseUrl}/consent/step1-received`, 302);
}
