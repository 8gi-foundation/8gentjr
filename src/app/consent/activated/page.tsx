import Link from 'next/link';

export const metadata = {
  title: 'Account activated',
  robots: { index: false, follow: false },
};

export default function ActivatedPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6"
      style={{ backgroundColor: 'var(--brand-bg)' }}>
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white text-xl font-bold mb-4"
          style={{ backgroundColor: 'var(--brand-accent)' }}>8</div>
        <h1 className="text-2xl font-bold mb-3"
          style={{ color: 'var(--brand-text)', fontFamily: 'var(--font-display)' }}>
          Your child&apos;s account is active
        </h1>
        <p className="text-base mb-4" style={{ color: 'var(--brand-text-soft)' }}>
          Thank you for confirming parental consent. Your child can now use 8gent Jr.
          We kept an audit record of both confirmations as required by COPPA.
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--brand-text-muted)' }}>
          To withdraw consent at any time, email
          {' '}<span style={{ color: 'var(--brand-accent)' }}>privacy@8gi.org</span>.
        </p>
        <Link href="/talk" className="inline-block px-6 py-3 rounded-xl text-white font-semibold"
          style={{ backgroundColor: 'var(--brand-accent)' }}>
          Open 8gent Jr
        </Link>
      </div>
    </main>
  );
}
