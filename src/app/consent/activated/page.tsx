import { ActivatedRedirect } from './ActivatedRedirect';

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
          Thank you for confirming parental consent. Opening 8gent Jr&hellip;
        </p>
        <p className="text-sm" style={{ color: 'var(--brand-text-muted)' }}>
          To withdraw consent at any time, email
          {' '}<a href="mailto:privacy@8gentjr.com" style={{ color: 'var(--brand-accent)' }}>privacy@8gentjr.com</a>.
        </p>
        <ActivatedRedirect />
      </div>
    </main>
  );
}
