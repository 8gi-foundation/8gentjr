'use client';

/**
 * OnboardingFlow — Problem-first onboarding for 8gent Jr.
 *
 * Issue #97: Lead with the child's experience, not features.
 * Flow:
 *   Step 1: "Every child deserves to be heard" — emotional hook
 *   Step 2: AAC bridges the communication gap — show the solution
 *   Step 3: Set up child's profile + parent consent
 *
 * No feature grids. No "powered by AI" language. Just warmth.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

// ── Step 1: The emotional hook ──────────────────────────

function StepEmpathy({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
      {/* Soft background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50 via-orange-50 to-rose-50 -z-10" />

      {/* Illustration: child reaching out */}
      <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-amber-100 border-4 border-amber-200/60 flex items-center justify-center mb-8 shadow-lg shadow-amber-100/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://static.arasaac.org/pictograms/6566/6566_300.png"
          alt="Child communicating"
          width={120}
          height={120}
          className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
        />
      </div>

      <h1
        className="text-3xl sm:text-4xl font-bold leading-tight max-w-sm"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--brand-text)' }}
      >
        Every child deserves to be heard
      </h1>

      <p className="mt-4 text-lg sm:text-xl leading-relaxed max-w-md" style={{ color: 'var(--brand-text-soft)' }}>
        Some children have so much to say but no way to say it.
        The frustration of not being understood is real — for them and for you.
      </p>

      <p className="mt-3 text-base leading-relaxed max-w-md" style={{ color: 'var(--brand-text-muted)' }}>
        You are not alone in this. And neither is your child.
      </p>

      <button
        onClick={onNext}
        className="mt-10 px-8 py-4 rounded-2xl text-lg font-semibold text-white
                   ios-press touch-target transition-colors"
        style={{ backgroundColor: 'var(--brand-accent)' }}
        aria-label="Continue to next step"
      >
        I understand this feeling
      </button>

      <p className="mt-4 text-sm" style={{ color: 'var(--brand-text-muted)' }}>
        Step 1 of 3
      </p>
    </div>
  );
}

// ── Step 2: AAC as the bridge ───────────────────────────

