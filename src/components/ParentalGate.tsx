"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConsentRecord {
  parentEmail: string;
  childAge: number;
  consentedAt: string;
  privacyPolicyVersion: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONSENT_KEY = "8gentjr_parental_consent";
const PRIVACY_POLICY_VERSION = "2026-04-10";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentRecord) : null;
  } catch {
    return null;
  }
}

function saveConsent(record: ConsentRecord): void {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = "role" | "age" | "consent" | "done";

export function ParentalGate({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>("done");
  const [mounted, setMounted] = useState(false);

  // Form state
  const [childAge, setChildAge] = useState<number | null>(null);
  const [parentEmail, setParentEmail] = useState("");
  const [readPolicy, setReadPolicy] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    const existing = getConsent();
    if (existing && existing.privacyPolicyVersion === PRIVACY_POLICY_VERSION) {
      setStep("done");
    } else {
      setStep("role");
    }
  }, []);

  // Don't flash gate on SSR
  if (!mounted) return null;
  if (step === "done") return <>{children}</>;

  // -------------------------------------------------------------------------
  // Step 1: Who is using this?
  // -------------------------------------------------------------------------

  if (step === "role") {
    return (
      <GateShell>
        <h1 className="text-2xl font-bold text-[var(--brand-text)] mb-2">
          Welcome to 8gent Jr
        </h1>
        <p className="text-sm text-[var(--brand-text-soft)] mb-8">
          Before we start, we need to know who is setting up the app.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setStep("age")}
            className="w-full py-4 px-6 rounded-2xl bg-[var(--brand-accent)] text-white font-semibold text-base hover:opacity-90 transition-opacity"
          >
            I am a parent or guardian
          </button>
          <button
            onClick={() => setStep("age")}
            className="w-full py-4 px-6 rounded-2xl bg-[var(--brand-bg-warm)] text-[var(--brand-text)] font-semibold text-base border border-[var(--brand-border)] hover:bg-[var(--brand-bg-accent)] transition-colors"
          >
            I am a teacher or therapist
          </button>
          <div className="pt-2">
            <p className="text-xs text-[var(--brand-text-muted)] text-center">
              If you are a child, please ask your parent or guardian to set up
              8gent Jr for you.
            </p>
          </div>
        </div>
      </GateShell>
    );
  }

  // -------------------------------------------------------------------------
  // Step 2: Child's age
  // -------------------------------------------------------------------------

  if (step === "age") {
    return (
      <GateShell>
        <h1 className="text-2xl font-bold text-[var(--brand-text)] mb-2">
          How old is the child?
        </h1>
        <p className="text-sm text-[var(--brand-text-soft)] mb-6">
          We ask this to provide the right experience and comply with
          children&apos;s privacy law.
        </p>

        <div className="grid grid-cols-4 gap-2 mb-6">
          {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(
            (age) => (
              <button
                key={age}
                onClick={() => setChildAge(age)}
                className={`py-3 rounded-xl text-base font-semibold transition-all ${
                  childAge === age
                    ? "bg-[var(--brand-accent)] text-white scale-105"
                    : "bg-[var(--brand-bg-warm)] text-[var(--brand-text)] border border-[var(--brand-border)] hover:border-[var(--brand-accent)]"
                }`}
              >
                {age === 18 ? "18+" : age}
              </button>
            ),
          )}
        </div>

        {childAge !== null && (
          <button
            onClick={() => {
              if (childAge < 13) {
                setStep("consent");
              } else {
                // 13+ can use with simplified consent
                saveConsent({
                  parentEmail: "self-verified-13-plus",
                  childAge,
                  consentedAt: new Date().toISOString(),
                  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
                });
                setStep("done");
              }
            }}
            className="w-full py-4 rounded-2xl bg-[var(--brand-accent)] text-white font-semibold text-base hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        )}

        <button
          onClick={() => setStep("role")}
          className="mt-3 text-sm text-[var(--brand-text-muted)] hover:underline"
        >
          Back
        </button>
      </GateShell>
    );
  }

  // -------------------------------------------------------------------------
  // Step 3: Parental consent (under 13)
  // -------------------------------------------------------------------------

  if (step === "consent") {
    const canSubmit =
      parentEmail.includes("@") &&
      parentEmail.includes(".") &&
      readPolicy &&
      consentGiven;

    return (
      <GateShell>
        <h1 className="text-2xl font-bold text-[var(--brand-text)] mb-2">
          Parental Consent Required
        </h1>
        <p className="text-sm text-[var(--brand-text-soft)] mb-6">
          Because your child is under 13, we need your consent before they can
          use 8gent Jr. This is required by the Children&apos;s Online Privacy
          Protection Act (COPPA).
        </p>

        <div className="space-y-4">
          {/* Parent email */}
          <div>
            <label className="text-sm font-medium text-[var(--brand-text)] mb-1 block">
              Your email address (parent/guardian)
            </label>
            <input
              type="email"
              value={parentEmail}
              onChange={(e) => {
                setParentEmail(e.target.value);
                setError("");
              }}
              placeholder="parent@example.com"
              className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] bg-white text-[var(--brand-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:border-transparent"
            />
            <p className="text-xs text-[var(--brand-text-muted)] mt-1">
              We will send a confirmation to this address. We will never share
              it.
            </p>
          </div>

          {/* Privacy policy acknowledgment */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={readPolicy}
              onChange={(e) => setReadPolicy(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-[var(--brand-border)] accent-[var(--brand-accent)]"
            />
            <span className="text-sm text-[var(--brand-text-soft)]">
              I have read and understand the{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-[var(--brand-accent)] underline"
              >
                Privacy Policy
              </Link>
              , including how my child&apos;s data is collected and used.
            </span>
          </label>

          {/* Consent checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-[var(--brand-border)] accent-[var(--brand-accent)]"
            />
            <span className="text-sm text-[var(--brand-text-soft)]">
              I am the parent or legal guardian of this child and I consent to
              the collection and use of data as described in the Privacy Policy.
              I understand I can withdraw consent at any time by contacting{" "}
              <span className="text-[var(--brand-accent)]">
                privacy@8gi.org
              </span>
              .
            </span>
          </label>

          {/* Data summary */}
          <div className="bg-[var(--brand-bg-warm)] rounded-xl p-4 text-xs text-[var(--brand-text-soft)] space-y-1">
            <p className="font-semibold text-[var(--brand-text)]">
              What we collect:
            </p>
            <p>
              Your email (for consent verification). Your child&apos;s age (for
              compliance). On-device usage data (never sent to us). Text sent to
              AI for autocomplete and speech features (not stored).
            </p>
            <p className="font-semibold text-[var(--brand-text)] mt-2">
              What we never do:
            </p>
            <p>
              No ads. No tracking. No data sales. No third-party sharing. No
              cookies beyond authentication.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          <button
            onClick={() => {
              if (!canSubmit) {
                setError(
                  "Please fill in your email and check both boxes to continue.",
                );
                return;
              }
              saveConsent({
                parentEmail,
                childAge: childAge!,
                consentedAt: new Date().toISOString(),
                privacyPolicyVersion: PRIVACY_POLICY_VERSION,
              });
              setStep("done");
            }}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-2xl font-semibold text-base transition-all ${
              canSubmit
                ? "bg-[var(--brand-accent)] text-white hover:opacity-90"
                : "bg-[var(--brand-border)] text-[var(--brand-text-muted)] cursor-not-allowed"
            }`}
          >
            I Consent — Set Up 8gent Jr
          </button>
        </div>

        <button
          onClick={() => setStep("age")}
          className="mt-3 text-sm text-[var(--brand-text-muted)] hover:underline"
        >
          Back
        </button>
      </GateShell>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

function GateShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--brand-accent)] text-white text-2xl font-bold mb-3">
            8
          </div>
          <p className="text-xs text-[var(--brand-text-muted)] tracking-wide">
            8gent Jr
          </p>
        </div>

        {children}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-[var(--brand-text-muted)]">
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            {" | "}
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            {" | "}
            <Link href="/feedback" className="hover:underline">
              Feedback
            </Link>
            {" | "}
            <span>8GI Foundation</span>
          </p>
        </div>
      </div>
    </div>
  );
}
