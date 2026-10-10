import { describe, expect, it } from 'vitest';

import {
  attachmentId,
  attachmentPolicy,
  questionId,
  textareaQuestion,
} from '../models/__fixtures__/survey-builders';
import type { AttachmentCandidate, AttachmentPolicy, Question, SessionAttachment } from '../models';
import {
  attachmentErrorsFor,
  isAcceptedType,
  isAtAttachmentCapacity,
  validateAttachmentSelection,
} from './attachment.validator';

/**
 * The attachment rules — T036, covering FR-022 to FR-024 and FR-028.
 *
 * FR-023's five checks run at two moments, and this file asserts both because they are not
 * the same function and do not have the same job:
 *
 * - **`validateAttachmentSelection`** screens a selection as the respondent makes it. Its
 *   job is the *partial* outcome: a mixed selection still attaches its valid files, and
 *   every violating file is rejected here, at selection, so it is never carried to submit
 *   (SC-004). The US3 scenarios below are all on this side.
 * - **`attachmentErrorsFor`** is the fail-closed half of FR-027. It runs over everything a
 *   question still holds against that question's *current* policy, at Next and at Submit
 *   through `validatePage`. Its cases are the ones selection cannot produce — a policy that
 *   tightened or vanished underneath files accepted under the old one — because those are
 *   exactly the inputs that layer exists for.
 */
function held(name: string, sizeBytes: number, mimeType = 'application/pdf'): SessionAttachment {
  return {
    id: attachmentId(`att_${name}`),
    name,
    mimeType,
    sizeBytes,
    bytes: new Uint8Array(sizeBytes === 0 ? 0 : 1),
  };
}

function questionHolding(policy: AttachmentPolicy | null): Question {
  return textareaQuestion({ id: 'q_evidence', attachments: policy });
}

/** A file as the selection checks see it: no id and no bytes, because they are pure. */
function candidate(name: string, sizeBytes: number, mimeType: string): AttachmentCandidate {
  return { name, mimeType, sizeBytes };
}

const EVIDENCE = questionId('q_evidence');
const EIGHT_MB = 8 * 1_048_576;

describe('isAcceptedType (FR-028, contract §3)', () => {
  it('accepts a listed MIME type, case-insensitively', () => {
    expect(isAcceptedType({ name: 'a.png', mimeType: 'image/png' }, ['image/png'])).toBe(true);
    expect(isAcceptedType({ name: 'a.png', mimeType: 'IMAGE/PNG' }, ['image/png'])).toBe(true);
  });

  it('accepts a listed extension even when the MIME type is unhelpful', () => {
    // Browsers hand over `application/octet-stream` for plenty of ordinary files, so an
    // extension list has to work on its own.
    expect(
      isAcceptedType({ name: 'scan.PDF', mimeType: 'application/octet-stream' }, ['.pdf']),
    ).toBe(true);
  });

  it('rejects a file whose type is not listed, however the OS offered it', () => {
    // FR-028: acceptance comes only from this question's `acceptedTypes`. Nothing about the
    // file having survived the OS picker makes it acceptable.
    expect(isAcceptedType({ name: 'b.txt', mimeType: 'text/plain' }, ['image/png'])).toBe(false);
    expect(isAcceptedType({ name: 'noextension', mimeType: 'text/plain' }, ['.png'])).toBe(false);
  });
});

describe('isAtAttachmentCapacity (FR-022)', () => {
  const policy = attachmentPolicy({ maxFiles: 2 });

  it('is false below the limit and true at or above it', () => {
    expect(isAtAttachmentCapacity(policy, 0)).toBe(false);
    expect(isAtAttachmentCapacity(policy, 1)).toBe(false);
    expect(isAtAttachmentCapacity(policy, 2)).toBe(true);
    expect(isAtAttachmentCapacity(policy, 3)).toBe(true);
  });

  it('is false for a question with no policy, which has no slots to fill', () => {
    expect(isAtAttachmentCapacity(null, 0)).toBe(false);
    expect(isAtAttachmentCapacity(null, 9)).toBe(false);
  });
});