function StepSolution({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-blue-50 to-indigo-50 -z-10" />

      {/* Before / After visual */}
      <div className="flex items-center gap-4 mb-8">
        {/* Before: isolated */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://static.arasaac.org/pictograms/7340/7340_300.png"
              alt="Child feeling frustrated"
              width={72}
              height={72}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain opacity-60"
            />
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--brand-text-muted)' }}>Before</span>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-1">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>

        {/* After: connected */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-green-100 border-2 border-green-200 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://static.arasaac.org/pictograms/6499/6499_300.png"
              alt="Child communicating happily"
              width={72}
              height={72}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
            />
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--brand-text-soft)' }}>After</span>
        </div>
      </div>

      <h1
        className="text-3xl sm:text-4xl font-bold leading-tight max-w-sm"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--brand-text)' }}
      >
        A picture is worth a thousand words
      </h1>

      <p className="mt-4 text-lg sm:text-xl leading-relaxed max-w-md" style={{ color: 'var(--brand-text-soft)' }}>
        Picture-based communication (AAC) gives your child a voice.
        They tap pictures to build sentences, and the app speaks for them.
      </p>

      {/* Mini demo: 3 example AAC cards */}
      <div className="mt-6 flex gap-3" role="img" aria-label="Example AAC cards: I want, drink, please">
        {[
          { label: 'I want', picto: '6579', bg: '#FFF59D', border: '#F59E0B' },
          { label: 'drink', picto: '2410', bg: '#FFCC80', border: '#F97316' },
          { label: 'please', picto: '5765', bg: '#A5D6A7', border: '#10B981' },
        ].map((card) => (
          <div
            key={card.label}
            className="flex flex-col items-center gap-1 rounded-xl p-2 w-20 sm:w-24 border-2"
            style={{ backgroundColor: card.bg, borderColor: card.border }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://static.arasaac.org/pictograms/${card.picto}/${card.picto}_300.png`}
              alt={card.label}
              width={56}
              height={56}
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
            />
            <span className="text-xs font-bold text-gray-800">{card.label}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm max-w-sm" style={{ color: 'var(--brand-text-muted)' }}>
        No reading required. Just pictures, taps, and a voice.
      </p>

      <div className="mt-8 flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-4 rounded-2xl text-base font-semibold
                     border-2 ios-press touch-target transition-colors"
          style={{ borderColor: 'var(--brand-border)', color: 'var(--brand-text-soft)' }}
          aria-label="Go back to previous step"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-8 py-4 rounded-2xl text-lg font-semibold text-white
                     ios-press touch-target transition-colors"
          style={{ backgroundColor: 'var(--brand-accent)' }}
          aria-label="Continue to set up your child's profile"
        >
          Let&apos;s set this up
        </button>
      </div>

      <p className="mt-4 text-sm" style={{ color: 'var(--brand-text-muted)' }}>
        Step 2 of 3
      </p>
    </div>
  );
}

// ── Step 3: Profile + consent ───────────────────────────

function StepProfile({
  onComplete,
  onBack,
}: {
  onComplete: (name: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the name input when this step mounts
    nameRef.current?.focus();
  }, []);

  const canContinue = name.trim().length > 0 && consent;

  const handleSubmit = useCallback(() => {
    if (canContinue) {
      onComplete(name.trim());
    }
  }, [canContinue, name, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-green-50 via-emerald-50 to-teal-50 -z-10" />

      {/* Welcome icon */}
      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-emerald-100 border-4 border-emerald-200/60 flex items-center justify-center mb-6 shadow-lg shadow-emerald-100/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://static.arasaac.org/pictograms/11302/11302_300.png"
          alt="Happy greeting"
          width={96}
          height={96}
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
        />
      </div>

      <h1
        className="text-3xl sm:text-4xl font-bold leading-tight max-w-sm"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--brand-text)' }}
      >
        Who are we helping today?
      </h1>

      <p className="mt-3 text-base leading-relaxed max-w-md" style={{ color: 'var(--brand-text-soft)' }}>
        We will personalise everything around your child. Their name will appear on their home screen and communication boards.
      </p>

      {/* Name input */}
      <div className="mt-6 w-full max-w-xs">
        <label htmlFor="child-name" className="sr-only">
          Child&apos;s first name
        </label>
        <input
          ref={nameRef}
          id="child-name"
          type="text"
          placeholder="Child's first name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          className="w-full px-5 py-4 rounded-2xl text-lg text-center font-medium
                     border-2 outline-none transition-colors
                     focus:ring-2 focus:ring-offset-2"
          style={{
            borderColor: 'var(--brand-border)',
            color: 'var(--brand-text)',
            backgroundColor: 'white',
          }}
          maxLength={50}
          autoComplete="given-name"
          aria-required="true"
        />
      </div>

      {/* Parent consent */}
      <div className="mt-6 w-full max-w-sm">
        <label
          htmlFor="parent-consent"
          className="flex items-start gap-3 text-left cursor-pointer p-3 rounded-xl transition-colors"
          style={{ backgroundColor: consent ? 'rgba(16, 185, 129, 0.08)' : 'transparent' }}
        >
          <input
            id="parent-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-emerald-600 flex-shrink-0"
            aria-required="true"
          />
          <span className="text-sm leading-relaxed" style={{ color: 'var(--brand-text-soft)' }}>
            I am this child&apos;s parent or guardian. I consent to setting up this communication tool for them.
            All data stays on this device.
          </span>
        </label>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-4 rounded-2xl text-base font-semibold
                     border-2 ios-press touch-target transition-colors"
          style={{ borderColor: 'var(--brand-border)', color: 'var(--brand-text-soft)' }}
          aria-label="Go back to previous step"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canContinue}
          className="px-8 py-4 rounded-2xl text-lg font-semibold text-white
                     ios-press touch-target transition-all"
          style={{
            backgroundColor: canContinue ? 'var(--brand-accent)' : '#D1D5DB',
            cursor: canContinue ? 'pointer' : 'not-allowed',
          }}
          aria-label="Start using the app"
          aria-disabled={!canContinue}
        >
          Start communicating
        </button>
      </div>

      <p className="mt-4 text-sm" style={{ color: 'var(--brand-text-muted)' }}>
        Step 3 of 3
      </p>
    </div>
  );
}

// ── Main flow controller ────────────────────────────────

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const { updateSettings } = useApp();
  const router = useRouter();

  const handleComplete = useCallback(
    (childName: string) => {
      // SEC-J1: Sanitize child name — strip HTML tags, cap length
      const sanitized = childName.replace(/<[^>]*>/g, '').slice(0, 50).trim();
      if (!sanitized) return;
      updateSettings({
        childName: sanitized,
        hasCompletedOnboarding: true,
      });
      router.replace('/talk');
    },
    [updateSettings, router],
  );

  return (
    <div className="relative overflow-hidden">
      {step === 0 && <StepEmpathy onNext={() => setStep(1)} />}
      {step === 1 && <StepSolution onNext={() => setStep(2)} onBack={() => setStep(0)} />}
      {step === 2 && <StepProfile onComplete={handleComplete} onBack={() => setStep(1)} />}
    </div>
  );
}
