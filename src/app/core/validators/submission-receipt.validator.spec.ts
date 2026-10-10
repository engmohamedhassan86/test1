import { describe, expect, it } from 'vitest';

import { isSubmissionReceipt } from './submission-receipt.validator';

/**
 * `isSubmissionReceipt` — T039, `contracts/response-submission.md` §3 and §9.1.
 *
 * This is the only predicate that may produce the `submitted` state, so its failure mode is
 * the worst one in the feature: a response the server never stored, confirmed to the
 * respondent with a reference number that means nothing. Every case below is therefore a
 * *rejection* case except the first, and the input type is `unknown` because the body comes
 * straight from `response.json()` and has been through no other guard.
 *
 * Contract test 5 is the 200-with-a-bad-body row: the adapter maps a rejection here to
 * `malformed-response`, never to `acknowledged`.
 */

const valid = { submissionId: 'sub_9f2c', receivedAt: '2026-05-05T10:15:00.000Z' };

describe('isSubmissionReceipt — accepts an acknowledgement', () => {
  it('accepts a body with both fields present, string and non-empty', () => {
    expect(isSubmissionReceipt(valid)).toBe(true);
  });

  it('accepts a body carrying extra fields alongside the two required ones', () => {
    // The receipt guard is not a config validator: unknown keys on a *response* are the
    // receiver's business, and rejecting them would break a server that adds a field.
    expect(isSubmissionReceipt({ ...valid, status: 'stored', queuePosition: 4 })).toBe(true);
  });

  it('accepts a single-character value for either field', () => {
    expect(isSubmissionReceipt({ submissionId: 'x', receivedAt: 'y' })).toBe(true);
  });
});

describe('isSubmissionReceipt — a missing field', () => {
  it('rejects a body with no submissionId', () => {
    expect(isSubmissionReceipt({ receivedAt: valid.receivedAt })).toBe(false);
  });

  it('rejects a body with no receivedAt (contract test 5)', () => {
    expect(isSubmissionReceipt({ submissionId: valid.submissionId })).toBe(false);
  });

  it('rejects an object with neither field', () => {
    expect(isSubmissionReceipt({})).toBe(false);
  });

  it('rejects a field present as null or undefined', () => {
    expect(isSubmissionReceipt({ ...valid, submissionId: null })).toBe(false);
    expect(isSubmissionReceipt({ ...valid, receivedAt: null })).toBe(false);
    expect(isSubmissionReceipt({ ...valid, submissionId: undefined })).toBe(false);
    expect(isSubmissionReceipt({ ...valid, receivedAt: undefined })).toBe(false);
  });
});

describe('isSubmissionReceipt — an empty field', () => {
  it('rejects an empty submissionId', () => {
    expect(isSubmissionReceipt({ ...valid, submissionId: '' })).toBe(false);
  });

  it('rejects an empty receivedAt', () => {
    expect(isSubmissionReceipt({ ...valid, receivedAt: '' })).toBe(false);
  });

  it('rejects both fields empty', () => {
    expect(isSubmissionReceipt({ submissionId: '', receivedAt: '' })).toBe(false);
  });
});

describe('isSubmissionReceipt — a wrong-typed field', () => {
  it('rejects a numeric submissionId, which JSON can carry', () => {
    expect(isSubmissionReceipt({ ...valid, submissionId: 9042 })).toBe(false);
  });

  it('rejects a receivedAt supplied as a number of milliseconds', () => {
    expect(isSubmissionReceipt({ ...valid, receivedAt: 1_767_225_300_000 })).toBe(false);
  });

  it('rejects a field nested in an object or an array', () => {
    expect(isSubmissionReceipt({ ...valid, submissionId: { id: 'sub_9f2c' } })).toBe(false);
    expect(isSubmissionReceipt({ ...valid, receivedAt: [valid.receivedAt] })).toBe(false);
  });
});

describe('isSubmissionReceipt — a non-object body', () => {
  it('rejects null, which `typeof` reports as an object', () => {
    expect(isSubmissionReceipt(null)).toBe(false);
  });

  it('rejects every other JSON scalar a 200 could carry', () => {
    for (const body of [undefined, 'sub_9f2c', 0, 1, true, false]) {
      expect(isSubmissionReceipt(body)).toBe(false);
    }
  });

  it('rejects an array, including one holding a valid receipt', () => {
    expect(isSubmissionReceipt([])).toBe(false);
    expect(isSubmissionReceipt([valid])).toBe(false);
  });
});
