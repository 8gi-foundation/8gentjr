/**
 * Unit tests for the age gate logic (issue #116).
 *
 * Covers the three signup paths forking correctly:
 *   - child_under_13 (birth year makes age < 13, guardian confirmation required)
 *   - self_13_plus   (birth year makes age >= 13)
 *   - carer_13_plus  (birth year makes age >= 13, relationship captured)
 *
 * Run with: bun test src/lib/account.test.ts
 */

import { test } from 'bun:test';
import assert from 'node:assert/strict';

import {
  ageFromBirthYear,
  buildAccountRecord,
  isUnder13,
  nextRouteForAccount,
  validateAccountInput,
} from './account';

const NOW = new Date('2026-04-21T00:00:00.000Z');

test('ageFromBirthYear computes age from current UTC year', () => {
  assert.equal(ageFromBirthYear(2020, NOW), 6);
  assert.equal(ageFromBirthYear(2013, NOW), 13);
  assert.equal(ageFromBirthYear(1990, NOW), 36);
});

test('ageFromBirthYear rejects invalid years', () => {
  assert.equal(ageFromBirthYear(Number.NaN, NOW), null);
  assert.equal(ageFromBirthYear(1800, NOW), null);
  assert.equal(ageFromBirthYear(2100, NOW), null);
});

test('isUnder13 is true only for ages strictly below 13', () => {
  assert.equal(isUnder13(2020, NOW), true);
  assert.equal(isUnder13(2013, NOW), false);
  assert.equal(isUnder13(2014, NOW), true);
  assert.equal(isUnder13(1990, NOW), false);
});

test('nextRouteForAccount routes child path to the VPC placeholder', () => {
  assert.equal(
    nextRouteForAccount('child_under_13'),
    '/parent-email-verification',
  );
  assert.equal(nextRouteForAccount('self_13_plus'), '/onboarding');
  assert.equal(nextRouteForAccount('carer_13_plus'), '/onboarding');
});

test('validateAccountInput: child path requires under-13 + guardian confirmation', () => {
  assert.match(
    validateAccountInput({
      accountType: 'child_under_13',
      birthYear: 1990,
      guardianConfirmed: true,
      now: NOW,
    }) ?? '',
    /only for children under 13/i,
  );
  assert.match(
    validateAccountInput({
      accountType: 'child_under_13',
      birthYear: 2020,
      guardianConfirmed: false,
      now: NOW,
    }) ?? '',
    /parent or legal guardian/i,
  );
  assert.equal(
    validateAccountInput({
      accountType: 'child_under_13',
      birthYear: 2020,
      guardianConfirmed: true,
      now: NOW,
    }),
    null,
  );
});

test('validateAccountInput: 13+ paths reject under-13 birth years', () => {
  assert.match(
    validateAccountInput({
      accountType: 'self_13_plus',
      birthYear: 2020,
      guardianConfirmed: true,
      now: NOW,
    }) ?? '',
    /13 or older/i,
  );
  assert.match(
    validateAccountInput({
      accountType: 'carer_13_plus',
      birthYear: 2020,
      guardianConfirmed: true,
      now: NOW,
    }) ?? '',
    /13 or older/i,
  );
  assert.equal(
    validateAccountInput({
      accountType: 'self_13_plus',
      birthYear: 1990,
      guardianConfirmed: false,
      now: NOW,
    }),
    null,
  );
});

test('validateAccountInput: missing birth year is rejected', () => {
  assert.match(
    validateAccountInput({
      accountType: 'self_13_plus',
      birthYear: null,
      guardianConfirmed: true,
      now: NOW,
    }) ?? '',
    /birth year/i,
  );
});

test('buildAccountRecord: child path forks correctly', () => {
  const record = buildAccountRecord({
    accountType: 'child_under_13',
    birthYear: 2020,
    guardianConfirmed: true,
    now: NOW,
  });
  assert.equal(record.accountType, 'child_under_13');
  assert.equal(record.birthYear, 2020);
  assert.equal(record.isChild, true);
  assert.equal(record.guardianConfirmed, true);
  assert.equal(record.parentEmailConfirmed, false);
  assert.equal(record.carerRelationship, undefined);
  assert.equal(record.gatedAt, NOW.toISOString());
});

test('buildAccountRecord: self 13+ path forks correctly', () => {
  const record = buildAccountRecord({
    accountType: 'self_13_plus',
    birthYear: 1995,
    guardianConfirmed: false,
    now: NOW,
  });
  assert.equal(record.accountType, 'self_13_plus');
  assert.equal(record.isChild, false);
  assert.equal(record.guardianConfirmed, true, '13+ path has implicit self-consent');
  assert.equal(record.carerRelationship, undefined);
});

test('buildAccountRecord: carer 13+ path retains relationship', () => {
  const record = buildAccountRecord({
    accountType: 'carer_13_plus',
    birthYear: 2005,
    guardianConfirmed: false,
    carerRelationship: 'speech therapist',
    now: NOW,
  });
  assert.equal(record.accountType, 'carer_13_plus');
  assert.equal(record.isChild, false);
  assert.equal(record.carerRelationship, 'speech therapist');
  assert.equal(record.guardianConfirmed, true);
});

test('routing: child path goes to VPC placeholder, others to onboarding', () => {
  const childRecord = buildAccountRecord({
    accountType: 'child_under_13',
    birthYear: 2020,
    guardianConfirmed: true,
    now: NOW,
  });
  const selfRecord = buildAccountRecord({
    accountType: 'self_13_plus',
    birthYear: 1995,
    guardianConfirmed: false,
    now: NOW,
  });
  const carerRecord = buildAccountRecord({
    accountType: 'carer_13_plus',
    birthYear: 2000,
    guardianConfirmed: false,
    carerRelationship: 'teacher',
    now: NOW,
  });
  assert.equal(
    nextRouteForAccount(childRecord.accountType),
    '/parent-email-verification',
  );
  assert.equal(nextRouteForAccount(selfRecord.accountType), '/onboarding');
  assert.equal(nextRouteForAccount(carerRecord.accountType), '/onboarding');
});
