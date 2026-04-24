import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "8gent Jr privacy policy. COPPA-compliant. How we handle your child's data.",
};

export default function PrivacyPolicy() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 text-[var(--brand-text)]">
      <Link
        href="/"
        className="text-sm text-[var(--brand-accent)] hover:underline mb-8 inline-block"
      >
        Back to 8gent Jr
      </Link>

      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Privacy Policy
      </h1>
      <p className="text-sm text-[var(--brand-text-muted)] mb-8">
        Last updated: April 10, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--brand-text-soft)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            Plain Language Summary
          </h2>
          <p>
            8gent Jr is a free app for children, including children under 13. We
            take your child&apos;s privacy seriously. Here is what you need to
            know:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>We do not sell or share your child&apos;s data with anyone.</li>
            <li>We do not use advertising or tracking cookies.</li>
            <li>We do not use Google Analytics or any third-party analytics.</li>
            <li>
              Most data stays on your device and never leaves it.
            </li>
            <li>
              A parent or guardian must give consent before a child under 13 can
              use this app.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            Who We Are
          </h2>
          <p>
            8gent Jr is operated by 8GI Foundation, founded by James Spalding.
            We build free AI tools for neurodivergent children. Our contact
            email is{" "}
            <a
              href="mailto:privacy@8gi.org"
              className="text-[var(--brand-accent)] hover:underline"
            >
              privacy@8gi.org
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            Children&apos;s Privacy (COPPA Compliance)
          </h2>
          <p>
            8gent Jr is designed for children, including children under 13. We
            comply with the Children&apos;s Online Privacy Protection Act
            (COPPA) and its 2025 amendments.
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>
              <strong>Parental consent is required</strong> before any child
              under 13 can create an account or use AI-powered features.
            </li>
            <li>
              Parents can review, delete, or refuse further collection of their
              child&apos;s data at any time by contacting{" "}
              <a
                href="mailto:privacy@8gi.org"
                className="text-[var(--brand-accent)] hover:underline"
              >
                privacy@8gi.org
              </a>
              .
            </li>
            <li>
              We collect only what is necessary for the app to function. We do
              not condition participation on unnecessary data collection.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            What Data We Collect
          </h2>

          <h3 className="font-semibold text-[var(--brand-text)] mt-4 mb-1">
            Data stored on your device only (never sent to us):
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Words and sentences your child builds (for the AAC board)</li>
            <li>Custom AAC cards your child creates</li>
            <li>App preferences (companion name, colours, settings)</li>
            <li>
              Usage statistics (words used, session counts) for the on-device
              analytics dashboard
            </li>
            <li>Songs your child generates</li>
            <li>Offline AAC card cache</li>
          </ul>
          <p className="mt-2">
            This data is stored in your browser&apos;s local storage and
            IndexedDB. It never leaves your device. You can delete it at any
            time by clearing your browser data.
          </p>

          <h3 className="font-semibold text-[var(--brand-text)] mt-4 mb-1">
            Data processed by our servers:
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>AI text requests:</strong> When your child uses
              autocomplete or sentence improvement, the text may be sent to
              Groq (our AI provider) for processing, only if you enable cloud
              AI. Groq does not store this data after processing. We do not
              log or store these requests. Cloud AI is disabled by default.
            </li>
            <li>
              <strong>Text-to-speech requests:</strong> Text is sent to our
              server to generate speech audio. We do not log or store the text.
            </li>
            <li>
              <strong>Song generation:</strong> Prompts are sent to generate
              songs. We do not store the prompts.
            </li>
          </ul>

          <h3 className="font-semibold text-[var(--brand-text)] mt-4 mb-1">
            Account data (if you create an account):
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Email address (parent&apos;s email, used for authentication and
              parental consent verification)
            </li>
            <li>Display name (optional)</li>
          </ul>
          <p className="mt-2">
            Account authentication is handled by Clerk, a third-party
            authentication provider. Clerk&apos;s privacy policy is available at{" "}
            <a
              href="https://clerk.com/legal/privacy"
              className="text-[var(--brand-accent)] hover:underline"
              target="_blank"
              rel="noopener"
            >
              clerk.com/legal/privacy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            What We Do NOT Collect
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>No cookies (except essential authentication cookies)</li>
            <li>No advertising or tracking pixels</li>
            <li>No Google Analytics, Facebook Pixel, or similar services</li>
            <li>No location data</li>
            <li>No photos, videos, or audio recordings of your child</li>
            <li>No contact lists or social media connections</li>
            <li>No device identifiers or fingerprinting</li>
            <li>No behavioural profiles or targeted advertising data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            Data Retention
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>On-device data:</strong> Stored until you clear it. Usage
              logs are automatically pruned after 30 days.
            </li>
            <li>
              <strong>AI processing:</strong> Text sent to Groq for AI features
              is processed in real-time and not stored by Groq or by us after
              the response is generated.
            </li>
            <li>
              <strong>Account data:</strong> Retained while the account is
              active. Delete your account at any time by contacting{" "}
              <a
                href="mailto:privacy@8gi.org"
                className="text-[var(--brand-accent)] hover:underline"
              >
                privacy@8gi.org
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            Third-Party Services
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Groq</strong> (AI inference): processes text for
              autocomplete, sentence improvement, and chat features. No data is
              stored.
            </li>
            <li>
              <strong>Clerk</strong> (authentication): handles account creation
              and login. Stores email and basic profile data.
            </li>
            <li>
              <strong>Vercel</strong> (hosting): serves the application. Standard
              server logs (IP address, request time) are retained for up to 30
              days for security purposes.
            </li>
          </ul>
          <p className="mt-2">
            We do not share data with any other third parties. We do not sell
            data. We do not use data for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            Parental Rights
          </h2>
          <p>As a parent or guardian, you have the right to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>
              Review the personal information we have collected from your child
            </li>
            <li>Request deletion of your child&apos;s personal information</li>
            <li>
              Refuse to allow further collection of your child&apos;s
              information
            </li>
            <li>
              Withdraw consent at any time, which will result in account
              deletion
            </li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, contact us at{" "}
            <a
              href="mailto:privacy@8gi.org"
              className="text-[var(--brand-accent)] hover:underline"
            >
              privacy@8gi.org
            </a>
            . We will respond within 48 hours.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            Security
          </h2>
          <p>
            We use industry-standard security measures including HTTPS
            encryption, secure authentication via Clerk, and minimal data
            collection. Because most data stays on your device, there is minimal
            risk of server-side data breaches affecting your child&apos;s usage
            data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            Changes to This Policy
          </h2>
          <p>
            If we make material changes to this policy, we will notify parents
            via the email address on file and update the date at the top of this
            page. We will obtain new parental consent if changes affect the
            types of data collected from children.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--brand-text)] mb-2">
            Contact
          </h2>
          <p>
            8GI Foundation
            <br />
            James Spalding, Founder
            <br />
            Email:{" "}
            <a
              href="mailto:privacy@8gi.org"
              className="text-[var(--brand-accent)] hover:underline"
            >
              privacy@8gi.org
            </a>
            <br />
            Dublin, Ireland
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-[var(--brand-border)] text-xs text-[var(--brand-text-muted)]">
        <p>
          8gent Jr is a product of 8GI Foundation.{" "}
          <Link
            href="/terms"
            className="text-[var(--brand-accent)] hover:underline"
          >
            Terms of Service
          </Link>{" "}
          |{" "}
          <Link
            href="/"
            className="text-[var(--brand-accent)] hover:underline"
          >
            Back to App
          </Link>
        </p>
      </div>
    </main>
  );
}
