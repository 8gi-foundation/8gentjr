/**
 * Pluggable EmailSender
 *
 * The repo has no transactional email provider wired today. This module
 * exposes an EmailSender interface and a log-only stub that writes to
 * data/consent/outbox.jsonl plus console. Swap with Resend/Postmark later
 * by exporting a new sender from getEmailSender().
 *
 * TODO (owner: james@8gi.org): wire a real provider before production.
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
    // eslint-disable-next-line no-console
    console.info(`[vpc-email:stub] ${msg.tag ?? 'untagged'} -> ${msg.to} | ${msg.subject}`);
    return { id };
  }
}

let singleton: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (singleton) return singleton;
  // In future: if RESEND_API_KEY etc are set, return real sender here.
  singleton = new LogOnlySender();
  return singleton;
}

// Test helper: override the sender in tests.
export function __setEmailSenderForTests(sender: EmailSender | null): void {
  singleton = sender;
}
