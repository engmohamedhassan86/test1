import { describe, expect, it } from 'vitest';

import {
  attachmentId,
  attachmentPolicy,
  textareaQuestion,
} from '../models/__fixtures__/survey-builders';
import type { AttachmentPolicy, Question, SessionAttachment } from '../models';
import { attachmentErrorsFor } from './attachment.validator';

/**
 * The FR-027 re-check, `attachmentErrorsFor`, asserted directly.
 *
 * This is the fail-closed half of FR-027: `acceptFiles` screens a selection as the respondent
 * makes it, and this runs over everything a question still holds against that question's
 * *current* policy, at Next and at Submit through `validatePage`. The cases below are the ones
 * selection cannot produce — a policy that tightened or vanished underneath files that were
 * accepted under the old one — because those are exactly the inputs this layer exists for.
 *
 * T036's full per-scenario list (the mixed selection, selection-order remainder, and the
 * zero-byte and zero-file cases at selection time) belongs to `acceptFiles` and is not here.
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
