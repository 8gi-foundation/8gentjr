/**
 * VPC Consent Tokens
 *
 * HMAC-SHA256 signed tokens for COPPA email-plus parental consent flow.
 * Tokens are single-use - the audit-store records consumption.
 *
 * Payload layout (base64url):
 *   { v: 1, sid: sessionId, step: 1|2, email, exp } . signature
 *
 * Ref DPIA Appendix C, FTC 16 CFR 312.5(b)(2).
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface TokenPayload {
  v: 1;
  sid: string;       // consent session id
  step: 1 | 2;
  email: string;     // parent email (lowercased)
  exp: number;       // unix seconds
}

const DEFAULT_EXPIRY_DAYS = 7;

function getSecret(): string {
  const secret = process.env.VPC_TOKEN_SECRET;
  if (!secret || secret.length < 16) {
    // Dev-only fallback. In prod, VPC_TOKEN_SECRET must be set.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('VPC_TOKEN_SECRET must be set in production');
    }
    return 'dev-only-consent-secret-do-not-use-in-prod';
  }
  return secret;
}

function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const s = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(s, 'base64');
}

function sign(body: string): string {
  return b64urlEncode(createHmac('sha256', getSecret()).update(body).digest());
}

export function newSessionId(): string {
  return b64urlEncode(randomBytes(18));
}

export function issueToken(
  payload: Omit<TokenPayload, 'v' | 'exp'>,
  opts?: { expiresInDays?: number },
): string {
  const expiresInDays = opts?.expiresInDays ?? DEFAULT_EXPIRY_DAYS;
  const full: TokenPayload = {
    v: 1,
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 86400,
  };
  const body = b64urlEncode(JSON.stringify(full));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export type TokenError =
  | 'malformed'
  | 'bad_signature'
  | 'expired'
  | 'wrong_version'
  | 'wrong_step';

export interface TokenOk {
  ok: true;
  payload: TokenPayload;
  tokenHash: string; // SHA-256 hex of raw token for audit lookup
}

export interface TokenFail {
  ok: false;
  error: TokenError;
}

export function verifyToken(
  token: string,
  expectedStep?: 1 | 2,
): TokenOk | TokenFail {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, error: 'malformed' };
  const [body, sig] = parts;
  const expected = sign(body);
  // timing-safe compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: 'bad_signature' };
  }
  let payload: TokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString('utf8'));
  } catch {
    return { ok: false, error: 'malformed' };
  }
  if (payload.v !== 1) return { ok: false, error: 'wrong_version' };
  if (expectedStep && payload.step !== expectedStep) {
    return { ok: false, error: 'wrong_step' };
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: 'expired' };
  }
  return { ok: true, payload, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
