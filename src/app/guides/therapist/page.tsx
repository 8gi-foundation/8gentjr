import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { GuideSection } from '@/components/guides/GuideSection';
import { GuideSentenceDemo } from '@/components/guides/GuideSentenceDemo';

/**
 * /guides/therapist - clinical-grade walkthrough.
 *
 * Long-scroll, ungated guide for Speech & Language Therapists, OTs, and
 * clinical teams. Mirrors the layout, typography, and section rhythm of
 * /guides/intro so the parent-domain voice stays consistent.
 *
 * Source content adapted from the therapist deck in the resume portfolio
 * repo and rewritten in clinician-to-clinician register. Marge Blanc's
 * Natural Language Acquisition framework is cited explicitly.
 *
 * Issue: #155
 */

export const metadata: Metadata = {
  title: 'For Speech & Language Therapists - 8gent Jr',
  description:
    'A clinician-to-clinician walkthrough of 8gent Jr: how an ungated, GLP-native AAC app supports Marge Blanc NLA stages 1-6, motor-planning consistency, Fitzgerald Key vocabulary, and carryover between clinic and home.',
};

export default function GuidesTherapistPage() {
  return (
    <div className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            For clinicians
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            8gent Jr for Speech &amp; Language Therapists
          </h1>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            A short, evidence-led walkthrough for SLTs, OTs, and clinical
            teams. Written clinician-to-clinician. Skim it on a Tuesday
            morning between sessions.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Looking for the parent version?{' '}
            <Link
              href="/guides/intro"
              className="text-emerald-700 underline font-semibold"
            >
              Read the parent intro
            </Link>{' '}
            and share it with families.
          </p>
        </header>

        <GuideSection num={1} title="The clinical gap" id="gap">
          <p>
            You already know the shape of the problem. The tools you would
            recommend are not the tools families can implement. The progress
            you log in session is rarely the progress that lands at home.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Access.</strong> Dedicated AAC devices still sit in the
              5,000 euro plus range. Medical card thresholds and 18-month
              waitlists keep them out of reach for most of the families on
              your caseload.
            </li>
            <li>
              <strong>Carryover.</strong> The grid you teach in clinic is not
              the grid the child uses on the family iPad. Different layouts,
              different vocabulary, different motor plans.
            </li>
            <li>
              <strong>Data.</strong> Most carryover evidence is anecdotal.
              Parent report on a Monday, your own observation on a Thursday,
              no quantitative thread between the two.
            </li>
            <li>
              <strong>Family training.</strong> You have minutes, not hours.
              Systems that need a workshop to implement get abandoned.
            </li>
            <li>
              <strong>GLP support.</strong> Most AAC is word-first. Gestalt
              language processors need scripts, mitigated chunks, and
              stage-aware prompting that conventional grids do not provide.
            </li>
          </ul>
          <p>
            8gent Jr is a focused response to those five constraints. It is
            not a replacement for therapy. It is a tool that travels with the
            child between your clinic, the classroom, and the kitchen table.
          </p>
        </GuideSection>

        <GuideSection
          num={2}
          title="Evidence-based design"
          id="evidence"
        >
          <p>
            The app is built on long-standing AAC principles, not consumer
            UX patterns retrofitted with a speech engine.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Motor-planning consistency.</strong> Core vocabulary
              sits in fixed grid positions. The locked Supercore grid never
              re-orders itself. Children build motor memory the same way an
              adult finds a kettle in the dark.
            </li>
            <li>
              <strong>Fitzgerald Key.</strong> Cards are coloured by part of
              speech using the Fitzgerald Key conventions familiar from
              clinical AAC training. Pronouns, verbs, descriptors, and core
              social words read at a glance.
            </li>
            <li>
              <strong>ARASAAC pictograms.</strong> The pictogram set is the
              ARASAAC open library, the same symbol stock most European
              clinical tools use. No bespoke art that has to be re-learned.
            </li>
            <li>
              <strong>Three vocabulary layers.</strong> Core (high-frequency,
              fixed-position), fringe (contextual, personalised), and
              gestalt (whole scripts and chunks). Each layer behaves
              differently, on purpose.
            </li>
            <li>
              <strong>Marge Blanc&apos;s Natural Language Acquisition
              framework.</strong> The app respects the six NLA stages
              described by Blanc and adjusts behaviour accordingly. We do
              not invent stages. We meet the child where you have already
              placed them.
            </li>
          </ul>
        </GuideSection>

        <GuideSection
          num={3}
          title="GLP-native: NLA stages 1 through 6"
          id="nla"
        >
          <p>
            For gestalt language processors, the app is first-class, not an
            after-thought. Every phrase carries a stage tag, and the
            interface re-shapes itself around the child&apos;s current
            stage.
          </p>
          <ol className="list-none pl-0 space-y-3 mt-2">
            <li className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
              <span className="font-bold text-emerald-900">
                Stage 1 - Echolalia / Whole Gestalts.
              </span>
              <span className="ml-1 text-emerald-900/85">
                Whole scripted chunks treated as single indivisible
                messages. Songs, show quotes, caregiver phrases.
              </span>
            </li>
            <li className="rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3">
              <span className="font-bold text-emerald-900">
                Stage 2 - Mitigated Gestalts.
              </span>
              <span className="ml-1 text-emerald-900/85">
                Chunks are trimmed and recombined. The Blend mode
                described below is the in-app surface for this stage.
              </span>
            </li>
            <li className="rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3">
              <span className="font-bold text-sky-900">
                Stage 3 - Single Words from Gestalts.
              </span>
              <span className="ml-1 text-sky-900/85">
                Isolated single words break free of scripts. The child
                labels, requests, and refuses one word at a time.
              </span>
            </li>
            <li className="rounded-xl border-2 border-sky-400 bg-sky-50 px-4 py-3">
              <span className="font-bold text-sky-900">
                Stage 4 - Early Original Sentences.
              </span>
              <span className="ml-1 text-sky-900/85">
                Novel two- and three-word combinations the child has not
                heard as a script. Agent-action, action-object,
                subject-verb-object.
              </span>
            </li>
            <li className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3">
              <span className="font-bold text-amber-900">
                Stage 5 - Complex Grammar.
              </span>
              <span className="ml-1 text-amber-900/85">
                Questions, conjunctions, articles, prepositions, and
                longer flexible expressions.
              </span>
            </li>
            <li className="rounded-xl border-2 border-amber-500 bg-amber-100 px-4 py-3">
              <span className="font-bold text-amber-900">
                Stage 6 - Full Conversation.
              </span>
              <span className="ml-1 text-amber-900/90">
                Multi-turn conversation, narrative, and social-pragmatic
                language. The child sustains topics and shares experience.
              </span>
            </li>
          </ol>
          <p>
            Stage names follow Blanc&apos;s NLA model. The same six stages
            appear inside the app on the Settings page so the carer or
            clinician can override the auto-estimate at any time.
          </p>

          <figure className="mt-6">
            <Image
              src="/screenshots/intro/talk-above-fold.png"
              alt="Talk page on a phone showing, top to bottom: a sentence bar with a green speak control, a sky-blue predictive next-word strip with four candidate words, an amber Your Words row of frequently-tapped vocabulary marked with stars, and the locked Supercore grid of Fitzgerald-coloured core word cards beneath."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              priority
              sizes="(max-width: 640px) 100vw, 600px"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              Talk above the fold: predictive strip, Your Words row, locked
              Supercore grid in Fitzgerald colours.
            </figcaption>
          </figure>

          <p className="mt-6">
            Stage 2 is the moment most word-first grids fail GLP children.
            The example below shows the Blend interaction: two whole
            gestalts on the sentence bar, fused into a single mitigated
            utterance while preserving each script. Tap the bar buttons to
            hear it.
          </p>
          <div className="mt-3">
            <GuideSentenceDemo
              initialChips={[
                { label: "let's go", isGestalt: true },
                { label: 'all done', isGestalt: true },
              ]}
              withBlend
              caption={`Two gestalts ("let's go" and "all done") sit on the bar with quote glyphs. Blend speaks them as one mitigated utterance, the bridge from Stage 1 to Stage 3.`}
            />
          </div>
        </GuideSection>

        <GuideSection
          num={4}
          title="What is tracked, where it lives"
          id="tracking"
        >
          <p>
            The app records communication events on-device. Nothing about a
            child&apos;s language is sold, profiled, or shipped to a third
            party. Four mechanisms drive the clinical signal.
          </p>
          <ul className="list-disc pl-6 space-y-3">
            <li>
              <strong>NLA stage estimator (T3.7).</strong> A small
              on-device estimator reads recent session events and suggests
              the child&apos;s likely current stage. It is read-only. The
              estimator never auto-mutates the active stage. The carer or
              clinician confirms or overrides.
            </li>
            <li>
              <strong>Predictive next-word strip (T2.4).</strong> The
              sky-blue row above the Supercore grid shows four likely next
              words derived from the child&apos;s own bigram patterns in
              the current session. It biases toward words they already
              use, not toward an external corpus.
            </li>
            <li>
              <strong>Your Words row (T2.5).</strong> The amber row is
              frequency-thresholded promotion: a word the child has tapped
              at least six times graduates from the locked grid into a
              starred personal-vocabulary slot. Visible, instant, theirs.
            </li>
            <li>
              <strong>Stage-2 Blend mode (T3.8).</strong> When the active
              stage is 2 and the sentence bar contains two or more
              gestalt-tagged chips, a Blend control appears alongside the
              speak button. Blend fuses the gestalts into one mitigated
              utterance, the developmentally appropriate bridge.
            </li>
          </ul>

          <figure className="mt-6">
            <Image
              src="/screenshots/intro/settings-above-fold.png"
              alt="Settings page on a phone showing the auto-estimated NLA stage banner near the top with a short stage description, followed by a vertical stage selector listing all six NLA stages so a carer or clinician can override the estimate."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              sizes="(max-width: 640px) 100vw, 600px"
              loading="lazy"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              Settings: the estimator suggests, the clinician decides.
            </figcaption>
          </figure>
        </GuideSection>

        <GuideSection
          num={5}
          title="In-clinic and at-home, one system"
          id="carryover"
        >
          <p>
            The carryover problem is structural. Two grids in two settings
            produce two motor plans and two vocabularies. 8gent Jr is the
            same app on the family device that a clinician demonstrates on
            theirs.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>In session.</strong> Open the app on the
              child&apos;s device or your own. Model the target chunk on
              the locked grid. Use the sentence bar to demonstrate
              recombination. Note the motor path.
            </li>
            <li>
              <strong>Send a routine home.</strong> Three-minute parent
              routines built around the same cards. No new app to install.
              No new vocabulary to learn. Same colours, same positions,
              same gestalt scripts.
            </li>
            <li>
              <strong>Observe carryover.</strong> Families who choose to
              share session events bring you a quantitative trace between
              visits. You see which cards survived the kitchen-table test
              and which did not.
            </li>
            <li>
              <strong>Discharge.</strong> The child&apos;s vocabulary,
              gestalt library, and Your Words row stay on the device. Care
              is continuous, not gated by your caseload.
            </li>
          </ul>
        </GuideSection>

        <GuideSection num={6} title="Pricing reality" id="pricing">
          <p>
            The recommendation does not have to start with{' '}
            <em>if you can afford it</em>.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Free for families. No account required to start.</li>
            <li>No medical card threshold. No funding application.</li>
            <li>No 18-month waitlist. Open the page, tap a card, hear it.</li>
            <li>
              No dedicated 5,000 euro device. Runs on the phone or tablet
              the family already owns.
            </li>
          </ul>
          <p>
            Removing the price tag changes what you can prescribe and how
            quickly the family can act on it.
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
                on your own device. Skim the locked Supercore grid, the
                sentence bar, and the predictive strip before your next
                session.
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
                to confirm the estimated NLA stage, override if you know
                better, and adjust grid size and TTS speed.
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
              The full Talk page: one screen, four layers, motor-stable
              core.
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
              aria-label="Open the parent intro to share with families"
            >
              Send parents the intro
            </Link>
          </div>
        </GuideSection>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
          <p>
            Clinical questions, feature requests, or evidence you would
            like us to track? Visit{' '}
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
