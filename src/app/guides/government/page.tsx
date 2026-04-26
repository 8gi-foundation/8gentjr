import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { GuideSection } from '@/components/guides/GuideSection';

/**
 * /guides/government - public-sector brief.
 *
 * Long-scroll, ungated brief for procurement panels, commissioning teams,
 * disability-services leads, and policy advisors at HSE (Ireland), NHS
 * (UK), state-level disability services in the US, and school districts.
 *
 * Mirrors /guides/therapist for layout, typography, and section rhythm so
 * the parent-domain voice stays consistent. The register here is sober,
 * evidence-led, and defensible. No marketing language. No fundraise tone.
 * Citations are the currency of this audience: Marge Blanc's Natural
 * Language Acquisition framework, the Fitzgerald Key, and the ARASAAC
 * pictogram library are named explicitly.
 *
 * Issue: #157
 */

export const metadata: Metadata = {
  title: 'For public-sector procurement and commissioning teams - 8gent Jr',
  description:
    'A sober, evidence-led brief for HSE, NHS, state disability services, and school districts. 8gent Jr is a free, ungated AAC app grounded in the NLA framework, the Fitzgerald Key, and the ARASAAC pictogram library. No procurement contract, no licence, no vendor lock-in.',
};

export default function GuidesGovernmentPage() {
  return (
    <div className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            For public-sector teams
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            8gent Jr for procurement and commissioning panels
          </h1>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            A short, evidence-led brief for HSE, NHS, state-level
            disability services, school districts, and policy advisors.
            Skim it on a Tuesday morning before a 3pm panel.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Looking for the clinical version?{' '}
            <Link
              href="/guides/therapist"
              className="text-emerald-700 underline font-semibold"
            >
              Read the therapist walkthrough
            </Link>
            . Looking for the parent version?{' '}
            <Link
              href="/guides/intro"
              className="text-emerald-700 underline font-semibold"
            >
              Read the parent intro
            </Link>
            .
          </p>
        </header>

        <GuideSection
          num={1}
          title="The system cost of inaccessible AAC"
          id="system-cost"
        >
          <p>
            Augmentative and alternative communication, or AAC, is the
            category of tools that lets a non-speaking or minimally
            verbal child be understood. The clinical case for AAC is
            settled. The access problem is not.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Assessment waitlists.</strong> In Ireland, the
              wait for an AAC assessment through public services
              regularly exceeds 18 months. Comparable backlogs are
              documented across NHS regions and most US state
              programmes. A child who is non-speaking at three is
              often still non-speaking at five before the first
              clinical recommendation lands.
            </li>
            <li>
              <strong>Device cost.</strong> Dedicated AAC devices sit
              in the 5,000 euro to 15,000 euro range. Where they are
              funded, they are funded slowly. Where they are not, the
              family is expected to absorb a cost most households
              cannot.
            </li>
            <li>
              <strong>Abandonment.</strong> Published AAC abandonment
              rates cluster between thirty and fifty percent. The
              device is procured, delivered, briefly used, then put
              in a drawer because no one in the family was trained
              to model it and the layout the child learned in clinic
              is not the layout they were given to take home.
            </li>
            <li>
              <strong>Equity gap.</strong> The current system
              produces three tiers: families with a medical card or
              equivalent who eventually receive a device, families
              who can pay privately, and families who get neither.
              The third tier is the largest.
            </li>
            <li>
              <strong>Lost outcomes.</strong> Communication that
              never reaches the kitchen table does not generalise.
              Education, healthcare access, mental-health outcomes,
              and adult independence all degrade in proportion to
              how long a child waits for a working communication
              system.
            </li>
          </ul>
          <p>
            The cost is not only the budget line for devices. The
            cost is the downstream demand on schools, on emergency
            services, on adult mental-health services, and on
            community supports that are shaped, decades later, by
            whether a child had a way to say no, to ask for help,
            and to be heard.
          </p>
        </GuideSection>

        <GuideSection
          num={2}
          title="What 8gent Jr provides at zero cost to the public purse"
          id="zero-cost"
        >
          <p>
            8gent Jr is a free, ungated AAC application that runs in
            any modern browser on any device a family already owns.
            It is not a proposal. It is shipping. The
            recommendation does not have to start with{' '}
            <em>if you can afford it</em>.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>No procurement contract.</strong> There is
              nothing to buy. No software licence, no per-seat fee,
              no annual renewal, no commercial agreement to
              negotiate.
            </li>
            <li>
              <strong>No vendor lock-in.</strong> The application
              is open-source under a permissive licence. The code
              path is public on the 8gi-foundation GitHub
              organisation. A future commissioning team can fork,
              audit, or self-host without permission.
            </li>
            <li>
              <strong>Free for families forever.</strong> No
              account is required to start. No paid tier exists
              for the core AAC surface. Removing the price tag is
              the design, not a promotion.
            </li>
            <li>
              <strong>No dedicated hardware.</strong> Runs on the
              phone, tablet, or laptop the family already owns.
              No 5,000 euro device sits between the child and a
              first sentence.
            </li>
            <li>
              <strong>Local-first session data.</strong> The words
              a child taps stay on the device. There is no cloud
              account holding a child&apos;s communication
              history.
            </li>
          </ul>
          <p>
            For a public body, the cost question collapses. There
            is no contract to sign, no budget line to defend, and
            no exit clause to worry about. The only commitment
            asked of the public sector is permission for clinical
            and educational staff to recommend the URL.
          </p>
        </GuideSection>

        <GuideSection
          num={3}
          title="Evidence base"
          id="evidence"
        >
          <p>
            The application is built on long-standing AAC
            principles. Each design choice maps to a specific,
            named, published framework that a clinical reviewer
            on the panel will recognise.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>
                Marge Blanc, Natural Language Acquisition.
              </strong>{' '}
              The application supports the six NLA stages
              described by Blanc for gestalt language processors,
              who account for a substantial share of autistic
              children referred for AAC. The same six stage names
              appear inside the app on the Settings page so a
              carer or clinician can override the auto-estimate
              at any time. Stage names are listed below.
            </li>
            <li>
              <strong>Motor-planning consistency.</strong> Core
              vocabulary sits in fixed grid positions. The
              Supercore grid never re-orders itself. Children
              build motor memory the same way an adult finds a
              kettle in the dark. Motor stability is the
              evidence-supported counter to abandonment.
            </li>
            <li>
              <strong>Fitzgerald Key.</strong> Cards are coloured
              by part of speech using the Fitzgerald Key
              conventions familiar from clinical AAC training in
              Ireland, the UK, and North America. Pronouns,
              verbs, descriptors, and core social words read at
              a glance.
            </li>
            <li>
              <strong>
                ARASAAC pictogram library.
              </strong>{' '}
              The pictogram set is the ARASAAC open library
              maintained by the Aragonese government in Spain.
              ARASAAC is the de-facto international standard
              with more than ten thousand symbols and is the
              same symbol stock most European public-sector AAC
              tools use. No bespoke art that has to be
              re-learned in transition.
            </li>
            <li>
              <strong>Three vocabulary layers.</strong>
              Core (high-frequency, fixed-position), fringe
              (contextual, personalised), and gestalt (whole
              scripts and chunks). Each layer behaves
              differently, on purpose, so that a gestalt
              language processor and a word-first child can
              both be served from one interface.
            </li>
          </ul>

          <p>
            The six NLA stages, named exactly as in Blanc&apos;s
            framework and as defined inside the application:
          </p>

          <ol className="list-none pl-0 space-y-3 mt-2">
            <li className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
              <span className="font-bold text-emerald-900">
                Stage 1 - Echolalia / Whole Gestalts.
              </span>
              <span className="ml-1 text-emerald-900/85">
                Whole scripted chunks treated as single
                indivisible messages.
              </span>
            </li>
            <li className="rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3">
              <span className="font-bold text-emerald-900">
                Stage 2 - Mitigated Gestalts.
              </span>
              <span className="ml-1 text-emerald-900/85">
                Chunks are trimmed and recombined.
              </span>
            </li>
            <li className="rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3">
              <span className="font-bold text-sky-900">
                Stage 3 - Single Words from Gestalts.
              </span>
              <span className="ml-1 text-sky-900/85">
                Isolated single words break free of scripts.
              </span>
            </li>
            <li className="rounded-xl border-2 border-sky-400 bg-sky-50 px-4 py-3">
              <span className="font-bold text-sky-900">
                Stage 4 - Early Original Sentences.
              </span>
              <span className="ml-1 text-sky-900/85">
                Novel two- and three-word combinations the
                child has not heard as a script.
              </span>
            </li>
            <li className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3">
              <span className="font-bold text-amber-900">
                Stage 5 - Complex Grammar.
              </span>
              <span className="ml-1 text-amber-900/85">
                Questions, conjunctions, articles,
                prepositions, longer flexible expressions.
              </span>
            </li>
            <li className="rounded-xl border-2 border-amber-500 bg-amber-100 px-4 py-3">
              <span className="font-bold text-amber-900">
                Stage 6 - Full Conversation.
              </span>
              <span className="ml-1 text-amber-900/90">
                Multi-turn conversation, narrative, and
                social-pragmatic language.
              </span>
            </li>
          </ol>

          <figure className="mt-6">
            <Image
              src="/screenshots/intro/talk-above-fold.png"
              alt="Talk page on a phone showing, top to bottom: a sentence bar with a green speak control, a sky-blue predictive next-word strip with four candidate words, an amber Your Words row of frequently-tapped vocabulary marked with stars, and the locked Supercore grid of Fitzgerald-coloured core word cards beneath. This is what a family or a clinician would see on first open."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              priority
              sizes="(max-width: 640px) 100vw, 600px"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              What a family or clinician would see on first open:
              the locked Supercore grid in Fitzgerald colours,
              ARASAAC pictograms, sentence bar, predictive strip,
              and Your Words row.
            </figcaption>
          </figure>
        </GuideSection>

        <GuideSection
          num={4}
          title="Privacy and compliance"
          id="privacy"
        >
          <p>
            The compliance posture is conservative by design. The
            application does not need a child&apos;s data to be
            useful, so it does not collect a child&apos;s data.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Local-first session data.</strong> The
              words a child taps, the gestalts they build, and
              the predictive history that personalises the
              interface stay on the device. There is no remote
              database holding a profile of a child&apos;s
              communication.
            </li>
            <li>
              <strong>GDPR.</strong> Because session data is
              local-first, the GDPR data-controller surface is
              minimal by construction. The European data
              minimisation principle is not retrofitted, it is
              the architecture.
            </li>
            <li>
              <strong>COPPA.</strong> The product treats users
              under the age of thirteen as the default audience.
              No advertising network is integrated. No third-
              party analytics SDK runs in the AAC surface.
            </li>
            <li>
              <strong>No third-party tracking.</strong> The AAC
              surface does not load advertising trackers,
              behavioural pixels, or data brokers. A child
              cannot be retargeted on the open web for tapping
              a card.
            </li>
            <li>
              <strong>Adult-only pages behind a parental
              gate.</strong> Settings, billing surfaces (where
              optional adult features exist), and any
              non-child-facing controls require an adult
              confirmation step before they unlock.
            </li>
          </ul>

          <figure className="mt-6">
            <Image
              src="/screenshots/intro/settings-above-fold.png"
              alt="Settings page on a phone showing the auto-estimated NLA stage banner near the top with a short stage description, followed by a vertical stage selector listing all six NLA stages so a carer or clinician can override the on-device estimate. The stage signal is computed locally."
              width={828}
              height={1792}
              className="rounded-2xl border border-gray-200 shadow-sm w-full h-auto"
              sizes="(max-width: 640px) 100vw, 600px"
              loading="lazy"
            />
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              The on-device stage signal: the estimator suggests,
              the carer or clinician decides. No remote profile
              of the child is created.
            </figcaption>
          </figure>
        </GuideSection>

        <GuideSection
          num={5}
          title="Outcomes that matter to commissioners"
          id="outcomes"
        >
          <p>
            The outcomes worth measuring are the ones a
            commissioning team would already track for any AAC
            programme. The application is designed so each one
            has a defensible mechanism, not a slogan.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Carryover from clinic to home.</strong>
              The same grid, same colours, same motor plan, and
              same gestalt library a clinician demonstrates in
              session is the grid the family opens at the
              kitchen table. The structural cause of carryover
              failure (two grids, two motor plans) is removed.
            </li>
            <li>
              <strong>Family training.</strong> Parents become
              co-therapists because the surface is the same one
              the clinician used. Three-minute parent routines
              built around the same cards replace the
              workshop-or-abandon pattern that drives much of
              the published abandonment rate.
            </li>
            <li>
              <strong>Equity of access.</strong> Cost is zero,
              the device is the one the family already owns,
              and the symbol stock (ARASAAC) is locale-aware.
              The product does not assume an English-speaking,
              high-income, urban family.
            </li>
            <li>
              <strong>Population-level reach.</strong> Any
              device with a modern browser, anywhere in the
              jurisdiction, on the day a clinician recommends
              it. The deployment latency is measured in minutes,
              not in months.
            </li>
            <li>
              <strong>Reduced demand on specialist
              services.</strong> A working communication system
              in the home reduces escalation events that
              otherwise present at GP surgeries, emergency
              departments, and community disability teams.
            </li>
          </ul>
          <p>
            None of these outcomes require a contract. They
            require a recommendation pathway and consenting
            families willing to share anonymised case studies.
          </p>
        </GuideSection>

        <GuideSection
          num={6}
          title="Procurement pathway"
          id="procurement"
        >
          <p>
            There is nothing to procure. The pathway a
            commissioning team is asked to consider is therefore
            unusual, and short.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>No contract.</strong> The application is
              free at the point of use. There is no commercial
              agreement to negotiate, no SLA to draft, and no
              vendor on the other side of a procurement table.
            </li>
            <li>
              <strong>No licence.</strong> Families do not buy
              the application. Public bodies do not buy the
              application. Schools do not buy the application.
              The licence is open and permissive.
            </li>
            <li>
              <strong>Recommendation, not deployment.</strong>
              The single ask is permission for speech and
              language therapists, occupational therapists,
              special-educational-needs coordinators, and
              disability-services teams to recommend the URL
              to families on their caseload.
            </li>
            <li>
              <strong>Public-sector contribution is
              evidence, not money.</strong> A model where the
              public sector contributes case studies, outcome
              data shared with explicit consent, and a feedback
              loop on what is missing for local populations.
              Money is not asked for. Evidence is.
            </li>
            <li>
              <strong>Optional evaluation cohort.</strong>
              Where a region wants a structured pilot, a
              commissioning team can nominate a cohort of
              consenting families and clinicians and the team
              will support data collection. No funding is
              required, no contract is exchanged, and the
              cohort can withdraw at any time.
            </li>
          </ul>
        </GuideSection>

        <GuideSection
          num={7}
          title="Contact and escalation"
          id="contact"
        >
          <p>
            For procurement panel briefings, evaluation cohort
            scoping, or written answers to a panel&apos;s
            specific questions, a single contact route is the
            most efficient path.
          </p>
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
                on any device. The product the brief describes
                is the product that opens. There is no demo
                build separate from the live application.
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
                to see the on-device NLA stage signal,
                including the override control a clinician would
                use. The estimator never auto-mutates the
                active stage.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm">
                3
              </span>
              <span>
                Reach the team via{' '}
                <Link
                  href="/feedback"
                  className="text-emerald-700 underline font-semibold"
                >
                  /feedback
                </Link>{' '}
                with the words{' '}
                <em>procurement panel</em> in the subject. A
                written brief, a tailored Q&amp;A, or a panel
                attendance can be arranged from there.
              </span>
            </li>
          </ol>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/talk"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg px-6 py-4 shadow-sm transition-colors"
              aria-label="Open the live Talk page"
            >
              Open the live application
            </Link>
            <Link
              href="/feedback"
              className="inline-flex items-center justify-center rounded-xl border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-lg px-6 py-4 transition-colors"
              aria-label="Contact the team about a procurement panel briefing"
            >
              Request a panel briefing
            </Link>
          </div>
        </GuideSection>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
          <p>
            Citations on this page: Marge Blanc, Natural
            Language Acquisition framework. Fitzgerald Key
            colour-coded vocabulary conventions. ARASAAC
            pictogram library, maintained by the Aragonese
            government, Spain. Source code and licence at the
            8gi-foundation GitHub organisation.
          </p>
        </footer>
      </article>
    </div>
  );
}