describe('validateAttachmentSelection — the five checks in order (FR-023)', () => {
  const policy = attachmentPolicy({
    maxFiles: 3,
    acceptedTypes: ['image/png'],
    maxSizeBytes: 1_000,
  });

  it('reports the unaccepted type on a file that also fails every later check', () => {
    // The first failing check decides the message. This file is the wrong type, too large,
    // and a duplicate of what is already held — and must still report its type.
    const existing = [held('b.txt', 2_000, 'text/plain')];
    const result = validateAttachmentSelection(EVIDENCE, policy, existing, [
      candidate('b.txt', 2_000, 'text/plain'),
    ]);

    expect(result.accepted).toEqual([]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.reason).toBe('unaccepted-type');
    expect(result.rejected[0]?.message).toBe(
      'b.txt: this file type is not accepted (allowed: PNG)',
    );
  });

  it('reports too-large on a right-typed file that is also empty-of-slot and duplicated', () => {
    const existing = [held('a.png', 2_000, 'image/png')];
    const result = validateAttachmentSelection(EVIDENCE, policy, existing, [
      candidate('a.png', 2_000, 'image/png'),
    ]);

    expect(result.rejected[0]?.reason).toBe('too-large');
    expect(result.rejected[0]?.message).toBe(
      'a.png: this file is larger than the 1000 bytes limit',
    );
  });

  it('reports empty before duplicate on a 0-byte file already held (US3 scenario 7)', () => {
    const existing = [held('blank.png', 0, 'image/png')];
    const result = validateAttachmentSelection(EVIDENCE, policy, existing, [
      candidate('blank.png', 0, 'image/png'),
    ]);

    expect(result.accepted).toEqual([]);
    expect(result.rejected[0]?.reason).toBe('empty');
    expect(result.rejected[0]?.message).toBe('blank.png: this file is empty');
  });

  it('reports duplicate before no-free-slot on a full question', () => {
    const full = attachmentPolicy({
      maxFiles: 1,
      acceptedTypes: ['image/png'],
      maxSizeBytes: 1_000,
    });
    const result = validateAttachmentSelection(
      EVIDENCE,
      full,
      [held('a.png', 500, 'image/png')],
      [candidate('a.png', 500, 'image/png')],
    );

    expect(result.rejected[0]?.reason).toBe('duplicate');
    expect(result.rejected[0]?.message).toBe('a.png is already attached');
  });

  it('reports no-free-slot last, for a file that passes the first four checks', () => {
    const full = attachmentPolicy({
      maxFiles: 1,
      acceptedTypes: ['image/png'],
      maxSizeBytes: 1_000,
    });
    const result = validateAttachmentSelection(
      EVIDENCE,
      full,
      [held('a.png', 500, 'image/png')],
      [candidate('b.png', 600, 'image/png')],
    );

    expect(result.rejected[0]?.reason).toBe('no-free-slot');
    // US3 scenario 5: the message is about the question, so it names no file.
    expect(result.rejected[0]?.message).toBe('You can attach up to 1 files to this question');
  });
});

describe('validateAttachmentSelection — a mixed selection (FR-024, US3 scenario 4)', () => {
  const policy = attachmentPolicy({ maxFiles: 3 });

  it('attaches a.png and rejects b.txt and an 8 MB c.png with one named error each', () => {
    const result = validateAttachmentSelection(
      EVIDENCE,
      policy,
      [],
      [
        candidate('a.png', 1_024, 'image/png'),
        candidate('b.txt', 1_024, 'text/plain'),
        candidate('c.png', EIGHT_MB, 'image/png'),
      ],
    );

    // The valid file still attaches: one bad file in a selection does not discard the rest.
    expect(result.accepted.map((file) => file.name)).toEqual(['a.png']);

    expect(result.rejected).toHaveLength(2);
    expect(result.rejected.map((rejection) => [rejection.fileName, rejection.reason])).toEqual([
      ['b.txt', 'unaccepted-type'],
      ['c.png', 'too-large'],
    ]);
    // FR-024: one error per rejected file, each naming its own file.
    expect(result.rejected[0]?.message).toBe(
      'b.txt: this file type is not accepted (allowed: PNG, JPEG, PDF)',
    );
    expect(result.rejected[1]?.message).toBe('c.png: this file is larger than the 5 MB limit');
    // Every rejection is attributed to the question that produced it (FR-024).
    expect(result.rejected.every((rejection) => rejection.questionId === EVIDENCE)).toBe(true);
  });

  it('carries no violating file through to the accepted set (SC-004)', () => {
    const result = validateAttachmentSelection(
      EVIDENCE,
      policy,
      [],
      [
        candidate('b.txt', 1_024, 'text/plain'),
        candidate('c.png', EIGHT_MB, 'image/png'),
        candidate('blank.png', 0, 'image/png'),
      ],
    );

    // Nothing survives selection, so nothing can reach the submit-time re-check or the
    // payload: the rejection happens here, once, at selection.
    expect(result.accepted).toEqual([]);
    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      'unaccepted-type',
      'too-large',
      'empty',
    ]);
  });
});

