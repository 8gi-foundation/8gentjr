import { NextRequest, NextResponse } from 'next/server';
import { appendLedger, gracePeriodDaysFromEnv } from '@/lib/privacy-server';
import { sendPrivacyEmail } from '@/lib/privacy-email';

/**
 * POST /api/privacy/withdraw
 *
 * Body: { parentEmail: string, restore?: boolean }
 *
 * Records a withdrawal (or restoration) in the server-side privacy ledger
 * and sends the parent an email. The client also writes local state so the
 * UI updates immediately; this endpoint is the compliance record of truth.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { parentEmail?: string; restore?: boolean };
    const email = (body.parentEmail ?? '').trim().toLowerCase();
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'parentEmail required' }, { status: 400 });
    }

    if (body.restore) {
      await appendLedger('withdraw-restored', { email });
      await sendPrivacyEmail({ kind: 'withdraw-restored', to: email });
      return NextResponse.json({ ok: true, status: 'active' });
    }

    const gracePeriodDays = gracePeriodDaysFromEnv();
    const purgeAfter = new Date(Date.now() + gracePeriodDays * 86_400_000).toISOString();
    await appendLedger('withdraw', { email, purgeAfter, gracePeriodDays });
    await sendPrivacyEmail({ kind: 'withdraw', to: email, gracePeriodDays, purgeAfter });

    return NextResponse.json({ ok: true, status: 'withdrawn', gracePeriodDays, purgeAfter });
  } catch (err) {
    console.error('[privacy/withdraw]', err);
    return NextResponse.json({ error: 'withdraw failed' }, { status: 500 });
  }
}
