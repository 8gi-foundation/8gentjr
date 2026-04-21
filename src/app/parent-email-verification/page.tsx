import Link from "next/link";

/**
 * Parent email verification placeholder (DPIA 2026-04-21).
 *
 * Child-path accounts land here after the age gate. The real
 * email-plus Verifiable Parental Consent flow is tracked in
 * issue #117 - this page exists only so the child path has a
 * destination and users are told what happens next.
 *
 * DPIA reference:
 *   8gi-governance/docs/legal/2026-04-21-8gentjr-dpia-interim.md
 */

export const metadata = {
  title: "Parent email confirmation - 8gent Jr",
};

export default function ParentEmailVerificationPage() {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--brand-accent)] text-white text-2xl font-bold mb-6">
          8
        </div>

        <h1 className="text-2xl font-bold text-[var(--brand-text)] mb-3">
          We will email you to confirm
        </h1>

        <p className="text-sm text-[var(--brand-text-soft)] mb-6 leading-relaxed">
          Because the account is for a child under 13, we need a parent or
          legal guardian to confirm by email before the account is activated.
          You will receive a confirmation link shortly.
        </p>

        <div className="bg-[var(--brand-bg-warm)] border border-[var(--brand-border)] rounded-2xl p-4 text-left text-sm text-[var(--brand-text-soft)] space-y-2">
          <p className="font-semibold text-[var(--brand-text)]">
            What happens next
          </p>
          <p>
            The full Verifiable Parental Consent flow is being finalised
            (tracked in issue #117). Until then, this page is a placeholder
            to let you know a confirmation step is required before the
            account becomes active.
          </p>
          <p>
            Questions: email{" "}
            <span className="text-[var(--brand-accent)]">privacy@8gi.org</span>.
          </p>
        </div>

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
