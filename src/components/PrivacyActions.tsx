'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_GRACE_DAYS,
  daysRemaining,
  deleteEverything,
  readDeletionProof,
  readPrivacyState,
  restoreConsent,
  withdrawConsent,
  type PrivacyState,
  type DeletionProof,
} from '@/lib/privacy-store';
import { CONSENT_STORAGE_KEY } from '@/lib/privacy-constants';

/**
 * Privacy & Consent surface for parents.
 *
 * Two actions:
 *   - Withdraw consent: pauses processing, 30-day grace to restore.
 *   - Delete everything: hard-delete, keeps a deletion-proof record.
 *
 * Both mirror to the server ledger via /api/privacy/* and send an email.
 */
export function PrivacyActions() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<PrivacyState>({
    status: 'active',
    gracePeriodDays: DEFAULT_GRACE_DAYS,
  });
  const [proof, setProof] = useState<DeletionProof | null>(null);
  const [parentEmail, setParentEmail] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState<'withdraw' | 'restore' | 'delete' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    setState(readPrivacyState());
    setProof(readDeletionProof());
    try {
      const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { parentEmail?: string };
        if (parsed.parentEmail && parsed.parentEmail.includes('@')) {
          setParentEmail(parsed.parentEmail);
        }
      }
    } catch { /* no-op */ }
  }, []);

  if (!mounted) return null;

  async function doWithdraw() {
    setError('');
    if (!parentEmail.includes('@')) {
      setError('Enter the parent email we should notify.');
      return;
    }
    setBusy('withdraw');
    try {
      const next = withdrawConsent({ parentEmail });
      setState(next);
      await fetch('/api/privacy/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ parentEmail }),
      });
    } catch (err) {
      setError('Could not withdraw. Try again.');
      console.error(err);
    } finally {
      setBusy(null);
    }
  }

  async function doRestore() {
    setBusy('restore');
    try {
      const next = restoreConsent();
      setState(next);
      if (parentEmail.includes('@')) {
        await fetch('/api/privacy/withdraw', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ parentEmail, restore: true }),
        });
      }
    } finally {
      setBusy(null);
    }
  }

  async function doDelete() {
    setError('');
    if (!parentEmail.includes('@')) {
      setError('Enter the parent email we should notify.');
      return;
    }
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm.');
      return;
    }
    setBusy('delete');
    try {
      const receipt = await deleteEverything({ parentEmail });
      setProof(receipt);
      setState({ status: 'deleted', gracePeriodDays: DEFAULT_GRACE_DAYS });
      await fetch('/api/privacy/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ parentEmail, confirm: 'DELETE', receiptId: receipt.receiptId }),
      });
    } catch (err) {
      setError('Delete failed locally. Contact privacy@8gi.org.');
      console.error(err);
    } finally {
      setBusy(null);
    }
  }

  const grace = daysRemaining(state);

  return (
    <div className="space-y-5">
      {state.status === 'deleted' && proof && (
        <Panel tone="ok" title="Your data has been deleted">
          <p className="text-sm">
            We kept a minimal deletion-proof record so we can show a regulator
            this happened. It contains a one-way hash of your email and a
            timestamp. We cannot rebuild your data from it.
          </p>
          <dl className="mt-3 text-xs space-y-1">
            <Row label="Receipt id" value={proof.receiptId} />
            <Row label="Deleted at" value={new Date(proof.deletedAt).toLocaleString()} />
            <Row label="Email hash" value={proof.emailHash.slice(0, 16) + '...'} />
          </dl>
        </Panel>
      )}

      {state.status === 'withdrawn' && (
        <Panel tone="warn" title="Consent withdrawn">
          <p className="text-sm">
            Processing is paused. Your data stays for <b>{grace} more day{grace === 1 ? '' : 's'}</b>,
            then it is deleted automatically. Restore anytime before then.
          </p>
          <button
            onClick={doRestore}
            disabled={busy !== null}
            className="mt-3 rounded-xl px-4 py-2 bg-[var(--brand-accent,#4CAF50)] text-white font-semibold disabled:opacity-50"
          >
            {busy === 'restore' ? 'Restoring...' : 'Restore consent'}
          </button>
        </Panel>
      )}

      {state.status === 'active' && (
        <>
          <Panel title="Parent email for privacy notices">
            <input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--brand-border, #E8E0D6)' }}
            />
            <p className="text-xs mt-2" style={{ color: 'var(--brand-text-muted, #9A9088)' }}>
              We use this only to confirm consent changes. No marketing ever.
            </p>
          </Panel>

          <Panel tone="warn" title="Withdraw consent">
            <p className="text-sm">
              Pauses all processing right now. We keep the data for 30 days so you can
              change your mind. After 30 days it is deleted automatically.
            </p>
            <button
              onClick={doWithdraw}
              disabled={busy !== null}
              className="mt-3 rounded-xl px-4 py-2 font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#F59E0B', color: 'white' }}
            >
              {busy === 'withdraw' ? 'Withdrawing...' : 'Withdraw consent'}
            </button>
          </Panel>

          <Panel tone="danger" title="Delete everything now">
            <p className="text-sm">
              Immediately removes the child profile, AAC vocabulary, saved progress,
              transcripts, and consent logs. We keep only a deletion-proof record
              (timestamp + one-way hash of your email) so we can prove the deletion
              happened. This cannot be undone.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="mt-3 w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--brand-border, #E8E0D6)' }}
            />
            <button
              onClick={doDelete}
              disabled={busy !== null}
              className="mt-3 rounded-xl px-4 py-2 font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#DC2626', color: 'white' }}
            >
              {busy === 'delete' ? 'Deleting...' : 'Delete everything now'}
            </button>
          </Panel>
        </>
      )}

      {error && (
        <p className="text-sm font-medium" style={{ color: '#DC2626' }}>{error}</p>
      )}
    </div>
  );
}

function Panel({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: 'warn' | 'danger' | 'ok';
  children: React.ReactNode;
}) {
  const border =
    tone === 'danger' ? '#FCA5A5' : tone === 'warn' ? '#FCD34D' : tone === 'ok' ? '#86EFAC' : 'var(--brand-border, #E8E0D6)';
  return (
    <section
      className="rounded-2xl p-4 bg-white"
      style={{ border: `2px solid ${border}` }}
    >
      <h2 className="font-bold text-base mb-2" style={{ color: 'var(--brand-text, #1A1614)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--brand-text-muted,#9A9088)]">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
