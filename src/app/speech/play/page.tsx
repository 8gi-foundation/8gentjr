import Link from 'next/link';
import VoicePlay from '@/components/VoicePlay';

/**
 * Voice Play - a sandbox under the existing Speech area (issue #238).
 *
 * Not a new top-level nav entry. /speech is already where mouth positions live,
 * and this joins it the way the science sandboxes join /science: one card on
 * the parent page, one route underneath, and a back control with the same
 * shape and the same word in the same corner as every other sandbox in the app,
 * so nothing has to be relearned.
 *
 * The chrome here is the warm cream the Speech area already uses, unlike the
 * dark science surfaces: this is a panel of exercises rather than a place, and
 * a child arriving from the phoneme cards should not feel the lights go out.
 */
export const metadata = {
  title: 'Voice Play | 8gent Jr',
  description: 'Mouth positions and held sounds, with live feedback on this device.',
};

export default function VoicePlayPage() {
  return (
    <div style={{ minHeight: 'calc(100dvh - 80px)', background: '#FFF8F0' }}>
      <header
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
        }}
      >
        <Link
          href="/speech"
          aria-label="Back to speech"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            minWidth: 44,
            minHeight: 44,
            fontSize: 18,
            fontWeight: 500,
            color: '#E8610A',
            textDecoration: 'none',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Speech</span>
        </Link>
        <h1
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: '#1A1612',
            fontFamily: 'var(--font-fraunces), serif',
            whiteSpace: 'nowrap',
          }}
        >
          Voice Play
        </h1>
      </header>

      <main>
        <VoicePlay />
      </main>
    </div>
  );
}
