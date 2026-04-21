import { NextRequest, NextResponse } from 'next/server';
import {
  ALLOWED_ROLES,
  LIMITS,
  appendSubmission,
  extractIp,
  hashIp,
  rateLimit,
  type FeedbackRole,
} from '@/lib/feedback-store';

/**
 * POST /api/feedback
 *
 * Public submit endpoint for the GDPR Art 35(9) feedback form.
 * No third-party captcha. Simple honeypot field + per-IP rate limit.
 * IPs are never stored raw. We keep a daily-salted truncated sha256.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  role?: unknown;
  relationship?: unknown;
  works_well?: unknown;
  should_change?: unknown;
  contact_email?: unknown;
  consent?: unknown;
  // honeypot: bots fill this, humans never see it
  website?: unknown;
}

function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot: silently accept so bots don't probe further.
  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  // Consent must be explicit.
  if (body.consent !== true) {
    return NextResponse.json({ error: 'Consent is required' }, { status: 400 });
  }

  // Role must be allow-listed.
  const role = typeof body.role === 'string' ? body.role : '';
  if (!ALLOWED_ROLES.includes(role as FeedbackRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const ip = extractIp(request.headers);
  const ip_hash = hashIp(ip);

  if (!rateLimit(ip_hash)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 },
    );
  }

  const relationship = clean(body.relationship, LIMITS.relationship);
  const works_well = clean(body.works_well, LIMITS.worksWell);
  const should_change = clean(body.should_change, LIMITS.shouldChange);
  const rawEmail = clean(body.contact_email, LIMITS.email);
  const contact_email = rawEmail.length === 0 ? null : isValidEmail(rawEmail) ? rawEmail : null;

  if (rawEmail.length > 0 && contact_email === null) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  if (!works_well && !should_change && !relationship) {
    return NextResponse.json({ error: 'Please share at least one note' }, { status: 400 });
  }

  const user_agent = (request.headers.get('user-agent') ?? '').slice(0, 500);

  const saved = await appendSubmission({
    role,
    relationship,
    works_well,
    should_change,
    contact_email,
    user_agent,
    ip_hash,
  });

  return NextResponse.json({ ok: true, id: saved.id }, { status: 201 });
}
