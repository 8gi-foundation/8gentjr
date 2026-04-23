/**
 * Account type + age gate logic (DPIA 2026-04-21).
 *
 * Three paths per issue #116:
 *   child_under_13: parent/guardian setting up for a child under 13.
 *                   Requires guardian confirmation + routes to the
 *                   email-plus Verifiable Parental Consent flow
 *                   (see src/lib/consent/).
 *   self_13_plus:   a person 13+ using it for themselves.
 *   carer_13_plus:  a person 13+ setting up for someone else who is 13+
 *                   (therapist, teacher, family carer).
 *
 * We store birth YEAR only (band) - never full DOB - to minimise
 * child data collected. See DPIA:
 *   8gi-governance/docs/legal/2026-04-21-8gentjr-dpia-interim.md
 */

export type AccountType =
  | 'child_under_13'
  | 'self_13_plus'
  | 'carer_13_plus';

export interface AccountRecord {
  accountType: AccountType;
  /** Birth year band only. Never capture full date of birth. */
  birthYear: number | null;
  /** True if the account subject is under 13 (derived at gate time). */
  isChild: boolean;
  /** Relationship for the carer path (e.g. "therapist", "teacher"). */
  carerRelationship?: string;
  /** ISO timestamp of when the gate was completed. */
  gatedAt: string;
  /** Parent/guardian confirmation for the child path. */
  guardianConfirmed: boolean;
  /** VPC flow completion (set once both consent emails are confirmed). */
  parentEmailConfirmed: boolean;
}

/** Minimum plausible birth year for an under-13 user today. */
export const MIN_BIRTH_YEAR = 1900;

/** Compute age band from a birth year. Returns null for invalid input. */
export function ageFromBirthYear(
  birthYear: number,
  now: Date = new Date(),
): number | null {
  if (!Number.isFinite(birthYear)) return null;
  if (birthYear < MIN_BIRTH_YEAR) return null;
  const currentYear = now.getUTCFullYear();
  if (birthYear > currentYear) return null;
  return currentYear - birthYear;
}

/** Is the given birth year under 13 relative to `now`? */
export function isUnder13(
  birthYear: number,
  now: Date = new Date(),
): boolean {
  const age = ageFromBirthYear(birthYear, now);
  if (age === null) return false;
  return age < 13;
}

/**
 * Resolve the next route for a given account type.
 *   child_under_13 -> /parent-email-verification (VPC flow)
 *   self_13_plus   -> /onboarding
 *   carer_13_plus  -> /onboarding
 */
export function nextRouteForAccount(type: AccountType): string {
  if (type === 'child_under_13') return '/parent-email-verification';
  return '/onboarding';
}

/**
 * Validate the inputs for a given path. Returns null if valid,
 * or a human-readable error string if not.
 */
export function validateAccountInput(input: {
  accountType: AccountType;
  birthYear: number | null;
  guardianConfirmed: boolean;
  now?: Date;
}): string | null {
  const { accountType, birthYear, guardianConfirmed, now } = input;
  if (birthYear === null || !Number.isFinite(birthYear)) {
    return 'Please provide a birth year.';
  }
  const age = ageFromBirthYear(birthYear, now);
  if (age === null) {
    return 'Please provide a valid birth year.';
  }

  if (accountType === 'child_under_13') {
    if (age >= 13) {
      return 'This path is only for children under 13. Please choose a different option.';
    }
    if (!guardianConfirmed) {
      return 'A parent or legal guardian must confirm to continue.';
    }
    return null;
  }

  // Both self_13_plus and carer_13_plus require age >= 13.
  if (age < 13) {
    return 'The 13+ paths require the account subject to be 13 or older.';
  }
  return null;
}

/**
 * Build a persisted account record from validated inputs.
 * Caller is expected to have called `validateAccountInput` first.
 */
export function buildAccountRecord(input: {
  accountType: AccountType;
  birthYear: number;
  guardianConfirmed: boolean;
  carerRelationship?: string;
  now?: Date;
}): AccountRecord {
  const now = input.now ?? new Date();
  return {
    accountType: input.accountType,
    birthYear: input.birthYear,
    isChild: isUnder13(input.birthYear, now),
    carerRelationship:
      input.accountType === 'carer_13_plus'
        ? input.carerRelationship
        : undefined,
    gatedAt: now.toISOString(),
    guardianConfirmed:
      input.accountType === 'child_under_13' ? input.guardianConfirmed : true,
    parentEmailConfirmed: false,
  };
}
