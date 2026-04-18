import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Use 8gent Jr',
  description: 'Simple video guides for parents, teachers, and carers. Learn how to use 8gent Jr AAC in minutes.',
};

interface VideoCard {
  id: string;
  title: string;
  description: string;
  audience: 'child' | 'parent' | 'teacher';
  audienceLabel: string;
  youtubeId: string | null; // null = coming soon
  steps: string[];
  durationLabel: string;
}

const VIDEOS: VideoCard[] = [
  {
    id: 'say-something',
    title: 'How to say something',
    description: 'Tap a symbol, build a sentence, and hear it spoken aloud.',
    audience: 'child',
    audienceLabel: 'For everyone',
    youtubeId: null,
    durationLabel: '~60 sec',
    steps: [
      'Open the app and tap "Talk" at the bottom.',
      'Tap any symbol and it appears in the sentence bar at the top.',
      'Keep tapping symbols to build your message.',
      'Tap the speaker icon in the sentence bar to hear it.',
      'Tap the X on any word to remove it, or swipe the bar to clear.',
    ],
  },
  {
    id: 'browse-categories',
    title: 'How to find words',
    description: 'Browse by category to find exactly the right symbol.',
    audience: 'child',
    audienceLabel: 'For everyone',
    youtubeId: null,
    durationLabel: '~60 sec',
    steps: [
      'From the Talk screen, tap "Browse" to see all categories.',
      'Choose a category: Food, Feelings, Actions, and more.',
      'Tap any word inside to add it to your sentence.',
      'Your sentence bar stays the same as you browse. Nothing is lost.',
      'Tap "Talk" in the dock to go back to the main screen.',
    ],
  },
  {
    id: 'parent-setup',
    title: 'Setting up for your child',
    description: "Personalise the voice, name, and experience in under 2 minutes.",
    audience: 'parent',
    audienceLabel: 'For parents & carers',
    youtubeId: null,
    durationLabel: '~90 sec',
    steps: [
      'Open the app and complete the short onboarding. It takes 2 minutes.',
      "Enter your child's name and choose a voice that feels right.",
      'The app remembers everything. No account or login needed.',
      'Tap "More" in the dock, then "My Stuff" to change settings any time.',
      'Everything is stored on the device. No data leaves without your permission.',
    ],
  },
  {
    id: 'classroom-setup',
    title: 'Using 8gent Jr in the classroom',
    description: 'Get it working on an interactive board in under 5 minutes.',
    audience: 'teacher',
    audienceLabel: 'For teachers',
    youtubeId: null,
    durationLabel: '~90 sec',
    steps: [
      'Open a browser on the board and go to 8gentjr.com.',
      'If the site is blocked, ask your IT admin to whitelist 8gentjr.com.',
      'Press F11 (or the fullscreen button) for the best classroom view.',
      'The app works without an account. Just open and go.',
      'Tap the symbols with your finger or a stylus, same as a tablet.',
      'To reset between students, tap "More" then "My Stuff" and clear the session.',
    ],
  },
];

const AUDIENCE_COLORS: Record<VideoCard['audience'], string> = {
  child: '#E8610A',
  parent: '#2E7D32',
  teacher: '#1565C0',
};

function AudienceBadge({ audience, label }: { audience: VideoCard['audience']; label: string }) {
  const color = AUDIENCE_COLORS[audience];
  return (
    <span
      className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {label}
    </span>
  );
}

function VideoEmbed({ youtubeId, title }: { youtubeId: string | null; title: string }) {
  if (!youtubeId) {
    return (
      <div className="relative w-full aspect-video rounded-2xl bg-[#F5F0EA] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#D4C9BC]">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#B0A090" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" fill="#B0A090" stroke="none" />
        </svg>
        <span className="text-sm text-[#9A8A7A] font-medium">Video coming soon</span>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-2 mt-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
            style={{ backgroundColor: '#E8610A' }}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span className="text-sm text-[#4A3F35] leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--brand-bg-warm, #FDFCFA)' }}>
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <Link
          href="/talk"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-opacity hover:opacity-70"
          style={{ color: '#E8610A' }}
          aria-label="Back to app"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to app
        </Link>

        <h1 className="text-3xl font-bold text-[#2C1810]" style={{ fontFamily: 'var(--font-fraunces, serif)' }}>
          How to use 8gent Jr
        </h1>
        <p className="mt-2 text-base text-[#6B5A4E]">
          Simple guides for parents, teachers, and anyone getting started.
        </p>
      </div>

      {/* Video cards */}
      <div className="px-5 pb-32 flex flex-col gap-8">
        {VIDEOS.map((video) => (
          <section
            key={video.id}
            className="rounded-3xl border overflow-hidden"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#EDE6DE' }}
            aria-labelledby={`video-title-${video.id}`}
          >
            {/* Video embed */}
            <div className="p-4 pb-0">
              <VideoEmbed youtubeId={video.youtubeId} title={video.title} />
            </div>

            {/* Info */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <AudienceBadge audience={video.audience} label={video.audienceLabel} />
                <span className="text-xs text-[#9A8A7A]">{video.durationLabel}</span>
              </div>

              <h2
                id={`video-title-${video.id}`}
                className="text-xl font-bold text-[#2C1810] mt-2"
                style={{ fontFamily: 'var(--font-fraunces, serif)' }}
              >
                {video.title}
              </h2>
              <p className="text-sm text-[#6B5A4E] mt-1">{video.description}</p>

              {/* Step-by-step */}
              <details className="mt-4">
                <summary className="text-sm font-semibold cursor-pointer select-none list-none flex items-center gap-2" style={{ color: '#E8610A' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  Step-by-step guide
                </summary>
                <StepList steps={video.steps} />
              </details>
            </div>
          </section>
        ))}

        {/* Footer note for teachers */}
        <div
          className="rounded-2xl p-4 text-sm"
          style={{ backgroundColor: '#EEF4FF', color: '#1565C0' }}
          role="note"
        >
          <strong>For schools:</strong> If 8gentjr.com is blocked by your network, ask your IT admin to whitelist{' '}
          <code className="bg-white/60 px-1 rounded text-xs">8gentjr.com</code>. It&apos;s a free educational tool for
          neurodivergent children, and most content filters approve it immediately.
        </div>
      </div>
    </div>
  );
}
