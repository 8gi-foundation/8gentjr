'use client';

/**
 * The "name" half of do -> see -> name.
 *
 * One calm sentence, shown after the child has already produced the effect.
 * Deliberately NOT a celebration: no confetti, no score, no streak, no sound of
 * its own. It states what the child made happen and gets out of the way.
 *
 * Sound-off completeness: this card is the primary channel. Speech, when it
 * happens at all, is a duplicate of what is written here, so a deaf or
 * hard-of-hearing child gets the whole activity.
 *
 * Announced politely to screen readers rather than assertively, so it never
 * interrupts a child mid-utterance on the talker.
 *
 * Issue: #225
 */

interface NamingCardProps {
  /** The naming line. Nothing renders when null. */
  line: string | null;
  onDismiss: () => void;
  /** Accent colour. Must stay outside hues 270-350 per BRAND.md. */
  accent?: string;
  /** Light card for warm backgrounds, dark card for canvas surfaces. */
  tone?: 'light' | 'dark';
  className?: string;
}

export default function NamingCard({
  line,
  onDismiss,
  accent = '#E8610A',
  tone = 'light',
  className = '',
}: NamingCardProps) {
  if (!line) return null;

  const dark = tone === 'dark';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${className}`}
      style={{
        backgroundColor: dark ? 'rgba(26, 22, 18, 0.92)' : '#FFFFFF',
        borderColor: dark ? `${accent}55` : '#F0DECA',
        boxShadow: dark ? 'none' : '0 2px 12px rgba(232, 97, 10, 0.08)',
        // Motion is a single short fade. Honoured against reduced motion below.
        animation: 'namingFade 320ms ease-out both',
      }}
    >
      <span
        aria-hidden="true"
        className="shrink-0 rounded-full"
        style={{ width: 10, height: 10, backgroundColor: accent }}
      />

      <p
        className="flex-1 m-0 text-[15px] font-semibold leading-snug"
        style={{ color: dark ? '#F5EFE7' : '#1a1a2e' }}
      >
        {line}
      </p>

      {/* Child-sized target: 44px minimum, per the existing design system. */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close"
        className="shrink-0 grid place-items-center rounded-full border-none cursor-pointer font-bold text-lg leading-none"
        style={{
          minWidth: 44,
          minHeight: 44,
          backgroundColor: dark ? 'rgba(255,255,255,0.10)' : '#FFF3E8',
          color: accent,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <style jsx>{`
        @keyframes namingFade {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
