'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

const ROLES: Array<{ value: string; label: string }> = [
  { value: 'parent', label: 'Parent' },
  { value: 'carer', label: 'Carer' },
  { value: 'adult-user', label: 'Adult user' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'speech-therapist', label: 'Speech therapist' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'other', label: 'Other' },
];

const LIM = { relationship: 300, works_well: 1000, should_change: 1000 };

export function FeedbackForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [relationship, setRelationship] = useState('');
  const [worksWell, setWorksWell] = useState('');
  const [shouldChange, setShouldChange] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!role) {
      setError('Please choose who you are.');
      return;
    }
    if (!consent) {
      setError('Please tick the consent box.');
      return;
    }
    if (!worksWell.trim() && !shouldChange.trim() && !relationship.trim()) {
      setError('Please share at least one note.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          relationship,
          works_well: worksWell,
          should_change: shouldChange,
          contact_email: email,
          consent,
          website,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Submission failed. Please try again.');
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
      setSubmitting(false);
    }
  }

  const fieldBase =
    'w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:border-transparent';

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg-warm)] p-6 text-center"
      >
        <h2
          className="text-xl font-bold text-[var(--brand-text)] mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Thank you.
        </h2>
        <p className="text-sm text-[var(--brand-text-soft)] mb-4">
          Your feedback reached the 8gent Jr team. We read every submission. We
          use it only to improve the app. You can request deletion any time by
          emailing{' '}
          <a
            href="mailto:privacy@8gi.org"
            className="text-[var(--brand-accent)] hover:underline"
          >
            privacy@8gi.org
          </a>
          .
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-accent-hover)]"
        >
          Back to 8gent Jr
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {/* Honeypot: hidden from humans, bots often fill it */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div>
        <label
          htmlFor="fb-role"
          className="block text-sm font-medium text-[var(--brand-text)] mb-1"
        >
          Who are you? <span className="text-[var(--brand-accent)]">*</span>
        </label>
        <select
          id="fb-role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={fieldBase}
        >
          <option value="">Choose one</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="fb-relationship"
          className="block text-sm font-medium text-[var(--brand-text)] mb-1"
        >
          Your relationship to AAC{' '}
          <span className="text-[var(--brand-text-muted)] font-normal">
            (optional)
          </span>
        </label>
        <input
          id="fb-relationship"
          type="text"
          maxLength={LIM.relationship}
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder="eg. I use AAC myself, or I support my 6-year-old"
          className={fieldBase}
        />
      </div>

      <div>
        <label
          htmlFor="fb-works"
          className="block text-sm font-medium text-[var(--brand-text)] mb-1"
        >
          What works well?{' '}
          <span className="text-[var(--brand-text-muted)] font-normal">
            (optional)
          </span>
        </label>
        <textarea
          id="fb-works"
          rows={4}
          maxLength={LIM.works_well}
          value={worksWell}
          onChange={(e) => setWorksWell(e.target.value)}
          className={fieldBase}
        />
      </div>

      <div>
        <label
          htmlFor="fb-change"
          className="block text-sm font-medium text-[var(--brand-text)] mb-1"
        >
          What should change?{' '}
          <span className="text-[var(--brand-text-muted)] font-normal">
            (optional)
          </span>
        </label>
        <textarea
          id="fb-change"
          rows={4}
          maxLength={LIM.should_change}
          value={shouldChange}
          onChange={(e) => setShouldChange(e.target.value)}
          className={fieldBase}
        />
      </div>

      <div>
        <label
          htmlFor="fb-email"
          className="block text-sm font-medium text-[var(--brand-text)] mb-1"
        >
          Contact email{' '}
          <span className="text-[var(--brand-text-muted)] font-normal">
            (optional, leave blank to stay anonymous)
          </span>
        </label>
        <input
          id="fb-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={fieldBase}
        />
      </div>

      <div className="flex items-start gap-2">
        <input
          id="fb-consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[var(--brand-border)] text-[var(--brand-accent)] focus:ring-[var(--brand-accent)]"
          required
        />
        <label
          htmlFor="fb-consent"
          className="text-sm text-[var(--brand-text-soft)]"
        >
          I agree my feedback may be used to improve 8gent Jr. I can request
          deletion at any time.
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg-warm)] px-3 py-2 text-sm text-[var(--brand-text)]"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[var(--brand-accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-accent-hover)] disabled:opacity-60"
      >
        {submitting ? 'Sending...' : 'Send feedback'}
      </button>
    </form>
  );
}
