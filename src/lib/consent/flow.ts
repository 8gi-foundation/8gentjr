/**
 * VPC Flow Orchestration
 *
 * Ties tokens + audit + email together. Kept framework-agnostic so the
 * Next.js route handlers stay thin.
 *
 * Steps:
 *   initiate     - send email #1
 *   confirmStep1 - consume step-1 token, schedule step-2 send
 *   sendStep2    - send email #2 (called after configured delay)
 *   confirmStep2 - consume step-2 token, activate child profile
 *
 * Delay between step-1 confirmation and step-2 send is controlled by
 * VPC_STEP2_DELAY_MS (default 86_400_000 = 24h, per FTC 16 CFR 312.5(b)(2)
 * email-plus 24-72h band). Set 0 in tests.
 */

import {
  appendAudit,
  consumedTokenHashes,
  isStep1Confirmed,
  isStep2Confirmed,
} from './audit-store';
import { getEmailSender } from './email-sender';
import { hashToken, issueToken, newSessionId, verifyToken } from './tokens';

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export interface InitiateInput {
  email: string;
  childProfileId: string | null;
  baseUrl: string;           // e.g. "https://8gentjr.com"
  noticeVersion?: string;
  ctx: RequestContext;
}

export interface InitiateOutput {
  sid: string;
  token: string;
  emailId: string;
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildStepUrl(baseUrl: string, step: 1 | 2, token: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const route = step === 1 ? 'confirm-step1' : 'confirm-step2';
  return `${base}/api/consent/${route}?token=${encodeURIComponent(token)}`;
}

export async function initiate(input: InitiateInput): Promise<InitiateOutput> {
  const email = normaliseEmail(input.email);
  const sid = newSessionId();
  const token = issueToken({ sid, step: 1, email });
  const url = buildStepUrl(input.baseUrl, 1, token);

  const sender = getEmailSender();
  const { id: emailId } = await sender.send({
    to: email,
    subject: 'Confirm parental consent (step 1 of 2) - 8gent Jr',
    tag: 'vpc-step-1',
    text: [
      'Hello,',
      '',
      'You are receiving this because someone is setting up a 8gent Jr child account and listed this address as the parent or guardian.',
      '',
      'Step 1 of 2: click the link below to confirm you are the parent or guardian.',
      '',
      url,
      '',
      'A second confirmation email will arrive within 24 hours. Both must be clicked for the child account to activate. Links expire in 7 days.',
      '',
      'If you did not request this, you can safely ignore the email.',
      '',
      '- 8GI Foundation',
    ].join('\n'),
  });

  await appendAudit({
    event: 'step1-sent',
    sid,
    email,
    step: 1,
    tokenHash: hashToken(token),
    ip: input.ctx.ip,
    userAgent: input.ctx.userAgent,
    noticeVersion: input.noticeVersion,
    childProfileId: input.childProfileId,
  });

  return { sid, token, emailId };
}

export interface ConfirmOutput {
  ok: true;
  sid: string;
  email: string;
  childProfileId: string | null;
}

export type ConfirmError =
  | 'invalid_token'
  | 'expired_token'
  | 'already_used'
  | 'out_of_order';

export async function confirmStep1(
  token: string,
  ctx: RequestContext,
): Promise<ConfirmOutput | { ok: false; error: ConfirmError }> {
  const verified = verifyToken(token, 1);
  if (!verified.ok) {
    return {
      ok: false,
      error: verified.error === 'expired' ? 'expired_token' : 'invalid_token',
    };
  }
  const { payload, tokenHash } = verified;
  const consumed = await consumedTokenHashes();
  if (consumed.has(tokenHash)) return { ok: false, error: 'already_used' };

  await appendAudit({
    event: 'step1-confirmed',
    sid: payload.sid,
    email: payload.email,
    step: 1,
    tokenHash,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    childProfileId: null,
  });

  return { ok: true, sid: payload.sid, email: payload.email, childProfileId: null };
}

function getStep2DelayMs(): number {
  // Default 24h per FTC 16 CFR 312.5(b)(2) email-plus 24-72h band.
  const DEFAULT_DELAY_MS = 24 * 60 * 60 * 1000;
  const raw = process.env.VPC_STEP2_DELAY_MS;
  if (raw === undefined) return DEFAULT_DELAY_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DELAY_MS;
}

/**
 * Schedule step-2 delivery. In this stub we use setTimeout in-process.
 * In production this should be swapped for a durable queue (Cloudflare
 * Queues, Inngest, or a cron row). Good enough for the PR - behind
 * VPC_STEP2_DELAY_MS so tests set 0.
 *
 * TODO (owner: james@8gi.org): replace with durable queue before prod.
 */
export function scheduleStep2Send(args: {
  sid: string;
  email: string;
  baseUrl: string;
  childProfileId: string | null;
  ctx: RequestContext;
}): void {
  const delay = getStep2DelayMs();
  const run = async () => {
    try {
      await sendStep2(args);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[vpc] step-2 send failed', err);
    }
  };
  if (delay === 0) {
    void run();
  } else {
    setTimeout(() => void run(), delay).unref?.();
  }
}

export async function sendStep2(args: {
  sid: string;
  email: string;
  baseUrl: string;
  childProfileId: string | null;
  ctx: RequestContext;
}): Promise<{ token: string; emailId: string }> {
  const email = normaliseEmail(args.email);
  // Do not re-send if already completed.
  if (await isStep2Confirmed(args.sid)) {
    return { token: '', emailId: 'skipped-already-confirmed' };
  }
  const token = issueToken({ sid: args.sid, step: 2, email });
  const url = buildStepUrl(args.baseUrl, 2, token);
  const sender = getEmailSender();
  const { id: emailId } = await sender.send({
    to: email,
    subject: 'Final confirmation - activate your child\'s account (step 2 of 2)',
    tag: 'vpc-step-2',
    text: [
      'Hello,',
      '',
      'Step 2 of 2. Click the link below to finish setting up your child\'s 8gent Jr account.',
      '',
      url,
      '',
      'This is the final confirmation under COPPA email-plus verifiable parental consent. The link expires in 7 days. The account will not activate until you click.',
      '',
      '- 8GI Foundation',
    ].join('\n'),
  });
  await appendAudit({
    event: 'step2-sent',
    sid: args.sid,
    email,
    step: 2,
    tokenHash: hashToken(token),
    ip: args.ctx.ip,
    userAgent: args.ctx.userAgent,
    childProfileId: args.childProfileId,
  });
  return { token, emailId };
}

export async function confirmStep2(
  token: string,
  ctx: RequestContext,
): Promise<ConfirmOutput | { ok: false; error: ConfirmError }> {
  const verified = verifyToken(token, 2);
  if (!verified.ok) {
    return {
      ok: false,
      error: verified.error === 'expired' ? 'expired_token' : 'invalid_token',
    };
  }
  const { payload, tokenHash } = verified;
  const consumed = await consumedTokenHashes();
  if (consumed.has(tokenHash)) return { ok: false, error: 'already_used' };
  if (!(await isStep1Confirmed(payload.sid))) {
    return { ok: false, error: 'out_of_order' };
  }
  await appendAudit({
    event: 'step2-confirmed',
    sid: payload.sid,
    email: payload.email,
    step: 2,
    tokenHash,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    childProfileId: null,
  });
  return { ok: true, sid: payload.sid, email: payload.email, childProfileId: null };
}
