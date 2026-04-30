import Link from 'next/link';
import ParentEmailForm from '@/components/ParentEmailForm';

/**
 * Parent email verification (COPPA email-plus VPC, step 1 of 2).
 *
 * Child-path accounts land here after the age gate. The form posts to
 * /api/consent/initiate which issues a signed step-1 token and sends email
 * #1. Step 2 is scheduled ~24 hours after step-1 confirmation
 * (FTC 16 CFR 312.5(b)(2) email-plus 24-72h band).
 *
 * DPIA reference:
 *   8gi-governance/docs/legal/2026-04-21-8gentjr-dpia-interim.md
 */

export const metadata = {
  title: 'Parent email confirmation - 8gent Jr',
};

export default function ParentEmailVerificationPage() {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--brand-accent)] text-white text-2xl font-bold mb-6">
          8
        </div>

        <h1 className="text-2xl font-bold text-[var(--brand-text)] mb-3">
          One last step for the grown-up
        </h1>

        <p className="text-sm text-[var(--brand-text-soft)] mb-6 leading-relaxed">
          Because this account is for a child under 13, we need a parent or
          legal guardian to confirm by email before it activates. Enter the
          parent email below and we will send a confirmation link.
        </p>

        <ParentEmailForm />

        <div className="mt-6 text-xs text-[var(--brand-text-muted)] space-x-2">
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <span>|</span>
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
