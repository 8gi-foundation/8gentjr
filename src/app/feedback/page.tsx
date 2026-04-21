import type { Metadata } from 'next';
import Link from 'next/link';
import { FeedbackForm } from './FeedbackForm';

export const metadata: Metadata = {
  title: 'Send Feedback',
  description:
    'Share how 8gent Jr works for you. Feedback shapes the app. Anonymous by default.',
  alternates: { canonical: 'https://8gentjr.com/feedback' },
};

export default function FeedbackPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 text-[var(--brand-text)]">
      <Link
        href="/"
        className="text-sm text-[var(--brand-accent)] hover:underline mb-8 inline-block"
      >
        Back to 8gent Jr
      </Link>

      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Send Feedback
      </h1>
      <p className="text-sm text-[var(--brand-text-muted)] mb-6">
        Help us build an AAC app that actually works for your family, your
        classroom, or yourself.
      </p>

      <div className="mb-8 p-4 rounded-xl bg-[var(--brand-bg-accent)] border border-[var(--brand-border)] text-sm text-[var(--brand-text-soft)]">
        <p className="mb-2">
          <strong className="text-[var(--brand-text)]">
            Please do not share information about a child here.
          </strong>
        </p>
        <p>
          Tell us what works, what is broken, what is missing. Your notes go to
          the 8gent Jr team only. You can request deletion any time by emailing{' '}
          <a
            href="mailto:privacy@8gi.org"
            className="text-[var(--brand-accent)] hover:underline"
          >
            privacy@8gi.org
          </a>
          .
        </p>
      </div>

      <FeedbackForm />

      <div className="mt-10 pt-6 border-t border-[var(--brand-border)] text-xs text-[var(--brand-text-muted)]">
        <p>
          See our{' '}
          <Link
            href="/privacy"
            className="text-[var(--brand-accent)] hover:underline"
          >
            Privacy Policy
          </Link>{' '}
          for how submissions are handled.
        </p>
      </div>
    </main>
  );
}
