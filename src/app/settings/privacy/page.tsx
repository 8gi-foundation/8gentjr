'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PrivacyActions } from '@/components/PrivacyActions';

/**
 * Settings > Privacy & Consent
 *
 * Parent-facing surface for GDPR Art 7(3) withdraw + Art 17 erasure.
 * DPIA ref: 8gi-governance/docs/legal/2026-04-21-8gentjr-dpia-interim.md
 */
export default function PrivacySettingsPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--brand-bg-warm, #FFF8F0)' }}>
      <header
        className="flex items-center justify-between px-4 py-3 relative"
        style={{ backgroundColor: 'var(--brand-accent, #4CAF50)' }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-white font-semibold text-lg active:opacity-80"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold text-xl">
          Privacy &amp; Consent
        </span>
        <div className="w-14" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-5 max-w-xl w-full self-center">
        <p className="text-sm" style={{ color: 'var(--brand-text-soft, #5C544A)' }}>
          You can withdraw consent at any time, or delete everything now. Both
          actions take effect immediately. We also send you an email so there is
          a paper trail. Full details are in the{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <PrivacyActions />
      </div>
    </div>
  );
}
