/**
 * Email stub for privacy actions.
 *
 * Issue #117 (email+VPC) will land the real SMTP/Resend wiring; until then we
 * log to the server console so the flow is observable in Vercel/Fly logs. The
 * interface stays when #117 swaps in a provider.
 */
export type PrivacyEmailKind = 'withdraw' | 'withdraw-restored' | 'delete';

export interface PrivacyEmailArgs {
  kind: PrivacyEmailKind;
  to: string;
  receiptId?: string;
  gracePeriodDays?: number;
  purgeAfter?: string;
}

export async function sendPrivacyEmail(args: PrivacyEmailArgs): Promise<{ ok: true }> {
  const subject = subjectFor(args);
  const body = bodyFor(args);
  // eslint-disable-next-line no-console
  console.info('[privacy-email] stub send', {
    to: args.to,
    kind: args.kind,
    subject,
    bodyPreview: body.slice(0, 140),
  });
  return { ok: true };
}

function subjectFor(a: PrivacyEmailArgs): string {
  switch (a.kind) {
    case 'withdraw':          return '8gent Jr: your consent has been withdrawn';
    case 'withdraw-restored': return '8gent Jr: your consent has been restored';
    case 'delete':            return '8gent Jr: your data has been deleted';
  }
}

function bodyFor(a: PrivacyEmailArgs): string {
  switch (a.kind) {
    case 'withdraw':
      return (
        `Hi,\n\nYou withdrew consent for 8gent Jr. Processing has stopped.\n` +
        `Your data will be permanently deleted after ${a.gracePeriodDays ?? 30} days ` +
        `(on ${a.purgeAfter ?? 'the scheduled date'}). You can restore access before then from Settings > Privacy & Consent.\n\n` +
        `If you did not request this, open the app and tap "Restore consent".`
      );
    case 'withdraw-restored':
      return (
        `Hi,\n\nYour consent has been restored and 8gent Jr can be used again. ` +
        `Nothing was deleted.`
      );
    case 'delete':
      return (
        `Hi,\n\nAll data associated with 8gent Jr has been deleted. ` +
        `Receipt id: ${a.receiptId ?? 'unavailable'}.\n\n` +
        `We kept a minimal deletion-proof record (timestamp and a one-way hash of your email) ` +
        `so we can show a regulator that the deletion happened. We cannot reconstruct your data from this record.`
      );
  }
}
