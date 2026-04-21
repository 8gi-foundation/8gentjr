import { NextRequest, NextResponse } from 'next/server';
import { listPendingDeletions, readLedger } from '@/lib/privacy-server';

/**
 * GET /api/privacy/admin
 *
 * Admin-only view of pending deletions + full ledger. Requires a shared
 * `x-admin-token` header matching `PRIVACY_ADMIN_TOKEN`. If the env var is
 * unset the route 404s so we never ship an open admin endpoint by accident.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.PRIVACY_ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const supplied = req.headers.get('x-admin-token');
  if (supplied !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const pending = await listPendingDeletions();
  const ledger = await readLedger();
  return NextResponse.json({ pending, ledgerCount: ledger.length, ledger });
}
