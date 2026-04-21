/**
 * GET /api/consent/confirm-step2?token=...
 *
 * Records step-2 confirmation and marks the account active. Redirects
 * the parent to the activated page.
 */

import { NextRequest } from 'next/server';
import { confirmStep2 } from '@/lib/consent/flow';

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
  const result = await confirmStep2(token, {
    ip: getIp(req),
    userAgent: req.headers.get('user-agent'),
  });
  if (!result.ok) {
    const map: Record<string, string> = {
      expired_token: '/consent/expired',
      invalid_token: '/consent/expired?reason=invalid',
      already_used: '/consent/expired?reason=used',
      out_of_order: '/consent/expired?reason=order',
    };
    return Response.redirect(`${baseUrl}${map[result.error] ?? '/consent/expired'}`, 302);
  }
  return Response.redirect(`${baseUrl}/consent/activated`, 302);
}
