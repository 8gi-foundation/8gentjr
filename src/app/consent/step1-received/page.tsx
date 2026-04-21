import Link from 'next/link';

export const metadata = {
  title: 'Step 1 confirmed - check your inbox',
  robots: { index: false, follow: false },
};

export default function Step1ReceivedPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6"
      style={{ backgroundColor: 'var(--brand-bg)' }}>
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white text-xl font-bold mb-4"
          style={{ backgroundColor: 'var(--brand-accent)' }}>8</div>
        <h1 className="text-2xl font-bold mb-3"
          style={{ color: 'var(--brand-text)', fontFamily: 'var(--font-display)' }}>
          Step 1 of 2 confirmed
        </h1>
        <p className="text-base mb-4" style={{ color: 'var(--brand-text-soft)' }}>
          Thanks. A second confirmation email will arrive in your inbox shortly.
          You need to click the link in that email to finish activating your child&apos;s account.
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--brand-text-muted)' }}>
          If it does not arrive within about 15 minutes, check spam or contact
          {' '}<span style={{ color: 'var(--brand-accent)' }}>privacy@8gi.org</span>.
        </p>
        <Link href="/" className="text-sm underline" style={{ color: 'var(--brand-accent)' }}>
          Back to 8gent Jr
        </Link>
      </div>
    </main>
  );
}
