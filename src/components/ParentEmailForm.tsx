'use client';

import { useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function ParentEmailForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('sending');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/consent/initiate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus('error');
        setErrorMsg(
          data.error === 'invalid_email'
            ? 'That does not look like a valid email.'
            : 'Something went wrong. Please try again.',
        );
        return;
      }
      setStatus('sent');
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-[var(--brand-bg-warm)] border border-[var(--brand-border)] rounded-2xl p-5 text-left text-sm text-[var(--brand-text-soft)] space-y-2">
        <p className="font-semibold text-[var(--brand-text)]">Check your inbox</p>
        <p>
          We sent a confirmation link to{' '}
          <span className="font-semibold text-[var(--brand-text)]">{email}</span>.
          A second email will follow about ten minutes after you click the first
          link. Both are required to activate the account.
        </p>
        <p>
          No email after a few minutes? Check spam, or email{' '}
          <span className="text-[var(--brand-accent)]">privacy@8gi.org</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <label
        htmlFor="parent-email"
        className="block text-sm font-semibold text-[var(--brand-text)]"
      >
        Parent or guardian email
      </label>
      <input
        id="parent-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-xl border border-[var(--brand-border)] bg-white px-4 py-3 text-base text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
        disabled={status === 'sending'}
      />
      <button
        type="submit"
        disabled={status === 'sending' || email.trim().length === 0}
        className="w-full rounded-xl bg-[var(--brand-accent)] text-white font-semibold py-3 text-base disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending...' : 'Send confirmation email'}
      </button>
      {errorMsg ? (
        <p role="alert" className="text-sm text-red-600">
          {errorMsg}
        </p>
      ) : null}
      <p className="text-xs text-[var(--brand-text-muted)]">
        We will only use this address for the two confirmation emails and any
        account-safety notices. See our{' '}
        <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </form>
  );
}
