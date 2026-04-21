import { NextRequest, NextResponse } from 'next/server';
import { appendLedger } from '@/lib/privacy-server';
import { sendPrivacyEmail } from '@/lib/privacy-email';

/**
 * POST /api/privacy/delete
 *
 * Body: { parentEmail: string, confirm: 'DELETE', receiptId?: string }
 *
 * Records the hard-delete in the server ledger and emails the parent. The
 * actual purge of client state happens on the client via deleteEverything()
 * before this endpoint is called; the server side records compliance proof.
 */
const POLICY_VERSION = '2026-04-10';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { parentEmail?: string; confirm?: string; receiptId?: string };
    const email = (body.parentEmail ?? '').trim().toLowerCase();

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'parentEmail required' }, { status: 400 });
    }
    if (body.confirm !== 'DELETE') {
      return NextResponse.json({ error: 'typed confirmation "DELETE" required' }, { status: 400 });
    }

    const receiptId = body.receiptId ?? 'JR-UNSET';
    await appendLedger('delete', { email, receiptId, policyVersion: POLICY_VERSION });
    await sendPrivacyEmail({ kind: 'delete', to: email, receiptId });

    return NextResponse.json({ ok: true, status: 'deleted', receiptId, policyVersion: POLICY_VERSION });
  } catch (err) {
    console.error('[privacy/delete]', err);
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }
}
