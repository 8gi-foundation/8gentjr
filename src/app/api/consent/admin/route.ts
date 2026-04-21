/**
 * GET /api/consent/admin?email=parent@example.com
 *
 * Returns VPC audit rows for a parent email. Header-gated via
 * VPC_ADMIN_TOKEN (Bearer). No Clerk admin role exists yet in this repo.
 *
 * TODO (owner: james@8gi.org): when a first-class admin role lands
 * (Clerk orgs / admin metadata), replace the shared-secret check with
 * role-based auth.
 */

import { NextRequest } from 'next/server';
import { findByEmail } from '@/lib/consent/audit-store';

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