describe('validateAttachmentSelection — an over-count selection (US3 scenario 5)', () => {
  const policy = attachmentPolicy({ maxFiles: 2 });

  it('takes files in selection order and rejects the remainder', () => {
    const result = validateAttachmentSelection(
      EVIDENCE,
      policy,
      [],
      [
        candidate('first.png', 100, 'image/png'),
        candidate('second.png', 200, 'image/png'),
        candidate('third.png', 300, 'image/png'),
        candidate('fourth.png', 400, 'image/png'),
      ],
    );

    expect(result.accepted.map((file) => file.name)).toEqual(['first.png', 'second.png']);
    expect(result.rejected.map((rejection) => rejection.fileName)).toEqual([
      'third.png',
      'fourth.png',
    ]);
    expect(result.rejected.every((rejection) => rejection.reason === 'no-free-slot')).toBe(true);
  });

  it('counts what the question already holds against the same limit', () => {
    const result = validateAttachmentSelection(
      EVIDENCE,
      policy,
      [held('already.png', 100, 'image/png')],
      [candidate('first.png', 200, 'image/png'), candidate('second.png', 300, 'image/png')],
    );

    expect(result.accepted.map((file) => file.name)).toEqual(['first.png']);
    expect(result.rejected.map((rejection) => rejection.fileName)).toEqual(['second.png']);
  });
});

describe('validateAttachmentSelection — a duplicate (US3 scenario 6)', () => {
  const policy = attachmentPolicy({ maxFiles: 3 });

  it('rejects a file matching a held file by name and size', () => {
    const result = validateAttachmentSelection(
      EVIDENCE,
      policy,
      [held('a.png', 1_024, 'image/png')],
      [candidate('a.png', 1_024, 'image/png')],
    );

    expect(result.accepted).toEqual([]);
    expect(result.rejected[0]?.reason).toBe('duplicate');
    expect(result.rejected[0]?.message).toBe('a.png is already attached');
  });

  it('rejects the second of two identical files inside one selection', () => {
    // The duplicate check sees files accepted earlier in the same selection, which is what
    // makes it match the respondent's view rather than only the pre-selection state.
    const result = validateAttachmentSelection(
      EVIDENCE,
      policy,
      [],
      [candidate('a.png', 1_024, 'image/png'), candidate('a.png', 1_024, 'image/png')],
    );

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected[0]?.reason).toBe('duplicate');
  });

  it('accepts a file sharing only a name, or only a size, with a held file', () => {
    const result = validateAttachmentSelection(
      EVIDENCE,
      policy,
      [held('a.png', 1_024, 'image/png')],
      [candidate('a.png', 2_048, 'image/png'), candidate('b.png', 1_024, 'image/png')],
    );

    // The rule is name **and** size; either alone is a different file.
    expect(result.accepted.map((file) => file.name)).toEqual(['a.png', 'b.png']);
    expect(result.rejected).toEqual([]);
  });
});

describe('validateAttachmentSelection — zero files (US3 scenario 9, FR-022)', () => {
  it('passes with an empty result, because attachments are never required', () => {
    const result = validateAttachmentSelection(
      EVIDENCE,
      attachmentPolicy({ maxFiles: 1 }),
      [held('already.png', 100, 'image/png')],
      [],
    );

    expect(result).toEqual({ accepted: [], rejected: [] });
  });

  it('passes even when the question is already at capacity', () => {
    // Cancelling out of the file picker must not produce an error about the limit.
    const result = validateAttachmentSelection(
      EVIDENCE,
      attachmentPolicy({ maxFiles: 1 }),
      [held('already.png', 100, 'image/png')],
      [],
    );

    expect(result.rejected).toEqual([]);
  });
});

