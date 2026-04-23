"use client";

/**
 * ParentalGate - DPIA age gate before account creation (issue #116).
 *
 * Three paths:
 *   child_under_13: parent/guardian path. Collects birth year +
 *                   legal-guardian confirmation, then routes into the
 *                   email-plus Verifiable Parental Consent flow.
 *   self_13_plus:   the account subject is 13+ and using it for themselves.
 *   carer_13_plus:  the account subject is 13+ and a carer is setting it up.
 *
 * Persists accountType + birthYear (band only) + isChild to AppContext.
 * This runs BEFORE onboarding / AAC board access.
 *
 * DPIA reference:
 *   8gi-governance/docs/legal/2026-04-21-8gentjr-dpia-interim.md
 */

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  type AccountType,
  ageFromBirthYear,
  buildAccountRecord,
  nextRouteForAccount,
  validateAccountInput,
} from "@/lib/account";

type Step = "who" | "birth_year" | "guardian" | "done";

const CURRENT_YEAR = new Date().getUTCFullYear();
// Offer roughly the last 100 years as birth-year options.
const BIRTH_YEAR_OPTIONS: number[] = Array.from(
  { length: 100 },
  (_, i) => CURRENT_YEAR - i,
);

export function ParentalGate({ children }: { children: ReactNode }) {
  const { settings, updateSettings, isLoaded } = useApp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("done");
  const [mounted, setMounted] = useState(false);

  // Form state - local to the gate flow, only committed to AppContext on submit.
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [carerRelationship, setCarerRelationship] = useState("");
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    // Gate is "done" once we have an accountType + birthYear committed.
    if (settings.accountType !== null && settings.birthYear !== null) {
      setStep("done");
    } else {
      setStep("who");
    }
  }, [isLoaded, settings.accountType, settings.birthYear]);

  if (!mounted || !isLoaded) return null;
  if (step === "done") return <>{children}</>;

  function commitAndRoute() {
    if (!accountType || birthYear === null) return;
    const record = buildAccountRecord({
      accountType,
      birthYear,
      guardianConfirmed,
      carerRelationship:
        accountType === "carer_13_plus"
          ? carerRelationship.trim() || undefined
          : undefined,
    });
    updateSettings({
      accountType: record.accountType,
      birthYear: record.birthYear,
      isChild: record.isChild,
      carerRelationship: record.carerRelationship ?? null,
      guardianConfirmed: record.guardianConfirmed,
      parentEmailConfirmed: record.parentEmailConfirmed,
      gatedAt: record.gatedAt,
    });
    setStep("done");
    router.replace(nextRouteForAccount(record.accountType));
  }

  // ---- Step 1: who is this account for? --------------------------------

  if (step === "who") {
    return (
      <GateShell>
        <h1 className="text-2xl font-bold text-[var(--brand-text)] mb-2">
          Who is this account for?
        </h1>
        <p className="text-sm text-[var(--brand-text-soft)] mb-8">
          We ask so we can give the right experience and follow
          children&apos;s privacy law. We store a birth year only, never a full
          date of birth.
        </p>

        <div className="space-y-3">
          <GateChoiceButton
            label="A child under 13"
            sub="I am a parent or legal guardian setting this up for a child under 13."
            onClick={() => {
              setAccountType("child_under_13");
              setError("");
              setStep("birth_year");
            }}
          />
          <GateChoiceButton
            label="Myself, 13 or older"
            sub="I am 13 or older and this account is for me."
            onClick={() => {
              setAccountType("self_13_plus");
              setError("");
              setStep("birth_year");
            }}
          />
          <GateChoiceButton
            label="A person I care for, 13 or older"
            sub="I am a carer, teacher, therapist or family member setting this up for someone 13 or older."
            onClick={() => {
              setAccountType("carer_13_plus");
              setError("");
              setStep("birth_year");
            }}
          />
        </div>
      </GateShell>
    );
  }

  // ---- Step 2: birth year (band only) ----------------------------------

  if (step === "birth_year") {
    const headline =
      accountType === "child_under_13"
        ? "What year was the child born?"
        : accountType === "carer_13_plus"
          ? "What year was the person born?"
          : "What year were you born?";

    const age = birthYear !== null ? ageFromBirthYear(birthYear) : null;

    const mismatchWarning = (() => {
      if (age === null || accountType === null) return null;
      if (accountType === "child_under_13" && age >= 13) {
        return "That birth year is 13 or older. Please pick the 13+ option on the previous screen.";
      }
      if (accountType !== "child_under_13" && age < 13) {
        return "That birth year is under 13. Please pick the child-under-13 option on the previous screen.";
      }
      return null;
    })();

    const canContinue =
      birthYear !== null &&
      mismatchWarning === null &&
      (accountType !== "carer_13_plus" || carerRelationship.trim().length > 0);

    return (
      <GateShell>
        <h1 className="text-2xl font-bold text-[var(--brand-text)] mb-2">
          {headline}
        </h1>
        <p className="text-sm text-[var(--brand-text-soft)] mb-6">
          Birth year only. We never ask for a full date of birth.
        </p>

        <label
          htmlFor="birth-year"
          className="text-sm font-medium text-[var(--brand-text)] mb-1 block"
        >
          Birth year
        </label>
        <select
          id="birth-year"
          value={birthYear ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            setBirthYear(value === "" ? null : Number(value));
            setError("");
          }}
          className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] bg-white text-[var(--brand-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:border-transparent"
        >
          <option value="">Select a year</option>
          {BIRTH_YEAR_OPTIONS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        {accountType === "carer_13_plus" && (
          <div className="mt-4">
            <label
              htmlFor="carer-relationship"
              className="text-sm font-medium text-[var(--brand-text)] mb-1 block"
            >
              Your relationship to this person
            </label>
            <input
              id="carer-relationship"
              type="text"
              value={carerRelationship}
              onChange={(e) => setCarerRelationship(e.target.value)}
              placeholder="e.g. therapist, teacher, family carer"
              className="w-full px-4 py-3 rounded-xl border border-[var(--brand-border)] bg-white text-[var(--brand-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:border-transparent"
              maxLength={60}
            />
          </div>
        )}

        {mismatchWarning && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
            {mismatchWarning}
          </p>
        )}

        {error && <p className="text-sm text-red-500 font-medium mt-4">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setStep("who");
              setError("");
            }}
            className="px-5 py-3 rounded-2xl border border-[var(--brand-border)] text-[var(--brand-text-soft)] font-semibold text-sm hover:bg-[var(--brand-bg-warm)] transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (!accountType) {
                setStep("who");
                return;
              }
              if (accountType === "child_under_13") {
                setStep("guardian");
                return;
              }
              const validation = validateAccountInput({
                accountType,
                birthYear,
                guardianConfirmed: true,
              });
              if (validation) {
                setError(validation);
                return;
              }
              commitAndRoute();
            }}
            disabled={!canContinue}
            className={`flex-1 py-3 rounded-2xl font-semibold text-base transition-all ${
              canContinue
                ? "bg-[var(--brand-accent)] text-white hover:opacity-90"
                : "bg-[var(--brand-border)] text-[var(--brand-text-muted)] cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </GateShell>
    );
  }

  // ---- Step 3: guardian confirmation (child path only) -----------------

  if (step === "guardian") {
    const canSubmit = guardianConfirmed && birthYear !== null;

    return (
      <GateShell>
        <h1 className="text-2xl font-bold text-[var(--brand-text)] mb-2">
          Guardian confirmation
        </h1>
        <p className="text-sm text-[var(--brand-text-soft)] mb-6">
          Because the account subject is under 13, we need a parent or legal
          guardian to confirm before we go any further. After this, we will
          ask for a parent email to send a confirmation link.
        </p>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-[var(--brand-border)] hover:bg-[var(--brand-bg-warm)] transition-colors">
          <input
            type="checkbox"
            checked={guardianConfirmed}
            onChange={(e) => setGuardianConfirmed(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-[var(--brand-border)] accent-[var(--brand-accent)]"
          />
          <span className="text-sm text-[var(--brand-text-soft)] leading-relaxed">
            I am the parent or legal guardian of this child and I am authorised
            to set up this communication tool for them. I understand I will be
            asked to confirm by email before the account is activated, and that
            I can withdraw consent at any time by contacting{" "}
            <span className="text-[var(--brand-accent)]">privacy@8gi.org</span>.
          </span>
        </label>

        <div className="mt-6 bg-[var(--brand-bg-warm)] rounded-xl p-4 text-xs text-[var(--brand-text-soft)] space-y-1">
          <p className="font-semibold text-[var(--brand-text)]">
            Your rights under COPPA and GDPR
          </p>
          <p>
            Review the{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-[var(--brand-accent)] underline"
            >
              Privacy Policy
            </Link>{" "}
            for what we collect and how we use it. No ads. No tracking. No data
            sales.
          </p>
        </div>

        {error && <p className="text-sm text-red-500 font-medium mt-4">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setStep("birth_year");
              setError("");
            }}
            className="px-5 py-3 rounded-2xl border border-[var(--brand-border)] text-[var(--brand-text-soft)] font-semibold text-sm hover:bg-[var(--brand-bg-warm)] transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (!accountType || birthYear === null) {
                setStep("who");
                return;
              }
              const validation = validateAccountInput({
                accountType,
                birthYear,
                guardianConfirmed,
              });
              if (validation) {
                setError(validation);
                return;
              }
              commitAndRoute();
            }}
            disabled={!canSubmit}
            className={`flex-1 py-3 rounded-2xl font-semibold text-base transition-all ${
              canSubmit
                ? "bg-[var(--brand-accent)] text-white hover:opacity-90"
                : "bg-[var(--brand-border)] text-[var(--brand-text-muted)] cursor-not-allowed"
            }`}
          >
            Continue to email confirmation
          </button>
        </div>
      </GateShell>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Shell + primitives
// ---------------------------------------------------------------------------

function GateShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--brand-accent)] text-white text-2xl font-bold mb-3">
            8
          </div>
          <p className="text-xs text-[var(--brand-text-muted)] tracking-wide">
            8gent Jr
          </p>
        </div>

        {children}

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

function GateChoiceButton({
  label,
  sub,
  onClick,
}: {
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left py-4 px-5 rounded-2xl bg-[var(--brand-bg-warm)] border border-[var(--brand-border)] hover:border-[var(--brand-accent)] transition-colors"
    >
      <div className="font-semibold text-[var(--brand-text)] text-base">
        {label}
      </div>
      <div className="text-sm text-[var(--brand-text-soft)] mt-1 leading-snug">
        {sub}
      </div>
    </button>
  );
}
