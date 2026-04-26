'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { GuideSection } from '@/components/guides/GuideSection';
import { GuideSentenceDemo } from '@/components/guides/GuideSentenceDemo';
import { GuideTapDemo } from '@/components/guides/GuideTapDemo';
import { preloadAudio } from '@/lib/tts';

/**
 * /guides/talk - parent walkthrough for the Talk page.
 *
 * Hand-holds parents through every interactive layer with REAL working
 * components: sentence bar, tap cards, mirror/magic/blend variants. Each
 * demo maintains its own local state so taps never leak into the live
 * sentence-store.
 */

const PRELOAD_PHRASES = [
  'I want water',
  'more',
  'stop',
  'happy',
  'help',
  "let's go",
  'all done',
  "let's go all done",
  'I want snack',
];

export default function GuidesTalkPage() {
  useEffect(() => {
    // Warm the TTS cache for every demo phrase so the first tap on any
    // button is instant. Best-effort; failures are silent inside preloadAudio.
    preloadAudio(PRELOAD_PHRASES);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            For parents
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            How Talk works
          </h1>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            Tap your way through this page. Every demo is real, with audio.
            Wear headphones if you are on a quiet train.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            New here? Read{' '}
            <Link href="/guides/intro" className="text-emerald-700 underline font-semibold">
              the intro
            </Link>{' '}
            first for the why.
          </p>
        </header>

        {/* 1. Sentence bar */}
        <GuideSection num={1} title="The sentence bar" id="sentence-bar">
          <p>
            Across the top of Talk sits the sentence bar. Every word your child
            taps slides into here as a chip. The green play button speaks the
            full sentence. The red X clears it.
          </p>
          <GuideSentenceDemo
            initialChips={[{ label: 'I' }, { label: 'want' }, { label: 'water' }]}
            caption="Tap the green ▶ button to hear it. Tap any chip to remove just that word."
          />
        </GuideSection>

        {/* 2. Tapping a card */}
        <GuideSection num={2} title="Tapping a card" id="tap-card">
          <p>
            Below the sentence bar are the word cards. One tap speaks the word
            instantly. Try these four core words:
          </p>
          <GuideTapDemo words={['more', 'stop', 'happy', 'help']} cols={4} />
          <p className="text-sm text-gray-600">
            On the real Talk page, tapping a card also adds it to the sentence
            bar. We left that off here so each tap stays its own clean demo.
          </p>
        </GuideSection>

        {/* 3. Predictive What's Next */}
        <GuideSection num={3} title="What's next (sky-blue row)" id="predictive">
          <p>
            The sky-blue row above the locked grid shows four likely next words
            based on your child&apos;s recent patterns. After they tap{' '}
            <em>I</em>, the row might offer <em>want</em>, <em>need</em>,{' '}
            <em>like</em>, <em>can</em>. It learns from yesterday, not from a
            stranger.
          </p>
          <div
            className="grid grid-cols-4 gap-2"
            role="group"
            aria-label="Example what's next predictions after tapping 'I'"
          >
            {['want', 'need', 'like', 'can'].map((word) => (
              <div
                key={word}
                className="rounded-xl border-2 border-sky-300 bg-sky-100 text-sky-900 px-2 py-3 text-center font-bold text-sm shadow-sm"
              >
                {word}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            These cards <em>can</em> reorder. The locked grid below them never
            does.
          </p>
        </GuideSection>

        {/* 4. Your Words - the big personal-vocabulary section */}
        <GuideSection num={4} title="Your Words: vocabulary that grows" id="your-words">
          <p>
            This is the section parents ask about most. Every time your child
            taps a word, 8gent Jr remembers - locally, on the device. After
            they tap a word <strong>5 or more times in a week</strong>, it gets
            promoted to the amber row with a star: their personal vocabulary,
            always one tap away.
          </p>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 my-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-800 mb-3">
              How it grows over a week
            </p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-200 text-amber-900 font-bold text-xs">
                  D1
                </span>
                <span className="text-gray-700">
                  <strong>Day 1.</strong> Child taps <em>snack</em> twice. Row
                  is empty. App is listening.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-300 text-amber-900 font-bold text-xs">
                  D3
                </span>
                <span className="text-gray-700">
                  <strong>Day 3.</strong> Three more taps. Total 5. Still hidden
                  - the threshold is hit but the row updates between sessions,
                  not mid-tap.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs">
                  D5
                </span>
                <span className="text-gray-700">
                  <strong>Day 5.</strong> Next time Talk opens, <em>snack</em>{' '}
                  appears in the Your Words row with a star. One thumb-stretch
                  away, every session.
                </span>
              </li>
            </ol>
            <div className="mt-4 grid grid-cols-3 gap-3" aria-hidden="true">
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-2 py-4 text-center text-xs text-gray-400 italic">
                empty
              </div>
              <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-2 py-4 text-center text-xs text-amber-700 italic">
                listening...
              </div>
              <div className="relative rounded-xl border-[3px] border-amber-500 bg-amber-200 text-amber-950 px-2 py-3 text-center font-bold text-sm shadow-sm">
                <span className="absolute top-1 right-1 text-amber-700">
                  &#9733;
                </span>
                snack
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500 text-center">
              Day 1 → Day 3 → Day 5: the moment a real word becomes a permanent
              shortcut.
            </p>
          </div>

          <p>
            What appears here is what your child cares about, in their own
            order. There is no editor, no curator, no list to maintain. The
            vocabulary grows with them.
          </p>

          <figure className="mt-4">
            <Image
              src="/screenshots/talk/talk-full.png"
              alt="The Talk page with a populated Your Words row, showing six amber word cards each with a small star indicator: more, want, snack, mum, stop, help. Below it the dashed-amber Suggested row, then the locked Fitzgerald-colored Supercore grid."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              sizes="(max-width: 640px) 100vw, 600px"
              loading="lazy"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              The amber Your Words row in production, populated.
            </figcaption>
          </figure>
        </GuideSection>

        {/* 5. Speak / Mirror / Magic */}
        <GuideSection num={5} title="Speak, Mirror, and Magic" id="speak-mirror-magic">
          <p>
            The button next to the green play has three identities depending on
            your child&apos;s NLA stage:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>▶ Speak</strong> always plays the sentence as built.
            </li>
            <li>
              <strong>🪞 Mirror</strong> appears at NLA stages 1-2. It re-speaks
              the sentence verbatim. Mirroring a gestalt processor&apos;s script
              is what they need - never correct early scripts.
            </li>
            <li>
              <strong>✨ Magic</strong> appears at NLA stages 3+. It improves
              grammar lightly before speaking, helping the bridge from chunks
              to single-word combinations.
            </li>
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Stage 1-2: Mirror
              </p>
              <GuideSentenceDemo
                initialChips={[
                  { label: "let's go", isGestalt: true },
                ]}
                withMirror
                caption="Tap 🪞 - the script comes back exactly as said."
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Stage 3+: Magic
              </p>
              <GuideSentenceDemo
                initialChips={[
                  { label: 'I' },
                  { label: 'want' },
                  { label: 'snack' },
                ]}
                withMagic
                caption="Tap ✨ - light analytic improve at higher stages."
              />
            </div>
          </div>
        </GuideSection>

        {/* 6. Blend (NEW) */}
        <GuideSection num={6} title="Blend: fusing two scripts" id="blend">
          <p>
            At NLA stage 2, when the sentence bar holds <strong>two or more
            gestalt chips</strong> (whole-phrase chunks marked with a small
            quote glyph), the second button becomes <strong>Blend</strong>.
            Blend keeps the child&apos;s scripts intact - it does not rewrite
            them analytically.
          </p>
          <GuideSentenceDemo
            initialChips={[
              { label: "let's go", isGestalt: true },
              { label: 'all done', isGestalt: true },
            ]}
            withBlend
            caption="Two gestalts on the bar. The Blend button fuses them while preserving each script."
          />
        </GuideSection>

        {/* 7. Browse / Phrases tabs */}
        <GuideSection num={7} title="Browse and Phrases" id="browse-phrases">
          <p>
            <strong>Browse</strong> opens the full vocabulary by Fitzgerald
            category: people, actions, descriptors, food, feelings, places,
            time, social. Every card here is the same shape and colour as the
            locked grid, so motor memory carries over.
          </p>
          <p>
            <strong>Phrases</strong> is your child&apos;s gestalt library:
            ready-made scripts they can launch in one tap (&quot;all
            done&quot;, &quot;I need a break&quot;, &quot;let&apos;s go&quot;).
            Tap once, the whole phrase speaks.
          </p>
          <figure className="mt-2">
            <Image
              src="/screenshots/talk/talk-above-fold.png"
              alt="Talk page above-the-fold view showing the sentence bar at the top and the topmost rows of the prediction and Your Words layout."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              sizes="(max-width: 640px) 100vw, 600px"
              loading="lazy"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              Above the fold on Talk. Sentence bar, then layered rows.
            </figcaption>
          </figure>
        </GuideSection>

        {/* 8. Voice Card Creator */}
        <GuideSection num={8} title="Need a card we don't have?" id="voice-cards">
          <p>
            For words and names unique to your family, the{' '}
            <Link href="/voice-cards" className="text-emerald-700 underline font-semibold">
              Voice Card Creator
            </Link>{' '}
            lets you record a card in your own voice. Microphone permission
            stays on-device - we cover that flow on its own page.
          </p>
        </GuideSection>

        <footer className="mt-16 pt-8 border-t border-gray-200">
          <Link
            href="/talk"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg px-6 py-4 shadow-sm transition-colors"
            aria-label="Open the live Talk page"
          >
            Open Talk now
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Want a refresher on the why?{' '}
            <Link href="/guides/intro" className="text-emerald-700 underline">
              Back to the intro
            </Link>
            .
          </p>
        </footer>
      </article>
    </div>
  );
}