describe('attachmentErrorsFor', () => {
  it('passes when the question holds nothing, whatever the policy (FR-022)', () => {
    expect(attachmentErrorsFor(questionHolding(attachmentPolicy({ maxFiles: 1 })), [])).toBeNull();
    // Attachments are never required, so "no files" passes even with no policy at all.
    expect(attachmentErrorsFor(questionHolding(null), [])).toBeNull();
  });

  it('passes when every held file still satisfies the current policy', () => {
    const policy = attachmentPolicy({ maxFiles: 3, maxSizeBytes: 10_000 });

    const error = attachmentErrorsFor(questionHolding(policy), [
      held('a.pdf', 1_000),
      held('b.pdf', 2_000),
    ]);

    expect(error).toBeNull();
  });

  it('rejects everything when the question stopped accepting files at all', () => {
    const error = attachmentErrorsFor(questionHolding(null), [held('a.pdf', 1_000)]);

    // `maxFiles: 0` is not representable on `AttachmentPolicy`, so the count message is
    // produced from a literal rather than a policy lookup.
    expect(error?.message).toBe('You can attach up to 0 files to this question');
    expect(error?.questionId).toBe('q_evidence');
  });

  it('reports the count once when the held set outgrew a tightened maxFiles', () => {
    const policy = attachmentPolicy({ maxFiles: 1, maxSizeBytes: 10_000 });

    const error = attachmentErrorsFor(questionHolding(policy), [
      held('a.pdf', 1_000),
      held('b.pdf', 2_000),
    ]);

    // The count message names no file, so it must not be reported per-file: an over-count
    // set yields exactly this one error, not one `no-free-slot` per sibling.
    expect(error?.message).toBe('You can attach up to 1 files to this question');
  });

  it('reports a duplicate held by name and size (check 4 of five)', () => {
    const policy = attachmentPolicy({ maxFiles: 3, maxSizeBytes: 10_000 });

    const error = attachmentErrorsFor(questionHolding(policy), [
      held('a.pdf', 1_000),
      held('a.pdf', 1_000),
    ]);

    // Regression guard for S10 LOW-4: the re-check used to pass an always-empty `held` to
    // `firstFailure`, which made the duplicate check unreachable on this path and left the
    // fail-closed layer silently implementing four of the five rules it documents.
    expect(error?.message).toBe('a.pdf is already attached');
  });

  it('does not treat a shared name with a different size as a duplicate', () => {
    const policy = attachmentPolicy({ maxFiles: 3, maxSizeBytes: 10_000 });

    const error = attachmentErrorsFor(questionHolding(policy), [
      held('a.pdf', 1_000),
      held('a.pdf', 2_000),
    ]);

    // The rule is name **and** size; either alone is a different file.
    expect(error).toBeNull();
  });

  it('reports a held file that a tightened maxSizeBytes now rejects', () => {
    const policy = attachmentPolicy({ maxFiles: 3, maxSizeBytes: 1_000 });

    const error = attachmentErrorsFor(questionHolding(policy), [held('big.pdf', 5_000)]);

    expect(error?.message).toContain('big.pdf');
  });

  it('reports a held file whose type the policy no longer accepts', () => {
    const policy = attachmentPolicy({ maxFiles: 3, acceptedTypes: ['image/png'] });

    const error = attachmentErrorsFor(questionHolding(policy), [
      held('notes.pdf', 1_000, 'application/pdf'),
    ]);

    expect(error?.message).toContain('notes.pdf');
  });

  it('checks in FR-023 order, so type beats size on a file that fails both', () => {
    const policy = attachmentPolicy({
      maxFiles: 3,
      maxSizeBytes: 1_000,
      acceptedTypes: ['image/png'],
    });
    const tooBigAndWrongType = held('notes.pdf', 5_000, 'application/pdf');

    const error = attachmentErrorsFor(questionHolding(policy), [tooBigAndWrongType]);
    const typeOnly = attachmentErrorsFor(
      questionHolding(attachmentPolicy({ maxFiles: 3, acceptedTypes: ['image/png'] })),
      [tooBigAndWrongType],
    );

    // Same file, same first failure: the unaccepted type is reported whether or not the
    // size rule would also have caught it.
    expect(error?.message).toBe(typeOnly?.message);
  });

  it('reports the first failing file in held order', () => {
    const policy = attachmentPolicy({ maxFiles: 3, maxSizeBytes: 1_000 });

    const error = attachmentErrorsFor(questionHolding(policy), [
      held('first-bad.pdf', 5_000),
      held('second-bad.pdf', 6_000),
    ]);

    expect(error?.message).toContain('first-bad.pdf');
  });
});
