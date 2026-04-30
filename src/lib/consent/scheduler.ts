/**
 * Durable scheduler for VPC step-2 email sends.
 *
 * The in-process setTimeout that shipped in the first cut cannot hold a 24h
 * delay across serverless cold starts / function recycles, which would silently
 * drop step-2 mails and leave child profiles inactive forever. This module
 * gives us a pluggable queue: Upstash Redis in prod, setTimeout in dev/tests.
 *
 * Prod flow:
 *   confirmStep1 -> scheduler.schedule(payload, now + delayMs, deliver)
 *                -> Upstash ZADD vpc:step2:queue <runAt> <JSON payload>
 *   Vercel Cron  -> GET /api/consent/process-queue (every 5 min)
 *                -> scheduler.drainDue(deliver) -> ZRANGEBYSCORE / ZREM / deliver
 *
 * Dev / test flow (no Upstash env): InProcessScheduler.schedule uses setTimeout
 * to call deliver directly. Safe for `VPC_STEP2_DELAY_MS=0` in tests.
 *
 * Idempotency: `deliver` is `sendStep2` which already short-circuits if the
 * step-2 token has been confirmed (audit-store.isStep2Confirmed). ZREM gives
 * at-most-once claim per cron tick; combined with the confirm-check above,
 * double-delivery risk is bounded to the rare double-fire before confirm.
 */

export interface Step2Payload {
  sid: string;
  email: string;
  baseUrl: string;
  childProfileId: string | null;
  ctx: { ip: string | null; userAgent: string | null };
}

export type Step2Deliver = (payload: Step2Payload) => Promise<void>;

export interface Scheduler {
  schedule(
    payload: Step2Payload,
    runAt: number,
    deliver: Step2Deliver,
  ): Promise<void>;
  drainDue(deliver: Step2Deliver, now?: number): Promise<{ delivered: number; failed: number }>;
}

const QUEUE_KEY = process.env.VPC_STEP2_QUEUE_KEY || 'vpc:step2:queue';

class InProcessScheduler implements Scheduler {
  async schedule(
    payload: Step2Payload,
    runAt: number,
    deliver: Step2Deliver,
  ): Promise<void> {
    const delay = Math.max(0, runAt - Date.now());
    const run = async () => {
      try {
        await deliver(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[vpc-scheduler:in-process] deliver failed', err);
      }
    };
    if (delay === 0) {
      void run();
      return;
    }
    setTimeout(() => void run(), delay).unref?.();
  }

  async drainDue(): Promise<{ delivered: number; failed: number }> {
    return { delivered: 0, failed: 0 };
  }
}

interface UpstashResult<T> {
  result?: T;
  error?: string;
}

class UpstashScheduler implements Scheduler {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly queueKey: string,
  ) {}

  private async cmd<T = unknown>(args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      throw new Error(`upstash ${args[0]} ${res.status}`);
    }
    const body = (await res.json()) as UpstashResult<T>;
    if (body.error) throw new Error(`upstash ${args[0]}: ${body.error}`);
    return body.result as T;
  }

  async schedule(payload: Step2Payload, runAt: number): Promise<void> {
    const member = JSON.stringify(payload);
    await this.cmd(['ZADD', this.queueKey, runAt, member]);
  }

  async drainDue(
    deliver: Step2Deliver,
    now = Date.now(),
  ): Promise<{ delivered: number; failed: number }> {
    const batch = 100;
    const members = await this.cmd<string[]>([
      'ZRANGEBYSCORE',
      this.queueKey,
      '-inf',
      now,
      'LIMIT',
      0,
      batch,
    ]);
    if (!Array.isArray(members) || members.length === 0) {
      return { delivered: 0, failed: 0 };
    }
    let delivered = 0;
    let failed = 0;
    for (const member of members) {
      const removed = await this.cmd<number>(['ZREM', this.queueKey, member]);
      if (removed !== 1) continue;
      let payload: Step2Payload;
      try {
        payload = JSON.parse(member) as Step2Payload;
      } catch {
        failed += 1;
        continue;
      }
      try {
        await deliver(payload);
        delivered += 1;
      } catch (err) {
        failed += 1;
        // Re-enqueue with 5-minute backoff so the next cron tick retries.
        try {
          await this.cmd([
            'ZADD',
            this.queueKey,
            Date.now() + 5 * 60 * 1000,
            member,
          ]);
        } catch {
          // If re-enqueue fails, we've already dropped the item; log + move on.
        }
        // eslint-disable-next-line no-console
        console.error('[vpc-scheduler:upstash] deliver failed, re-queued', err);
      }
    }
    return { delivered, failed };
  }
}

let singleton: Scheduler | null = null;

export function getScheduler(): Scheduler {
  if (singleton) return singleton;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    singleton = new UpstashScheduler(url, token, QUEUE_KEY);
  } else {
    singleton = new InProcessScheduler();
  }
  return singleton;
}

export function __setSchedulerForTests(s: Scheduler | null): void {
  singleton = s;
}
