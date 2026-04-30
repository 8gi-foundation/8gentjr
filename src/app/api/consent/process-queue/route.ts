/**
 * GET /api/consent/process-queue
 *
 * Vercel Cron target. Drains any step-2 VPC emails whose scheduled send time
 * has arrived and dispatches them via the email sender. Runs every 5 minutes
 * (see vercel.json `crons`).
 *
 * Auth: Vercel Cron includes `authorization: Bearer $CRON_SECRET` when set.
 * We accept either a matching secret OR requests that originate from Vercel's
 * internal cron header (`x-vercel-cron: 1`). If CRON_SECRET is unset we refuse
 * the call — better to fail loud than quietly stop sending step-2.
 */

import { NextRequest } from 'next/server';
import { drainStep2Queue } from '@/lib/consent/flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  if (auth === `Bearer ${secret}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await drainStep2Queue();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
