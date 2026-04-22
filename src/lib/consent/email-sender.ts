/**
 * Pluggable EmailSender
 *
 * Strategy at runtime (getEmailSender):
 *   1. If RESEND_API_KEY is set, send via Resend REST API (no SDK dep).
 *   2. Otherwise, LogOnlySender writes to console + data/consent/outbox.jsonl
 *      (best-effort: swallows fs errors so it works on read-only runtimes).
 *
 * From address is controlled by RESEND_FROM_EMAIL (default
 * 'privacy@8gi.org'). Verify the domain in Resend before shipping.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  tag?: string;       // e.g. 'vpc-step-1', 'vpc-step-2'
}

export interface EmailSender {
  send(msg: EmailMessage): Promise<{ id: string }>;
}

class LogOnlySender implements EmailSender {
  async send(msg: EmailMessage): Promise<{ id: string }> {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const outboxDir =
        process.env.VPC_AUDIT_DIR ||
        path.join(process.cwd(), 'data', 'consent');
      await fs.mkdir(outboxDir, { recursive: true });
      const row = { id, ts: new Date().toISOString(), ...msg };
      await fs.appendFile(
        path.join(outboxDir, 'outbox.jsonl'),
        JSON.stringify(row) + '\n',
        'utf8',
      );
    } catch {
      // Read-only filesystem (Vercel) — still log, just skip file.
    }
    // eslint-disable-next-line no-console
    console.info(
      `[vpc-email:stub] ${msg.tag ?? 'untagged'} -> ${msg.to} | ${msg.subject}`,
    );
    return { id };
  }
}

class ResendSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
        ...(msg.tag ? { tags: [{ name: 'category', value: msg.tag }] } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`resend send failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as { id?: string };
    return { id: data.id ?? `resend-${Date.now()}` };
  }
}

let singleton: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (singleton) return singleton;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const from = process.env.RESEND_FROM_EMAIL || 'privacy@8gi.org';
    singleton = new ResendSender(key, from);
  } else {
    singleton = new LogOnlySender();
  }
  return singleton;
}

// Test helper: override the sender in tests.
export function __setEmailSenderForTests(sender: EmailSender | null): void {
  singleton = sender;
}
