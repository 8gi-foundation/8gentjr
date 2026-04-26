import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { GuideSection } from '@/components/guides/GuideSection';
import { GuideSentenceDemo } from '@/components/guides/GuideSentenceDemo';

/**
 * /guides/educator - classroom-grade walkthrough.
 *
 * Long-scroll, ungated guide for classroom teachers, special-ed teachers,
 * SNAs, IEP teams, and school SLTs. Mirrors the layout, typography, and
 * section rhythm of /guides/therapist and /guides/intro so the
 * parent-domain voice stays consistent.
 *
 * Source content adapted from the educator deck in the resume portfolio
 * repo and rewritten in educator-to-educator register. Marge Blanc's
 * Natural Language Acquisition framework is referenced briefly.
 *
 * Issue: #156
 */

export const metadata: Metadata = {
  title: 'For Educators - 8gent Jr',
  description:
    'A teacher-to-teacher walkthrough of 8gent Jr: how an ungated, GLP-aware AAC app fits into a school day, supports IEP goals and progress monitoring, and runs on the classroom tablet you already have.',
};

export default function GuidesEducatorPage() {
  return (
    <div className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            For educators
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            8gent Jr for Classroom &amp; Special-Ed Teachers
          </h1>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            A short, practical walkthrough for classroom teachers, SNAs,
            resource teachers, and IEP teams. Written teacher-to-teacher.
            Skim it on a Sunday evening before the week starts.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Looking for the parent version?{' '}
            <Link
              href="/guides/intro"
              className="text-emerald-700 underline font-semibold"
            >
              Read the parent intro
            </Link>{' '}
            and send it home in the school bag.
          </p>
        </header>

        <GuideSection num={1} title="The classroom gap" id="gap">
          <p>
            You know the shape of this already. You have one device per
            class, a procurement cycle that runs on a different planet to
            the children in your room, and at least one student whose
            communication needs cannot wait for next year&apos;s budget.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>One device, many students.</strong> The class iPad
              gets shared across reading groups, maths stations, and your
              non-speaking student. The communication tool has to live
              alongside everything else, not behind a locked admin
              account.
            </li>
            <li>
              <strong>Multi-student, multi-need.</strong> One child needs a
              core grid. Another needs gestalt scripts. A third just needs
              a visible &quot;I need a break&quot; button by lunchtime.
              The tool has to hold all three.
            </li>
            <li>
              <strong>No IT budget, no procurement window.</strong>
              Dedicated AAC devices still sit in the 5,000 euro plus
              range. The school cannot order one this term, and the child
              needs to talk this week.
            </li>
            <li>
              <strong>AAC abandonment in school.</strong> A grid the child
              uses at home with their SLT is often left switched off in
              class, because the layout, the vocabulary, and the routine
              do not survive the transition into your room.
            </li>
          </ul>
          <p>
            8gent Jr is not a replacement for your SNA, your SLT, or your
            classroom planning. It is a free tool that runs on the device
            the school already has, with a layout that does not change
            between home, clinic, and classroom.
          </p>
        </GuideSection>

        <GuideSection
          num={2}
          title="How Talk fits a school day"
          id="school-day"
        >
          <p>
            The Talk page is built around the rhythms a teacher already
            structures the day with. Nothing here asks you to redesign
            your timetable. The card positions stay fixed, so the child
            builds the same motor memory across morning circle and
            home-time.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Transitions.</strong> &quot;All done&quot;,
              &quot;next&quot;, &quot;wait&quot;, &quot;line up&quot;
              live in the locked Supercore grid. The same tap path on
              Monday works on Friday. The visual timer in the regulation
              tools gives a five-minute warning the child can see.
            </li>
            <li>
              <strong>Requesting.</strong> &quot;I want&quot;,
              &quot;more&quot;, &quot;help&quot;, &quot;stop&quot; sit
              one tap away. The sentence bar lets the child stack a
              request in front of you instead of grabbing or pulling.
            </li>
            <li>
              <strong>Social rituals.</strong> Morning greetings,
              register, &quot;good morning&quot;, &quot;goodbye&quot;,
              &quot;thank you&quot; are stored as gestalt scripts so the
              child can join circle time with one tap rather than
              composing a sentence under pressure.
            </li>
            <li>
              <strong>Snack, lunch, playground.</strong> Routine
              vocabulary like &quot;snack&quot;, &quot;water&quot;,
              &quot;outside&quot;, &quot;ball&quot;, &quot;swing&quot;,
              and the always-visible safety phrases &quot;toilet&quot;
              and &quot;I&apos;m hurt&quot; stay one tap away regardless
              of stage.
            </li>
          </ul>
          <p>
            The classroom-typical sentence below is built from three
            chips on the locked grid. Tap the green speak control to
            hear it.
          </p>
          <div className="mt-3">
            <GuideSentenceDemo
              initialChips={[
                { label: 'I' },
                { label: 'want' },
                { label: 'snack' },
              ]}
              caption="A three-tap request the child can make at the snack table without grabbing or melting down."
            />
          </div>
        </GuideSection>

        <GuideSection
          num={3}
          title="Meeting the child where they are: the NLA stages"
          id="nla"
        >
          <p>
            Not every non-speaking student learns language one word at a
            time. Many are gestalt language processors: they start with
            whole scripted chunks and move through scripts toward
            original sentences. Marge Blanc&apos;s Natural Language
            Acquisition framework describes six stages, and the app
            re-shapes itself around the child&apos;s current stage.
          </p>
          <p>
            You do not need to be an SLT to use this. You only need to
            know which stage the child is sitting at, so the prompts you
            give in class match the prompts the device gives.
          </p>
          <ol className="list-none pl-0 space-y-3 mt-2">
            <li className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
              <span className="font-bold text-emerald-900">
                Stage 1 - Echolalia / Whole Gestalts.
              </span>
              <span className="ml-1 text-emerald-900/85">
                Whole scripted chunks. Songs, show quotes, your own
                phrases echoed back. Treat each gestalt as a single
                message, not a string of words to correct.
              </span>
            </li>
            <li className="rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3">
              <span className="font-bold text-emerald-900">
                Stage 2 - Mitigated Gestalts.
              </span>
              <span className="ml-1 text-emerald-900/85">
                Scripts get trimmed and recombined. The Blend control
                inside the app fuses two gestalts into one mitigated
                utterance, the developmentally appropriate bridge.
              </span>
            </li>
            <li className="rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3">
              <span className="font-bold text-sky-900">
                Stage 3 - Single Words from Gestalts.
              </span>
              <span className="ml-1 text-sky-900/85">
                Single words start to break free. The child labels,
                requests, and refuses one word at a time. Core grid
                comes into its own here.
              </span>
            </li>
            <li className="rounded-xl border-2 border-sky-400 bg-sky-50 px-4 py-3">
              <span className="font-bold text-sky-900">
                Stage 4 - Early Original Sentences.
              </span>
              <span className="ml-1 text-sky-900/85">
                Two- and three-word combinations the child has never
                heard as a script. &quot;I want snack&quot;,
                &quot;more book&quot;, &quot;go outside&quot;.
              </span>
            </li>
            <li className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3">
              <span className="font-bold text-amber-900">
                Stage 5 - Complex Grammar.
              </span>
              <span className="ml-1 text-amber-900/85">
                Questions, conjunctions, articles, prepositions. The
                child can answer Q&amp;A in class with a sentence
                rather than a single word.
              </span>
            </li>
            <li className="rounded-xl border-2 border-amber-500 bg-amber-100 px-4 py-3">
              <span className="font-bold text-amber-900">
                Stage 6 - Full Conversation.
              </span>
              <span className="ml-1 text-amber-900/90">
                Multi-turn talk, narrative, social-pragmatic language.
                The child sustains a topic across morning circle and
                tells you about their weekend.
              </span>
            </li>
          </ol>
          <p>
            Therapists work with these stages in depth. Educators only
            need the awareness: if the child is at Stage 1 or 2, do not
            mark scripted speech as an error. If the child is at Stage 3
            or 4, expect single words and short combinations, not
            essays. The app handles the matching prompts.
          </p>

          <figure className="mt-6">
            <Image
              src="/screenshots/intro/talk-above-fold.png"
              alt="The Talk page on a phone showing what a non-speaking student sees in class: a sentence bar with a green speak control at the top, a sky-blue predictive next-word strip with four likely words underneath, an amber Your Words row of frequently-tapped vocabulary marked with stars, and the locked Supercore grid of Fitzgerald-coloured core word cards filling the lower half."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              priority
              sizes="(max-width: 640px) 100vw, 600px"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              What a child sees in Talk: predictive strip, Your Words
              row, locked Supercore grid.
            </figcaption>
          </figure>
        </GuideSection>

        <GuideSection
          num={4}
          title="IEP integration and progress notes"
          id="iep"
        >
          <p>
            Three screens in the app give you the kind of evidence that
            slots straight into IEP goals and termly progress notes.
            None of it requires you to formally test the child or
            interrupt a lesson to collect data.
          </p>
          <ul className="list-disc pl-6 space-y-3">
            <li>
              <strong>T2.5 Your Words row.</strong> The amber row of
              starred personal-vocabulary cards is a frequency-emerged
              picture of the words this child actually uses. A word
              graduates to Your Words after the child has tapped it at
              least six times. Useful for goals like &quot;will use a
              core vocabulary of 20 words across three settings&quot;.
            </li>
            <li>
              <strong>T3.7 stage estimator.</strong> An on-device
              estimator reads recent session events and suggests the
              child&apos;s likely current NLA stage. It gives you a
              stage signal without a formal assessment, useful for IEP
              review meetings where you want to describe progress
              against the framework the SLT is using.
            </li>
            <li>
              <strong>T2.4 predictive strip.</strong> The sky-blue row
              above the Supercore grid shows four likely next words
              based on the child&apos;s own bigram patterns in the
              current session. Reading the predictive strip across a
              week tells you which pairings the child is choosing,
              which is a richer progress note than a single tap count.
            </li>
          </ul>
          <p>
            All three signals live on the device and are visible to the
            adult holding it. Nothing about the child&apos;s language
            is sold, profiled, or shipped to a third party.
          </p>

          <figure className="mt-6">
            <Image
              src="/screenshots/intro/settings-above-fold.png"
              alt="Settings page on a phone showing the auto-estimated NLA stage banner near the top with a short stage description, followed by a vertical stage selector listing all six NLA stages so a teacher, SNA, or SLT can override the estimate before an IEP review."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              sizes="(max-width: 640px) 100vw, 600px"
              loading="lazy"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              The stage estimator: a quick signal for IEP review, not
              an assessment in disguise.
            </figcaption>
          </figure>
        </GuideSection>

        <GuideSection
          num={5}
          title="Multiple students on a shared device"
          id="shared"
        >
          <p>
            Most special-ed classrooms run a shared tablet. The app is
            designed around that reality: every adult-only setting sits
            behind a parental gate, and each child gets their own
            profile that the device remembers.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Parental gate.</strong> Settings, profile
              switching, and stage overrides require a long-press
              followed by an adult-level interaction. A curious
              classmate cannot wander into the configuration screen.
            </li>
            <li>
              <strong>Per-child profiles.</strong> Each profile carries
              its own NLA stage, Your Words row, predictive strip
              history, grid size, and TTS voice. Switching profiles
              swaps the whole experience without rebuilding anything.
            </li>
            <li>
              <strong>What changes per child.</strong> The Supercore
              grid stays in the same positions across profiles, so
              motor memory is consistent if the child uses a personal
              device at home. Personalisation lives in the layers
              around the core: vocabulary, stage, voice, grid size,
              calm mode.
            </li>
            <li>
              <strong>Quick swap at transitions.</strong> Switching
              profiles is one tap from the parental gate. Reading
              group ends, you switch, the next child has their own
              row of starred words ready.
            </li>
          </ul>
        </GuideSection>

        <GuideSection
          num={6}
          title="Privacy: COPPA, GDPR, and your data officer"
          id="privacy"
        >
          <p>
            Your school&apos;s data protection officer is going to ask
            three questions before this app touches a school device.
            Here are the short answers.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Where is the data stored?</strong> Locally on the
              device. Session events, Your Words history, and stage
              signals are written to on-device storage. There is no
              cloud sync of session events.
            </li>
            <li>
              <strong>Is there a child account?</strong> No. The app
              does not require an account, an email, or a sign-up to
              start. A non-speaking student can open the page and tap
              a card without anyone collecting their identity.
            </li>
            <li>
              <strong>COPPA and GDPR posture.</strong> Local-first by
              default means the lawful basis for processing is narrow
              and the data subject&apos;s rights are easy to honour:
              the data is on the device the family controls. The app
              is built so that not collecting is the default state.
            </li>
            <li>
              <strong>What about TTS?</strong> Text spoken aloud is
              sent to a speech engine to produce audio, then cached
              on-device for instant replay. No transcript of the
              child&apos;s session events is uploaded.
            </li>
          </ul>
          <p>
            This is the short version. If your data officer wants the
            long version, send them to{' '}
            <Link
              href="/help"
              className="text-emerald-700 underline font-semibold"
            >
              /help
            </Link>{' '}
            and we will walk them through it directly.
          </p>
        </GuideSection>

        <GuideSection
          num={7}
          title="Get started, then send it home"
          id="start"
        >
          <ol className="list-none pl-0 space-y-4">
            <li className="flex gap-4">
              <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm">
                1
              </span>
              <span>
                Open{' '}
                <Link
                  href="/talk"
                  className="text-emerald-700 underline font-semibold"
                >
                  /talk
                </Link>{' '}
                on the classroom tablet. Tap a few cards. Get a feel
                for the sentence bar, the predictive strip, and the
                locked Supercore grid before the bell goes.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm">
                2
              </span>
              <span>
                Visit{' '}
                <Link
                  href="/settings"
                  className="text-emerald-700 underline font-semibold"
                >
                  /settings
                </Link>{' '}
                behind the parental gate. Confirm the estimated NLA
                stage for the child, override if the SLT has told you
                a different stage, and adjust grid size and TTS voice.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm">
                3
              </span>
              <span>
                Send the family the parent intro at{' '}
                <Link
                  href="/guides/intro"
                  className="text-emerald-700 underline font-semibold"
                >
                  /guides/intro
                </Link>
                . Five-minute read, no jargon, no install required.
                The same vocabulary you use in class will work at the
                kitchen table.
              </span>
            </li>
          </ol>

          <figure className="mt-8">
            <Image
              src="/screenshots/intro/talk-full.png"
              alt="The full Talk page from top to bottom on a single phone screen, showing the sentence bar, the sky-blue predictive next-word strip, the amber Your Words row marked with stars, the dashed-amber Suggested for you row of stage-appropriate prompts, and the locked Supercore grid of Fitzgerald-coloured core word cards filling the lower half of the screen."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              sizes="(max-width: 640px) 100vw, 600px"
              loading="lazy"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              The full Talk page: one screen, four layers,
              motor-stable core, ready for circle time.
            </figcaption>
          </figure>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/talk"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg px-6 py-4 shadow-sm transition-colors"
              aria-label="Open the Talk page now"
            >
              Open Talk
            </Link>
            <Link
              href="/guides/intro"
              className="inline-flex items-center justify-center rounded-xl border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-lg px-6 py-4 transition-colors"
              aria-label="Open the parent intro to send home with families"
            >
              Send parents the intro
            </Link>
          </div>
        </GuideSection>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
          <p>
            Classroom questions, IEP feature requests, or evidence you
            would like the app to surface? Visit{' '}
            <Link href="/help" className="text-emerald-700 underline">
              /help
            </Link>{' '}
            or send a note via{' '}
            <Link href="/feedback" className="text-emerald-700 underline">
              /feedback
            </Link>
            .
          </p>
        </footer>
      </article>
    </div>
  );
}
