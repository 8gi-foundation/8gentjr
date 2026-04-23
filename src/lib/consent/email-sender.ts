/**
 * Pluggable EmailSender
 *
 * Strategy at runtime (getEmailSender):
 *   1. If AGENTMAIL_API_KEY is set, send via AgentMail REST API (no SDK dep).
 *   2. Otherwise, LogOnlySender writes to console + data/consent/outbox.jsonl
 *      (best-effort: swallows fs errors so it works on read-only runtimes).
 *
 * From inbox is controlled by AGENTMAIL_FROM_INBOX (default
 * 'aijames@jamesspalding.org'). The inbox must already exist in AgentMail.
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

class AgentMailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly fromInbox: string,
  ) {}

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const url = `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(this.fromInbox)}/messages/send`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
        ...(msg.tag ? { labels: [msg.tag] } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`agentmail send failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as { messageId?: string; message_id?: string };
    return { id: data.messageId ?? data.message_id ?? `agentmail-${Date.now()}` };
  }
}

let singleton: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (singleton) return singleton;
  const key = process.env.AGENTMAIL_API_KEY;
  if (key) {
    const from = process.env.AGENTMAIL_FROM_INBOX || 'aijames@jamesspalding.org';
    singleton = new AgentMailSender(key, from);
  } else {
    singleton = new LogOnlySender();
  }
  return singleton;
}

// Test helper: override the sender in tests.
export function __setEmailSenderForTests(sender: EmailSender | null): void {
  singleton = sender;
}
