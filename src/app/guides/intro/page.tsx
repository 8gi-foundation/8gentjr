import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { GuideSection } from '@/components/guides/GuideSection';

export const metadata: Metadata = {
  title: 'What is 8gent Jr - A Parent\'s Intro',
  description:
    'A plain-language intro for parents: what 8gent Jr does, why it is built around Gestalt Language Processing, how Talk works, and how to get started.',
};

export default function GuidesIntroPage() {
  return (
    <div className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            For parents
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            What is 8gent Jr?
          </h1>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            A calm, ad-free communication app for neurodivergent kids. Read like
            a friend explaining over coffee. Five minutes, then you can decide
            if it is right for your child.
          </p>
        </header>

        <GuideSection num={1} title="What it actually does" id="what">
          <p>
            8gent Jr is a talker. Your child taps a card with a word or a
            picture, and the app says it out loud in a friendly child voice. Tap
            a few cards in a row and it speaks the whole sentence.
          </p>
          <p>
            That is the surface. Underneath, the cards rearrange themselves over
            time so your child sees the words they actually use most often,
            right where their thumb already lives.
          </p>
          <figure className="mt-6">
            <Image
              src="/screenshots/intro/talk-above-fold.png"
              alt="The 8gent Jr Talk page on a phone, showing a sentence bar at the top with a green play button, a sky-blue row of next-word predictions, an amber row of the child's most-used words, and a grid of tappable word cards in Fitzgerald colors."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              priority
              sizes="(max-width: 640px) 100vw, 600px"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              The Talk page: a sentence bar on top, tappable words below.
            </figcaption>
          </figure>
        </GuideSection>

        <GuideSection num={2} title="Why we built it around GLP" id="why">
          <p>
            Many neurodivergent children, especially autistic kids, are
            <strong> Gestalt Language Processors</strong>. That is not a
            diagnosis or a deficit. It is a different starting point: kids who
            learn language in whole chunks (echolalia, scripts, song lines)
            before they break those chunks into single words.
          </p>
          <p>
            The framework we follow is{' '}
            <strong>Marge Blanc&apos;s Natural Language Acquisition (NLA)</strong>
            , a six-stage model widely used by speech-language pathologists. We
            do not invent stages. We meet your child wherever they are on
            theirs, and the app shifts behaviour accordingly.
          </p>
          <p>
            On the Settings page, a banner shows your child&apos;s current NLA
            stage. It is auto-estimated from how they use Talk, not asked in a
            quiz. You can override it at any time if you know better.
          </p>
          <figure className="mt-6">
            <Image
              src="/screenshots/intro/settings-above-fold.png"
              alt="The Settings page on a phone, showing the NLA stage banner at the top with the current stage and a short description, followed by a stage selector with stages 1 through 6."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              sizes="(max-width: 640px) 100vw, 600px"
              loading="lazy"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              Settings shows the auto-estimated NLA stage. Override anytime.
            </figcaption>
          </figure>
        </GuideSection>

        <GuideSection num={3} title="How Talk is laid out" id="how">
          <p>
            Talk is four stacked rows from top to bottom. Each row has a job and
            a colour so your child can spot it without reading.
          </p>
          <ol className="space-y-3 list-none pl-0 mt-2">
            <li className="rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3">
              <span className="font-bold text-sky-900">1. What&apos;s next (sky blue).</span>
              <span className="ml-1 text-sky-900/80">
                Predicts likely next words from yesterday&apos;s patterns. These
                cards <em>can</em> move.
              </span>
            </li>
            <li className="rounded-xl border-[3px] border-amber-500 bg-amber-100 px-4 py-3">
              <span className="font-bold text-amber-900">2. Your Words (amber, with a star).</span>
              <span className="ml-1 text-amber-900/90">
                Words your child has tapped 5+ times. Their personal vocabulary,
                surfaced for instant access.
              </span>
            </li>
            <li className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-3">
              <span className="font-bold text-amber-900">3. Suggested for you (dashed amber).</span>
              <span className="ml-1 text-amber-900/80">
                Stage-appropriate prompts. Refreshes between sessions.
              </span>
            </li>
            <li className="rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3">
              <span className="font-bold text-gray-900">4. The locked Supercore grid.</span>
              <span className="ml-1 text-gray-700">
                Fitzgerald-coloured core vocabulary that <strong>never moves</strong>.
                Motor planning matters: kids learn to find &quot;more&quot;
                without looking, the way you find your coffee mug in the dark.
              </span>
            </li>
          </ol>
          <figure className="mt-6">
            <Image
              src="/screenshots/intro/talk-full.png"
              alt="The full Talk page showing all four rows from top to bottom: the sky-blue What's Next prediction row, the amber Your Words row with stars, the dashed-amber Suggested row, and the locked grid of Fitzgerald-colored Supercore word cards."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              sizes="(max-width: 640px) 100vw, 600px"
              loading="lazy"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              Talk, top to bottom. Want details on each row?{' '}
              <Link href="/guides/talk" className="text-emerald-700 underline font-semibold">
                See the Talk walkthrough
              </Link>
              .
            </figcaption>
          </figure>
        </GuideSection>

        <GuideSection num={4} title="Privacy and COPPA" id="privacy">
          <p>
            8gent Jr is local-first. The words your child taps and the
            sentences they build stay on the device. We do not sync session
            events to a cloud. We do not sell data. Ever.
          </p>
          <p>
            Adult-only pages (Settings, Privacy, Help, Feedback) sit behind a
            simple parental gate. Educational pages like this guide are open so
            you can read them before deciding whether to install anything.
          </p>
          <p>
            The text-to-speech voice is generated by a third-party voice
            provider when an internet connection is available, with a built-in
            browser-voice fallback. Only the words being spoken are sent for
            synthesis. Read the full{' '}
            <Link href="/privacy" className="text-emerald-700 underline font-semibold">
              privacy policy
            </Link>{' '}
            for the long version.
          </p>
        </GuideSection>

        <GuideSection num={5} title="Get started in three steps" id="start">
          <ol className="list-none pl-0 space-y-4">
            <li className="flex gap-4">
              <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm">
                1
              </span>
              <span>
                Open <Link href="/talk" className="text-emerald-700 underline font-semibold">/talk</Link>{' '}
                on your phone or tablet. No sign-up, no install required to try.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm">
                2
              </span>
              <span>
                Tap any word card. The app speaks it. Tap a few in a row to
                build a sentence, then press the green play button.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm">
                3
              </span>
              <span>
                Visit{' '}
                <Link href="/settings" className="text-emerald-700 underline font-semibold">
                  /settings
                </Link>{' '}
                to see the auto-estimated NLA stage and personalise voice and
                name.
              </span>
            </li>
          </ol>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/talk"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg px-6 py-4 shadow-sm transition-colors"
              aria-label="Open the Talk page now"
            >
              Open Talk now
            </Link>
            <Link
              href="/guides/talk"
              className="inline-flex items-center justify-center rounded-xl border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-lg px-6 py-4 transition-colors"
              aria-label="Read the full Talk walkthrough"
            >
              Walk through Talk
            </Link>
          </div>
        </GuideSection>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
          <p>
            Questions? Visit{' '}
            <Link href="/help" className="text-emerald-700 underline">/help</Link>{' '}
            or send us a note via{' '}
            <Link href="/feedback" className="text-emerald-700 underline">/feedback</Link>.
          </p>
        </footer>
      </article>
    </div>
  );
}
